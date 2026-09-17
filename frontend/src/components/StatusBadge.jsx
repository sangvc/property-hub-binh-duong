import { STATUS_LABELS } from "../lib/api";

const STYLES = {
  available: "bg-emerald-50 text-emerald-800 border-emerald-200",
  urgent: "bg-amber-50 text-amber-900 border-amber-200",
  rented: "bg-stone-100 text-stone-500 border-stone-200",
};

const DOTS = {
  available: "bg-emerald-500",
  urgent: "bg-amber-500 animate-pulse",
  rented: "bg-stone-400",
};

export default function StatusBadge({ status, className = "" }) {
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] || STYLES.available} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOTS[status] || DOTS.available}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
