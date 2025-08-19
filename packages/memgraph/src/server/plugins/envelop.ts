import {
  useResponseCache,
  createInMemoryCache,
} from "@graphql-yoga/plugin-response-cache";
import { execute, parse, specifiedRules, subscribe, validate } from "graphql";
import { envelop, useEngine } from "@envelop/core";
import { EnvelopArmor } from "@escape.tech/graphql-armor";

const responseCache = createInMemoryCache();

const armor = new EnvelopArmor({
  maxDepth: { n: 6 },
});
const protection = armor.protect();

const getEnveloped = async () => {
  return envelop({
    plugins: [
      useEngine({
        parse,
        validate,
        specifiedRules,
        execute,
        subscribe,
      }),
      useResponseCache({
        ttl: 2000,
        ttlPerSchemaCoordinate: {
          "Query.__schema": undefined, // cache infinitely
        },
        session: () => null,
        cache: responseCache,
      }),
      ...protection.plugins,
    ],
  });
};

export default getEnveloped;
