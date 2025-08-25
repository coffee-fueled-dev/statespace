import Ajv, { type ValidateFunction } from "ajv";
import { ValidationSchema, type Validation, type Schema } from "./schema.zod";
import type { Validated, Shape } from "./types";

const ajv = new Ajv();

/**
 * Compiles a StatespaceSystem schema (nested structure) into an AJV validator function
 * @param schema - A system schema with nested validation objects
 * @returns AJV validator function with proper TypeScript typing for the entire system
 */
export const makeExecutableSchema = <TSchema extends Schema>(
  schema: TSchema
): ValidateFunction<Shape<TSchema>> => {
  // Convert the system schema to an object validation schema
  const objectSchema: Validation = {
    type: "object",
    require: Object.fromEntries(
      Object.entries(schema).map(([key, value]) => {
        if ("type" in value) {
          // It's a direct Validation
          return [key, value as Validation];
        } else {
          // It's a nested object of Validations - convert to object validation
          return [
            key,
            {
              type: "object" as const,
              require: value as Record<string, Validation>,
            },
          ];
        }
      })
    ),
  };

  return makeExecutableValidator(objectSchema) as ValidateFunction<
    Shape<TSchema>
  >;
};

/**
 * Compiles a single Validation schema into an AJV validator function
 * @param validation - A single validation schema object
 * @returns AJV validator function with proper TypeScript typing
 */
export const makeExecutableValidator = <TValidation extends Validation>(
  validation: TValidation
): ValidateFunction<Validated<TValidation>> => {
  const parsed = ValidationSchema.parse(validation);
  const schema = compileAjvSchema(parsed);
  return ajv.compile(schema) as ValidateFunction<Validated<TValidation>>;
};

function compileAjvSchema(validation: Validation): any {
  switch (validation.type) {
    case "string":
      return compileStringSchema(validation);
    case "number":
      return compileNumberSchema(validation);
    case "boolean":
      return compileBooleanSchema(validation);
    case "date":
      return compileDateSchema(validation);
    case "array":
      return compileArraySchema(validation);
    case "object":
      return compileObjectSchema(validation);
    case "null":
      return { type: "null" };
    case "undefined":
      return {}; // AJV doesn't have undefined type, so we allow anything
    default:
      throw new Error(
        `Unsupported validation type: ${(validation as any).type}`
      );
  }
}

function compileStringSchema(validation: Validation & { type: "string" }): any {
  const schema: any = { type: "string" };

  if (validation.require) {
    for (const req of validation.require) {
      switch (req.operator) {
        case "maxLength":
          schema.maxLength = req.args;
          break;
        case "minLength":
          schema.minLength = req.args;
          break;
        case "length":
          schema.minLength = req.args;
          schema.maxLength = req.args;
          break;
        case "includes":
          schema.pattern = escapeRegex(req.args);
          break;
        case "startsWith":
          schema.pattern = `^${escapeRegex(req.args)}`;
          break;
        case "endsWith":
          schema.pattern = `${escapeRegex(req.args)}$`;
          break;
        case "lowercase":
          schema.pattern = "^[^A-Z]*$";
          break;
        case "uppercase":
          schema.pattern = "^[^a-z]*$";
          break;
      }
    }
  }

  return schema;
}

function compileNumberSchema(validation: Validation & { type: "number" }): any {
  const schema: any = { type: "number" };

  if (validation.require) {
    for (const req of validation.require) {
      switch (req.operator) {
        case "lt":
          schema.exclusiveMaximum = req.args;
          break;
        case "lte":
          schema.maximum = req.args;
          break;
        case "gt":
          schema.exclusiveMinimum = req.args;
          break;
        case "gte":
          schema.minimum = req.args;
          break;
        case "multipleOf":
          schema.multipleOf = req.args;
          break;
        case "positive":
          schema.exclusiveMinimum = 0;
          break;
        case "negative":
          schema.exclusiveMaximum = 0;
          break;
        case "nonpositive":
          schema.maximum = 0;
          break;
        case "nonnegative":
          schema.minimum = 0;
          break;
      }
    }
  }

  return schema;
}

function compileBooleanSchema(
  validation: Validation & { type: "boolean" }
): any {
  const schema: any = { type: "boolean" };

  if (validation.require) {
    const req = validation.require;
    if (req.operator === "true") {
      schema.const = true;
    } else if (req.operator === "false") {
      schema.const = false;
    }
  }

  return schema;
}

function compileDateSchema(validation: Validation & { type: "date" }): any {
  const schema: any = { type: "string", format: "date-time" };

  if (validation.require) {
    const req = validation.require;
    switch (req.operator) {
      case "before":
        schema.formatMaximum = req.args;
        break;
      case "after":
        schema.formatMinimum = req.args;
        break;
      case "between":
        schema.formatMinimum = req.args.start;
        schema.formatMaximum = req.args.end;
        break;
    }
  }

  return schema;
}

function compileArraySchema(validation: Validation & { type: "array" }): any {
  const schema: any = { type: "array" };

  if (validation.require) {
    for (const req of validation.require) {
      switch (req.operator) {
        case "length":
          switch (req.args.method) {
            case "eq":
              schema.minItems = req.args.value;
              schema.maxItems = req.args.value;
              break;
            case "lt":
              schema.maxItems = req.args.value - 1;
              break;
            case "lte":
              schema.maxItems = req.args.value;
              break;
            case "gt":
              schema.minItems = req.args.value + 1;
              break;
            case "gte":
              schema.minItems = req.args.value;
              break;
          }
          break;
        case "shape":
          schema.items = compileAjvSchema(req.value as Validation);
          break;
      }
    }
  }

  return schema;
}

function compileObjectSchema(validation: Validation & { type: "object" }): any {
  const schema: any = { type: "object" };

  if (validation.require) {
    schema.properties = {};
    schema.required = [];

    for (const [key, propValidation] of Object.entries(validation.require)) {
      schema.properties[key] = compileAjvSchema(propValidation);

      // If the property is not undefined or null, it's required
      if (
        propValidation.type !== "undefined" &&
        propValidation.type !== "null"
      ) {
        schema.required.push(key);
      }
    }

    if (schema.required.length === 0) {
      delete schema.required;
    }
  }

  return schema;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
