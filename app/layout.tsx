import type { Metadata } from "next";
import "./globals.css";
import { PhoneFrame } from "@/components/phone-frame";
import { JourneyProvider } from "@/components/journey-provider";
import { CompanionPhone } from "@/components/companion-phone";
import { Scenes } from "@/components/scenes";
import { Impact } from "@/components/impact";

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
          Every screen renders inside the main phone. A second phone appears on
          the left when the story moves to someone else's device, and the
          presenter's panel sits on the right; its Scenes view is how the demo
          jumps to a later day. The provider holds what the passengers have done so far, so a
          ticket built on the home screen is the ticket the checkout prints.
        */}
        <JourneyProvider>
          <PhoneFrame before={<CompanionPhone />} aside={<Scenes />} after={<Impact />}>
            {children}
          </PhoneFrame>
        </JourneyProvider>
      </body>
    </html>
  );
}
