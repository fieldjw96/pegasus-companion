import { AmbientScreen } from "@/components/ambient/ambient-screen";

/**
 * Direction C: it has already decided.
 *
 * Opens on a finished proposal rather than an empty box, and waits to be
 * corrected rather than instructed. The biggest claim of the three, which is
 * why the reasons sit above the price and the thing most likely to make it
 * wrong is on the same screen.
 */
export default function Home() {
  return <AmbientScreen />;
}
