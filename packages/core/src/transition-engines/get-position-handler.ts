import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import type { InternalContainer } from "..";

/**
 * Get position handler with hierarchy: container-specific -> global
 */
export function getPositionHandler(
  position: string,
  container: InternalContainer,
  positionHandlers: Record<PositionType, PositionHandler>
): PositionHandler | null {
  // 1. Check container-specific handlers first
  if (container.positionHandlers?.[position]) {
    return container.positionHandlers[position];
  }

  // 2. Check global handlers
  if (positionHandlers[position]) {
    return positionHandlers[position];
  }

  return null;
}
