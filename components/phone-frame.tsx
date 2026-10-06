import type { ReactNode } from "react";

/**
 * The device frame the whole mock renders inside.
 *
 * This is a web app pretending to be a phone, so the frame is load-bearing for
 * the demo: a judge watching a screen share needs to read it as an app, not a
 * website. 390x844 is an iPhone 15 logical viewport, and every artboard on the
 * design canvas is drawn at exactly that size.
 *
 * The status bar is not here. A lock screen draws its own, in white, and an app
 * screen draws its own, in navy, so each screen owns the top 44px of itself.
 */
export function PhoneFrame({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 p-4 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:p-10">
      <div className="relative shrink-0">
        <div className="relative h-[864px] w-[410px] overflow-hidden rounded-[46px] border-[10px] border-black bg-pg-surface shadow-2xl">
          <span
            aria-hidden
            className="pointer-events-none absolute top-3 left-1/2 z-30 h-8 w-32 -translate-x-1/2 rounded-full bg-black"
          />
          <div className="relative h-full w-full">{children}</div>
        </div>
      </div>
      {aside}
    </div>
  );
}
