"use client";

import type { ReactNode } from "react";

/**
 * A bottom sheet over a dimmed screen. The grab handle and the 28px top radius
 * are what make it read as a sheet rather than a card that fell to the bottom.
 */
export function Sheet({
  label,
  children,
  onClose,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fade absolute inset-0 z-30 cursor-default bg-pg-navy/55"
      />
      <section
        role="dialog"
        aria-label={label}
        className={`rise absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-[28px] bg-white px-5 pt-2.5 pb-7 ${className}`}
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <span aria-hidden className="h-[5px] w-10 self-center rounded-[3px] bg-pg-line" />
        {children}
      </section>
    </>
  );
}
