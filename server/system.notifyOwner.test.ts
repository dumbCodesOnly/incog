import { vi, describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as notification from "./_core/notification";
import {
  createAuthContext,
  adminUser,
  regularUser,
} from "./_core/test-utils";

vi.mock("./_core/notification");

describe("system.notifyOwner", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("allows an admin to send a notification", async () => {
    vi.mocked(notification.notifyOwner).mockResolvedValue(true);
    const { ctx } = createAuthContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    const input = { title: "Test Title", content: "Test Content" };
    const result = await caller.system.notifyOwner(input);

    expect(result).toEqual({ success: true });
    expect(notification.notifyOwner).toHaveBeenCalledWith(input);
  });

  it("prevents a non-admin user from sending a notification", async () => {
    const { ctx } = createAuthContext(regularUser);
    const caller = appRouter.createCaller(ctx);

    const input = { title: "Test Title", content: "Test Content" };

    await expect(caller.system.notifyOwner(input)).rejects.toThrowError(
      "You do not have required permission"
    );
  });

  it("prevents an unauthenticated user from sending a notification", async () => {
    const { ctx } = createAuthContext(null);
    const caller = appRouter.createCaller(ctx);

    const input = { title: "Test Title", content: "Test Content" };

    await expect(caller.system.notifyOwner(input)).rejects.toThrowError(
      "You do not have required permission"
    );
  });

  it("throws an error for invalid input", async () => {
    const { ctx } = createAuthContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    const input = { title: "", content: "" };

    await expect(caller.system.notifyOwner(input)).rejects.toThrowError();
  });
});
