import {
  GraphQLClient,
  type RequestDocument,
  type Variables,
} from "graphql-request";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

export * from "./generated/types";
export * from "./operations";

export type StatespaceResponse<Data> = Data;

export type WithAccessToken<T> = T extends { [key: string]: never }
  ? { accessToken?: string }
  : T & { accessToken?: string };

export const authorization = (accessToken?: string) => {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
};

export interface ClientOptions {
  endpoint: string;
  accessToken?: string;
}

const serializeVariables = (variables: Variables): Variables => {
  return JSON.parse(
    JSON.stringify(variables, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
};

export const createClient = ({ endpoint, accessToken }: ClientOptions) => {
  const client = new GraphQLClient(endpoint, {
    headers: authorization(accessToken),
  });

  return {
    gql: <T, V extends Variables = Variables>(
      document: RequestDocument | TypedDocumentNode<T, V>,
      variables?: WithAccessToken<V>
    ): Promise<T> => {
      const serializedVariables = variables
        ? serializeVariables(variables)
        : undefined;

      if (variables?.accessToken) {
        const authHeaders = authorization(variables.accessToken);
        return (client.request as any)(
          document,
          serializedVariables,
          authHeaders
        );
      }
      return (client.request as any)(document, serializedVariables);
    },
  };
};
