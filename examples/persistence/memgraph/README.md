# Memgraph Persistence Example

Demonstrates persisting state transitions to Memgraph using the `@statespace/adapters` package.

## Setup

1. Install and start Memgraph on port 7687
2. Set environment variables (optional):
   ```bash
   MEMGRAPH_URI=neo4j://localhost:7687
   MEMGRAPH_USER=neo4j
   MEMGRAPH_PASS=password
   ```

## Run

```bash
bun run --cwd examples/persistence start:memgraph
```

## What it does

- Creates MemgraphAdapter with batching options
- Generates transitions from multiple seed states
- Converts transitions to Markov links
- Batches and persists to database
- Demonstrates both batch and individual enqueue

## Database Schema

**States**: `State` nodes with `index` property
**Transitions**: `TRANSITION` relationships with transition details

## Query Examples

```cypher
MATCH (s:State) RETURN count(s);
MATCH ()-[t:TRANSITION]->() RETURN count(t);
MATCH (s:State)-[t:TRANSITION]->() RETURN s.index, count(t) ORDER BY count(t) DESC LIMIT 10;
```
