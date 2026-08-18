import Ajv from "ajv";
import { TransitionRepository } from "../transition/adapters";
import type { TransitionFn, TransitionSuccess } from "../transition/domain";
import type { ExecutableStateSpace, IStateSpaceRepository, StateSpace } from "./domain";

const ajv = new Ajv({
  strict: false,
  validateSchema: false,
});

export const StateSpaceRepository: IStateSpaceRepository = {
  makeExecutable: <TState extends object>(
    stateSpace: StateSpace<TState>,
  ): ExecutableStateSpace<TState> => {
    const validator = ajv.compile(stateSpace.shape);
    const byName = new Map<string, TransitionFn<TState>>();

    for (const transition of stateSpace.transitions) {
      if (byName.has(transition.name)) {
        throw new Error(`Duplicate transition name: ${transition.name}`);
      }
      byName.set(transition.name, TransitionRepository.makeExecutable(transition, validator));
    }

    const apply: ExecutableStateSpace<TState>["apply"] = (state, name, context) => {
      const fn = byName.get(name);
      if (!fn) {
        return {
          success: false,
          name,
          state,
          error: `Unknown transition: ${name}`,
        };
      }
      return fn(state, context);
    };

    return {
      shape: stateSpace.shape,
      transitions: stateSpace.transitions,
      apply,
      enabled: (state, context) => {
        const neighbors: TransitionSuccess<TState>[] = [];
        for (const transition of stateSpace.transitions) {
          const result = apply(state, transition.name, context);
          if (result.success) {
            neighbors.push(result);
          }
        }
        return neighbors;
      },
    };
  },
};
