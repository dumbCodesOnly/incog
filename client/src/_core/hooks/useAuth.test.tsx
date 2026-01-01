import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
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
});
