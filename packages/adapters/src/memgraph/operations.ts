// Cypher queries for memgraph operations

export const BATCH_UPSERT_STATES_AND_TRANSITIONS_QUERY = `
  // First, create/update all states with config hash
  UNWIND $states as stateData
  MERGE (state:State {index: stateData.index, configHash: stateData.configHash})
  ON CREATE SET 
    state.timestamp_created = timestamp(),
    state.timestamp_last_seen = timestamp()
  ON MATCH SET 
    state.timestamp_last_seen = timestamp()

  WITH collect(state) as processed_states

  // Then create transitions
  UNWIND $transitions as transitionData
  MATCH (fromState:State {index: transitionData.fromIndex})
  MATCH (toState:State {index: transitionData.toIndex})
  MERGE (fromState)-[t:TRANSITION {
    element: transitionData.element,
    fromContainer: transitionData.fromContainer,
    toContainer: transitionData.toContainer,
    transitionType: transitionData.transitionType
  }]->(toState)
  ON CREATE SET 
    t.cost = transitionData.cost,
    t.metadata = transitionData.metadata,
    t.timestamp_created = timestamp(),
    t.timestamp_last_seen = timestamp()
  ON MATCH SET 
    t.timestamp_last_seen = timestamp()
  
  RETURN count(processed_states) as states_processed, count(t) as transitions_processed
  `;

export const GET_STATES_BY_CONFIG_QUERY = `
  MATCH (state:State {configHash: $configHash})
  RETURN state.index as stateIndex
  ORDER BY stateIndex
  `;

export const GET_CONFIG_FROM_STATE_QUERY = `
  MATCH (state:State {index: $stateIndex})
  RETURN state.configHash as configHash
  LIMIT 1
  `;

export const CLEANUP_OLD_STATES_QUERY = `
  MATCH (state:State)
  WHERE state.timestamp_last_seen < $cutoffTimestamp
  DETACH DELETE state
  RETURN count(state) as deleted_count
  `;
