// Core types for the Lehmer-based state space exploration framework

import type {
  PositionType,
  PositionReference,
  PositionHandler,
} from "@statespace/position-handlers";

// Internal container format with actual slot arrays for processing
export interface InternalContainer {
  id: string;
  slots: Element[];
  metadata?: Record<string, any>;
  allowedTransitions: any[];
  positionHandlers?: Record<PositionType, PositionHandler>;
}

// Internal system state for processing
export interface InternalSystemState {
  containers: InternalContainer[];
}

export type Element = string | boolean;
export type Permutation = Element[];
export type LexicalIndex = number;

// Generic transition type - can be any string defined by the user
export type TransitionType = string;

export interface TransitionRule {
  targetId: string;
  from: PositionReference;
  to: PositionReference;
  transitionType?: TransitionType;
  metadata?: Record<string, any>;
}

export interface Container {
  id: string;
  slots: number; // Number of slots in the container
  metadata?: Record<string, any>;
  allowedTransitions: TransitionRule[];
  positionHandlers?: Record<PositionType, PositionHandler>;
}

export interface SystemState {
  containers: Container[];
}

export interface StateTransition {
  element: Element;
  fromContainer: string;
  toContainer: string;
  transitionType: TransitionType;
  resultingState: SystemState;
  lexicalIndex: LexicalIndex;
  metadata?: Record<string, any>;
}

export interface StatespaceConfig {
  name: string;
  description: string;
  containers: Container[];
  elementBank: string[]; // Only non-false elements
  metadata?: Record<string, any>;
}
