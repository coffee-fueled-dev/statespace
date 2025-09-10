import type { IExplorer } from "./domain";
import Queue from "queue";
import type {
  HashedTransition,
  MarkovChain,
  MarkovGraph,
  StudyConfig,
} from "./domain";
import type {
  Codex,
  ExecutableStateSpace,
  Schema,
  TransitionResult,
} from "@statespace/core";

export class Explorer<T extends object> implements IExplorer<T> {
  private _graph: MarkovGraph = new Map();
  private _uniqueStates: number = 0;
  private _totalOperations: number = 0;

  constructor(
    private readonly stateSpace: ExecutableStateSpace<T>,
    private readonly codex: Codex<T>,
  ) {}

  private async _processTransition(
    transition: (state: T) => TransitionResult<T>,
    initialState: T,
    transitionMap: Map<string, MarkovChain[2]>,
  ): Promise<HashedTransition<T> | null> {
    this._totalOperations++;
    const result = transition(initialState);

    if (result.success) {
      const resultStateHash = await this.encode(result.state);

      const transitionEntry = transitionMap.get(resultStateHash);
      if (!transitionEntry) {
        this._uniqueStates++;
        transitionMap.set(resultStateHash, [
          {
            name: result.name,
            path: result.effect.path,
            cost: result.effect.cost,
            meta: result.effect.meta,
          },
          1,
        ]);
      } else {
        transitionEntry[1]++;
      }

      return { result, hash: resultStateHash };
    }

    return null;
  }

  async neighbors(initialState: T): Promise<HashedTransition<T>[]> {
    const neighbors: HashedTransition<T>[] = [];
    for await (const neighbor of this.neighborIterator(initialState)) {
      neighbors.push(neighbor);
    }

    return neighbors;
  }

  async *neighborIterator(
    initialState: T,
  ): AsyncGenerator<HashedTransition<T>> {
    const initialStateHash = await this.encode(initialState);
    if (!this._graph.has(initialStateHash)) {
      this._uniqueStates++;
      this._graph.set(initialStateHash, new Map());
    }

    const transitionMap = this._graph.get(initialStateHash)!;

    // Use queue package for better async processing with streaming results
    const results: HashedTransition<T>[] = [];
    let processedCount = 0;

    const q = new Queue({
      concurrency: Infinity, // Process all transitions in parallel
      autostart: true,
      results: [],
    });

    // Add each transition as a job to the queue
    for (const transition of this.stateSpace.transitions) {
      q.push(async () => {
        const hashedTransition = await this._processTransition(
          transition,
          initialState,
          transitionMap,
        );
        if (hashedTransition) {
          results.push(hashedTransition);
        }
        processedCount++;
      });
    }

    // Stream results as they become available
    while (
      processedCount < this.stateSpace.transitions.length ||
      results.length > 0
    ) {
      if (results.length > 0) {
        yield results.shift()!;
      } else {
        // Small delay to prevent busy waiting
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
  }

  async encode(state: T): Promise<string> {
    return this.codex.encode(state);
  }

  async decode(key: string): Promise<T> {
    return this.codex.decode(key);
  }

  /**
   * Runs a study with this explorer instance, providing a unified interface
   * for executing different types of algorithms and studies.
   */
  async study<TResult>(
    study: (config: StudyConfig<T>) => Promise<TResult>,
    config: Omit<StudyConfig<T>, "explorer">,
  ): Promise<TResult> {
    // Reset internal state for clean study execution
    this.resetState();

    return await study({
      explorer: this,
      ...config,
    });
  }

  /**
   * Resets the internal state tracking for a fresh study execution
   */
  resetState(): void {
    this._graph.clear();
    this._uniqueStates = 0;
    this._totalOperations = 0;
  }

  get graph(): MarkovGraph {
    return this._graph;
  }

  get uniqueStates(): number {
    return this._uniqueStates;
  }

  get totalOperations(): number {
    return this._totalOperations;
  }

  get shape(): Schema<T> {
    return this.stateSpace.shape;
  }
}
