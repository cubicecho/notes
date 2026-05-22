import type { GraphQLResolveInfo } from 'graphql';
import type { IMiddlewareFunction } from 'graphql-middleware';
import type { Context } from '../../context.ts';

// A Rule checks a condition and throws on failure. It does not call resolve.
export type Rule = (
  parent: unknown,
  args: Record<string, unknown>,
  context: Context,
  info: GraphQLResolveInfo,
) => void | Promise<void>;

// A Middleware wraps a resolver and calls resolve on success.
export type Middleware = IMiddlewareFunction<unknown, Context>;

/**
 * A permissions map derived from the generated resolver types.
 * Each type key (Query, Mutation, …) is optional and maps to either:
 *   - a single Rule | Middleware applied to every field in that type, or
 *   - an object where each field key is an optional Rule | Middleware.
 */
export type PermissionsMap<T> = {
  [TypeName in keyof T]?:
    | Rule
    | Middleware
    | {
        [FieldName in keyof NonNullable<T[TypeName]>]?: Rule | Middleware;
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

export const and =
  (...rules: Rule[]): Middleware =>
  async (resolve, parent, args, context, info) => {
    for (const rule of rules) {
      await rule(parent, args as Record<string, unknown>, context, info);
    }
    return resolve(parent, args, context, info);
  };

export const or =
  (...rules: Rule[]): Rule =>
  async (parent, args, context, info) => {
    let lastError: unknown;
    for (const rule of rules) {
      try {
        await rule(parent, args, context, info);
        return;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError ?? new Error('Forbidden');
  };
