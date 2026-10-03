import type { Metadata } from "next";
import "./globals.css";
import { PhoneFrame } from "@/components/phone-frame";

export const metadata: Metadata = {
  title: "Pegasus — booking mock",
  description:
    "A mock of the Pegasus mobile booking journey, used as a harness for an agentic companion layer. Not affiliated with Pegasus Airlines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/*
          Every screen renders inside the phone frame. Keeping the frame in the
          root layout rather than per-page means a new screen cannot accidentally
          render full-width and look right in isolation but wrong in the demo.
        */}
        <PhoneFrame>{children}</PhoneFrame>
      </body>
    </html>
  );
}
