import { z } from "zod";

const PropertySchema = z
  .object({
    name: z.string().describe("The name of the property."),
    description: z
      .string()
      .describe(
        "A detailed description of the property and its purpose on the entity."
      ),
    type: z
      .enum(["string", "number", "boolean", "array", "object"])
      .describe("The type of the property."),
  })
  .describe(
    "A property is a feature of an entity, like a color, value, label, etc. " +
      "It may be modified by transitions and used to constrain when a transition is or isn't allowed."
  );

export type RoughEntity = z.infer<typeof RoughEntitySchema>;
export const RoughEntitySchema = z
  .object({
    name: z.string().describe("The name of the entity."),
    description: z
      .string()
      .describe(
        "A detailed description of the entity and its purpose in the system."
      ),
    properties: z
      .array(PropertySchema)
      .describe(
        "Use properties to describe the specific, modifiable features of the entity. " +
          "These properties are the features of states in the system, and will also be " +
          "used to create constraint rules that limit the reachable states."
      ),
  })
  .describe(
    "An entity is a modifiable participant in the system. " +
      "It may be an entity in a software system, a real world object, a concept, a person, a software component, and many other things. " +
      "The key point is that an entity has properties that can be modified. " +
      "The various combinations of properties form the states of the system."
  );
