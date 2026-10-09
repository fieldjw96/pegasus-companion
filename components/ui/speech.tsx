import type { ReactNode } from "react";
import { Sparkle } from "./primitives";

/** The pale-yellow block with the tail pointing up at the avatar. */
export function Speech({ title, text }: { title: string; text: string[] }) {
  return (
    <div className="relative mt-4 flex flex-col gap-2 rounded-[20px] bg-pg-speech px-4 pt-4 pb-[18px]">
      <span
        aria-hidden
        className="absolute -top-[7px] left-[18px] h-4 w-4 rotate-45 rounded-[3px] bg-pg-speech"
      />
      <h3 className="relative flex items-center gap-2 text-[19px] leading-6 font-extrabold tracking-[-0.01em]">
        <Sparkle size={16} />
        {title}
      </h3>
      <p className="text-[15px] leading-[22px] font-medium" style={{ textWrap: "pretty" }}>
        {text.map((sentence, i) => (
          <span key={i}>
            {emphasise(sentence)}
            {i < text.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    </div>
  );
}

/** Bold the figures and dates: anything a passenger would check. */
function emphasise(sentence: string): ReactNode {
  const parts = sentence.split(
    /(\d[\d,]*(?:\.\d+)? GBP|\d+%|\d+ seats|\d+ days|\d{1,2} [A-Z][a-z]+|\d{2}:\d{2})/g,
  );
  return parts.map((part, i) =>
    /\d/.test(part) ? (
      <strong key={i} className="font-extrabold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
