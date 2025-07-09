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
 * Generate ALL transitions from current state (breadth-first strategy)
 * Takes position handlers as input and generates all possible next states
 */
export function breadthFirst(
  currentState: InternalSystemState,
  encodeState: (state: InternalSystemState) => number,
  positionHandlers: Record<PositionType, PositionHandler>,
  getTransitionType: (
    fromContainer: string,
    toContainer: string,
    rule?: any
  ) => TransitionType = () => "MOVE"
): StateTransition[] {
  const transitions: StateTransition[] = [];

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
        const placements = getValidPlacements(
          rule.to,
          target,
          move.element,
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

          transitions.push({
            element: move.element,
            fromContainer: origin.id,
            toContainer: target.id,
            transitionType,
            resultingState: externalResultingState,
            lexicalIndex,
            metadata: rule.metadata,
          });
        }
      }
    }
  }

  return transitions;
}
