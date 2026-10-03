import { SearchForm } from "@/components/search-form";
import { BolBolHeader } from "@/components/bolbol-header";

/**
 * Home.
 *
 * Matched to the live app: a destination-collage hero with the seasonal overlay,
 * the search card overlapping it, then the BolBol Extra card and the row of
 * secondary entry points.
 *
 * The hero images are CSS gradients standing in for photography. Shipping real
 * destination photos would mean shipping someone's copyrighted images into a
 * mock, which is not worth it for a prototype.
 */
const HERO_TILES = [
  "from-[#7FA8C9] to-[#C98A4B]",
  "from-[#8CA9C4] to-[#3F5A74]",
  "from-[#9DB98C] to-[#C9A24B]",
  "from-[#D9B45B] to-[#8A6A2F]",
  "from-[#A8B8C8] to-[#5C7083]",
  "from-[#C9A878] to-[#7E5F3A]",
  "from-[#6E93B3] to-[#2E4A63]",
  "from-[#A3BE8C] to-[#5E7B52]",
  "from-[#C98A6B] to-[#7A4A33]",
];

export default function HomeScreen() {
  return (
    <>
      <div className="relative">
        <div className="grid h-[300px] grid-cols-3 grid-rows-3">
          {HERO_TILES.map((tile, i) => (
            <div key={i} className={`bg-gradient-to-br ${tile}`} />
          ))}
        </div>

        <div className="absolute inset-x-0 top-0">
          <BolBolHeader meta="0 BolPoints" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[13px] font-extrabold tracking-wide text-white uppercase drop-shadow">
            Ready for your
          </p>
          <p className="-mt-1 text-[42px] leading-[0.95] font-bold text-pg-yellow italic drop-shadow">
            autumn
          </p>
          <p className="text-[34px] leading-tight font-bold text-pg-yellow italic drop-shadow">
            trip?
          </p>
        </div>

        <div className="absolute bottom-2 left-4 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1 rounded-full ${i === 0 ? "w-5 bg-white" : "w-2 bg-white/50"}`}
            />
          ))}
        </div>
      </div>

      <div className="-mt-6 px-3">
        <SearchForm />
      </div>

      <div className="mt-3 px-3">
        <Row
          icon={<span className="text-[20px]">📍</span>}
          top="Plan Your Trip"
          bottom="Based on Your Style and Budget!"
        />
      </div>

      <div className="mt-3 px-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-pg-line">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-bold">BolBol Extra</p>
            <span className="rounded-full bg-pg-yellow/25 px-2.5 py-1 text-[13px] font-bold text-pg-navy">
              0 | 15 Pins
            </span>
            <span className="ml-auto rounded-full bg-pg-orange px-3 py-1 text-[12px] font-bold text-white">
              New
            </span>
          </div>
          <p className="mt-2 text-[14px]">
            <strong>JACK</strong>, Collect 15 Pins to Use Your Advantages 🚀
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["🎫", "Free Cancellation Option"],
              ["🧳", "50% Discount on Baggage Purchases"],
              ["🅱️", "Earn x2 BolPoints"],
            ].map(([icon, label]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-pg-surface text-[20px]">
                  {icon}
                  <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#FBD5B5] text-[10px]">
                    🔒
                  </span>
                </span>
                <span className="text-[11px] leading-tight text-pg-navy">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3 px-3 pb-6">
        <Row
          icon={<span className="text-[20px]">💬</span>}
          top="For all your questions and needs"
          bottom="Pegasus Assistant"
        />
        <Row
          icon={<span className="text-[20px]">➕</span>}
          top="Fly Better with"
          bottom="Additional Services"
        />
        <Row
          icon={<span className="text-[20px]">🌍</span>}
          top="With Pegasus"
          bottom="Where do we fly?"
        />
      </div>

      <div className="bg-white px-4 pt-5 pb-28">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold">The Best Deals</h2>
          <span className="rounded-lg px-3 py-2 text-[15px] font-semibold ring-1 ring-pg-line">
            SAW ⌄
          </span>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto">
          {[
            ["Istanbul-Dalaman", "25"],
            ["Istanbul-Tiran", "46"],
          ].map(([route, price]) => (
            <div
              key={route}
              className="w-[220px] shrink-0 overflow-hidden rounded-2xl ring-1 ring-pg-line"
            >
              <div className="h-28 bg-gradient-to-br from-[#7FA8C9] to-[#3F5A74]" />
              <div className="p-3">
                <p className="text-[15px] font-bold">{route}</p>
                <p className="mt-1 text-[19px] font-bold">
                  {price} GBP{" "}
                  <span className="text-[12px] font-normal text-pg-ink">Fares from</span>
                </p>
                <p className="mt-1 text-[13px] text-pg-ink">October 2026</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Row({ icon, top, bottom }: { icon: React.ReactNode; top: string; bottom: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-pg-line">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-pg-navy">{top}</span>
        <span className="block text-[15px] font-bold text-pg-navy">{bottom}</span>
      </span>
      <span className="text-[18px] text-pg-ink">›</span>
    </div>
  );
}
