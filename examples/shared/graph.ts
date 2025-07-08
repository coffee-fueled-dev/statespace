import type {
  LexicalIndex,
  StateTransition,
  SystemState,
} from "../../packages/core/src/types";

export interface GraphNode {
  index: LexicalIndex;
  state: SystemState;
  transitions: StateTransition[];
  visited: boolean;
}

export interface GraphEdge {
  from: LexicalIndex;
  to: LexicalIndex;
  transition: StateTransition;
}

/**
 * StateGraph manages the graph representation of the state space,
 * tracking nodes (states) and edges (transitions) for exploration and analysis.
 */
export class StateGraph {
  private nodes: Map<LexicalIndex, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  private explorationQueue: LexicalIndex[] = [];

  /**
   * Add a new state node to the graph
   */
  addNode(
    index: LexicalIndex,
    state: SystemState,
    transitions: StateTransition[] = []
  ): void {
    if (!this.nodes.has(index)) {
      this.nodes.set(index, {
        index,
        state,
        transitions,
        visited: false,
      });
    }
  }

  /**
   * Add transitions from a node and create corresponding edges
   */
  addTransitions(
    fromIndex: LexicalIndex,
    transitions: StateTransition[]
  ): void {
    const node = this.nodes.get(fromIndex);
    if (!node) {
      throw new Error(`Node ${fromIndex} not found in graph`);
    }

    node.transitions = transitions;

    // Create edges for each transition
    transitions.forEach((transition) => {
      this.edges.push({
        from: fromIndex,
        to: transition.lexicalIndex,
        transition,
      });

      // Add target nodes if they don't exist
      if (!this.nodes.has(transition.lexicalIndex)) {
        this.addNode(transition.lexicalIndex, transition.resultingState);
        this.enqueueForExploration(transition.lexicalIndex);
      }
    });
  }

  /**
   * Mark a node as visited
   */
  markVisited(index: LexicalIndex): void {
    const node = this.nodes.get(index);
    if (node) {
      node.visited = true;
    }
  }

  /**
   * Get a node by its index
   */
  getNode(index: LexicalIndex): GraphNode | undefined {
    return this.nodes.get(index);
  }

  /**
   * Get all nodes in the graph
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges in the graph
   */
  getAllEdges(): GraphEdge[] {
    return [...this.edges];
  }

  /**
   * Get edges originating from a specific node
   */
  getEdgesFrom(index: LexicalIndex): GraphEdge[] {
    return this.edges.filter((edge) => edge.from === index);
  }

  /**
   * Get edges leading to a specific node
   */
  getEdgesTo(index: LexicalIndex): GraphEdge[] {
    return this.edges.filter((edge) => edge.to === index);
  }

  /**
   * Add an index to the exploration queue
   */
  enqueueForExploration(index: LexicalIndex): void {
    if (!this.explorationQueue.includes(index)) {
      this.explorationQueue.push(index);
    }
  }

  /**
   * Get the next index to explore
   */
  getNextToExplore(): LexicalIndex | undefined {
    return this.explorationQueue.shift();
  }

  /**
   * Check if there are more nodes to explore
   */
  hasMoreToExplore(): boolean {
    return this.explorationQueue.length > 0;
  }

  /**
   * Get statistics about the graph
   */
  getStats() {
    const totalNodes = this.nodes.size;
    const visitedNodes = Array.from(this.nodes.values()).filter(
      (n) => n.visited
    ).length;
    const totalEdges = this.edges.length;

    const transitionTypes = this.edges.reduce((acc, edge) => {
      const type = edge.transition.transitionType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalNodes,
      visitedNodes,
      unvisitedNodes: totalNodes - visitedNodes,
      totalEdges,
      transitionTypes,
      averageTransitionsPerNode: totalNodes > 0 ? totalEdges / totalNodes : 0,
    };
  }

  /**
   * Export graph data for external analysis (e.g., GraphML, JSON)
   */
  exportData() {
    return {
      nodes: Array.from(this.nodes.values()).map((node) => ({
        id: node.index,
        state: node.state,
        visited: node.visited,
        transitionCount: node.transitions.length,
      })),
      edges: this.edges.map((edge) => ({
        source: edge.from,
        target: edge.to,
        element: edge.transition.element,
        fromContainer: edge.transition.fromContainer,
        toContainer: edge.transition.toContainer,
        type: edge.transition.transitionType,
      })),
    };
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges.length = 0;
    this.explorationQueue.length = 0;
  }
}
