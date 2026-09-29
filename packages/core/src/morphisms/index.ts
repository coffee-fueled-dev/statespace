export {
  compose,
  composeArrows,
  defineMorphisms,
  identityArrow,
  instantiate,
} from "./category";
export { createMorphismSpace } from "./compile";
export type {
  Arrow,
  CompositionCertificate,
  MorphismDef,
  MorphismError,
  MorphismSpace,
  ObjectValue,
  SemanticObject,
} from "./domain";
export { formatMorphismError } from "./domain";
export { classify, classifyAs, defineObjects, objectByKey } from "./objects";
export type { Result } from "./result";
export { err, flatMap, mapError, ok } from "./result";
