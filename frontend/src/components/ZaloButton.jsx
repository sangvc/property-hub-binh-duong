import { useEffect, useState } from "react";
import { MessageCircle, Copy, Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { getConfig, zaloLink, buildZaloMessage, ZALO_FALLBACK_PHONE } from "../lib/api";
import { Button } from "./ui/button";

export default function ZaloButton({ listing, size = "default", className = "" }) {
  const [zaloPhone, setZaloPhone] = useState(ZALO_FALLBACK_PHONE);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getConfig().then((c) => setZaloPhone(c.zalo_phone)).catch(() => {});
  }, []);

  const message = buildZaloMessage(listing);

  const copyInfo = async () => {
    try {
      await navigator.clipboard.writeText(`Zalo: ${zaloPhone}\n${message}`);
      setCopied(true);
      toast.success("Đã sao chép nội dung liên hệ");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không sao chép được, vui lòng ghi lại số Zalo: " + zaloPhone);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <a
        href={zaloLink(zaloPhone, message)}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="zalo-contact-button"
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#0068FF] hover:bg-[#0056D6] active:scale-[0.98] text-white font-bold transition-all shadow-lg shadow-blue-600/20 ${
          size === "lg" ? "px-8 py-3.5 text-base" : "px-5 py-2.5 text-sm"
        }`}
      >
        <MessageCircle className={size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
        Liên hệ Zalo ngay
      </a>
      <div className="flex items-center justify-center gap-3 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1" data-testid="zalo-phone-display">
          <Phone className="w-3.5 h-3.5" /> Zalo: {zaloPhone || "..."}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={copyInfo}
          data-testid="zalo-copy-button"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Đã chép" : "Chép nội dung"}
        </Button>
      </div>
    </div>
  );
}
