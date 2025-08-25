import type { Schema, Shape } from "../schema";
import type { Metadata } from "../shared/schema.zod";

export type Hash = string;

export type TransitionEvent<TShape extends Shape<Schema>> = {
  currentState: { shape: TShape; hash?: Hash };
  nextState: { shape: TShape; hash?: Hash };
  ruleName: string;
  cost?: number | null | undefined;
  metadata?: Metadata | null | undefined;
};

type TransitionResultBase<TShape extends Shape<Schema>> = {
  /** The name of the transition rule that was applied */
  ruleName: string;
  /** The resulting state after applying the transition */
  systemState: { shape: TShape; hash?: Hash };
  /** The cost of applying this transition */
  cost: number;
  /** Metadata for the transition */
  metadata?: Metadata | null | undefined;
};

/**
 * Represents the result of applying a transition rule.
 */
export interface TransitionSuccess<TShape extends Shape<Schema>>
  extends TransitionResultBase<TShape> {
  success: true;
}

/**
 * Represents a failed transition attempt.
 */
export interface TransitionFailure<TShape extends Shape<Schema>>
  extends TransitionResultBase<TShape> {
  /** Whether the transition was successful */
  success: false;
  /** The reason for the failure */
  reason: "constraint" | "shape";
  /** Error details */
  errors: string[];
}

/**
 * Union type for transition outcomes.
 */
export type TransitionResult<TShape extends Shape<Schema>> =
  | TransitionSuccess<TShape>
  | TransitionFailure<TShape>;
