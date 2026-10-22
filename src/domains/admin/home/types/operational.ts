export const PRIORITY_GROUPS = [
  "drafts",
  "publication",
  "unavailable",
  "out",
  "low",
  "prepare",
  "deliver",
  "unpaid",
] as const;
export type PriorityGroup = (typeof PRIORITY_GROUPS)[number];
export const PRIORITY_BLOCKS = {
  orders: ["prepare", "deliver", "unpaid"],
  inventory: ["out", "low"],
  catalog: ["drafts", "publication", "unavailable"],
} satisfies Record<string, PriorityGroup[]>;
export type PriorityBlock = keyof typeof PRIORITY_BLOCKS;
export interface PriorityRow {
  id: string;
  name: string;
  href: string;
  sku: string | null;
  stock: number | null;
  minimum: number | null;
  orderNumber: number | null;
}
export interface PriorityQueue {
  group: PriorityGroup;
  count: number;
  rows: PriorityRow[];
  nextCursor: string | null;
  updatedAt: string;
  updatedLabel: string;
}
