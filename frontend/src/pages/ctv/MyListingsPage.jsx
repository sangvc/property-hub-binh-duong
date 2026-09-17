import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle, Pencil, Eye, Loader2, ImageOff } from "lucide-react";
import { api, mediaUrl, formatPrice, TYPE_LABELS, MODERATION_LABELS } from "../../lib/api";
import Header from "../../components/Header";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";

const MOD_STYLES = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  hidden: "bg-stone-100 text-stone-500 border-stone-200",
};

export default function MyListingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState(null);

  useEffect(() => {
    api.get("/my/listings").then((r) => setListings(r.data)).catch(() => setListings([]));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 rise-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tin của tôi</h1>
            <p className="text-sm text-stone-500 mt-1">Theo dõi trạng thái duyệt và chỉnh sửa tin đã đăng</p>
          </div>
          <Button
            onClick={() => navigate("/ctv/tao-tin")}
            className="rounded-full bg-[#E05A47] hover:bg-[#C94635] text-white font-bold gap-1.5"
            data-testid="create-listing-button"
          >
            <PlusCircle className="w-4 h-4" /> Đăng tin
          </Button>
        </div>

        {listings === null ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#E05A47]" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-stone-300" data-testid="my-listings-empty">
            <ImageOff className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="font-bold text-stone-700">Bạn chưa có tin nào</p>
            <p className="text-sm text-stone-500 mt-1 mb-4">Đăng tin đầu tiên ngay trên điện thoại, chỉ mất 2 phút</p>
            <Button
              onClick={() => navigate("/ctv/tao-tin")}
              className="rounded-full bg-[#E05A47] hover:bg-[#C94635] text-white font-bold"
              data-testid="empty-create-listing-button"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Đăng tin mới
            </Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="my-listings-list">
            {listings.map((l) => (
              <div
                key={l.id}
                data-testid={`my-listing-row-${l.id}`}
                className="bg-white rounded-2xl border border-stone-200 p-3.5 flex gap-3.5 items-center"
              >
                <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  {l.images?.[0] && <img src={mediaUrl(l.images[0])} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${MOD_STYLES[l.moderation]}`} data-testid={`moderation-badge-${l.id}`}>
                      {MODERATION_LABELS[l.moderation]}
                    </span>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="font-bold text-sm leading-snug line-clamp-1">{l.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {TYPE_LABELS[l.type]} · {l.district} · <span className="font-semibold text-[#E05A47]">{formatPrice(l.price)}</span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                  {l.moderation === "approved" && (
                    <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => navigate(`/tin/${l.id}`)} data-testid={`view-listing-${l.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full gap-1"
                    onClick={() => navigate(`/ctv/sua-tin/${l.id}`)}
                    data-testid={`edit-listing-${l.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Sửa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {user?.role === "ctv" && (
          <p className="text-xs text-stone-400 mt-6 text-center">
            Tin sau khi đăng hoặc sửa sẽ chuyển sang trạng thái "Chờ duyệt" trước khi hiển thị công khai.
          </p>
        )}
      </main>
    </div>
  );
}
