import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

let configPromise = null;
export function getConfig() {
  if (!configPromise) {
    configPromise = api.get("/config").then((r) => r.data);
  }
  return configPromise;
}

export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API}/files/${path}`;
}

export function formatPrice(v) {
  if (!v && v !== 0) return "";
  if (v >= 1000000) {
    const m = v / 1000000;
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(m)} triệu/tháng`;
  }
  return `${new Intl.NumberFormat("vi-VN").format(v)} đ/tháng`;
}

export const TYPE_LABELS = { mat_bang: "Mặt bằng kinh doanh", cho_o: "Chỗ ở" };
export const STATUS_LABELS = { available: "Đang sẵn sàng", urgent: "Đang gấp", rented: "Đã cho thuê" };
export const MODERATION_LABELS = { pending: "Chờ duyệt", approved: "Đã duyệt", hidden: "Bị ẩn" };

export function buildZaloMessage(listing) {
  const link = `${window.location.origin}/tin/${listing.id}`;
  return `Chào Pool Local, mình sắp chuyển đến Bình Dương và quan tâm tin "${listing.title}" (${listing.district}) - giá ${formatPrice(listing.price)}.\nĐịa chỉ: ${listing.address}\nLink: ${link}\nNhờ bạn tư vấn và dẫn mình đi xem nhé.`;
}

export function zaloLink(phone, message) {
  const p = (phone || "").replace(/\D/g, "");
  return `https://zalo.me/${p}?text=${encodeURIComponent(message)}`;
}

export const ZALO_FALLBACK_PHONE = "0937363434";

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Có lỗi xảy ra, vui lòng thử lại.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
