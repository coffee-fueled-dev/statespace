import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import type { StatespaceConfig } from "@statespace/core";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Encode a StatespaceConfig into a bijective hash using gzip compression
 * The hash can be decoded back to the original config
 */
export async function encodeConfig(config: StatespaceConfig): Promise<string> {
  const jsonString = JSON.stringify(config, Object.keys(config).sort());
  const compressed = await gzipAsync(Buffer.from(jsonString, "utf8"));
  return compressed.toString("base64");
}

/**
 * Decode a config hash back to the original StatespaceConfig
 */
export async function decodeConfig(encoded: string): Promise<StatespaceConfig> {
  const compressed = Buffer.from(encoded, "base64");
  const decompressed = await gunzipAsync(compressed);
  return JSON.parse(decompressed.toString("utf8"));
}

/**
 * Synchronous version using deflate for smaller configs
 */
export function encodeConfigSync(config: StatespaceConfig): string {
  const jsonString = JSON.stringify(config, Object.keys(config).sort());
  return Buffer.from(jsonString, "utf8").toString("base64");
}

/**
 * Synchronous decode
 */
export function decodeConfigSync(encoded: string): StatespaceConfig {
  const buffer = Buffer.from(encoded, "base64");
  return JSON.parse(buffer.toString("utf8"));
}
