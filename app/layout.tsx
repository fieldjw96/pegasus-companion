import type { Metadata } from "next";
import "./globals.css";
import { PhoneFrame } from "@/components/phone-frame";
import { JourneyProvider } from "@/components/journey-provider";
import { Scenes } from "@/components/scenes";

export const metadata: Metadata = {
  title: "Pegasus — AI Travel Companion mock",
  description:
    "A mock of the Pegasus mobile app with an AI travel companion built into it. Not affiliated with Pegasus Airlines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/*
          Every screen renders inside the phone frame, and the scenes panel sits
          beside it. The provider holds what the passenger has done so far, so a
          ticket built on the home screen is the ticket the checkout prints.
        */}
        <JourneyProvider>
          <PhoneFrame aside={<Scenes />}>{children}</PhoneFrame>
        </JourneyProvider>
      </body>
    </html>
  );
}
