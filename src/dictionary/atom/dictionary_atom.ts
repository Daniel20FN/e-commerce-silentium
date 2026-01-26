import { atom } from "jotai";
import { Dictionary } from "../services/get-dictionary";

export const dictionaryAtom = atom<Dictionary | undefined>();
