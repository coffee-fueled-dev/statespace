import type { StatespaceConfig } from "../types";

export interface StateEstimate {
  upperBound: number;
  calculation: string;
  warnings: string[];
  breakdown: {
    totalSlots: number;
    uniqueElements: number;
    containers: Array<{
      id: string;
      slots: number;
    }>;
  };
}

/**
 * Calculate upper bound estimate of unique states for a configuration
 * Uses simple permutation logic: arranging unique elements across available slots
 */
export function estimateStateCount(config: StatespaceConfig): StateEstimate {
  const totalSlots = config.containers.reduce(
    (sum, container) => sum + container.slots,
    0
  );

  const uniqueElements = config.elementBank.length;
  const warnings: string[] = [];

  let upperBound: number;
  let calculation: string;

  // Basic validation and warnings
  if (uniqueElements > totalSlots) {
    upperBound = 0;
    calculation = `Impossible: ${uniqueElements} elements > ${totalSlots} slots`;
    warnings.push("Configuration is impossible - more elements than slots");
  } else if (uniqueElements === 0) {
    upperBound = 1;
    calculation = "No elements = 1 empty state";
  } else {
    // P(totalSlots, uniqueElements) = totalSlots! / (totalSlots - uniqueElements)!
    upperBound = permutations(totalSlots, uniqueElements);
    calculation = `P(${totalSlots}, ${uniqueElements}) = ${totalSlots}! / ${
      totalSlots - uniqueElements
    }!`;
  }

  // Add helpful warnings
  if (totalSlots > 15) {
    warnings.push(
      `Large state space: ${totalSlots} slots may result in ${formatStateCount(
        upperBound
      )} states`
    );
  }

  if (config.containers.length > 4) {
    warnings.push(
      `Many containers (${config.containers.length}) - actual reachable states will be much smaller`
    );
  }

  if (upperBound > 1e6) {
    warnings.push(
      "Consider selective exploration or rule-based pruning for large state spaces"
    );
  }

  return {
    upperBound,
    calculation,
    warnings,
    breakdown: {
      totalSlots,
      uniqueElements,
      containers: config.containers.map((c) => ({
        id: c.id,
        slots: c.slots,
      })),
    },
  };
}

/**
 * Calculate permutations P(n,r) = n! / (n-r)!
 */
function permutations(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0) return 1;

  let result = 1;
  for (let i = n; i > n - r; i--) {
    result *= i;
    // Prevent overflow for large numbers
    if (result > Number.MAX_SAFE_INTEGER / (n - r + 1)) {
      return Number.MAX_SAFE_INTEGER;
    }
  }
  return result;
}

/**
 * Format large numbers for display
 */
export function formatStateCount(count: number): string {
  if (count === Number.MAX_SAFE_INTEGER) {
    return "∞ (overflow)";
  }
  if (count >= 1e12) {
    return `${(count / 1e12).toFixed(1)}T`;
  }
  if (count >= 1e9) {
    return `${(count / 1e9).toFixed(1)}B`;
  }
  if (count >= 1e6) {
    return `${(count / 1e6).toFixed(1)}M`;
  }
  if (count >= 1e3) {
    return `${(count / 1e3).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

export function logSpaceEstimates(config: StatespaceConfig) {
  console.log("=== State Space Analysis ===");
  const estimate = estimateStateCount(config);
  console.log(
    `Configuration: ${estimate.breakdown.uniqueElements} elements, ${estimate.breakdown.containers.length} containers, ${estimate.breakdown.totalSlots} total slots`
  );
  console.log(
    `Theoretical upper bound: ${formatStateCount(estimate.upperBound)} states`
  );
  console.log(`Calculation: ${estimate.calculation}`);

  if (estimate.warnings.length > 0) {
    console.log("Warnings:");
    estimate.warnings.forEach((warning) => console.log(`  ⚠️  ${warning}`));
  }

  console.log("\nContainer breakdown:");
  estimate.breakdown.containers.forEach((container) =>
    console.log(`  ${container.id}: ${container.slots} slots`)
  );
}
