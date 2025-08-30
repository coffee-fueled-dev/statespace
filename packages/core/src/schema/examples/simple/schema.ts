import { executableStateSpace } from "../..";
import { JSONSchemaDeclaration } from "./schemas/json-schema";
import { ZodDeclaration } from "./schemas/zod";

// JSON schema and Zod schema examples are interoperable because Zod can convert to JSON schema
const fromJSONSchema = executableStateSpace(JSONSchemaDeclaration);
const fromZod = executableStateSpace(ZodDeclaration);
