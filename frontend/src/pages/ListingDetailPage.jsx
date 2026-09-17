import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, MapPin, Ruler, Home, Loader2 } from "lucide-react";
import { api, mediaUrl, formatPrice, TYPE_LABELS } from "../lib/api";
import Header from "../components/Header";
import StatusBadge from "../components/StatusBadge";
import ZaloButton from "../components/ZaloButton";
import { MapView } from "../components/MapPicker";

function YoutubeEmbed({ url }) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (!match) return null;
  return (
    <div className="aspect-video rounded-xl overflow-hidden border border-stone-200">
      <iframe
        src={`https://www.youtube.com/embed/${match[1]}`}
        title="Video"
        className="w-full h-full"
        allowFullScreen
        data-testid="video-embed"
      />
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    setListing(null);
    setNotFound(false);
    api
      .get(`/listings/${id}`)
      .then((r) => setListing(r.data))
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    if (listing) document.title = `${listing.title} | Pool Local`;
    return () => {
      document.title = "Pool Local";
    };
  }, [listing]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800 mb-4"
          data-testid="back-to-listings"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        {notFound ? (
          <div className="text-center py-24" data-testid="listing-not-found">
            <p className="font-bold text-xl text-stone-700">Tin không tồn tại hoặc chưa được duyệt</p>
            <Link to="/" className="text-[#E05A47] font-semibold text-sm mt-2 inline-block">
              Xem các tin khác
            </Link>
          </div>
        ) : !listing ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#E05A47]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 rise-in">
            {/* Media */}
            <div className="lg:col-span-3 space-y-3">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                {listing.images?.length ? (
                  <img
                    src={mediaUrl(listing.images[activeImg] || listing.images[0])}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    data-testid="detail-main-image"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">Chưa có ảnh</div>
                )}
              </div>
              {listing.images?.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none" data-testid="image-thumbnails">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      data-testid={`thumbnail-${i}`}
                      className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === activeImg ? "border-[#E05A47]" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {listing.video &&
                (listing.video.includes("youtube") || listing.video.includes("youtu.be") ? (
                  <YoutubeEmbed url={listing.video} />
                ) : (
                  <video
                    controls
                    src={mediaUrl(listing.video)}
                    className="w-full rounded-xl border border-stone-200"
                    data-testid="video-player"
                  />
                ))}
              {listing.lat && listing.lng && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-2">Vị trí</h2>
                  <MapView lat={listing.lat} lng={listing.lng} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-stone-900 text-white text-[11px] font-semibold px-2.5 py-1 inline-flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  {TYPE_LABELS[listing.type]}
                </span>
                <StatusBadge status={listing.status} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight" data-testid="detail-title">
                {listing.title}
              </h1>
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Giá thuê</p>
                    <p className="text-2xl font-black text-[#E05A47] font-mono tracking-tight" data-testid="detail-price">
                      {formatPrice(listing.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Diện tích</p>
                    <p className="text-lg font-bold inline-flex items-center gap-1" data-testid="detail-area">
                      <Ruler className="w-4 h-4" /> {listing.area_m2} m²
                    </p>
                  </div>
                </div>
                <div className="border-t border-stone-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Địa chỉ</p>
                  <p className="text-sm font-medium flex items-start gap-1.5" data-testid="detail-address">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#E05A47]" />
                    {listing.address}, {listing.district}, Bình Dương
                  </p>
                </div>
              </div>

              <ZaloButton listing={listing} size="lg" />

              {listing.description && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-2">Mô tả chi tiết</h2>
                  <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-line" data-testid="detail-description">
                    {listing.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
