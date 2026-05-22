import type { GraphQLResolveInfo } from 'graphql';
import type {
  IMiddlewareFunction,
  IMiddlewareTypeMap,
} from 'graphql-middleware';
import type { Context } from '../../context.ts';

// Resolve is the next-resolver function passed to middleware by graphql-middleware.
// biome-ignore lint/suspicious/noExplicitAny: must match IMiddlewareResolver's Promise<any> return
type Resolve = (
  parent?: unknown,
  args?: unknown,
  context?: unknown,
  info?: GraphQLResolveInfo,
) => Promise<any>;

// Middleware is the full graphql-middleware function type (callable or options object).
export type Middleware = IMiddlewareFunction<unknown, Context>;

// Rule is the callable middleware form — checks a condition (throwing on failure)
// then calls resolve. Since Rule is structurally a Middleware, rules can be used
// naked in a PermissionsMap or composed with and()/or().
export type Rule = (
  resolve: Resolve,
  parent: unknown,
  args: unknown,
  context: Context,
  info: GraphQLResolveInfo,
) => Promise<any>;

/**
 * A permissions map derived from the generated resolver types.
 * Extends IMiddlewareTypeMap so it is directly assignable to applyMiddleware.
 * Each type key (Query, Mutation, …) is optional and maps to either:
 *   - a single Rule applied to every field in that type, or
 *   - an object where each field key is an optional Rule.
 */
export type PermissionsMap<T> = IMiddlewareTypeMap & {
  [TypeName in keyof T]?:
    | Rule
    | {
        [FieldName in keyof NonNullable<T[TypeName]>]?: Rule;
      };
};

/**
 * Extracts a scalar string value from resolver args regardless of nesting:
 *   args.key           (custom resolvers)
 *   args.values.key    (auto-generated single-insert mutations)
 *   args.where.key.eq  (auto-generated delete/filter mutations)
 */
export function getArgValue(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  if (typeof args[key] === 'string') {
    return args[key] as string;
  }

  const values = args.values as Record<string, unknown> | undefined;
  if (typeof values?.[key] === 'string') {
    return values[key] as string;
  }

  const where = args.where as Record<string, unknown> | undefined;
  const filter = where?.[key] as Record<string, unknown> | undefined;
  if (typeof filter?.eq === 'string') {
    return filter.eq;
  }

  return undefined;
}

// Always allows the operation through.
export const accept: Rule = (resolve, parent, args, context, info) =>
  resolve(parent, args, context, info);

// Always rejects the operation.
export const deny: Rule = () => {
  throw new Error('Forbidden');
};

const noop: Resolve = async () => undefined;

// Runs all rules sequentially, passing a noop resolve to intercept their
// resolve calls, then calls the real resolve once at the end.
export const and =
  (...rules: Rule[]): Rule =>
  async (resolve, parent, args, context, info) => {
    for (const rule of rules) {
      await rule(noop, parent, args, context, info);
    }
    return resolve(parent, args, context, info);
  };

// Tries each rule in order; calls the real resolve on the first that passes.
export const or =
  (...rules: Rule[]): Rule =>
  async (resolve, parent, args, context, info) => {
    let lastError: unknown;
    for (const rule of rules) {
      try {
        await rule(noop, parent, args, context, info);
        return resolve(parent, args, context, info);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError ?? new Error('Forbidden');
  };
