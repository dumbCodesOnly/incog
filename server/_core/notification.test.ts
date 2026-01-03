import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyOwner } from "./notification";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

// This mock will be hoisted
vi.mock("./env", () => ({
  ENV: {
    forgeApiUrl: "https://example.com",
    forgeApiKey: "test-api-key",
  },
}));

global.fetch = vi.fn();

describe("notifyOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the ENV mock to its default state before each test
    vi.mocked(ENV, true).forgeApiUrl = "https://example.com";
    vi.mocked(ENV, true).forgeApiKey = "test-api-key";
  });

  describe("Payload Validation", () => {
    it("should throw a TRPCError if the title is empty", async () => {
      const payload = { title: " ", content: "Test Content" };
      await expect(notifyOwner(payload)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required.",
        })
      );
    });

    it("should throw a TRPCError if the content is empty", async () => {
      const payload = { title: "Test Title", content: " " };
      await expect(notifyOwner(payload)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required.",
        })
      );
    });

    it("should throw a TRPCError if the title is too long", async () => {
      const payload = { title: "a".repeat(1201), content: "Test Content" };
      await expect(notifyOwner(payload)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title must be at most 1200 characters.",
        })
      );
    });

    it("should throw a TRPCError if the content is too long", async () => {
      const payload = { title: "Test Title", content: "a".repeat(20001) };
      await expect(notifyOwner(payload)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content must be at most 20000 characters.",
        })
      );
    });
  });

  describe("Environment Configuration", () => {
    it("should throw a TRPCError if forgeApiUrl is not configured", async () => {
      vi.mocked(ENV, true).forgeApiUrl = undefined;
      const payload = { title: "Test Title", content: "Test Content" };
      await expect(notifyOwner(payload)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Notification service URL is not configured.",
        })
      );
    });

    it("should throw a TRPCError if forgeApiKey is not configured", async () => {
        vi.mocked(ENV, true).forgeApiKey = undefined;
      const payload = { title: "Test Title", content: "Test Content" };
      await expect(notifyOwner(payload)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Notification service API key is not configured.",
        })
      );
    });
  });

  describe("API Interaction", () => {
    it("should return true when the notification is sent successfully", async () => {
      (fetch as any).mockResolvedValue({ ok: true });
      const payload = { title: "Test Title", content: "Test Content" };
      const result = await notifyOwner(payload);
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://example.com/webdevtoken.v1.WebDevService/SendNotification",
        expect.objectContaining({
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: "Bearer test-api-key",
            "content-type": "application/json",
            "connect-protocol-version": "1",
          },
          body: JSON.stringify({ title: "Test Title", content: "Test Content" }),
        })
      );
    });

    it("should return false when the notification service returns a non-ok response", async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Some error"),
      });
      const payload = { title: "Test Title", content: "Test Content" };
      const result = await notifyOwner(payload);
      expect(result).toBe(false);
    });

    it("should return false when the fetch call fails", async () => {
      (fetch as any).mockRejectedValue(new Error("Network error"));
      const payload = { title: "Test Title", content: "Test Content" };
      const result = await notifyOwner(payload);
      expect(result).toBe(false);
    });

    it("should trim the title and content before sending", async () => {
      (fetch as any).mockResolvedValue({ ok: true });
      const payload = { title: "  Test Title  ", content: "  Test Content  " };
      await notifyOwner(payload);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ title: "Test Title", content: "Test Content" }),
        })
      );
    });
  });
});
