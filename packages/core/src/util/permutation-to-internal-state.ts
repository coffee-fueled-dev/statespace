import type { Container, Element, InternalSystemState } from "..";

export function permutationToInternalState(
  permutation: Element[],
  containers: Container[]
): InternalSystemState {
  let slotIndex = 0;
  const internalContainers = containers.map((container) => {
    const slots = permutation.slice(slotIndex, slotIndex + container.slots);
    slotIndex += container.slots;
    return {
      id: container.id,
      slots,
      metadata: container.metadata,
      allowedTransitions: container.allowedTransitions,
      positionHandlers: container.positionHandlers,
    };
  });

  return { containers: internalContainers };
}
