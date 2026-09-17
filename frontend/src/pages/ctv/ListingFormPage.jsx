import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Loader2, UploadCloud, X, MapPin, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { api, mediaUrl, formatApiError, getConfig, TYPE_LABELS, STATUS_LABELS } from "../../lib/api";
import Header from "../../components/Header";
import MapPicker from "../../components/MapPicker";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

const EMPTY = {
  type: "mat_bang",
  title: "",
  priceTrieu: "",
  area_m2: "",
  address: "",
  district: "Thuận An",
  lat: null,
  lng: null,
  description: "",
  images: [],
  video: "",
  videoUrl: "",
  status: "available",
  owner_phone: "",
  contact_note: "",
};

export default function ListingFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [districts, setDistricts] = useState(["Thuận An", "Thủ Dầu Một", "Dĩ An"]);
  const [uploading, setUploading] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    getConfig().then((c) => setDistricts(c.districts)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/my/listings/${id}`)
      .then((r) => {
        const l = r.data;
        setForm({
          type: l.type,
          title: l.title,
          priceTrieu: l.price ? String(l.price / 1000000) : "",
          area_m2: String(l.area_m2 || ""),
          address: l.address,
          district: l.district,
          lat: l.lat,
          lng: l.lng,
          description: l.description || "",
          images: l.images || [],
          video: l.video && !l.video.startsWith("http") ? l.video : "",
          videoUrl: l.video && l.video.startsWith("http") ? l.video : "",
          status: l.status,
          owner_phone: l.owner_phone || "",
          contact_note: l.contact_note || "",
        });
        setLoaded(true);
      })
      .catch((err) => {
        toast.error(formatApiError(err));
        navigate(user?.role === "admin" ? "/admin" : "/ctv");
      });
  }, [id, isEdit, navigate, user]);

  const uploadImages = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(list.length);
    for (const file of list) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await api.post("/upload", fd);
        setForm((f) => ({ ...f, images: [...f.images, data.path] }));
      } catch (err) {
        toast.error(formatApiError(err));
      }
      setUploading((n) => n - 1);
    }
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd);
      set("video", data.path);
      set("videoUrl", "");
      toast.success("Đã tải video lên");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploadingVideo(false);
    }
  };

  const geocodeAddress = async () => {
    if (!form.address.trim()) {
      toast.error("Nhập địa chỉ trước khi tìm vị trí");
      return;
    }
    setGeocoding(true);
    try {
      const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { format: "json", q: `${form.address}, ${form.district}, Bình Dương, Việt Nam`, limit: 1, countrycodes: "vn" },
      });
      if (data.length) {
        set("lat", parseFloat(data[0].lat));
        set("lng", parseFloat(data[0].lon));
        toast.success("Đã tìm thấy vị trí, kiểm tra lại ghim trên bản đồ");
      } else {
        toast.error("Không tìm thấy vị trí, hãy chạm trực tiếp lên bản đồ");
      }
    } catch {
      toast.error("Lỗi tìm vị trí, hãy chạm trực tiếp lên bản đồ");
    } finally {
      setGeocoding(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.images.length) {
      toast.error("Cần ít nhất 1 hình ảnh trước khi gửi tin");
      return;
    }
    if (!parseFloat(form.priceTrieu) || !parseFloat(form.area_m2)) {
      toast.error("Vui lòng nhập giá thuê và diện tích hợp lệ");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        price: Math.round(parseFloat(form.priceTrieu || "0") * 1000000),
        area_m2: parseFloat(form.area_m2 || "0"),
        address: form.address.trim(),
        district: form.district,
        lat: form.lat,
        lng: form.lng,
        description: form.description,
        images: form.images,
        video: form.video || form.videoUrl.trim() || null,
        status: form.status,
        owner_phone: form.owner_phone.trim() || null,
        contact_note: form.contact_note.trim() || null,
      };
      if (isEdit) {
        await api.put(`/listings/${id}`, payload);
        toast.success(user?.role === "admin" ? "Đã cập nhật tin" : "Đã cập nhật, tin chuyển sang chờ duyệt lại");
      } else {
        await api.post("/listings", payload);
        toast.success("Đã gửi tin, chờ admin duyệt");
      }
      navigate(user?.role === "admin" ? "/admin" : "/ctv");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E05A47]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 rise-in">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1" data-testid="form-title">
          {isEdit ? "Chỉnh sửa tin" : "Đăng tin mới"}
        </h1>
        <p className="text-sm text-stone-500 mb-6">Điền đủ các trường bắt buộc (*) để tin được duyệt nhanh</p>

        <form onSubmit={submit} className="space-y-6">
          {/* Loại sản phẩm */}
          <div>
            <Label className="mb-2 block">Loại sản phẩm *</Label>
            <div className="grid grid-cols-2 gap-2" data-testid="form-type-group">
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => set("type", value)}
                  data-testid={`form-type-${value}`}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors ${
                    form.type === value
                      ? "border-[#E05A47] bg-[#FFF1EE] text-[#C94635]"
                      : "border-stone-200 bg-white text-stone-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tiêu đề */}
          <div className="space-y-1.5">
            <Label htmlFor="f-title">Tiêu đề tin *</Label>
            <Input
              id="f-title"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="VD: Mặt bằng mặt tiền Lái Thiêu 120m², giá 25 triệu"
              data-testid="form-title-input"
            />
          </div>

          {/* Khu vực */}
          <div>
            <Label className="mb-2 block">Khu vực *</Label>
            <div className="flex gap-2 flex-wrap" data-testid="form-district-group">
              {districts.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => set("district", d)}
                  data-testid={`form-district-${d}`}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    form.district === d
                      ? "bg-[#E05A47] text-white border-[#E05A47]"
                      : "bg-white text-stone-600 border-stone-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Địa chỉ + geocode */}
          <div className="space-y-1.5">
            <Label htmlFor="f-address">Địa chỉ cụ thể *</Label>
            <div className="flex gap-2">
              <Input
                id="f-address"
                required
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="VD: 123 Đường Lái Thiêu, P. Lái Thiêu"
                data-testid="form-address-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={geocodeAddress}
                disabled={geocoding}
                className="shrink-0 gap-1.5"
                data-testid="geocode-button"
              >
                {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                <span className="hidden sm:inline">Tìm vị trí</span>
              </Button>
            </div>
          </div>

          {/* Map */}
          <div>
            <Label className="mb-2 block flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Ghim vị trí trên bản đồ (chạm vào bản đồ để chọn)
            </Label>
            <MapPicker lat={form.lat} lng={form.lng} onPick={(lat, lng) => { set("lat", lat); set("lng", lng); }} />
            {form.lat && form.lng && (
              <p className="text-xs text-stone-500 mt-1.5" data-testid="picked-coords">
                Đã ghim: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Giá & diện tích */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-price">Giá thuê (triệu/tháng) *</Label>
              <Input
                id="f-price"
                type="number"
                min="0"
                step="0.1"
                required
                value={form.priceTrieu}
                onChange={(e) => set("priceTrieu", e.target.value)}
                placeholder="VD: 12.5"
                data-testid="form-price-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-area">Diện tích (m²) *</Label>
              <Input
                id="f-area"
                type="number"
                min="0"
                required
                value={form.area_m2}
                onChange={(e) => set("area_m2", e.target.value)}
                placeholder="VD: 85"
                data-testid="form-area-input"
              />
            </div>
          </div>

          {/* Trạng thái */}
          <div>
            <Label className="mb-2 block">Tình trạng *</Label>
            <div className="flex gap-2 flex-wrap" data-testid="form-status-group">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => set("status", value)}
                  data-testid={`form-status-${value}`}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    form.status === value
                      ? "bg-[#0F5132] text-white border-[#0F5132]"
                      : "bg-white text-stone-600 border-stone-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ảnh */}
          <div>
            <Label className="mb-2 block">Hình ảnh * (tối đa 10MB/ảnh)</Label>
            <div className="grid grid-cols-3 gap-2" data-testid="image-preview-grid">
              {form.images.map((img, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 group">
                  <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                    data-testid={`remove-image-${i}`}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-stone-900/70 text-white flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                data-testid="upload-image-button"
                className="aspect-[4/3] rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-1 text-stone-400 hover:border-[#E05A47] hover:text-[#E05A47] transition-colors"
              >
                {uploading > 0 ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                <span className="text-[11px] font-semibold">{uploading > 0 ? `Đang tải ${uploading}...` : "Thêm ảnh"}</span>
              </button>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { uploadImages(e.target.files); e.target.value = ""; }}
              data-testid="image-file-input"
            />
          </div>

          {/* Video */}
          <div className="space-y-2">
            <Label>Video (không bắt buộc, tối đa 50MB)</Label>
            {form.video ? (
              <div className="relative rounded-lg overflow-hidden border border-stone-200">
                <video src={mediaUrl(form.video)} controls className="w-full max-h-48" data-testid="video-preview" />
                <button
                  type="button"
                  onClick={() => set("video", "")}
                  data-testid="remove-video-button"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-stone-900/70 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={form.videoUrl}
                  onChange={(e) => set("videoUrl", e.target.value)}
                  placeholder="Hoặc dán link YouTube..."
                  data-testid="form-video-url-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="shrink-0 gap-1.5"
                  data-testid="upload-video-button"
                >
                  {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span className="hidden sm:inline">Tải video</span>
                </Button>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { uploadVideo(e.target.files?.[0]); e.target.value = ""; }}
              data-testid="video-file-input"
            />
          </div>

          {/* Mô tả */}
          <div className="space-y-1.5">
            <Label htmlFor="f-desc">Mô tả chi tiết</Label>
            <Textarea
              id="f-desc"
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Tiện ích, hướng, phù hợp kinh doanh gì, thời gian xem nhà..."
              data-testid="form-description-input"
            />
          </div>

          {/* Liên hệ nội bộ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-phone">SĐT chủ nhà/người liên hệ</Label>
              <Input
                id="f-phone"
                value={form.owner_phone}
                onChange={(e) => set("owner_phone", e.target.value)}
                placeholder="Chỉ admin thấy"
                data-testid="form-owner-phone-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-note">Ghi chú cho admin</Label>
              <Input
                id="f-note"
                value={form.contact_note}
                onChange={(e) => set("contact_note", e.target.value)}
                placeholder="VD: Liên hệ sau 5h chiều"
                data-testid="form-contact-note-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || uploading > 0}
            className="w-full rounded-full bg-[#E05A47] hover:bg-[#C94635] text-white font-bold py-6 text-base"
            data-testid="form-submit-button"
          >
            {submitting && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Gửi tin chờ duyệt"}
          </Button>
        </form>
      </main>
    </div>
  );
}
