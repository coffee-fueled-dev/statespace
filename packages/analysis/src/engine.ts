import type { Explorer, StateTransition, LexicalIndex } from "@statespace/core";
import * as Reachability from "./reachability";

export interface AnalyticsEngineConfig {
  explorer: Explorer;
  autoTrackDiscoveries?: boolean;
}

export interface StateDiscoveryEvent {
  index: LexicalIndex;
  state: any;
  transitions: StateTransition[];
}

/**
 * AnalyticsEngine acts as an event bridge and provides high-level analytics operations
 * Built on top of Explorer's stateless traversal capabilities
 */
export class AnalyticsEngine {
  private explorer: Explorer;
  private discoveredStates: Set<LexicalIndex> = new Set();
  private stateTransitions: Map<LexicalIndex, StateTransition[]> = new Map();
  private autoTrackDiscoveries: boolean;

  constructor(config: AnalyticsEngineConfig) {
    this.explorer = config.explorer;
    this.autoTrackDiscoveries = config.autoTrackDiscoveries ?? false;

    // Set up event handling if auto-tracking is enabled
    if (this.autoTrackDiscoveries) {
      this.explorer.setEventHandler({
        onStateDiscovered: (event) => this.handleStateDiscovery(event),
      });
    }
  }

  /**
   * Handle state discovery events from Explorer
   */
  private handleStateDiscovery(event: StateDiscoveryEvent): void {
    this.discoveredStates.add(event.index);
    this.stateTransitions.set(event.index, event.transitions);
  }

  /**
   * Search for a path between two states
   */
  async boundedPathSearch(
    origin: LexicalIndex,
    target: LexicalIndex,
    options: Reachability.BoundedPathSearchOptions = {}
  ): Promise<Reachability.BoundedPathSearchResult> {
    return Reachability.boundedPathSearch(
      this.explorer,
      origin,
      target,
      options
    );
  }

  /**
   * Find all states reachable within X steps from an origin state
   */
  async breadthLimitedReachability(
    origin: LexicalIndex,
    maxSteps: number,
    silent: boolean = false
  ): Promise<Reachability.BreadthLimitedReachabilityResult> {
    return Reachability.breadthLimitedReachability(
      this.explorer,
      origin,
      maxSteps,
      silent
    );
  }

  /**
   * Display a state in readable format
   */
  displayState(stateIndex: LexicalIndex, label?: string): void {
    displayState(this.explorer, stateIndex, label);
  }

  /**
   * Get statistics about discovered states (if auto-tracking enabled)
   */
  getDiscoveryStats(): {
    totalDiscoveredStates: number;
    averageTransitionsPerState: number;
    statesWithNoTransitions: number;
  } {
    if (!this.autoTrackDiscoveries) {
      throw new Error("Auto-tracking must be enabled to use discovery stats");
    }

    const totalStates = this.discoveredStates.size;
    const totalTransitions = Array.from(this.stateTransitions.values()).reduce(
      (sum, transitions) => sum + transitions.length,
      0
    );
    const statesWithNoTransitions = Array.from(
      this.stateTransitions.values()
    ).filter((transitions) => transitions.length === 0).length;

    return {
      totalDiscoveredStates: totalStates,
      averageTransitionsPerState:
        totalStates > 0 ? totalTransitions / totalStates : 0,
      statesWithNoTransitions,
    };
  }

  /**
   * Clear discovery tracking data
   */
  clearDiscoveryData(): void {
    this.discoveredStates.clear();
    this.stateTransitions.clear();
  }

  /**
   * Get the underlying Explorer instance
   */
  getExplorer(): Explorer {
    return this.explorer;
  }

  /**
   * Check if a state has been discovered (requires auto-tracking)
   */
  hasDiscovered(stateIndex: LexicalIndex): boolean {
    if (!this.autoTrackDiscoveries) {
      throw new Error(
        "Auto-tracking must be enabled to check discovery status"
      );
    }
    return this.discoveredStates.has(stateIndex);
  }

  /**
   * Get transitions for a discovered state (requires auto-tracking)
   */
  getDiscoveredTransitions(
    stateIndex: LexicalIndex
  ): StateTransition[] | undefined {
    if (!this.autoTrackDiscoveries) {
      throw new Error(
        "Auto-tracking must be enabled to get discovered transitions"
      );
    }
    return this.stateTransitions.get(stateIndex);
  }
}

/**
 * Display a state in a readable format
 */
export function displayState(
  explorer: Explorer,
  stateIndex: LexicalIndex,
  label?: string
): void {
  const result = explorer.singleState(stateIndex);
  if (result) {
    if (label) {
      console.log(`${label} (${stateIndex}):`);
    } else {
      console.log(`State ${stateIndex}:`);
    }

    // Decode the state to get actual element arrangement
    const codec = explorer.getCodec();
    const permutation = codec.decode(stateIndex);

    // Convert permutation back to container view
    let offset = 0;
    result.currentState.containers.forEach((container) => {
      const containerSlots = permutation.slice(
        offset,
        offset + container.slots
      );
      offset += container.slots;

      const items = containerSlots.map((slot) => (slot === false ? "_" : slot));
      console.log(`  ${container.id}: [${items.join(", ")}]`);
    });
  } else {
    console.log(`${label || "State"} (${stateIndex}): [INVALID STATE]`);
  }
}
