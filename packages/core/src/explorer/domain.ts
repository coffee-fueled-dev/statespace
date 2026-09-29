import type { Hash } from "../codex/entity";
import type { Metadata } from "../effect/domain";
import type { Schema } from "../statespace/domain";
import type { TransitionResult, TransitionSuccess } from "../transition/domain";

export interface IExplorer<T extends object> {
  readonly graph: MarkovGraph;
  readonly uniqueStates: number;
  readonly totalOperations: number;
  readonly shape: Schema<T>;

  neighbors(initialState: T, context?: unknown): Promise<HashedTransition<T>[]>;
  neighborIterator(initialState: T, context?: unknown): AsyncGenerator<HashedTransition<T>>;
  encode(state: T): Promise<string>;
  decode(key: string): Promise<T>;
  study<TResult>(
    study: (config: StudyConfig<T>) => Promise<TResult>,
    config: Omit<StudyConfig<T>, "explorer">,
  ): Promise<TResult>;
  resetState(): void;
}

export type StudyResult<T extends object> = {
  lastTransition: TransitionResult<T> | null;
  exitReason: string;
};

export interface StudyConfig<T extends object> {
  explorer: IExplorer<T>;
  initialState: T;
  context?: unknown;
  exitConditions: ((
    explorer: IExplorer<T>,
  ) => StudyResult<T> | null | Promise<StudyResult<T> | null>)[];
}

export type MarkovChain = [
  Hash,
  Hash,
  [
    {
      name: string;
      /** Present for path-focused effects; omitted for whole-state transforms. */
      path?: string;
      meta?: Metadata;
      cost?: number | null | undefined;
    },
    number, // number of times this transition has been taken
  ],
];

export type MarkovGraph = Map<MarkovChain[0], Map<MarkovChain[1], MarkovChain[2]>>;

export type HashedTransition<T extends object> = {
  result: TransitionSuccess<T>;
  hash: Hash;
};
