import { Link } from "react-router-dom";
import { Ruler, MapPin } from "lucide-react";
import { mediaUrl, formatPrice, TYPE_LABELS } from "../lib/api";
import StatusBadge from "./StatusBadge";

const TYPE_FRIENDLY = {
  mat_bang: "Sẵn sàng để bạn khai trương",
  cho_o: "Gọn gàng cho ngày đầu chuyển về",
};

export default function ListingCard({ listing }) {
  const img = listing.images?.[0];
  return (
    <Link
      to={`/tin/${listing.id}`}
      data-testid={`listing-card-${listing.id}`}
      className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl hover:shadow-stone-900/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {img ? (
          <img
            src={mediaUrl(img)}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">Chưa có ảnh</div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-stone-900/80 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1">
            {TYPE_LABELS[listing.type]}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge status={listing.status} />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold leading-snug text-[15px] line-clamp-2 group-hover:text-[#E05A47] transition-colors">
          {listing.title}
        </h3>
        <p className="text-xs text-[#0F5132] font-medium">{TYPE_FRIENDLY[listing.type]}</p>
        <p className="text-xs text-stone-500 flex items-center gap-1 line-clamp-1">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {listing.address}, {listing.district}
        </p>
        <div className="mt-auto pt-2 flex items-end justify-between border-t border-stone-100">
          <span className="text-lg font-black text-[#E05A47] font-mono tracking-tight" data-testid="listing-price">
            {formatPrice(listing.price)}
          </span>
          <span className="text-xs font-semibold text-stone-600 inline-flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5" />
            {listing.area_m2} m²
          </span>
        </div>
      </div>
    </Link>
  );
}
