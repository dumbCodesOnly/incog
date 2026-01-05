import { describe, test, expect } from "vitest";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import { TrpcContext } from "./context";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";

const testRouter = router({
  public: publicProcedure.query(() => "public"),
  protected: protectedProcedure.query(() => "protected"),
  admin: adminProcedure.query(() => "admin"),
});

const createTestCaller = (ctx: Partial<TrpcContext>) => {
  const caller = testRouter.createCaller(ctx as any);
  return caller;
};

describe("trpc middleware", () => {
  describe("protectedProcedure", () => {
    test("should pass with a user", async () => {
      const caller = createTestCaller({ user: { id: "1", role: "user", email: "test@test.com" } });
      const result = await caller.protected();
      expect(result).toBe("protected");
    });

    test("should throw UNAUTHORIZED without a user", async () => {
      const caller = createTestCaller({ user: null });
      await expect(caller.protected()).rejects.toThrow(
        new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG })
      );
    });
  });

  describe("adminProcedure", () => {
    test("should pass with an admin user", async () => {
      const caller = createTestCaller({ user: { id: "1", role: "admin", email: "test@test.com" } });
      const result = await caller.admin();
      expect(result).toBe("admin");
    });

    test("should throw FORBIDDEN without a user", async () => {
      const caller = createTestCaller({ user: null });
      await expect(caller.admin()).rejects.toThrow(
        new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG })
      );
    });

    test("should throw FORBIDDEN with a non-admin user", async () => {
      const caller = createTestCaller({ user: { id: "1", role: "user", email: "test@test.com" } });
      await expect(caller.admin()).rejects.toThrow(
        new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG })
      );
    });
  });
});
