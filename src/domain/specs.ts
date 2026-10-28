import type { Category, TestSpec } from "./types"

/** The 50-question mixed sprint: about 18 seconds a question, one way only. */
export const MIXED_SPRINT: TestSpec = {
  id: "mixed-sprint",
  name: "Mixed sprint",
  blueprint: { verbal: 17, maths: 17, spatial: 16 },
  seconds: 15 * 60,
  navigation: "one-way",
  feedback: "end",
}

const DRILL_NAMES: Record<Category, string> = {
  verbal: "Verbal drill",
  maths: "Maths and logic drill",
  spatial: "Spatial drill",
}

/** A 10-question drill on one category, at the sprint's pace, with Back allowed. */
export function drill(
  category: Category,
  feedback: "end" | "instant" = "end"
): TestSpec {
  return {
    id: `drill-${category}`,
    name: DRILL_NAMES[category],
    blueprint: { [category]: 10 },
    seconds: 3 * 60,
    navigation: "free",
    feedback,
  }
}
