import { generate, type CodegenConfig } from "@graphql-codegen/cli";
import { type GraphQLSchema, printSchema } from "graphql";
import path from "path";
import { fileURLToPath } from "url";
import { getSchema } from "../server/startup";

const getPaths = (ROOT: string) => {
  const pathOut = (target: string) => path.join(ROOT, target, "generated");
  const pathIn = (target: string) => path.join(ROOT, target);
  return {
    output: {
      graphql: {
        client: {
          types: path.join(pathOut("packages/graphql/src/client"), "types.ts"),
          operations: pathOut("packages/graphql/src/client"),
        },
      },
    },
    input: {
      operations: path.join(
        pathIn("packages/graphql/src/client"),
        "**/*.graphql"
      ),
    },
  };
};

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
    [paths.output.graphql.client.types]: {
      plugins: ["typescript"],
    },
    [paths.output.graphql.client.operations]: {
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
  const ROOT = path.resolve(__dirname, "../../../../../");
  const { input, output } = getPaths(ROOT);

  getSchema()
    .then((neo4jSchema) =>
      generate(getConfig(neo4jSchema, { input, output }), true)
    )
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
