import { SearchForm } from "@/components/search-form";
import { ReportStep } from "@/components/companion/report-step";

export default function SearchScreen() {
  return (
    <>
      <ReportStep step="search" />
      <div className="bg-pg-orange px-5 pt-4 pb-8 text-white">
        <p className="text-[13px] font-medium opacity-90">Merhaba</p>
        <h1 className="mt-0.5 text-[22px] font-bold tracking-tight">Where to?</h1>
      </div>
      <div className="-mt-5 px-4">
        <SearchForm />
      </div>
      <div className="px-5 pt-6">
        <h2 className="text-[13px] font-bold tracking-wide text-pg-ink uppercase">
          Popular from Istanbul
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { code: "STN", city: "London", from: "59" },
            { code: "BER", city: "Berlin", from: "49" },
            { code: "AYT", city: "Antalya", from: "25" },
            { code: "DXB", city: "Dubai", from: "99" },
          ].map((d) => (
            <div key={d.code} className="rounded-2xl bg-pg-surface p-3">
              <p className="text-[15px] font-bold">{d.city}</p>
              <p className="text-[11px] text-pg-ink">{d.code}</p>
              <p className="mt-2 text-[13px] font-semibold text-pg-orange">
                from {d.from} EUR
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
