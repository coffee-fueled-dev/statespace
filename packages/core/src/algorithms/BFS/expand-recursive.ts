import type z from "zod";
import type { System } from "../../types";
import type { TransitionRules } from "../../transitions";
import type { KeyGenerator } from "../../key-generators";
import { generateBreadth } from "./bfs";

export type StateKey = string;

export interface State<TSchema extends z.ZodRawShape> {
  value: System<TSchema>;
  stateKey: StateKey;
  isNew: boolean;
}

export type TransitionEvent<TSchema extends z.ZodRawShape> = {
  fromState: State<TSchema>;
  toState: State<TSchema>;
  ruleName: string;
  cost: number;
};

export interface ExpansionConfig<TSchema extends z.ZodRawShape> {
  systemSchema: z.ZodObject<TSchema>;
  initialState: System<TSchema>;
  transitionRules: TransitionRules<System<TSchema>>;
  keyGenerator: KeyGenerator<System<TSchema>>;
  limit: {
    maxIterations: number;
    maxStates?: number; // Optional limit on number of states to explore
  };
  onTransition?: (event: TransitionEvent<TSchema>) => void;
}

/**
 * Recursively expands the state graph from an initial state
 */
export async function expandRecursive<TSchema extends z.ZodRawShape>(
  config: ExpansionConfig<TSchema>
): Promise<void> {
  const {
    systemSchema,
    initialState,
    transitionRules,
    keyGenerator,
    limit: { maxIterations, maxStates = Infinity },
    onTransition,
  } = config;

  const states = new Map<StateKey, System<TSchema>>();

  const explorationQueue: Array<{ state: System<TSchema>; key: StateKey }> = [];

  // Initialize with the starting state
  const initialKey = await keyGenerator.encode(initialState);
  states.set(initialKey, initialState);
  explorationQueue.push({ state: initialState, key: initialKey });

  // Emit initial state discovery
  onTransition?.({
    fromState: { value: initialState, stateKey: initialKey, isNew: true },
    toState: { value: initialState, stateKey: initialKey, isNew: true },
    ruleName: "initial",
    cost: 0,
  });

  let iterationsPerformed = 0;

  while (
    explorationQueue.length > 0 &&
    iterationsPerformed < maxIterations &&
    states.size < maxStates
  ) {
    const { state: currentState, key: currentStateKey } =
      explorationQueue.shift()!;
    iterationsPerformed++;

    const nextStateResults = generateBreadth(
      systemSchema,
      currentState,
      transitionRules
    );

    for (const result of nextStateResults) {
      // Stop early if we've hit the state limit
      if (states.size >= maxStates) {
        break;
      }

      const nextStateKey = await keyGenerator.encode(result.systemState);
      const isNewState = !states.has(nextStateKey);

      onTransition?.({
        fromState: {
          value: currentState,
          stateKey: currentStateKey,
          isNew: false,
        },
        toState: {
          value: result.systemState,
          stateKey: nextStateKey,
          isNew: isNewState,
        },
        ruleName: result.ruleName,
        cost: result.cost,
      });

      if (isNewState) {
        states.set(nextStateKey, result.systemState);
        explorationQueue.push({ state: result.systemState, key: nextStateKey });
      }
    }
  }
}
