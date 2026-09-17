import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Building2, Home, LayoutGrid, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import ListingCard from "../components/ListingCard";
import Header from "../components/Header";

const TYPE_TABS = [
  { value: "", label: "Tất cả", icon: LayoutGrid },
  { value: "mat_bang", label: "Mặt bằng kinh doanh", icon: Building2 },
  { value: "cho_o", label: "Chỗ ở", icon: Home },
];

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const type = searchParams.get("type") || "";
  const q = searchParams.get("q") || "";

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (type) params.type = type;
    if (q) params.q = q;
    api
      .get("/listings", { params })
      .then((r) => setListings(r.data))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [type, q]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const urgentCount = useMemo(() => listings.filter((l) => l.status === "urgent").length, [listings]);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-5 rise-in">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#E05A47] mb-2">
          Chào mừng bạn đến Bình Dương
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
          Mới chuyển về hay mở thêm chi nhánh?{" "}
          <span className="text-[#E05A47]">Tụi mình lo chỗ cho bạn.</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-stone-500 max-w-xl leading-relaxed">
          Không cần mất công dò hỏi nơi xa lạ — tụi mình đã chọn sẵn những chỗ ở và mặt bằng đáng tin nhất tại Thuận
          An, Thủ Dầu Một và Dĩ An. Xem ảnh thật, giá rõ ràng, nhắn Zalo là được dẫn đi xem ngay trong ngày.
        </p>

        <div className="mt-6 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", e.target.value.trim());
            }}
            placeholder="Gõ tên đường hoặc khu bạn sắp đến... rồi Enter"
            data-testid="search-input"
            className="w-full rounded-full border border-stone-200 bg-white pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]/40 focus:border-[#E05A47]"
          />
        </div>
      </section>

      {/* Sticky type filter */}
      <div className="sticky top-[68px] z-40 bg-[#FAF9F6]/95 backdrop-blur-xl border-y border-stone-200/80 rise-in rise-in-delay-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none" data-testid="type-filter">
            {TYPE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setParam("type", t.value)}
                data-testid={`type-tab-${t.value || "all"}`}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                  type === t.value
                    ? "bg-[#1C1917] text-white border-[#1C1917]"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listing grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-stone-500" data-testid="listing-count">
            {loading
              ? "Đang tìm chỗ cho bạn..."
              : `Có ${listings.length} lựa chọn đang chờ bạn${urgentCount ? ` · ${urgentCount} tin đang cần gấp` : ""}`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24" data-testid="listing-loading">
            <Loader2 className="w-8 h-8 animate-spin text-[#E05A47]" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24 text-stone-500" data-testid="listing-empty">
            <p className="font-bold text-lg text-stone-700 mb-1">Chưa có tin đúng ý bạn lúc này</p>
            <p className="text-sm max-w-md mx-auto">
              Đừng lo — nhắn Zalo cho tụi mình, nói bạn cần gì và ở khu nào. Đội ngũ địa phương sẽ lùng giúp bạn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6" data-testid="listing-grid">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-stone-400 leading-relaxed">
          POOL LOCAL · Người bạn địa phương đầu tiên của bạn tại Bình Dương
          <br />
          Nhắn Zalo là được đồng hành đi xem — không môi giới chèn ép, không phí ẩn.
        </div>
      </footer>
    </div>
  );
}
