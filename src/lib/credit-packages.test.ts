import { describe, expect, it } from "vitest";
import { formatDailyCredits } from "./credit-packages";

describe("formatDailyCredits", () => {
  it("shows daily allowance clearly", () => {
    expect(formatDailyCredits(10)).toBe("하루/10회");
    expect(formatDailyCredits(100)).toBe("하루/100회");
  });
});
