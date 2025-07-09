# Memgraph Persistence Example

Demonstrates persisting state transitions to Memgraph using the `@statespace/adapters` package.

## Prerequisites

**Important**: This example requires a running Memgraph instance.

1. **Install Memgraph**: Download from [memgraph.com](https://memgraph.com/download)
2. **Start Memgraph**: Run with default settings on port 7687
3. **Verify connection**: Ensure Memgraph is accessible at `neo4j://localhost:7687`

## Environment Variables

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

- Creates config-aware MemgraphAdapter with bijective config hashing
- Generates transitions from multiple seed states
- Converts transitions to Markov links with config hash
- Batches and persists to database
- Demonstrates both batch and individual enqueue

## Database Schema

**States**: `State` nodes with `index` and `configHash` properties
**Transitions**: `TRANSITION` relationships with transition details

## Expected Output

```
Persistence example completed successfully
```

## Troubleshooting

### Connection Errors

If you see "Could not perform discovery" or "Pool is closed" errors:

1. Ensure Memgraph is running: `sudo systemctl start memgraph` (Linux) or start Memgraph app
2. Check connection: `telnet localhost 7687`
3. Verify credentials match environment variables

### Success with Errors

If you see "Persistence example completed successfully" followed by connection errors, the example worked correctly. The errors occur during cleanup when Memgraph is not accessible.

## Query Examples

```cypher
MATCH (s:State) RETURN count(s);
MATCH ()-[t:TRANSITION]->() RETURN count(t);
MATCH (s:State) RETURN DISTINCT s.configHash;
```
