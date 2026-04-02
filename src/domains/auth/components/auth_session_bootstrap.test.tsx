import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import {
  currentUserAtom,
  hasResolvedCurrentUserAtom,
} from "@/domains/auth/states/current_user_atom";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { UserRole, UserStatus } from "@prisma/client";
import { render, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { AuthSessionBootstrap } from "./auth_session_bootstrap";

jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: jest.fn(),
}));

const mockUseCancellableApiContext = jest.mocked(useCancellableApiContext);

function createCurrentUser(
  overrides?: Partial<CurrentUserDto>,
): CurrentUserDto {
  return {
    id: "user-1",
    authUserId: "auth-user-1",
    email: "cliente@example.com",
    role: UserRole.customer,
    status: UserStatus.active,
    emailVerified: true,
    profile: {
      firstName: "Ana",
      lastName: "Pérez",
    },
    ...overrides,
  };
}

describe("AuthSessionBootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("replaces stale cached user data with the latest /auth/me result", async () => {
    const store = createStore();
    const staleUser = createCurrentUser({
      id: "stale-user",
      email: "stale@example.com",
    });
    const freshUser = createCurrentUser();
    const get = jest.fn().mockResolvedValue({ user: freshUser });
    const abort = jest.fn();

    store.set(currentUserAtom, staleUser);
    store.set(hasResolvedCurrentUserAtom, false);
    mockUseCancellableApiContext.mockReturnValue({
      cancellableApi: {
        get,
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      },
      abort,
      abortAll: jest.fn(),
      isPending: jest.fn().mockReturnValue(false),
    });

    const { unmount } = render(
      <Provider store={store}>
        <AuthSessionBootstrap />
      </Provider>,
    );

    await waitFor(() => {
      expect(store.get(currentUserAtom)).toEqual(freshUser);
      expect(store.get(hasResolvedCurrentUserAtom)).toBe(true);
    });

    expect(get).toHaveBeenCalledWith("auth-session-bootstrap", "/auth/me");

    unmount();

    expect(abort).toHaveBeenCalledWith("auth-session-bootstrap");
  });

  it("clears stale cache when /auth/me fails", async () => {
    const store = createStore();
    const get = jest.fn().mockRejectedValue(new Error("boom"));

    store.set(currentUserAtom, createCurrentUser({ id: "stale-user" }));
    store.set(hasResolvedCurrentUserAtom, false);
    mockUseCancellableApiContext.mockReturnValue({
      cancellableApi: {
        get,
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      },
      abort: jest.fn(),
      abortAll: jest.fn(),
      isPending: jest.fn().mockReturnValue(false),
    });

    render(
      <Provider store={store}>
        <AuthSessionBootstrap />
      </Provider>,
    );

    await waitFor(() => {
      expect(store.get(currentUserAtom)).toBeNull();
      expect(store.get(hasResolvedCurrentUserAtom)).toBe(true);
    });
  });
});
