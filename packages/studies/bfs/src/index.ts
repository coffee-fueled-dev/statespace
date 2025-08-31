import type {
  StudyConfig,
  StudyResult,
  TransitionResult,
} from "@statespace/core";
import {
  PriorityQueue,
  type ICompare,
  type IGetCompareValue,
} from "@datastructures-js/priority-queue";

export interface BFSConfig<T extends object> extends StudyConfig<T> {
  comparator: ICompare<TransitionResult<T>>;
}

export async function bfs<T extends object>({
  explorer,
  initialState,
  exitConditions,
  comparator = (a, b) => (a.effect.cost ?? 0) - (b.effect.cost ?? 0),
}: BFSConfig<T>): Promise<StudyResult<T>> {
  const queue = new PriorityQueue<TransitionResult<T>>(comparator);
  // BFS to find the optimal path to an exit condition using a priority queue
}
