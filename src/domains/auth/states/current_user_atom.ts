import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { atom } from "jotai";

export const currentUserAtom = atom<CurrentUserDto | null>(null);
export const hasResolvedCurrentUserAtom = atom(false);
