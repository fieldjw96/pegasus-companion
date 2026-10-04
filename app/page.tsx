import { BoardingScreen } from "@/components/boarding/boarding-screen";

/**
 * Direction B: the pass.
 *
 * Same brain as the conversational direction, a different claim about what a
 * booking is. Here the output is an object you hold rather than a record you
 * review, and what the assistant inferred is marked on the object itself.
 */
export default function Home() {
  return <BoardingScreen />;
}
