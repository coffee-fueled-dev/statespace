import type {
  Hash,
  Schema,
  TransitionResult,
  TransitionSuccess,
  Metadata,
} from "@statespace/core";

export interface IExplorer<T extends object> {
  readonly graph: MarkovGraph;
  readonly uniqueStates: number;
  readonly totalOperations: number;
  readonly shape: Schema<T>;

  neighbors(initialState: T): Promise<HashedTransition<T>[]>;
  neighborIterator(initialState: T): AsyncGenerator<HashedTransition<T>>;
  encode(state: T): Promise<string>;
  decode(key: string): Promise<T>;
  study<TResult>(
    study: (config: StudyConfig<T>) => Promise<TResult>,
    config: Omit<StudyConfig<T>, "explorer">
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
  exitConditions: ((
    explorer: IExplorer<T>
  ) => StudyResult<T> | null | Promise<StudyResult<T> | null>)[];
}

export type MarkovChain = [
  Hash,
  Hash,
  [
    {
      name: string;
      path: string;
      meta?: Metadata;
      cost?: number | null | undefined;
    },
    number // number of times this transition has been taken
  ]
];

export type MarkovGraph = Map<
  MarkovChain[0],
  Map<MarkovChain[1], MarkovChain[2]>
>;

export type HashedTransition<T extends object> = {
  result: TransitionSuccess<T>;
  hash: Hash;
};
