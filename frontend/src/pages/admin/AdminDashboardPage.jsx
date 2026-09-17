import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, EyeOff, Eye, Trash2, Pencil, Eye as ViewIcon } from "lucide-react";
import { toast } from "sonner";
import { api, mediaUrl, formatPrice, TYPE_LABELS, MODERATION_LABELS, STATUS_LABELS, formatApiError } from "../../lib/api";
import Header from "../../components/Header";
import StatusBadge from "../../components/StatusBadge";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

const TABS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đang hiển thị" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "", label: "Tất cả" },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [listings, setListings] = useState(null);
  const [stats, setStats] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    const params = tab ? { moderation: tab } : {};
    api.get("/admin/listings", { params }).then((r) => setListings(r.data)).catch(() => setListings([]));
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  };

  useEffect(load, [tab]);

  const setModeration = async (id, moderation) => {
    try {
      await api.patch(`/admin/listings/${id}/moderation`, { moderation });
      toast.success(moderation === "approved" ? "Đã duyệt tin" : moderation === "hidden" ? "Đã ẩn tin" : "Đã chuyển về chờ duyệt");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/listings/${id}/status`, { status });
      toast.success(`Đã đổi sang "${STATUS_LABELS[status]}"`);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/admin/listings/${deleteTarget}`);
      toast.success("Đã xóa tin");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 rise-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Quản trị tin đăng</h1>
            <p className="text-sm text-stone-500 mt-1">Duyệt, chỉnh sửa, ẩn/xóa và đổi trạng thái tin</p>
          </div>
          <Button
            onClick={() => navigate("/admin/cong-tac-vien")}
            variant="outline"
            className="rounded-full"
            data-testid="goto-users-button"
          >
            Cộng tác viên
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-testid="admin-stats">
            {[
              { label: "Chờ duyệt", value: stats.pending, color: "text-amber-700" },
              { label: "Đang hiển thị", value: stats.approved, color: "text-emerald-700" },
              { label: "Đã ẩn", value: stats.hidden, color: "text-stone-500" },
              { label: "Đã cho thuê", value: stats.rented, color: "text-[#E05A47]" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{s.label}</p>
                <p className={`text-2xl font-black font-mono ${s.color}`} data-testid={`stat-${s.label}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-5" data-testid="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setListings(null); }}
              data-testid={`admin-tab-${t.value || "all"}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold border transition-colors ${
                tab === t.value ? "bg-[#1C1917] text-white border-[#1C1917]" : "bg-white text-stone-600 border-stone-200"
              }`}
            >
              {t.label}
              {t.value === "pending" && stats?.pending ? ` (${stats.pending})` : ""}
            </button>
          ))}
        </div>

        {listings === null ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#E05A47]" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-300 text-stone-500" data-testid="admin-empty">
            Không có tin nào trong mục này
          </div>
        ) : (
          <div className="space-y-3" data-testid="admin-listings-list">
            {listings.map((l) => (
              <div key={l.id} data-testid={`admin-listing-row-${l.id}`} className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="flex gap-3.5 items-start">
                  <div className="w-24 h-18 sm:w-32 sm:h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0 aspect-[4/3]">
                    {l.images?.[0] && <img src={mediaUrl(l.images[0])} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="rounded-full bg-stone-900 text-white text-[10px] font-semibold px-2 py-0.5">{TYPE_LABELS[l.type]}</span>
                      <StatusBadge status={l.status} />
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">{MODERATION_LABELS[l.moderation]}</span>
                    </div>
                    <p className="font-bold text-sm leading-snug">{l.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {l.district} · <span className="font-semibold text-[#E05A47]">{formatPrice(l.price)}</span> · {l.area_m2} m² · Đăng bởi {l.owner_name || "CTV"}
                    </p>
                    {(l.owner_phone || l.contact_note) && (
                      <p className="text-xs text-stone-400 mt-1">
                        {l.owner_phone && `SĐT: ${l.owner_phone}`} {l.contact_note && `· ${l.contact_note}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100">
                  {l.moderation !== "approved" && (
                    <Button size="sm" className="h-8 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white gap-1 text-xs" onClick={() => setModeration(l.id, "approved")} data-testid={`approve-${l.id}`}>
                      <Check className="w-3.5 h-3.5" /> Duyệt
                    </Button>
                  )}
                  {l.moderation !== "hidden" && (
                    <Button size="sm" variant="outline" className="h-8 rounded-full gap-1 text-xs" onClick={() => setModeration(l.id, "hidden")} data-testid={`hide-${l.id}`}>
                      <EyeOff className="w-3.5 h-3.5" /> Ẩn
                    </Button>
                  )}
                  {l.moderation === "hidden" && (
                    <Button size="sm" variant="outline" className="h-8 rounded-full gap-1 text-xs" onClick={() => setModeration(l.id, "approved")} data-testid={`unhide-${l.id}`}>
                      <Eye className="w-3.5 h-3.5" /> Hiện lại
                    </Button>
                  )}
                  <select
                    value={l.status}
                    onChange={(e) => setStatus(l.id, e.target.value)}
                    data-testid={`status-select-${l.id}`}
                    className="h-8 rounded-full border border-stone-200 bg-white text-xs font-semibold px-2.5 focus:outline-none"
                  >
                    {Object.entries(STATUS_LABELS).map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" className="h-8 rounded-full gap-1 text-xs" onClick={() => navigate(`/admin/sua-tin/${l.id}`)} data-testid={`edit-${l.id}`}>
                    <Pencil className="w-3.5 h-3.5" /> Sửa
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-full gap-1 text-xs" onClick={() => navigate(`/tin/${l.id}`)} data-testid={`preview-${l.id}`}>
                    <ViewIcon className="w-3.5 h-3.5" /> Xem
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-full gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto" onClick={() => setDeleteTarget(l.id)} data-testid={`delete-${l.id}`}>
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tin này?</AlertDialogTitle>
            <AlertDialogDescription>Hành động không thể hoàn tác. Tin sẽ bị xóa vĩnh viễn khỏi hệ thống.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" data-testid="delete-confirm">
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
