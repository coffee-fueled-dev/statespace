import z from "zod";
import type { System } from "../../shared/types";
import type { Hash, TransitionEvent, TransitionRules } from "../../transitions";
import type { Codex } from "../../codex";
import { generateBreadth } from "./bfs";

export interface ExpansionConfig<TSchema extends z.ZodRawShape> {
  systemSchema: z.ZodObject<TSchema>;
  initialState: System<TSchema>;
  transitionRules: TransitionRules<System<TSchema>>;
  codex: Codex;
  limit: {
    maxIterations: number;
    maxStates?: number; // Optional limit on number of states to explore
  };
  onTransition?: (event: TransitionEvent<System<TSchema>>) => void;
  onCycleDetected?: (cycle: {
    fromHash: Hash;
    toHash: Hash;
    ruleName: string;
    cost: number;
    fromState: System<TSchema>;
    toState: System<TSchema>;
  }) => void;
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
    onCycleDetected,
  } = config;

  const systemHash = await codex.encode(z.toJSONSchema(systemSchema));

  const states = new Map<Hash, System<TSchema>>();

  const explorationQueue: Array<{ state: System<TSchema>; hash: Hash }> = [];

  // Initialize with the starting state
  const initialHash = await codex.encode(initialState);
  states.set(initialHash, initialState);
  explorationQueue.push({ state: initialState, hash: initialHash });

  const transitionPayload = {
    currentState: { value: initialState, hash: initialHash, isNew: true },
    nextState: { value: initialState, hash: initialHash, isNew: true },
    ruleName: "initial",
    cost: 0,
    metadata: undefined,
  };

  // Emit initial state discovery
  onTransition?.({
    ...transitionPayload,
    hash: await codex.encode(transitionPayload),
    systemHash,
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

      // Detect cycle: if we're transitioning to an already visited state
      if (!isNewState && onCycleDetected) {
        onCycleDetected({
          fromHash: currentStateHash,
          toHash: nextStateHash,
          ruleName: result.ruleName,
          cost: result.cost,
          fromState: currentState,
          toState: result.systemState,
        });
      }

      const transitionPayload = {
        currentState: {
          value: currentState,
          hash: currentStateHash,
          isNew: false,
        },
        nextState: {
          value: result.systemState,
          hash: nextStateHash,
          isNew: isNewState,
        },
        ruleName: result.ruleName,
        cost: result.cost,
        metadata: result.metadata,
      };

      onTransition?.({
        ...transitionPayload,
        hash: await codex.encode(transitionPayload),
        systemHash,
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
