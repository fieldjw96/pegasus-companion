/**
 * The header that sits over every screen.
 *
 * Two variants, both from the screenshots: translucent over the home hero, and a
 * solid grey bar once the home screen scrolls. The flights screens use a solid
 * yellow bar with a title instead, which is `FlightsHeader` below.
 *
 * The BolBol pill alternates between "0 BolPoints" and "0/15 Pins" in the real
 * app, so `meta` is a prop rather than a constant.
 */
export function BolBolHeader({
  meta = "0 BolPoints",
  variant = "overlay",
}: {
  meta?: string;
  variant?: "overlay" | "solid";
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 ${
        variant === "solid" ? "bg-pg-header" : ""
      }`}
    >
      <span className="wordmark text-[22px] text-white">PEGASUS</span>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full bg-white/25 py-1 pr-3 pl-1 backdrop-blur">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDEBCB] text-[9px] leading-[1.05] font-black text-pg-orange">
            BOL
            <br />
            BOL
          </span>
          <span className="text-[13px] leading-tight text-white">
            Welcome, <strong className="font-bold">JACK</strong>
            <span className="block text-[12px] opacity-95">{meta}</span>
          </span>
        </div>
        <span className="relative">
          <BellIcon />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-pg-orange" />
        </span>
      </div>
    </div>
  );
}

/** The amber bar used on every screen after search: back, title, action. */
export function FlightsHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
      <span className="text-[22px] leading-none text-pg-navy">←</span>
      <h1 className="text-[17px] font-bold tracking-tight text-pg-navy">{title}</h1>
      <span className="flex h-8 w-8 items-center justify-center">{action ?? null}</span>
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="h-7 w-7">
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}
