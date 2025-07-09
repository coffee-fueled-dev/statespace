import type { Element, InternalContainer } from "..";

/**
 * Create new container configuration after a move
 */
export function createNewContainers(
  containers: InternalContainer[],
  originId: string,
  newOriginSlots: Element[],
  targetId: string,
  newTargetSlots: Element[]
): InternalContainer[] {
  return containers.map((container) => {
    if (container.id === originId) {
      return { ...container, slots: newOriginSlots };
    }
    if (container.id === targetId) {
      return { ...container, slots: newTargetSlots };
    }
    return container;
  });
}
