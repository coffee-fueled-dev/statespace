import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import type { Element, InternalContainer, Transition } from "..";
import { getPositionHandler } from "./get-position-handler";

/**
 * Get valid placements in a container based on position
 */
export function getValidPlacements(
  position: string,
  container: InternalContainer,
  transition: Transition,
  positionHandlers: Record<PositionType, PositionHandler>
): Element[][] {
  const handler = getPositionHandler(position, container, positionHandlers);
  return handler ? handler.canMoveTo(container.slots, transition) : [];
}
