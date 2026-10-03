import { AssistantScreen } from "@/components/assistant/assistant-screen";

/**
 * The landing screen.
 *
 * Chat first. The old step-by-step home still exists at /classic, so the two
 * can be shown side by side, but this is the product now: a passenger says what
 * they want and the trip assembles underneath, rather than being walked through
 * nine screens of questions the app could mostly have answered itself.
 */
export default function Home() {
  return <AssistantScreen />;
}
