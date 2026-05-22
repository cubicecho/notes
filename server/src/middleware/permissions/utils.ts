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

import type { MongoAbility } from '@casl/ability';
import type {
  GraphQLResolveInfo,
  GraphQLScalarType,
  OperationTypeNode,
} from 'graphql';
import type { IMiddlewareTypeMap } from 'graphql-middleware';

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
// ArgsOf<TResolverField>
//
// Extracts the args type from a generated resolver field type.
// Resolver fields are (parent, args, context, info) => result functions,
// so the second parameter is the args.
//
//   ArgsOf<MutationResolvers['updateUsers']>
//   → MutationUpdateUsersArgs  (= { set: UpdateUserInput; where?: UserFilters })
//
// Use this to type the getSubjectData callback in requireCan so callers get
// full autocomplete and type checking on the specific mutation/query args
// instead of Record<string, unknown>.
// ---------------------------------------------------------------------------

export type ArgsOf<TResolverField> = TResolverField extends (
  parent: unknown,
  args: infer TArgs,
  ...rest: unknown[]
) => unknown
  ? TArgs
  : Record<string, unknown>;

// ---------------------------------------------------------------------------
// Rule — the callable middleware form used in PermissionsMap entries.
// accept / deny — always-pass and always-fail primitives.
// ---------------------------------------------------------------------------

export type Rule = (
  resolve: ResolveFn,
  parent: unknown,
  args: unknown,
  context: any, // biome-ignore lint/suspicious/noExplicitAny: accepts any concrete context type
  info: GraphQLResolveInfo,
) => Promise<any>;

export const accept: Rule = (resolve, parent, args, context, info) =>
  resolve(parent, args, context, info);

export const deny: Rule = () => {
  throw new Error('Forbidden');
};

// ---------------------------------------------------------------------------
// PermissionsMap<TResolvers>
//
// Extends IMiddlewareTypeMap so it is directly assignable to applyMiddleware.
// Each type key is optional and maps to either a single Rule or a field map.
// ---------------------------------------------------------------------------

export type PermissionsMap<TResolvers> = IMiddlewareTypeMap & {
  [TypeName in keyof TResolvers]?:
    | Rule
    | {
        [FieldName in keyof NonNullable<TResolvers[TypeName]>]?: Rule;
      };
};

// ---------------------------------------------------------------------------
// AppAbility and options
// ---------------------------------------------------------------------------

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

// Const object for every Action value — use instead of raw strings in
// can/cannot calls to get autocomplete and catch typos at compile time.
// satisfies validates full coverage: TypeScript errors if Action gains a
// new value and Actions is not updated.
export const Actions = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
} as const satisfies Record<Action, Action>;

// biome-ignore lint/suspicious/noExplicitAny: see module comment
export type AppAbility = MongoAbility<[Action, any]>;

// detectSubjectType reads __typename so CASL does not need ForcedSubject at runtime.
export const abilityOptions = {
  detectSubjectType: (obj: Record<PropertyKey, unknown>) =>
    obj.__typename as string,
};

// ---------------------------------------------------------------------------
// createRequireCan<TContext, TAbility>(getAbility)
//
// Factory that returns a requireCan() builder bound to a specific ability
// resolver. Decouples the auth/ability logic from the permissions map so
// projects can swap in any ability-building strategy.
//
// Usage:
//   const requireCan = createRequireCan(
//     async (ctx) => buildMyAbility(ctx),
//     (ctx) => ctx.userId,           // isAuthenticated check
//     (subject, typed) => typed(subject, {}),  // optional: custom subject builder
//   );
//
// Returns requireCan<TArgs>(action, subject, getSubjectData?) which
// produces a Rule middleware function.
// ---------------------------------------------------------------------------

export type AbilityLike = {
  can(action: string, subject: unknown): boolean;
};

// biome-ignore lint/suspicious/noExplicitAny: resolver resolve() must return any
type ResolveFn = (
  parent?: unknown,
  args?: unknown,
  context?: unknown,
  info?: GraphQLResolveInfo,
) => Promise<any>;

export function createRequireCan<TContext, TAbility extends AbilityLike>(
  getAbility: (context: TContext) => Promise<TAbility>,
  isAuthenticated: (context: TContext) => boolean,
  buildSubject?: (type: string, attrs: Record<string, unknown>) => unknown,
) {
  return function requireCan<
    TArgs extends Record<string, unknown> = Record<string, unknown>,
  >(
    action: Action,
    subject: string,
    getSubjectData?: (args: TArgs) => Record<string, unknown>,
  ) {
    return async (
      resolve: ResolveFn,
      parent: unknown,
      args: unknown,
      context: TContext,
      info: GraphQLResolveInfo,
    ): Promise<any> => {
      if (!isAuthenticated(context)) {
        throw new Error('Not authenticated');
      }
      const ability = await getAbility(context);
      const instance =
        getSubjectData && buildSubject
          ? buildSubject(subject, getSubjectData(args as unknown as TArgs))
          : getSubjectData
            ? getSubjectData(args as unknown as TArgs)
            : subject;

      if (!ability.can(action, instance)) {
        throw new Error('Forbidden');
      }
      return resolve(parent, args, context, info);
    };
  };
}

// ---------------------------------------------------------------------------
// createSubjects<TMap>()
//
// Returns a helper that validates a subject-name const object against
// SubjectName<TResolvers>. The object's keys must exactly cover the derived
// domain type names — TypeScript errors if any are missing or misspelled.
// Values equal keys so each entry can be used directly in CASL calls.
//
//   const Subject = createSubjects<AppSubjectMap>()({
//     User: 'User', Note: 'Note', Org: 'Org', OrgMember: 'OrgMember',
//   } as const);
//
//   can('read', Subject.User)   ← typed literal 'User', not plain string
// ---------------------------------------------------------------------------

export function createSubjects<TMap extends Record<string, object>>() {
  return function subjects<
    T extends Record<string & keyof TMap, string & keyof TMap>,
  >(map: T): T {
    return map;
  };
}

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
  return function typed<K extends string & keyof TMap>(
    type: K,
    attrs: Record<string, unknown>,
  ): TMap[keyof TMap] {
    return { __typename: type, ...attrs } as unknown as TMap[keyof TMap];
  };
}
