import type {
  SystemState,
  StateTransition,
  TransitionType,
  InternalSystemState,
} from "../types";
import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import { getValidMoves } from "./get-valid-moves";
import { getValidPlacements } from "./get-valid-placements";
import { createNewContainers } from "./create-new-containers";

/**
 * Generate transitions one at a time from current state (depth-first strategy)
 * Yields transitions lazily, allowing true DFS behavior
 */
export function* depthFirst(
  currentState: InternalSystemState,
  encodeState: (state: InternalSystemState) => number,
  positionHandlers: Record<PositionType, PositionHandler>,
  getTransitionType: (
    fromContainer: string,
    toContainer: string,
    rule?: string
  ) => TransitionType = () => "MOVE"
): Generator<StateTransition> {
  for (const origin of currentState.containers) {
    // Skip empty containers
    if (origin.slots.every((slot) => slot === false)) continue;

    for (const rule of origin.allowedTransitions) {
      const target = currentState.containers.find(
        (c) => c.id === rule.targetId
      );
      if (!target) continue;

      // Get valid moves from origin
      const moves = getValidMoves(rule.from, origin, positionHandlers);
      if (moves.length === 0) continue;

      // Check if target has space
      if (!target.slots.includes(false)) continue;

      // Generate transitions for each valid move
      for (const move of moves) {
        // Create transition object for position handler
        const transition = {
          element: move.element,
          cost: rule.cost || null,
        };

        const placements = getValidPlacements(
          rule.to,
          target,
          transition,
          positionHandlers
        );

        for (const placement of placements) {
          const newContainers = createNewContainers(
            currentState.containers,
            origin.id,
            move.modifiedSlots,
            target.id,
            placement
          );

          const transitionType = getTransitionType(
            origin.id,
            target.id,
            rule.transitionType
          );

          const lexicalIndex = encodeState({ containers: newContainers });

          // Evaluate cost function if present
          const evaluatedCost =
            typeof rule.cost === "function"
              ? rule.cost(currentState)
              : rule.cost ?? null;

          // Convert back to external SystemState format for the result
          const externalResultingState: SystemState = {
            containers: newContainers.map((container) => ({
              id: container.id,
              slots: container.slots.length,
              metadata: container.metadata,
              allowedTransitions: container.allowedTransitions,
              positionHandlers: container.positionHandlers,
            })),
          };

          // Yield each transition one at a time
          yield {
            element: move.element,
            fromContainer: origin.id,
            toContainer: target.id,
            transitionType,
            resultingState: externalResultingState,
            lexicalIndex,
            cost: evaluatedCost,
            metadata: rule.metadata,
          };
        }
      }
    }
  }
}
