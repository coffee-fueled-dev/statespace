import { PathRepository } from "../path/adapters";
import type { IConstraintRepository } from "./domain";
import Ajv from "ajv";

const ajv = new Ajv({
  strict: false,
  validateSchema: false,
});

export const ConstraintRepository: IConstraintRepository = {
  apply: (constraint, state, path, phase) =>
    ConstraintRepository.makeExecutable(constraint)(path, state, phase),

  createImperative: (fn) => (path, state, phase) => {
    const value = PathRepository.valueFromPath(path, state);
    const result = fn(value, state);

    return ConstraintRepository.formatResult({
      isValid: result.success,
      state,
      phase,
      path,
      message: result.message,
    });
  },

  formatResult: ({ isValid, state, phase, path, message }) => {
    if (isValid) {
      return {
        success: true,
        state,
        phase,
        path,
      };
    } else {
      return {
        success: false,
        state,
        phase,
        path,
        message: message || "Constraint validation failed",
      };
    }
  },

  makeExecutable: (constraint) => (path, state, phase) => {
    if (typeof constraint.validation === "function") {
      return constraint.validation(path, state, phase);
    }
    const value = PathRepository.valueFromPath(path, state);
    const validator = ajv.compile(constraint.validation);
    const isValid = validator(value);

    const errorMessage =
      validator.errors
        ?.map((err) => `${err.instancePath} ${err.message}`)
        .join(", ") || "Validation failed";

    return ConstraintRepository.formatResult({
      isValid,
      state,
      phase,
      path,
      message: errorMessage,
    });
  },
} as const;
