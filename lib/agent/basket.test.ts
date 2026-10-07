import { expect, it } from "vitest";
import { emreComparison, willComparison } from "./basket";

it("prices both journeys from the same code as the tickets", () => {
  const w = willComparison();
  const e = emreComparison();
  expect(w.companion.passengers).toBe(3);
  expect(w.companion.total).toBeGreaterThan(w.today.total);
  expect(e.companion.ancillary).toBeGreaterThan(e.today.ancillary);
});
