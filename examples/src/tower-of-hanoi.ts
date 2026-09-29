import {
  bfs,
  Explorer,
  jsonCodex,
  type Schema,
  StateSpaceRepository,
  type Transition,
} from "@very-coffee/statespace";

interface HanoiState {
  pegs: number[][];
}
const hanoiSchema: Schema<HanoiState> = {
  type: "object",
  properties: {
    pegs: {
      type: "array",
      items: {
        type: "array",
        items: { type: "number" },
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["pegs"],
  additionalProperties: false,
};

function createMove(from: number, to: number): Transition<HanoiState> {
  return {
    name: `Move ${from}->${to}`,
    constraints: [], // We'll enforce legality in the effect
    effect: {
      operation: "transform",
      transform: (state) => {
        const newState = structuredClone(state);
        const src = newState.pegs[from];
        const dst = newState.pegs[to];
        if (!src || !dst) {
          return {
            success: false,
            error: "Invalid peg",
          };
        }

        const disk = src.at(-1);
        if (disk === undefined) {
          return {
            success: false,
            error: "Empty source",
          };
        }
        const top = dst.at(-1);
        if (top !== undefined && top < disk) {
          return {
            success: false,
            error: "Illegal move",
          };
        }

        src.pop();
        dst.push(disk);
        return { success: true, state: newState };
      },
    },
  };
}

// Generate all 6 transitions for 3 pegs
const hanoiTransitions: Transition<HanoiState>[] = [];
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (i !== j) hanoiTransitions.push(createMove(i, j));
  }
}

const hanoiStateSpace = StateSpaceRepository.makeExecutable({
  shape: hanoiSchema,
  transitions: hanoiTransitions,
});

const initialState: HanoiState = { pegs: [[3, 2, 1], [], []] };
const goalState: HanoiState = { pegs: [[], [], [3, 2, 1]] };
const explorer = new Explorer(hanoiStateSpace, jsonCodex<HanoiState>());

let goalHash: string | null = null;

const result = await explorer.study(bfs, {
  initialState,
  exitConditions: [
    async (exp) => {
      for (const [hash] of exp.graph) {
        const decoded = await exp.decode(hash);
        if (JSON.stringify(decoded) === JSON.stringify(goalState)) {
          goalHash = hash; // Store the goal hash for later use
          return {
            exitReason: "Goal reached",
            lastTransition: null,
          };
        }
      }
      return null;
    },
  ],
});

console.log(result.exitReason);

// If we found the goal, reconstruct and display the shortest path
if (result.exitReason === "Goal reached" && result.reconstructPath && goalHash) {
  const path = await result.reconstructPath(goalHash);
  console.log(`\nShortest path (${path.length} moves):`);

  let currentState = initialState;
  console.log("Initial:", JSON.stringify(currentState.pegs));

  for (let i = 0; i < path.length; i++) {
    const transition = path[i];
    if (!transition) continue;
    currentState = transition.state;
    console.log(`${i + 1}. ${transition.name}: ${JSON.stringify(currentState.pegs)}`);
  }
}
