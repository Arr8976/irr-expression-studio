import { describe, expect, it } from "vitest";
import { buildUserAccountKey } from "./credit-account-keys";

describe("credit account keys", () => {
  it("builds stable user account keys", () => {
    expect(buildUserAccountKey("google", "123")).toBe("user:google:123");
    expect(buildUserAccountKey("kakao", "456")).toBe("user:kakao:456");
  });
});
