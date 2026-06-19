import type { Resolvers, ResolversTypes } from './resolvers.js';
import { createGraphQLAbility, createSubjects, createTyped, type SubjectMap } from '@vantreeseba/graphql-casl';
export type AppSubjectMap = SubjectMap<Resolvers, ResolversTypes>;

export const Subject = createSubjects<AppSubjectMap>()({
  AuthPayload: 'AuthPayload',
  Note: 'Note',
  Org: 'Org',
  OrgMember: 'OrgMember',
  RequestMagicLinkResult: 'RequestMagicLinkResult',
  User: 'User',
} as const);

export const typed = createTyped<AppSubjectMap>();

export const ability = () => createGraphQLAbility<AppSubjectMap>();
