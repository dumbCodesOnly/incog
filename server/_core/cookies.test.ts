import { describe, it, expect } from "vitest";
import { getSessionCookieOptions } from "./cookies";
import type { Request } from "express";

describe("getSessionCookieOptions", () => {
  it("should return secure: true when protocol is https", () => {
    const req = {
      protocol: "https",
      headers: {},
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(true);
  });

  it("should return secure: false when protocol is http and no x-forwarded-proto header", () => {
    const req = {
      protocol: "http",
      headers: {},
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(false);
  });

  it("should return secure: true when x-forwarded-proto is 'https'", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": "https",
      },
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(true);
  });

  it("should return secure: true when x-forwarded-proto is 'http,https'", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": "http,https",
      },
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(true);
  });

  it("should return secure: true when x-forwarded-proto is an array containing 'https'", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": ["http", "https"],
      },
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(true);
  });

  it("should return secure: false when x-forwarded-proto does not contain 'https'", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": "http,http2",
      },
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(false);
  });

  it("should return the correct default options", () => {
    const req = {
      protocol: "http",
      headers: {},
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: false,
    });
  });

  it("should handle case-insensitivity in x-forwarded-proto", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": "HTTPS",
      },
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(true);
  });

  it("should handle whitespace in x-forwarded-proto", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": " http , https ",
      },
    } as Request;
    const options = getSessionCookieOptions(req);
    expect(options.secure).toBe(true);
  });
});
