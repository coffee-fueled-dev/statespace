import type { Explorer } from "../explorer";

export interface StudyConfig<T extends object> {
  explorer: Explorer<T>;
  initialState: T;
  limit: {
    maxIterations: number;
    maxStates: number;
  };
}

export interface PathfindingStudy<T extends object> extends StudyConfig<T> {
  targetCondition: (systemState: T) => boolean;
  /** Optional function to determine node priority (lower = higher priority). If not provided, uses FIFO queue. */
  priorityFunction?: (node: Node<T>) => number;
}

export interface Node<T> {
  state: T;
  path: string[];
  cost: number;
}
