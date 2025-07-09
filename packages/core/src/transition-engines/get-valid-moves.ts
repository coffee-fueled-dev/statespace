import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import type { Element, InternalContainer } from "..";
import { getPositionHandler } from "./get-position-handler";

/**
 * Get valid moves from a container based on position
 */
export function getValidMoves(
  position: string,
  container: InternalContainer,
  positionHandlers: Record<PositionType, PositionHandler>
): { element: Element; modifiedSlots: Element[] }[] {
  const handler = getPositionHandler(position, container, positionHandlers);
  return handler ? handler.canMoveFrom(container.slots) : [];
}
