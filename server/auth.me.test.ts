import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createAuthContext, regularUser } from "./_core/test-utils";

describe("auth.me", () => {
  it("returns the user object for an authenticated user", async () => {
    const { ctx } = createAuthContext(regularUser);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toEqual(regularUser);
  });

  it("returns null for an unauthenticated user", async () => {
    const { ctx } = createAuthContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});
