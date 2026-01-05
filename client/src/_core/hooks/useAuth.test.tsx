import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAuth } from "./useAuth";
import { trpc } from "@/lib/trpc";
import React, { PropsWithChildren } from "react";

// Mock getLoginUrl to avoid environment variable dependency
vi.mock("@/const", () => ({
  getLoginUrl: () => "http://dummy-login-url",
  COOKIE_NAME: "auth_token",
  ONE_YEAR_MS: 31536000000,
}));

// Mock the trpc module with a factory to ensure hooks are mock functions
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: vi.fn(),
    auth: {
      me: {
        useQuery: vi.fn(),
      },
      logout: {
        useMutation: vi.fn(),
      },
    },
  },
}));

const regularUser = {
  id: 2,
  openId: "regular-user",
  email: "user@example.com",
  name: "Regular User",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const queryClient = new QueryClient();
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(trpc.useUtils).mockReturnValue({
      auth: {
        me: {
          setData: vi.fn(),
          invalidate: vi.fn(),
        },
      },
    } as any);
  });

  it("should return an authenticated user", () => {
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: regularUser,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(regularUser);
    expect(result.current.loading).toBe(false);
  });

  it("should return null for an unauthenticated user", () => {
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should reflect the loading state", () => {
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
  });

  it("should handle logout successfully and call onSuccess", async () => {
    const setDataMock = vi.fn();
    const invalidateMock = vi.fn();
    vi.mocked(trpc.useUtils).mockReturnValue({
      auth: { me: { setData: setDataMock, invalidate: invalidateMock } },
    } as any);

    let onSuccess: (() => void) | undefined;
    const mutateAsync = vi.fn().mockImplementation(() => {
      if (onSuccess) onSuccess();
      return Promise.resolve();
    });

    vi.mocked(trpc.auth.logout.useMutation).mockImplementation((options: any) => {
      onSuccess = options?.onSuccess;
      return {
        isPending: false,
        error: null,
        mutateAsync,
      };
    });
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: regularUser,
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => await result.current.logout());

    expect(mutateAsync).toHaveBeenCalled();
    // Called once in onSuccess and once in finally block
    expect(setDataMock).toHaveBeenCalledTimes(2);
    expect(invalidateMock).toHaveBeenCalledTimes(1);
  });

  it("should handle UNAUTHORIZED error on logout", async () => {
    const error = {
      name: "TRPCClientError",
      data: {
        code: "UNAUTHORIZED",
      },
    };
    const mutateAsync = vi.fn().mockRejectedValue(error);
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: regularUser,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync,
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(mutateAsync).toHaveBeenCalled();
  });

  it("should re-throw non-UNAUTHORIZED errors on logout", async () => {
    const error = new Error("A generic error");
    const mutateAsync = vi.fn().mockRejectedValue(error);
    const setDataMock = vi.fn();
    const invalidateMock = vi.fn();
    vi.mocked(trpc.useUtils).mockReturnValue({
      auth: {
        me: {
          setData: setDataMock,
          invalidate: invalidateMock,
        },
      },
    } as any);
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: regularUser,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync,
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(act(() => result.current.logout())).rejects.toThrow("A generic error");

    expect(mutateAsync).toHaveBeenCalled();
    expect(setDataMock).toHaveBeenCalledWith(undefined, null);
    expect(invalidateMock).toHaveBeenCalled();
  });

  it("should redirect on unauthenticated", () => {
    const { location } = window;
    // This is how you mock `window.location`
    vi.stubGlobal("location", {
      ...location,
      href: "",
      pathname: "/some-path",
    });

    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync: vi.fn(),
    } as any);

    renderHook(() => useAuth({ redirectOnUnauthenticated: true }), {
      wrapper,
    });

    expect(window.location.href).toBe("http://dummy-login-url");
    vi.unstubAllGlobals();
  });

  it("should not redirect if on the redirect path", () => {
    const { location } = window;
    vi.stubGlobal("location", {
      ...location,
      href: "",
      pathname: "/login",
    });

    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync: vi.fn(),
    } as any);

    renderHook(
      () => useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" }),
      { wrapper }
    );

    expect(window.location.href).toBe("");
    vi.unstubAllGlobals();
  });
});
