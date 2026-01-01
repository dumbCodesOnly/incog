import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createPublicContext } from "./_core/test-utils";

describe("system.health", () => {
  it("returns { ok: true } for a valid timestamp", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.system.health({ timestamp: Date.now() });

    expect(result).toEqual({ ok: true });
  });

  it("throws an error for a negative timestamp", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.system.health({ timestamp: -1 })
    ).rejects.toThrowError("timestamp cannot be negative");
  });
});
