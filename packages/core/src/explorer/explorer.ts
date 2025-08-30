import type { Codex } from "../codex";
import type { Hash } from "../codex/types";
import type { Effect, ExecutableStateSpace, Metadata } from "../schema";
import type { StudyConfig } from "./studies/types";

export type MarkovChain = [
  Hash,
  Hash,
  {
    cost?: number | null | undefined;
    ruleName: string;
    metadata?: Metadata;
  }
];

type MarkovGraph = Map<MarkovChain[0], Record<MarkovChain[1], MarkovChain[2]>>;

export class Explorer<T extends object> {
  private states = new Set<Hash>();
  private graph: MarkovGraph = new Map();

  constructor(
    private readonly stateSpace: ExecutableStateSpace<T>,
    private readonly codex: Codex<T>
  ) {}

  async neighbors(initialState: T): Promise<T[]> {
    const neighbors: T[] = [];
    for await (const neighbor of this.neighborIterator(initialState)) {
      neighbors.push(neighbor);
    }

    return neighbors;
  }

  async *neighborIterator(initialState: T): AsyncGenerator<T> {
    for await (const transition of this.stateSpace.transitions) {
      const result = await transition(initialState);

      if (result.success) {
        yield result.state;
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
  async runStudy<TResult>(
    study: (config: StudyConfig<T>) => Promise<TResult>,
    config: Omit<StudyConfig<T>, "explorer">
  ): Promise<TResult> {
    // Reset internal state for clean study execution
    this.resetState();

    // Create full config with this explorer instance
    const fullConfig: StudyConfig<T> = {
      explorer: this,
      ...config,
    };

    // Execute the study
    return await study(fullConfig);
  }

  /**
   * Runs a study with custom initial state and limits
   */
  async runStudyWith<TResult>(
    study: (config: StudyConfig<T>) => Promise<TResult>,
    initialState: T,
    limit: { maxIterations: number; maxStates: number }
  ): Promise<TResult> {
    return this.runStudy(study, { initialState, limit });
  }

  /**
   * Resets the internal state tracking for a fresh study execution
   */
  resetState(): void {
    this.states.clear();
    this.graph.clear();
  }

  /**
   * Gets the current number of discovered states
   */
  get stateCount(): number {
    return this.states.size;
  }

  /**
   * Gets the current number of discovered transitions
   */
  get transitionCount(): number {
    return Array.from(this.graph.values()).reduce(
      (total, transitions) => total + Object.keys(transitions).length,
      0
    );
  }
}
