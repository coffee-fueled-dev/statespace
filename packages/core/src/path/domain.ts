export type Path<TState> = TState extends object
  ? {
      [K in keyof TState]-?: K extends string
        ? TState[K] extends object
          ? TState[K] extends (infer U)[]
            ? K | `${K}[${number}]` | `${K}[${number}].${Path<U>}`
            : K | `${K}.${Path<TState[K]>}`
          : K
        : never;
    }[keyof TState]
  : never;

export type Value<
  TState,
  TPath extends string
> = TPath extends `${infer K}[${infer Index}].${infer R}`
  ? K extends keyof TState
    ? TState[K] extends (infer U)[]
      ? Value<U, R>
      : never
    : never
  : TPath extends `${infer K}[${infer Index}]`
  ? K extends keyof TState
    ? TState[K] extends (infer U)[]
      ? U
      : never
    : never
  : TPath extends `${infer K}.${infer R}`
  ? K extends keyof TState
    ? Value<TState[K], R>
    : never
  : TPath extends keyof TState
  ? TState[TPath]
  : never;

export type PathReference<
  TState extends object,
  TPath extends Path<TState>
> = `$${TPath}`;

export interface IPathRepository {
  readonly paths: <TState extends object>(
    state: TState,
    prefix?: string
  ) => Path<TState>[];

  readonly isPath: <TState extends object, TPath extends string>(
    path: TPath,
    state: TState
  ) => boolean;

  // TODO: return errors
  readonly isPathRef: <TState extends object>(
    maybeRef: unknown,
    state: TState
  ) => boolean;

  readonly valueFromPath: <
    TState extends object,
    TPath extends Path<TState> = Path<TState>
  >(
    path: TPath,
    state: TState
  ) => Value<TState, TPath>;

  readonly parsePathSegments: (
    path: string
  ) => Array<
    { type: "property"; key: string } | { type: "index"; index: number }
  >;
}
