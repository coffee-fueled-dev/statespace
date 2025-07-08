// Core types for the Lehmer-based state space exploration framework

import type { TransitionEngineConfig } from "./transition-engine";

export type Element = string | boolean;
export type Permutation = Element[];
export type LexicalIndex = number;

// Generic position type - can be any string defined by the user
export type PositionType = string;

// Generic transition type - can be any string defined by the user
export type TransitionType = string;

export type PositionReference = string;

// Position handler interface for custom position behavior
export interface PositionHandler {
  canMoveFrom: (
    slots: Element[]
  ) => { element: Element; modifiedSlots: Element[] }[];
  canMoveTo: (slots: Element[], element: Element) => Element[][];
}

export interface TransitionRule {
  targetId: string;
  from: PositionReference;
  to: PositionReference;
  transitionType?: TransitionType;
  metadata?: Record<string, any>;
}

export interface Container {
  id: string;
  slots: Element[];
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
  elementBank: (string | boolean)[];
  transitionEngine?: TransitionEngineConfig;
  metadata?: Record<string, any>;
}
