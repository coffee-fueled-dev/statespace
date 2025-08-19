import { print } from "graphql";
import {
  createClient,
  type StatespaceResponse,
  type WithAccessToken,
} from "../../";
import {
  StatesListDocument,
  StatesUpdateDocument,
  StatesCreateDocument,
  StatesCreateBatchDocument,
  type StatesListQuery,
  type StatesListQueryVariables,
  type StatesCreateMutation,
  type StatesCreateMutationVariables,
  type StatesUpdateMutation,
  type StatesUpdateMutationVariables,
  type StatesCreateBatchMutation,
  type StatesCreateBatchMutationVariables,
} from "./operations.generated";
import type { GraphQLClient } from "graphql-request";

export * from "./operations.generated";

const StatesUpdateDocumentString = print(StatesUpdateDocument);
const StatesListDocumentString = print(StatesListDocument);
const StatesCreateDocumentString = print(StatesCreateDocument);
const StatesCreateBatchDocumentString = print(StatesCreateBatchDocument);

export type StateModule = ReturnType<typeof createStateModule>;
export const createStateModule = (client: ReturnType<typeof createClient>) => ({
  list({
    accessToken,
    ...variables
  }: WithAccessToken<StatesListQueryVariables>): Promise<
    StatespaceResponse<StatesListQuery>
  > {
    return client.gql(StatesListDocumentString, {
      ...variables,
      accessToken,
    });
  },
  create({
    accessToken,
    ...variables
  }: WithAccessToken<StatesCreateMutationVariables>): Promise<
    StatespaceResponse<StatesCreateMutation>
  > {
    return client.gql(StatesCreateDocumentString, {
      ...variables,
      accessToken,
    });
  },
  createBatch({
    accessToken,
    ...variables
  }: WithAccessToken<StatesCreateBatchMutationVariables>): Promise<
    StatespaceResponse<StatesCreateBatchMutation>
  > {
    return client.gql(StatesCreateBatchDocumentString, {
      ...variables,
      accessToken,
    });
  },
  update({
    accessToken,
    ...variables
  }: WithAccessToken<StatesUpdateMutationVariables>): Promise<
    StatespaceResponse<StatesUpdateMutation>
  > {
    return client.gql(StatesUpdateDocumentString, {
      ...variables,
      accessToken,
    });
  },
});
