export default function BetaBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-orange border border-brand-orange/25 leading-none shrink-0 ${className}`}
    >
      Beta
    </span>
  );
}
