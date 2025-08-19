import { generate, type CodegenConfig } from "@graphql-codegen/cli";
import { type GraphQLSchema, printSchema } from "graphql";
import path from "path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "url";
import fg from "fast-glob";
import { pino } from "pino";
import { getSchema } from "../server/startup";

const logger = pino({
  name: "schema",
});

const getPaths = (ROOT: string) => {
  const pathOut = (target: string) => path.join(ROOT, target, "generated");
  const pathIn = (target: string) => path.join(ROOT, target);
  return {
    output: {
      examples: {
        sdl: path.join(pathOut("packages/examples/src"), "sdl.graphql"),
      },
      memgraph: {
        client: {
          types: path.join(pathOut("packages/memgraph/src/client"), "types.ts"),
          operations: pathOut("packages/memgraph/src/client"),
        },
        server: {
          sdl: path.join(
            pathOut("packages/memgraph/src/server"),
            "sdl.graphql"
          ),
        },
      },
    },
    input: {
      sdl: path.join(pathIn("packages/memgraph/src/schema"), "**/*.graphql"),
      operations: path.join(
        pathIn("packages/memgraph/src/client"),
        "**/*.graphql"
      ),
    },
  };
};

export async function compileSDL(pattern: string) {
  const files = fg.sync(pattern);
  if (files.length === 0) {
    logger.warn(`No .graphql files found at ${pattern}`);
  }
  const typeDefs = await Promise.all(
    files.map((file) => Bun.file(file).text())
  );
  return typeDefs.join("\n");
}

const getConfig = (
  schema: GraphQLSchema,
  paths: ReturnType<typeof getPaths>
): CodegenConfig => ({
  overwrite: true,
  schema: printSchema(schema),
  documents: [paths.input.operations],
  verbose: false,
  noSilentErrors: false,
  ignoreNoDocuments: true,
  silent: true,
  errorsOnly: true,
  generates: {
    [paths.output.memgraph.client.types]: {
      plugins: ["typescript"],
    },
    [paths.output.examples.sdl]: {
      plugins: ["schema-ast"],
    },
    [paths.output.memgraph.client.operations]: {
      preset: "near-operation-file",
      plugins: ["typescript-operations", "typed-document-node"],
      presetConfig: {
        baseTypesPath: "types.ts",
        fileName: "operations",
      },
      config: {
        namingConvention: {
          typeNames: "change-case-all#pascalCase",
          enumValues: "change-case-all#pascalCase",
        },
        scalars: {
          DateTime: "string",
        },
      },
    },
  },
});

if (import.meta.main) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const ROOT = path.resolve(__dirname, "../../../../");
  const { input, output } = getPaths(ROOT);

  const SDL = await compileSDL(input.sdl);

  if (SDL) {
    await mkdir(path.dirname(output.memgraph.server.sdl), { recursive: true });
    Bun.write(output.memgraph.server.sdl, SDL);
  }

  getSchema(SDL)
    .then((neo4jSchema) =>
      generate(getConfig(neo4jSchema, { input, output }), true)
    )
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
