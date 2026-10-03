import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

/**
 * The device frame the whole mock renders inside.
 *
 * This is a web app pretending to be a phone, so the frame is load-bearing for
 * the demo: a judge watching a screen share needs to read it as an app, not a
 * website. 390x844 is an iPhone 15 logical viewport.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 p-4 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:p-10">
      <div className="relative shrink-0">
        <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[2.75rem] border-[10px] border-black bg-pg-surface shadow-2xl">
          {/* Status bar. Static on purpose: a live clock changes every screenshot. */}
          <div className="relative z-10 flex h-11 items-center justify-between px-6 pt-1 text-[14px] font-semibold text-pg-navy">
            <span>15:06</span>
            <span className="absolute left-1/2 top-1.5 h-8 w-32 -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1 text-[12px]">
              <span aria-hidden>▂▄▆</span>
              <span className="rounded-sm bg-[#30D158] px-1 text-[10px] text-black">33</span>
            </span>
          </div>

          <div className="no-scrollbar h-[calc(844px-2.75rem)] overflow-y-auto">
            {children}
          </div>

          <BottomNav />
        </div>
      </div>
    </div>
  );
}
