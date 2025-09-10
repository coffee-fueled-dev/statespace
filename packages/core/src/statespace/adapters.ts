import { TransitionRepository } from "../transition/adapters";
import type { IStateSpaceRepository } from "./domain";
import Ajv from "ajv";

const ajv = new Ajv({
  strict: false,
  validateSchema: false,
});

export const StateSpaceRepository: IStateSpaceRepository = {
  makeExecutable: (stateSpace) => ({
    shape: stateSpace.shape,
    transitions: stateSpace.transitions.map((transition) =>
      TransitionRepository.makeExecutable(
        transition,
        ajv.compile(stateSpace.shape),
      ),
    ),
  }),
};
