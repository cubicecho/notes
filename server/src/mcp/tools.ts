/**
 * Schema → MCP tool descriptors.
 *
 * Every `Query`/`Mutation` root field becomes one tool: its arguments map to a
 * Zod input shape, and its return type drives an auto-generated selection set so
 * the AI gets useful data back without having to author GraphQL.
 *
 * This module is intentionally pure — no MCP SDK, no executor, no auth. The
 * tools it produces are executed against the *permission-wrapped* schema in
 * {@link ./index.ts}, which is where CASL/auth enforcement lives.
 */

import {
  type GraphQLArgument,
  type GraphQLField,
  type GraphQLInputType,
  type GraphQLNamedType,
  type GraphQLOutputType,
  type GraphQLSchema,
  getNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { type ZodTypeAny, z } from 'zod';

export type OperationType = 'query' | 'mutation';

export interface GraphqlTool {
  /** Tool name == GraphQL root-field name. */
  name: string;
  /** Human/AI-facing description built from the SDL docstrings + signature. */
  description: string;
  operationType: OperationType;
  /** The GraphQL document executed when the tool is called. */
  operation: string;
  /** MCP input schema, as a Zod raw shape (one entry per field argument). */
  inputSchema: Record<string, ZodTypeAny>;
  annotations: {
    title: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
  };
}

/** Default depth for auto-generated selection sets. */
const DEFAULT_SELECTION_DEPTH = 2;

// ---------------------------------------------------------------------------
// Arguments → Zod input schema
// ---------------------------------------------------------------------------

function zodForScalar(name: string): ZodTypeAny {
  switch (name) {
    case 'String':
    case 'ID':
      return z.string();
    case 'Int':
      return z.number().int();
    case 'Float':
      return z.number();
    case 'Boolean':
      return z.boolean();
    // Custom scalars (DateTime, JSON, …) carry no built-in shape — stay opaque.
    default:
      return z.any();
  }
}

function zodForInputType(type: GraphQLInputType): ZodTypeAny {
  if (isNonNullType(type)) {
    return zodForInputType(type.ofType);
  }
  if (isListType(type)) {
    return z.array(zodForInputType(type.ofType));
  }
  if (isScalarType(type)) {
    return zodForScalar(type.name);
  }
  if (isEnumType(type)) {
    const values = type.getValues().map((v) => v.name);
    return values.length > 0
      ? z.enum(values as [string, ...string[]])
      : z.string();
  }
  if (isInputObjectType(type)) {
    const shape: Record<string, ZodTypeAny> = {};
    for (const [fieldName, field] of Object.entries(type.getFields())) {
      let fieldZod = zodForInputType(field.type);
      if (!isNonNullType(field.type)) fieldZod = fieldZod.optional();
      shape[fieldName] = field.description
        ? fieldZod.describe(field.description)
        : fieldZod;
    }
    return z.object(shape);
  }
  return z.any();
}

function buildInputShape(
  args: readonly GraphQLArgument[],
): Record<string, ZodTypeAny> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const arg of args) {
    let argZod = zodForInputType(arg.type);
    if (!isNonNullType(arg.type)) argZod = argZod.optional();
    shape[arg.name] = arg.description
      ? argZod.describe(arg.description)
      : argZod;
  }
  return shape;
}

// ---------------------------------------------------------------------------
// Return type → selection set
// ---------------------------------------------------------------------------

function selectionForComposite(
  named: GraphQLNamedType,
  depth: number,
  maxDepth: number,
  visiting: ReadonlySet<string>,
): string {
  // Unions/interfaces without a concrete shape: just tag the type.
  if (isUnionType(named)) return '{ __typename }';
  if (!isObjectType(named) && !isInterfaceType(named)) return '';

  const selections: string[] = ['__typename'];
  for (const [fieldName, field] of Object.entries(named.getFields())) {
    // Fields that require arguments can't be auto-selected safely.
    if (field.args.length > 0) continue;

    const fieldNamed = getNamedType(field.type);
    if (isScalarType(fieldNamed) || isEnumType(fieldNamed)) {
      selections.push(fieldName);
    } else if (
      (isObjectType(fieldNamed) ||
        isInterfaceType(fieldNamed) ||
        isUnionType(fieldNamed)) &&
      depth < maxDepth &&
      !visiting.has(fieldNamed.name) // break cycles
    ) {
      const sub = selectionForComposite(
        fieldNamed,
        depth + 1,
        maxDepth,
        new Set(visiting).add(fieldNamed.name),
      );
      if (sub) selections.push(`${fieldName} ${sub}`);
    }
  }
  return `{ ${selections.join(' ')} }`;
}

/** Empty string for leaf (scalar/enum) return types — no sub-selection. */
function buildSelectionSet(type: GraphQLOutputType, maxDepth: number): string {
  const named = getNamedType(type);
  if (isScalarType(named) || isEnumType(named)) return '';
  return selectionForComposite(named, 1, maxDepth, new Set([named.name]));
}

// ---------------------------------------------------------------------------
// Operation + description
// ---------------------------------------------------------------------------

function buildOperation(
  operationType: OperationType,
  field: GraphQLField<unknown, unknown>,
  selectionSet: string,
): string {
  const varDefs = field.args
    .map((a) => `$${a.name}: ${a.type.toString()}`)
    .join(', ');
  const argUses = field.args.map((a) => `${a.name}: $${a.name}`).join(', ');
  const head = varDefs ? `(${varDefs})` : '';
  const call = argUses ? `(${argUses})` : '';
  const body = selectionSet
    ? `${field.name}${call} ${selectionSet}`
    : `${field.name}${call}`;
  return `${operationType} ${field.name}${head} { ${body} }`;
}

function describeField(
  field: GraphQLField<unknown, unknown>,
  operationType: OperationType,
): string {
  const signature = `${operationType} ${field.name}(${field.args
    .map((a) => `${a.name}: ${a.type.toString()}`)
    .join(', ')}): ${field.type.toString()}`;
  const lines: string[] = [];
  if (field.description) lines.push(field.description);
  lines.push(`GraphQL: ${signature}`);
  const argDocs = field.args
    .filter((a) => a.description)
    .map((a) => `- ${a.name}: ${a.description}`);
  if (argDocs.length > 0) lines.push('Arguments:', ...argDocs);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// buildGraphqlTools
// ---------------------------------------------------------------------------

export function buildGraphqlTools(
  schema: GraphQLSchema,
  opts: { selectionDepth?: number } = {},
): GraphqlTool[] {
  const maxDepth = opts.selectionDepth ?? DEFAULT_SELECTION_DEPTH;
  const tools: GraphqlTool[] = [];

  const roots: Array<
    [OperationType, ReturnType<GraphQLSchema['getQueryType']>]
  > = [
    ['query', schema.getQueryType()],
    ['mutation', schema.getMutationType()],
  ];

  for (const [operationType, root] of roots) {
    if (!root) continue;
    for (const field of Object.values(root.getFields())) {
      const selectionSet = buildSelectionSet(field.type, maxDepth);
      tools.push({
        name: field.name,
        description: describeField(field, operationType),
        operationType,
        operation: buildOperation(operationType, field, selectionSet),
        inputSchema: buildInputShape(field.args),
        annotations: {
          title: field.name,
          // MCP has no query/mutation split — annotate intent instead.
          ...(operationType === 'query'
            ? { readOnlyHint: true }
            : { destructiveHint: true }),
        },
      });
    }
  }

  return tools;
}
