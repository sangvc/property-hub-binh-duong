# Pool Local – PRD

## Problem statement (gốc)
Web app listing mặt bằng kinh doanh và chỗ ở cho thuê tại Bình Dương. Khách xem/lọc tin theo khu vực và liên hệ Zalo trung tâm (0877149002) với nội dung quote sẵn từng tin. CTV đăng tin nhanh từ điện thoại, admin duyệt trước khi public. Catalog điều phối thủ công qua Zalo, không phải marketplace.

## User personas
- **Người đi thuê**: xem danh sách, lọc theo loại/khu vực/trạng thái, xem chi tiết (ảnh, video, giá, diện tích, địa chỉ, map), nhắn Zalo trung tâm.
- **Cộng tác viên (CTV)**: đăng nhập, tạo/sửa tin (ảnh, video, ghim map), theo dõi trạng thái duyệt.
- **Admin**: duyệt/ẩn/xóa/sửa tin, đổi trạng thái (sẵn sàng/gấp/đã thuê), quản lý tài khoản CTV, điều phối khách qua Zalo.

## Architecture
- Frontend: React (CRA + craco) + Tailwind + shadcn/ui + react-leaflet (OpenStreetMap), react-router-dom v7, axios withCredentials, sonner toasts.
- Backend: FastAPI + Motor (MongoDB), JWT httpOnly cookie auth (access 15m + refresh 7d), bcrypt, brute-force lockout, password reset qua Emergent email proxy.
- Storage: Emergent Object Storage (ảnh/video, prefix `pool-local/`, serve qua `/api/files/{path}`, soft-delete trong DB).
- Zalo: deep link `https://zalo.me/0877149002?text=...` với nội dung quote tên tin + địa chỉ + link; fallback hiển thị số + nút copy.

## Đã implement (2026-09-15)
- Auth đầy đủ: login/logout/me/refresh/forgot/reset password, seed admin (sang.vucao@gmail.com) + demo CTV (ctv.demo@poollocal.vn / ctv123456), quên mật khẩu qua email.
- Public: trang chủ listing-first với bộ lọc loại/khu vực/trạng thái + tìm kiếm; trang chi tiết (gallery, video YouTube/upload, Leaflet map, nút Zalo); tin "đã cho thuê" loại khỏi danh sách mặc định.
- CTV: dashboard tin của tôi, form đăng/sửa tin tối ưu mobile (upload nhiều ảnh ≤10MB, video ≤50MB hoặc link YouTube, geocode địa chỉ qua Nominatim + chạm ghim map), validate trường bắt buộc, sửa tin → chờ duyệt lại.
- Admin: dashboard duyệt tin theo tab (chờ duyệt/đang hiển thị/đã ẩn/tất cả), thống kê, duyệt/ẩn/hiện/xóa, đổi trạng thái nhanh, sửa tin; trang quản lý CTV (tạo/xóa tài khoản).
- Seed 6 tin mẫu cho 3 khu vực: Thuận An, Thủ Dầu Một, Dĩ An.

## Backlog
### P0
- (Hoàn tất trong MVP)

### P1
- Thống kê lượt xem / lượt nhấn Zalo theo tin
- Form khách gửi nhu cầu thuê khi chưa tìm được tin phù hợp
- SEO meta/OG tags cho từng trang chi tiết (hiện mới có document.title)

### P2
- Lưu tin yêu thích (localStorage)
- Landing page theo từng khu vực
- Gợi ý tin tương tự theo khu vực + mức giá
- Nén ảnh đầu vào phía client

## Next tasks
- Chờ kết quả testing agent vòng 1 và fix lỗi nếu có
- Người dùng kiểm tra luồng Zalo trên điện thoại thật
