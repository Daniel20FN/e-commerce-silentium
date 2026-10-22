import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  getPriorityBlock,
  getPriorityQueue,
} from "../services/operational_service";
import type {
  PriorityBlock,
  PriorityGroup,
  PriorityQueue,
} from "../types/operational";
import {
  PriorityFailure,
  PriorityPanelContent,
  PriorityQueueContent,
  PriorityQueueError,
} from "./priority_content";
export { PriorityLoading } from "./priority_content";
type Copy = Dictionary["admin"]["dashboard"]["operations"];
export async function PriorityPanel({
  block,
  copy,
}: {
  block: PriorityBlock;
  copy: Copy;
}) {
  let queues: PriorityQueue[];
  try {
    queues = await getPriorityBlock(block);
  } catch (error) {
    console.error("[admin priorities]", block, error);
    return <PriorityFailure title={copy.blocks[block]} copy={copy} />;
  }
  return <PriorityPanelContent block={block} queues={queues} copy={copy} />;
}
export async function PriorityQueueView({
  group,
  cursor,
  copy,
}: {
  group: PriorityGroup;
  cursor?: string;
  copy: Copy;
}) {
  let queue: PriorityQueue;
  try {
    queue = await getPriorityQueue(group, cursor);
  } catch (error) {
    console.error("[admin priority queue]", group, error);
    return <PriorityQueueError group={group} copy={copy} />;
  }
  return <PriorityQueueContent queue={queue} cursor={cursor} copy={copy} />;
}
