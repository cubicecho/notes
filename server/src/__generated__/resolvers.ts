import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Context } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: unknown; output: unknown; }
};

export type CreateNoteInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  orgId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  userId: Scalars['String']['input'];
};

export type CreateOrgInput = {
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** DateTime */
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type CreateOrgMemberInput = {
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  orgId: Scalars['String']['input'];
  role?: InputMaybe<OrgMembersRoleEnum>;
  userId: Scalars['String']['input'];
};

export type CreateUserInput = {
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  email: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type DateTimeFilter = {
  OR?: InputMaybe<Array<DateTimeFilterOr>>;
  /** DateTime */
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  /** Array<DateTime> */
  inArray?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  lte?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  ne?: InputMaybe<Scalars['DateTime']['input']>;
  notIlike?: InputMaybe<Scalars['String']['input']>;
  /** Array<DateTime> */
  notInArray?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  notLike?: InputMaybe<Scalars['String']['input']>;
};

export type DateTimeFilterOr = {
  /** DateTime */
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  /** Array<DateTime> */
  inArray?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  lte?: InputMaybe<Scalars['DateTime']['input']>;
  /** DateTime */
  ne?: InputMaybe<Scalars['DateTime']['input']>;
  notIlike?: InputMaybe<Scalars['String']['input']>;
  /** Array<DateTime> */
  notInArray?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  notLike?: InputMaybe<Scalars['String']['input']>;
};

export type IdFilter = {
  OR?: InputMaybe<Array<IdFilterOr>>;
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars['String']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  ne?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type IdFilterOr = {
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars['String']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  ne?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type InnerOrder = {
  direction: OrderDirection;
  /** Priority of current field */
  priority: Scalars['Int']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Add a user to an org. Caller must be an owner of the org.
   * Defaults to role 'member' if not specified.
   */
  addOrgMember: OrgMember;
  createNote?: Maybe<Note>;
  createNotes: Array<Note>;
  createOrg?: Maybe<Org>;
  createOrgMember?: Maybe<OrgMember>;
  createOrgMembers: Array<OrgMember>;
  createOrgs: Array<Org>;
  createUser?: Maybe<User>;
  createUsers: Array<User>;
  deleteNotes: Array<Note>;
  deleteOrgMembers: Array<OrgMember>;
  deleteOrgs: Array<Org>;
  deleteUsers: Array<User>;
  /** Remove a user from an org. Caller must be an owner of the org. */
  removeOrgMember: OrgMember;
  updateNotes: Array<Note>;
  updateOrgMembers: Array<OrgMember>;
  updateOrgs: Array<Org>;
  updateUsers: Array<User>;
};


export type MutationAddOrgMemberArgs = {
  orgId: Scalars['String']['input'];
  role?: InputMaybe<OrgMembersRoleEnum>;
  userId: Scalars['String']['input'];
};


export type MutationCreateNoteArgs = {
  values: CreateNoteInput;
};


export type MutationCreateNotesArgs = {
  values: Array<CreateNoteInput>;
};


export type MutationCreateOrgArgs = {
  values: CreateOrgInput;
};


export type MutationCreateOrgMemberArgs = {
  values: CreateOrgMemberInput;
};


export type MutationCreateOrgMembersArgs = {
  values: Array<CreateOrgMemberInput>;
};


export type MutationCreateOrgsArgs = {
  values: Array<CreateOrgInput>;
};


export type MutationCreateUserArgs = {
  values: CreateUserInput;
};


export type MutationCreateUsersArgs = {
  values: Array<CreateUserInput>;
};


export type MutationDeleteNotesArgs = {
  where?: InputMaybe<NoteFilters>;
};


export type MutationDeleteOrgMembersArgs = {
  where?: InputMaybe<OrgMemberFilters>;
};


export type MutationDeleteOrgsArgs = {
  where?: InputMaybe<OrgFilters>;
};


export type MutationDeleteUsersArgs = {
  where?: InputMaybe<UserFilters>;
};


export type MutationRemoveOrgMemberArgs = {
  orgId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationUpdateNotesArgs = {
  set: UpdateNoteInput;
  where?: InputMaybe<NoteFilters>;
};


export type MutationUpdateOrgMembersArgs = {
  set: UpdateOrgMemberInput;
  where?: InputMaybe<OrgMemberFilters>;
};


export type MutationUpdateOrgsArgs = {
  set: UpdateOrgInput;
  where?: InputMaybe<OrgFilters>;
};


export type MutationUpdateUsersArgs = {
  set: UpdateUserInput;
  where?: InputMaybe<UserFilters>;
};

export type Note = {
  __typename?: 'Note';
  content: Scalars['String']['output'];
  /** DateTime */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  org?: Maybe<Org>;
  orgId?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  /** DateTime */
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};


export type NoteOrgArgs = {
  where?: InputMaybe<OrgFilters>;
};


export type NoteUserArgs = {
  where?: InputMaybe<UserFilters>;
};

export type NoteFilters = {
  OR?: InputMaybe<Array<NoteFiltersOr>>;
  content?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  orgId?: InputMaybe<IdFilter>;
  title?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  userId?: InputMaybe<IdFilter>;
};

export type NoteFiltersOr = {
  content?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  orgId?: InputMaybe<IdFilter>;
  title?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  userId?: InputMaybe<IdFilter>;
};

export type NoteOrderBy = {
  content?: InputMaybe<InnerOrder>;
  createdAt?: InputMaybe<InnerOrder>;
  id?: InputMaybe<InnerOrder>;
  orgId?: InputMaybe<InnerOrder>;
  title?: InputMaybe<InnerOrder>;
  updatedAt?: InputMaybe<InnerOrder>;
  userId?: InputMaybe<InnerOrder>;
};

/** Order by direction */
export type OrderDirection =
  /** Ascending order */
  | 'asc'
  /** Descending order */
  | 'desc';

export type Org = {
  __typename?: 'Org';
  /** DateTime */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  members: Array<OrgMember>;
  name: Scalars['String']['output'];
  notes: Array<Note>;
  /** DateTime */
  updatedAt: Scalars['DateTime']['output'];
};


export type OrgMembersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OrgMemberOrderBy>;
  where?: InputMaybe<OrgMemberFilters>;
};


export type OrgNotesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<NoteOrderBy>;
  where?: InputMaybe<NoteFilters>;
};

export type OrgFilters = {
  OR?: InputMaybe<Array<OrgFiltersOr>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  name?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type OrgFiltersOr = {
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  name?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type OrgMember = {
  __typename?: 'OrgMember';
  /** DateTime */
  createdAt: Scalars['DateTime']['output'];
  org?: Maybe<Org>;
  orgId: Scalars['String']['output'];
  role: OrgMembersRoleEnum;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};


export type OrgMemberOrgArgs = {
  where?: InputMaybe<OrgFilters>;
};


export type OrgMemberUserArgs = {
  where?: InputMaybe<UserFilters>;
};

export type OrgMemberFilters = {
  OR?: InputMaybe<Array<OrgMemberFiltersOr>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  orgId?: InputMaybe<IdFilter>;
  role?: InputMaybe<OrgMembersRoleEnumFilter>;
  userId?: InputMaybe<IdFilter>;
};

export type OrgMemberFiltersOr = {
  createdAt?: InputMaybe<DateTimeFilter>;
  orgId?: InputMaybe<IdFilter>;
  role?: InputMaybe<OrgMembersRoleEnumFilter>;
  userId?: InputMaybe<IdFilter>;
};

export type OrgMemberOrderBy = {
  createdAt?: InputMaybe<InnerOrder>;
  orgId?: InputMaybe<InnerOrder>;
  role?: InputMaybe<InnerOrder>;
  userId?: InputMaybe<InnerOrder>;
};

export type OrgMembersRoleEnum =
  /** Value: member */
  | 'member'
  /** Value: owner */
  | 'owner';

export type OrgMembersRoleEnumFilter = {
  OR?: InputMaybe<Array<OrgMembersRoleEnumFilterOr>>;
  eq?: InputMaybe<OrgMembersRoleEnum>;
  gt?: InputMaybe<OrgMembersRoleEnum>;
  gte?: InputMaybe<OrgMembersRoleEnum>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<OrgMembersRoleEnum>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<OrgMembersRoleEnum>;
  lte?: InputMaybe<OrgMembersRoleEnum>;
  ne?: InputMaybe<OrgMembersRoleEnum>;
  notIlike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<OrgMembersRoleEnum>>;
  notLike?: InputMaybe<Scalars['String']['input']>;
};

export type OrgMembersRoleEnumFilterOr = {
  eq?: InputMaybe<OrgMembersRoleEnum>;
  gt?: InputMaybe<OrgMembersRoleEnum>;
  gte?: InputMaybe<OrgMembersRoleEnum>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<OrgMembersRoleEnum>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<OrgMembersRoleEnum>;
  lte?: InputMaybe<OrgMembersRoleEnum>;
  ne?: InputMaybe<OrgMembersRoleEnum>;
  notIlike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<OrgMembersRoleEnum>>;
  notLike?: InputMaybe<Scalars['String']['input']>;
};

export type OrgOrderBy = {
  createdAt?: InputMaybe<InnerOrder>;
  id?: InputMaybe<InnerOrder>;
  name?: InputMaybe<InnerOrder>;
  updatedAt?: InputMaybe<InnerOrder>;
};

export type Query = {
  __typename?: 'Query';
  /** Personal notes owned by the authenticated user (excludes org notes). */
  myNotes: Array<Note>;
  /** Orgs the authenticated user is a member of. */
  myOrgs: Array<Org>;
  note: Array<Note>;
  noteSingle?: Maybe<Note>;
  org: Array<Org>;
  orgMember: Array<OrgMember>;
  orgMemberSingle?: Maybe<OrgMember>;
  orgSingle?: Maybe<Org>;
  user: Array<User>;
  userSingle?: Maybe<User>;
};


export type QueryNoteArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<NoteOrderBy>;
  where?: InputMaybe<NoteFilters>;
};


export type QueryNoteSingleArgs = {
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<NoteOrderBy>;
  where?: InputMaybe<NoteFilters>;
};


export type QueryOrgArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OrgOrderBy>;
  where?: InputMaybe<OrgFilters>;
};


export type QueryOrgMemberArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OrgMemberOrderBy>;
  where?: InputMaybe<OrgMemberFilters>;
};


export type QueryOrgMemberSingleArgs = {
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OrgMemberOrderBy>;
  where?: InputMaybe<OrgMemberFilters>;
};


export type QueryOrgSingleArgs = {
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OrgOrderBy>;
  where?: InputMaybe<OrgFilters>;
};


export type QueryUserArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<UserOrderBy>;
  where?: InputMaybe<UserFilters>;
};


export type QueryUserSingleArgs = {
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<UserOrderBy>;
  where?: InputMaybe<UserFilters>;
};

export type StringFilter = {
  OR?: InputMaybe<Array<StringFilterOr>>;
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars['String']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  ne?: InputMaybe<Scalars['String']['input']>;
  notIlike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars['String']['input']>>;
  notLike?: InputMaybe<Scalars['String']['input']>;
};

export type StringFilterOr = {
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars['String']['input']>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  ne?: InputMaybe<Scalars['String']['input']>;
  notIlike?: InputMaybe<Scalars['String']['input']>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars['String']['input']>>;
  notLike?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNoteInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  orgId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrgInput = {
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type UpdateOrgMemberInput = {
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  orgId?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<OrgMembersRoleEnum>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  /** DateTime */
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  /** DateTime */
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type User = {
  __typename?: 'User';
  /** DateTime */
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  notes: Array<Note>;
  orgMemberships: Array<OrgMember>;
  /** DateTime */
  updatedAt: Scalars['DateTime']['output'];
};


export type UserNotesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<NoteOrderBy>;
  where?: InputMaybe<NoteFilters>;
};


export type UserOrgMembershipsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OrgMemberOrderBy>;
  where?: InputMaybe<OrgMemberFilters>;
};

export type UserFilters = {
  OR?: InputMaybe<Array<UserFiltersOr>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  email?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type UserFiltersOr = {
  createdAt?: InputMaybe<DateTimeFilter>;
  email?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type UserOrderBy = {
  createdAt?: InputMaybe<InnerOrder>;
  email?: InputMaybe<InnerOrder>;
  id?: InputMaybe<InnerOrder>;
  updatedAt?: InputMaybe<InnerOrder>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateNoteInput: CreateNoteInput;
  CreateOrgInput: CreateOrgInput;
  CreateOrgMemberInput: CreateOrgMemberInput;
  CreateUserInput: CreateUserInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DateTimeFilterOr: DateTimeFilterOr;
  IdFilter: IdFilter;
  IdFilterOr: IdFilterOr;
  InnerOrder: InnerOrder;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Note: ResolverTypeWrapper<Note>;
  NoteFilters: NoteFilters;
  NoteFiltersOr: NoteFiltersOr;
  NoteOrderBy: NoteOrderBy;
  OrderDirection: OrderDirection;
  Org: ResolverTypeWrapper<Org>;
  OrgFilters: OrgFilters;
  OrgFiltersOr: OrgFiltersOr;
  OrgMember: ResolverTypeWrapper<OrgMember>;
  OrgMemberFilters: OrgMemberFilters;
  OrgMemberFiltersOr: OrgMemberFiltersOr;
  OrgMemberOrderBy: OrgMemberOrderBy;
  OrgMembersRoleEnum: OrgMembersRoleEnum;
  OrgMembersRoleEnumFilter: OrgMembersRoleEnumFilter;
  OrgMembersRoleEnumFilterOr: OrgMembersRoleEnumFilterOr;
  OrgOrderBy: OrgOrderBy;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StringFilter: StringFilter;
  StringFilterOr: StringFilterOr;
  UpdateNoteInput: UpdateNoteInput;
  UpdateOrgInput: UpdateOrgInput;
  UpdateOrgMemberInput: UpdateOrgMemberInput;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<User>;
  UserFilters: UserFilters;
  UserFiltersOr: UserFiltersOr;
  UserOrderBy: UserOrderBy;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  CreateNoteInput: CreateNoteInput;
  CreateOrgInput: CreateOrgInput;
  CreateOrgMemberInput: CreateOrgMemberInput;
  CreateUserInput: CreateUserInput;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  DateTimeFilterOr: DateTimeFilterOr;
  IdFilter: IdFilter;
  IdFilterOr: IdFilterOr;
  InnerOrder: InnerOrder;
  Int: Scalars['Int']['output'];
  Mutation: Record<PropertyKey, never>;
  Note: Note;
  NoteFilters: NoteFilters;
  NoteFiltersOr: NoteFiltersOr;
  NoteOrderBy: NoteOrderBy;
  Org: Org;
  OrgFilters: OrgFilters;
  OrgFiltersOr: OrgFiltersOr;
  OrgMember: OrgMember;
  OrgMemberFilters: OrgMemberFilters;
  OrgMemberFiltersOr: OrgMemberFiltersOr;
  OrgMemberOrderBy: OrgMemberOrderBy;
  OrgMembersRoleEnumFilter: OrgMembersRoleEnumFilter;
  OrgMembersRoleEnumFilterOr: OrgMembersRoleEnumFilterOr;
  OrgOrderBy: OrgOrderBy;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  StringFilter: StringFilter;
  StringFilterOr: StringFilterOr;
  UpdateNoteInput: UpdateNoteInput;
  UpdateOrgInput: UpdateOrgInput;
  UpdateOrgMemberInput: UpdateOrgMemberInput;
  UpdateUserInput: UpdateUserInput;
  User: User;
  UserFilters: UserFilters;
  UserFiltersOr: UserFiltersOr;
  UserOrderBy: UserOrderBy;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  addOrgMember?: Resolver<ResolversTypes['OrgMember'], ParentType, ContextType, RequireFields<MutationAddOrgMemberArgs, 'orgId' | 'userId'>>;
  createNote?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<MutationCreateNoteArgs, 'values'>>;
  createNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<MutationCreateNotesArgs, 'values'>>;
  createOrg?: Resolver<Maybe<ResolversTypes['Org']>, ParentType, ContextType, RequireFields<MutationCreateOrgArgs, 'values'>>;
  createOrgMember?: Resolver<Maybe<ResolversTypes['OrgMember']>, ParentType, ContextType, RequireFields<MutationCreateOrgMemberArgs, 'values'>>;
  createOrgMembers?: Resolver<Array<ResolversTypes['OrgMember']>, ParentType, ContextType, RequireFields<MutationCreateOrgMembersArgs, 'values'>>;
  createOrgs?: Resolver<Array<ResolversTypes['Org']>, ParentType, ContextType, RequireFields<MutationCreateOrgsArgs, 'values'>>;
  createUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationCreateUserArgs, 'values'>>;
  createUsers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationCreateUsersArgs, 'values'>>;
  deleteNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, Partial<MutationDeleteNotesArgs>>;
  deleteOrgMembers?: Resolver<Array<ResolversTypes['OrgMember']>, ParentType, ContextType, Partial<MutationDeleteOrgMembersArgs>>;
  deleteOrgs?: Resolver<Array<ResolversTypes['Org']>, ParentType, ContextType, Partial<MutationDeleteOrgsArgs>>;
  deleteUsers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, Partial<MutationDeleteUsersArgs>>;
  removeOrgMember?: Resolver<ResolversTypes['OrgMember'], ParentType, ContextType, RequireFields<MutationRemoveOrgMemberArgs, 'orgId' | 'userId'>>;
  updateNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<MutationUpdateNotesArgs, 'set'>>;
  updateOrgMembers?: Resolver<Array<ResolversTypes['OrgMember']>, ParentType, ContextType, RequireFields<MutationUpdateOrgMembersArgs, 'set'>>;
  updateOrgs?: Resolver<Array<ResolversTypes['Org']>, ParentType, ContextType, RequireFields<MutationUpdateOrgsArgs, 'set'>>;
  updateUsers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationUpdateUsersArgs, 'set'>>;
}>;

export type NoteResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = ResolversObject<{
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  org?: Resolver<Maybe<ResolversTypes['Org']>, ParentType, ContextType, Partial<NoteOrgArgs>>;
  orgId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, Partial<NoteUserArgs>>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type OrgResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Org'] = ResolversParentTypes['Org']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['OrgMember']>, ParentType, ContextType, Partial<OrgMembersArgs>>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, Partial<OrgNotesArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type OrgMemberResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrgMember'] = ResolversParentTypes['OrgMember']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  org?: Resolver<Maybe<ResolversTypes['Org']>, ParentType, ContextType, Partial<OrgMemberOrgArgs>>;
  orgId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['OrgMembersRoleEnum'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, Partial<OrgMemberUserArgs>>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  myNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  myOrgs?: Resolver<Array<ResolversTypes['Org']>, ParentType, ContextType>;
  note?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, Partial<QueryNoteArgs>>;
  noteSingle?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, Partial<QueryNoteSingleArgs>>;
  org?: Resolver<Array<ResolversTypes['Org']>, ParentType, ContextType, Partial<QueryOrgArgs>>;
  orgMember?: Resolver<Array<ResolversTypes['OrgMember']>, ParentType, ContextType, Partial<QueryOrgMemberArgs>>;
  orgMemberSingle?: Resolver<Maybe<ResolversTypes['OrgMember']>, ParentType, ContextType, Partial<QueryOrgMemberSingleArgs>>;
  orgSingle?: Resolver<Maybe<ResolversTypes['Org']>, ParentType, ContextType, Partial<QueryOrgSingleArgs>>;
  user?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, Partial<QueryUserArgs>>;
  userSingle?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, Partial<QueryUserSingleArgs>>;
}>;

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, Partial<UserNotesArgs>>;
  orgMemberships?: Resolver<Array<ResolversTypes['OrgMember']>, ParentType, ContextType, Partial<UserOrgMembershipsArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  DateTime?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Note?: NoteResolvers<ContextType>;
  Org?: OrgResolvers<ContextType>;
  OrgMember?: OrgMemberResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

