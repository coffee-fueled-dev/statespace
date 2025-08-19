import type z from "zod";
import type { System } from "../../types";
import type { TransitionEvent, TransitionRules } from "../../transitions";
import type { Codex } from "../../codex";
import { generateBreadth } from "./bfs";

export type Hash = string;

export interface State<TSchema extends z.ZodRawShape> {
  value: System<TSchema>;
  hash: Hash;
  isNew: boolean;
}

export interface ExpansionConfig<TSchema extends z.ZodRawShape> {
  systemSchema: z.ZodObject<TSchema>;
  initialState: System<TSchema>;
  transitionRules: TransitionRules<System<TSchema>>;
  codex: Codex<System<TSchema>>;
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
    codex,
    limit: { maxIterations, maxStates = Infinity },
    onTransition,
  } = config;

  const states = new Map<Hash, System<TSchema>>();

  const explorationQueue: Array<{ state: System<TSchema>; hash: Hash }> = [];

  // Initialize with the starting state
  const initialHash = await codex.encode(initialState);
  states.set(initialHash, initialState);
  explorationQueue.push({ state: initialState, hash: initialHash });

  // Emit initial state discovery
  onTransition?.({
    fromState: { value: initialState, hash: initialHash, isNew: true },
    toState: { value: initialState, hash: initialHash, isNew: true },
    ruleName: "initial",
    cost: 0,
    metadata: undefined,
  });

  let iterationsPerformed = 0;

  while (
    explorationQueue.length > 0 &&
    iterationsPerformed < maxIterations &&
    states.size < maxStates
  ) {
    const { state: currentState, hash: currentStateHash } =
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

      const nextStateHash = await codex.encode(result.systemState);
      const isNewState = !states.has(nextStateHash);

      onTransition?.({
        fromState: {
          value: currentState,
          hash: currentStateHash,
          isNew: false,
        },
        toState: {
          value: result.systemState,
          hash: nextStateHash,
          isNew: isNewState,
        },
        ruleName: result.ruleName,
        cost: result.cost,
        metadata: result.metadata,
      });

      if (isNewState) {
        states.set(nextStateHash, result.systemState);
        explorationQueue.push({
          state: result.systemState,
          hash: nextStateHash,
        });
      }
    }
  }
}
