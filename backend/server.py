from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import secrets
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from html import escape
from urllib.parse import urlparse

import bcrypt
import jwt
import httpx
import requests
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import Response as RawResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
DISTRICTS = ["Thuận An", "Thủ Dầu Một", "Dĩ An"]
LISTING_TYPES = {"mat_bang": "Mặt bằng kinh doanh", "cho_o": "Chỗ ở"}
STATUSES = {"available": "Đang sẵn sàng", "urgent": "Đang gấp", "rented": "Đã cho thuê"}
MODERATIONS = {"pending", "approved", "hidden"}
ZALO_PHONE = os.environ.get("ZALO_PHONE", "")
APP_NAME = "pool-local"
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_VIDEO_SIZE = 50 * 1024 * 1024

# ---------------- Object Storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------------- Email (password reset) ----------------
EMAIL_BASE_URL = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME") or "Pool Local"

async def send_password_reset_email(to_email: str, token: str) -> bool:
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    link = f"{base}/dat-lai-mat-khau?token={token}"
    if not EMAIL_KEY or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("Email not configured; password reset link: %s", link)
        else:
            logger.error("Password reset email not configured (EMERGENT_EMAIL_KEY / FRONTEND_URL)")
        return False
    brand = escape(EMAIL_FROM_NAME)
    html = (
        f'<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        f'<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu {brand} của bạn.</p>'
        f'<p><a href="{escape(link)}">Đặt lại mật khẩu</a></p>'
        f'<p>Link có hiệu lực 1 giờ và chỉ dùng 1 lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>'
        f'<p style="font-size:12px;color:#888">Gửi bởi {brand}.</p>'
        f'</td></tr></table>'
    )
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json={"to": [to_email], "subject": f"Đặt lại mật khẩu {EMAIL_FROM_NAME}", "html": html, "from_name": EMAIL_FROM_NAME},
            )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Password reset email failed: {e}")
        return False

# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "email": email, "ver": token_version, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "ver": token_version, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, user: dict):
    ver = user.get("token_version", 0)
    response.set_cookie("access_token", create_access_token(user["id"], user["email"], ver), httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie("refresh_token", create_refresh_token(user["id"], ver), httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def clean_user(user: dict) -> dict:
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="Tài khoản không tồn tại")
        if payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn")
        return clean_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ dành cho admin")
    return user

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ---------------- Models ----------------
class LoginInput(BaseModel):
    email: str
    password: str

class ForgotInput(BaseModel):
    email: str

class ResetInput(BaseModel):
    token: str
    password: str

class ListingInput(BaseModel):
    type: str
    title: str
    price: float
    area_m2: float
    address: str
    district: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: str = ""
    images: List[str] = []
    video: Optional[str] = None
    status: str = "available"
    owner_phone: Optional[str] = None
    contact_note: Optional[str] = None

class ModerationInput(BaseModel):
    moderation: str

class StatusInput(BaseModel):
    status: str

class CtvCreateInput(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None

def validate_listing(data: ListingInput):
    errors = []
    if data.type not in LISTING_TYPES:
        errors.append("Loại sản phẩm không hợp lệ")
    if not data.title.strip():
        errors.append("Thiếu tiêu đề")
    if data.price <= 0:
        errors.append("Giá thuê phải lớn hơn 0")
    if data.area_m2 <= 0:
        errors.append("Diện tích phải lớn hơn 0")
    if not data.address.strip():
        errors.append("Thiếu địa chỉ")
    if data.district not in DISTRICTS:
        errors.append("Khu vực không hợp lệ")
    if not data.images:
        errors.append("Cần ít nhất 1 hình ảnh")
    if data.status not in STATUSES:
        errors.append("Trạng thái không hợp lệ")
    if errors:
        raise HTTPException(status_code=422, detail="; ".join(errors))

# ---------------- Auth endpoints ----------------
@api_router.post("/auth/login")
async def login(data: LoginInput, request: Request, response: Response):
    email = data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    attempts = await db.login_attempts.count_documents({"identifier": identifier, "created_at": {"$gt": cutoff}})
    if attempts >= 5:
        raise HTTPException(status_code=429, detail="Quá nhiều lần thử sai. Vui lòng thử lại sau 15 phút.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.insert_one({"identifier": identifier, "email": email, "created_at": datetime.now(timezone.utc).isoformat()})
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    await db.login_attempts.delete_many({"identifier": identifier})
    set_auth_cookies(response, user)
    return clean_user(user)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Đã đăng xuất"}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Không có refresh token")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user or payload.get("ver", 0) != user.get("token_version", 0):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn")
    response.set_cookie("access_token", create_access_token(user["id"], user["email"], user.get("token_version", 0)), httponly=True, secure=True, samesite="none", max_age=900, path="/")
    return {"message": "ok"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotInput, background_tasks: BackgroundTasks):
    email = data.email.lower().strip()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    recent = await db.password_reset_requests.count_documents({"email": email, "created_at": {"$gt": cutoff}})
    await db.password_reset_requests.insert_one({"email": email, "created_at": datetime.now(timezone.utc).isoformat()})
    generic = {"message": "Nếu email đã đăng ký, link đặt lại mật khẩu đã được gửi."}
    if recent >= 5:
        return generic
    user = await db.users.find_one({"email": email})
    if not user:
        return generic
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(),
        "user_id": user["id"],
        "email": email,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "used": False,
    })
    background_tasks.add_task(send_password_reset_email, user["email"], token)
    return generic

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetInput):
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    record = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": token_hash, "used": False, "expires_at": {"$gt": now}},
        {"$set": {"used": True}},
    )
    if not record:
        raise HTTPException(status_code=400, detail="Link không hợp lệ hoặc đã hết hạn")
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="Mật khẩu tối thiểu 6 ký tự")
    email = record["email"]
    await db.users.update_one(
        {"id": record["user_id"]},
        {"$set": {"password_hash": hash_password(data.password)}, "$inc": {"token_version": 1}},
    )
    await db.password_reset_tokens.delete_many({"email": email, "used": False})
    await db.login_attempts.delete_many({"email": email})
    return {"message": "Đặt lại mật khẩu thành công"}

# ---------------- Public endpoints ----------------
@api_router.get("/")
async def root():
    return {"message": "Pool Local API"}

@api_router.get("/config")
async def public_config():
    return {
        "zalo_phone": ZALO_PHONE,
        "districts": DISTRICTS,
        "types": [{"value": k, "label": v} for k, v in LISTING_TYPES.items()],
        "statuses": [{"value": k, "label": v} for k, v in STATUSES.items()],
    }

@api_router.get("/listings")
async def public_listings(type: Optional[str] = None, district: Optional[str] = None, status: Optional[str] = None, q: Optional[str] = None):
    query = {"moderation": "approved"}
    if type in LISTING_TYPES:
        query["type"] = type
    if district in DISTRICTS:
        query["district"] = district
    if status in STATUSES:
        query["status"] = status
    else:
        query["status"] = {"$ne": "rented"}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    return await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/listings/{listing_id}")
async def public_listing_detail(listing_id: str, request: Request):
    doc = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Tin không tồn tại")
    if doc.get("moderation") != "approved":
        user = await get_optional_user(request)
        if not user or (user["role"] != "admin" and user["id"] != doc.get("owner_id")):
            raise HTTPException(status_code=404, detail="Tin không tồn tại")
    return doc

# ---------------- Upload & files ----------------
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content_type = file.content_type or "application/octet-stream"
    is_image = content_type.startswith("image/")
    is_video = content_type.startswith("video/")
    if not (is_image or is_video):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file ảnh hoặc video")
    data = await file.read()
    limit = MAX_IMAGE_SIZE if is_image else MAX_VIDEO_SIZE
    if len(data) > limit:
        raise HTTPException(status_code=400, detail=f"File vượt quá giới hạn {limit // (1024 * 1024)}MB")
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else ("jpg" if is_image else "mp4")).lower()
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result["size"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "content_type": content_type}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File không tồn tại")
    data, ct = get_object(path)
    return RawResponse(content=data, media_type=record.get("content_type", ct))

# ---------------- Listing endpoints (authenticated) ----------------
@api_router.post("/listings")
async def create_listing(data: ListingInput, user: dict = Depends(get_current_user)):
    validate_listing(data)
    now = datetime.now(timezone.utc).isoformat()
    doc = data.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "moderation": "pending",
        "owner_id": user["id"],
        "owner_name": user.get("name", ""),
        "created_at": now,
        "updated_at": now,
    })
    await db.listings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/my/listings")
async def my_listings(user: dict = Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"owner_id": user["id"]}
    return await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/my/listings/{listing_id}")
async def my_listing_detail(listing_id: str, user: dict = Depends(get_current_user)):
    doc = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Tin không tồn tại")
    if user["role"] != "admin" and doc.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Không có quyền xem tin này")
    return doc

@api_router.put("/listings/{listing_id}")
async def update_listing(listing_id: str, data: ListingInput, user: dict = Depends(get_current_user)):
    doc = await db.listings.find_one({"id": listing_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tin không tồn tại")
    if user["role"] != "admin" and doc.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Không có quyền sửa tin này")
    validate_listing(data)
    update = data.model_dump()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    if user["role"] != "admin":
        update["moderation"] = "pending"
    await db.listings.update_one({"id": listing_id}, {"$set": update})
    return await db.listings.find_one({"id": listing_id}, {"_id": 0})

# ---------------- Admin endpoints ----------------
@api_router.get("/admin/listings")
async def admin_listings(moderation: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(require_admin)):
    query = {}
    if moderation in MODERATIONS:
        query["moderation"] = moderation
    if status in STATUSES:
        query["status"] = status
    return await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    return {
        "pending": await db.listings.count_documents({"moderation": "pending"}),
        "approved": await db.listings.count_documents({"moderation": "approved"}),
        "hidden": await db.listings.count_documents({"moderation": "hidden"}),
        "rented": await db.listings.count_documents({"status": "rented"}),
        "ctv": await db.users.count_documents({"role": "ctv"}),
        "total": await db.listings.count_documents({}),
    }

@api_router.patch("/admin/listings/{listing_id}/moderation")
async def admin_set_moderation(listing_id: str, data: ModerationInput, user: dict = Depends(require_admin)):
    if data.moderation not in MODERATIONS:
        raise HTTPException(status_code=422, detail="Trạng thái duyệt không hợp lệ")
    result = await db.listings.update_one({"id": listing_id}, {"$set": {"moderation": data.moderation, "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tin không tồn tại")
    return {"message": "ok"}

@api_router.patch("/admin/listings/{listing_id}/status")
async def admin_set_status(listing_id: str, data: StatusInput, user: dict = Depends(require_admin)):
    if data.status not in STATUSES:
        raise HTTPException(status_code=422, detail="Trạng thái không hợp lệ")
    result = await db.listings.update_one({"id": listing_id}, {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tin không tồn tại")
    return {"message": "ok"}

@api_router.delete("/admin/listings/{listing_id}")
async def admin_delete_listing(listing_id: str, user: dict = Depends(require_admin)):
    result = await db.listings.delete_one({"id": listing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tin không tồn tại")
    return {"message": "Đã xóa tin"}

@api_router.get("/admin/users")
async def admin_users(user: dict = Depends(require_admin)):
    return await db.users.find({"role": "ctv"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/admin/users")
async def admin_create_user(data: CtvCreateInput, user: dict = Depends(require_admin)):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="Mật khẩu tối thiểu 6 ký tự")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name.strip(),
        "phone": data.phone,
        "role": "ctv",
        "token_version": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return clean_user(doc)

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target or target.get("role") != "ctv":
        raise HTTPException(status_code=404, detail="Cộng tác viên không tồn tại")
    await db.users.delete_one({"id": user_id})
    return {"message": "Đã xóa cộng tác viên"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Seeding ----------------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin Pool Local",
            "role": "admin",
            "token_version": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin account")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Updated admin password")

async def seed_demo_ctv():
    email = "ctv.demo@poollocal.vn"
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password("ctv123456"),
            "name": "CTV Demo",
            "phone": "0909000111",
            "role": "ctv",
            "token_version": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded demo CTV account")

async def seed_listings():
    if await db.listings.count_documents({}) > 0:
        return
    admin = await db.users.find_one({"role": "admin"})
    if not admin:
        return
    now = datetime.now(timezone.utc).isoformat()
    samples = [
        {"type": "mat_bang", "title": "Mặt bằng góc 2 mặt tiền Lái Thiêu, thích hợp cafe/showroom", "price": 25000000, "area_m2": 120, "address": "Đường Lái Thiêu, P. Lái Thiêu", "district": "Thuận An", "lat": 10.9027, "lng": 106.6989, "status": "urgent",
         "description": "Mặt bằng góc 2 mặt tiền đường lớn, khu dân cư đông đúc, gần Lotte Mart Lái Thiêu. Phù hợp mở quán cafe, showroom, cửa hàng tiện lợi. Mặt tiền rộng 8m, có sẵn chỗ đậu xe ô tô.",
         "images": ["https://images.unsplash.com/photo-1690648518721-801b5e290844?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200", "https://images.unsplash.com/photo-1598790193169-5841a2d75d04?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]},
        {"type": "mat_bang", "title": "Mặt bằng thương mại trần cao mặt tiền đường 30/4", "price": 18000000, "area_m2": 85, "address": "Đường 30/4, P. Phú Hòa", "district": "Thủ Dầu Một", "lat": 10.9768, "lng": 106.6722, "status": "available",
         "description": "Mặt bằng trệt trần cao 4.5m, mặt tiền đường 30/4 sầm uất. Thích hợp F&B, spa, văn phòng công ty. Khu vực trung tâm thành phố, đông khách qua lại cả ngày.",
         "images": ["https://images.unsplash.com/photo-1759050486852-fdfe2fdc7bea?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]},
        {"type": "mat_bang", "title": "Kiot F&B setup sẵn gần cổng KCN Sóng Thần 1", "price": 12000000, "area_m2": 60, "address": "Đường D1, KCN Sóng Thần 1", "district": "Dĩ An", "lat": 10.8863, "lng": 106.7624, "status": "available",
         "description": "Kiot đã setup sẵn bếp, quầy bar, hệ thống hút mùi. Ngay cổng khu công nghiệp, lượng công nhân và chuyên gia qua lại cực lớn giờ trưa và tan ca.",
         "images": ["https://images.unsplash.com/photo-1469631423273-6995642a6a40?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]},
        {"type": "cho_o", "title": "Căn hộ dịch vụ full nội thất gần chợ Thủ Dầu Một", "price": 7500000, "area_m2": 45, "address": "P. Phú Cường, TP. Thủ Dầu Một", "district": "Thủ Dầu Một", "lat": 10.9812, "lng": 106.6601, "status": "available",
         "description": "Căn hộ dịch vụ 1 phòng ngủ full nội thất cao cấp: máy lạnh, giường, tủ, bếp. Có thang máy, camera an ninh 24/7, chỗ đậu xe rộng. Vào ở ngay.",
         "images": ["https://images.unsplash.com/photo-1738168246881-40f35f8aba0a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200", "https://images.unsplash.com/photo-1663756915304-40b7eda63e41?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]},
        {"type": "cho_o", "title": "Studio hiện đại cho chuyên gia KCN VSIP 1", "price": 5500000, "area_m2": 32, "address": "Đường Hữu Nghị, P. Bình Hòa", "district": "Thuận An", "lat": 10.9214, "lng": 106.7111, "status": "urgent",
         "description": "Studio thiết kế hiện đại, cửa sổ lớn đón sáng, nội thất mới 100%. Cách KCN VSIP 1 chỉ 5 phút xe máy. Khu an ninh, yên tĩnh, wifi tốc độ cao.",
         "images": ["https://images.unsplash.com/photo-1662454419622-a41092ecd245?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]},
        {"type": "cho_o", "title": "Phòng trọ cao cấp có gác lửng gần ĐH Quốc Gia", "price": 3800000, "area_m2": 28, "address": "P. Đông Hòa, TP. Dĩ An", "district": "Dĩ An", "lat": 10.8708, "lng": 106.8033, "status": "rented",
         "description": "Phòng trọ cao cấp có gác lửng thông minh, máy lạnh, nóng lạnh, giờ giấc tự do. Gần làng Đại học, thuận tiện cho sinh viên và người đi làm.",
         "images": ["https://images.unsplash.com/photo-1628592102751-ba83b0314276?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]},
    ]
    for s in samples:
        doc = {
            **s,
            "id": str(uuid.uuid4()),
            "video": None,
            "owner_phone": None,
            "contact_note": None,
            "moderation": "approved",
            "owner_id": admin["id"],
            "owner_name": admin.get("name", "Admin"),
            "created_at": now,
            "updated_at": now,
        }
        await db.listings.insert_one(doc)
    logger.info("Seeded sample listings")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.login_attempts.create_index("email")
    await db.login_attempts.create_index("identifier")
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=900)
    await db.listings.create_index([("moderation", 1), ("status", 1)])
    await db.listings.create_index("owner_id")
    await seed_admin()
    await seed_demo_ctv()
    await seed_listings()
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
