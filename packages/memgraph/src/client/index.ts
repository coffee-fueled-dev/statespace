import {
  GraphQLClient,
  type RequestDocument,
  type Variables,
} from "graphql-request";
import type { GraphQLError } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

export * from "./generated/types";
export * from "./operations";

export interface StatespaceResponse<Data> {
  status: number;
  headers: Headers;
  data: Data;
  extensions?: unknown;
  errors?: GraphQLError[];
}

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

export const createClient = ({ endpoint, accessToken }: ClientOptions) => {
  const client = new GraphQLClient(endpoint, {
    headers: authorization(accessToken),
  });

  return {
    gql: <T, V extends Variables = Variables>(
      document: RequestDocument | TypedDocumentNode<T, V>,
      variables?: WithAccessToken<V>
    ): Promise<T> => {
      if (variables?.accessToken) {
        const authHeaders = authorization(variables.accessToken);
        return (client.request as any)(document, variables, authHeaders);
      }
      return (client.request as any)(document, variables);
    },
  };
};
