import { print } from "graphql";
import {
  createClient,
  type StatespaceResponse,
  type WithAccessToken,
} from "../../";
import {
  StatesListDocument,
  StatesCreateDocument,
  StatesCreateBatchDocument,
  StatesUpsertDocument,
  StatesUpsertBatchDocument,
  StatesCreateTransitionDocument,
  type StatesListQuery,
  type StatesListQueryVariables,
  type StatesCreateMutation,
  type StatesCreateMutationVariables,
  type StatesCreateBatchMutation,
  type StatesCreateBatchMutationVariables,
  type StatesUpsertMutationVariables,
  type StatesUpsertMutation,
  type StatesUpsertBatchMutation,
  type StatesUpsertBatchMutationVariables,
  type StatesCreateTransitionMutation,
  type StatesCreateTransitionMutationVariables,
} from "./operations.generated";

export * from "./operations.generated";

const StatesListDocumentString = print(StatesListDocument);
const StatesCreateDocumentString = print(StatesCreateDocument);
const StatesCreateBatchDocumentString = print(StatesCreateBatchDocument);
const StatesUpsertDocumentString = print(StatesUpsertDocument);
const StatesUpsertBatchDocumentString = print(StatesUpsertBatchDocument);
const StatesCreateTransitionDocumentString = print(
  StatesCreateTransitionDocument
);

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
  createTransition({
    accessToken,
    ...variables
  }: WithAccessToken<StatesCreateTransitionMutationVariables>): Promise<
    StatespaceResponse<StatesCreateTransitionMutation>
  > {
    return client.gql(StatesCreateTransitionDocumentString, {
      ...variables,
      accessToken,
    });
  },
  upsert({
    accessToken,
    ...variables
  }: WithAccessToken<StatesUpsertMutationVariables>): Promise<
    StatespaceResponse<StatesUpsertMutation>
  > {
    return client.gql(StatesUpsertDocumentString, {
      ...variables,
      accessToken,
    });
  },
  upsertBatch({
    accessToken,
    ...variables
  }: WithAccessToken<StatesUpsertBatchMutationVariables>): Promise<
    StatespaceResponse<StatesUpsertBatchMutation>
  > {
    return client.gql(StatesUpsertBatchDocumentString, {
      ...variables,
      accessToken,
    });
  },
});
