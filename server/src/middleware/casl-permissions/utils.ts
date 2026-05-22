/**
 * Generic CASL utilities — no imports from the generated schema.
 *
 * Pass your own Resolvers / ResolversTypes to SubjectName<T> / SubjectMap<T, R>
 * and get a fully-derived subject union without any manual type listing.
 *
 * AppAbility uses MongoAbility<[TActions, any]> because __typename-based
 * runtime detection cannot provide static condition typing without CASL's
 * ForcedSubject. To be revisited when the custom CASL package is built.
 */

import type { MongoAbility, Subject } from '@casl/ability';
import type { GraphQLScalarType, OperationTypeNode } from 'graphql';

// ---------------------------------------------------------------------------
// SubjectName<TResolvers>
//
// Derives domain type names from any generated Resolvers type by excluding:
//   - Root operation types (Query, Mutation, Subscription) via OperationTypeNode
//   - Custom scalar types (value is GraphQLScalarType in Resolvers)
//
// Key remapping evaluates eagerly so consumers receive a concrete string union.
// `string &` ensures only string literal keys are retained.
// ---------------------------------------------------------------------------

type RootOperations = Capitalize<`${OperationTypeNode}`>;

export type SubjectName<TResolvers> = string &
  keyof {
    [K in keyof TResolvers as K extends string
      ? K extends RootOperations
        ? never
        : NonNullable<TResolvers[K]> extends GraphQLScalarType
          ? never
          : K
      : never]: unknown;
  };

// ---------------------------------------------------------------------------
// SubjectMap<TResolvers, TResolversTypes>
//
// Maps each domain name to a Partial of its model type via TResolversTypes.
// Awaited<> unwraps ResolverTypeWrapper<T> = Promise<T> | T.
// Partial<T> lets CASL conditions match any subset of the model's fields.
// ---------------------------------------------------------------------------

export type SubjectMap<TResolvers, TResolversTypes> = {
  [K in SubjectName<TResolvers>]: K extends keyof TResolversTypes
    ? Partial<Awaited<TResolversTypes[K]>>
    : never;
};

// ---------------------------------------------------------------------------
// AppAbility and options
// ---------------------------------------------------------------------------

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

// biome-ignore lint/suspicious/noExplicitAny: see module comment
export type AppAbility<
  TActions extends string = Action,
  TSubjects extends Subject = any,
> = MongoAbility<[TActions, TSubjects]>;

// detectSubjectType reads __typename so CASL does not need ForcedSubject at runtime.
export const abilityOptions = {
  detectSubjectType: (obj: Record<PropertyKey, unknown>) =>
    obj.__typename as string,
};

// ---------------------------------------------------------------------------
// createTyped<TMap>()
//
// Returns a typed() helper bound to a specific SubjectMap. Call once at the
// app level to tag plain objects with __typename for CASL's detectSubjectType.
//
//   const typed = createTyped<AppSubjectMap>();
//   ability.can('update', typed('User', { id: targetId }))
// ---------------------------------------------------------------------------

export function createTyped<TMap extends Record<string, object>>() {
  return function typed(
    type: string & keyof TMap,
    attrs: Record<string, unknown>,
  ): TMap[keyof TMap] {
    return { __typename: type, ...attrs } as unknown as TMap[keyof TMap];
  };
}
