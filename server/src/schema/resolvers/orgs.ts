import { orgMembers } from '@cubicecho/notes-db';
import { delegateToSchema } from '@graphql-tools/delegate';
import { and, eq } from 'drizzle-orm';
import { OperationTypeNode } from 'graphql';
import type {
  MutationAddOrgMemberArgs,
  MutationCreateOrgArgs,
  MutationRemoveOrgMemberArgs,
  MutationResolvers,
  QueryResolvers,
} from '../../__generated__/resolvers.ts';

export const orgResolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
} = {
  Query: {
    myOrgs: async (_parent, _args, context, info) => {
      const memberships = await context.db.query.orgMembers.findMany({
        where: { userId: context.userId },
      });
      const orgIds = memberships.map(
        (m: typeof orgMembers.$inferSelect) => m.orgId,
      );

      if (orgIds.length === 0) return [];

      return delegateToSchema({
        schema: info.schema,
        operation: OperationTypeNode.QUERY,
        fieldName: 'org',
        args: { where: { id: { inArray: orgIds } } },
        context,
        info,
      });
    },
  },
  Mutation: {
    createOrg: async (_parent, args: MutationCreateOrgArgs, context, info) => {
      const org = await delegateToSchema({
        schema: info.schema,
        operation: OperationTypeNode.MUTATION,
        fieldName: 'insertIntoOrg',
        args: { values: { name: args.name } },
        context,
        info,
      });

      await context.db.insert(orgMembers).values({
        orgId: org.id,
        userId: context.userId,
        role: 'owner',
      });

      return org;
    },

    addOrgMember: async (
      _parent,
      args: MutationAddOrgMemberArgs,
      context,
      info,
    ) => {
      const callerMembership = await context.db.query.orgMembers.findFirst({
        where: { orgId: args.orgId, userId: context.userId },
      });
      if (!callerMembership) throw new Error('Not a member of this org');
      if (callerMembership.role !== 'owner')
        throw new Error('Only org owners can add members');

      const org = await context.db.query.orgs.findFirst({
        where: { id: args.orgId },
      });
      if (!org) throw new Error(`Org ${args.orgId} not found`);

      return delegateToSchema({
        schema: info.schema,
        operation: OperationTypeNode.MUTATION,
        fieldName: 'insertIntoOrgMember',
        args: {
          values: {
            orgId: args.orgId,
            userId: args.userId,
            role: args.role ?? 'member',
          },
        },
        context,
        info,
      });
    },

    removeOrgMember: async (
      _parent,
      args: MutationRemoveOrgMemberArgs,
      context,
    ) => {
      const callerMembership = await context.db.query.orgMembers.findFirst({
        where: { orgId: args.orgId, userId: context.userId },
      });
      if (!callerMembership) throw new Error('Not a member of this org');
      if (callerMembership.role !== 'owner')
        throw new Error('Only org owners can remove members');

      const targetMembership = await context.db.query.orgMembers.findFirst({
        where: { orgId: args.orgId, userId: args.userId },
      });
      if (!targetMembership)
        throw new Error('User is not a member of this org');

      const [removed] = await context.db
        .delete(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, args.orgId),
            eq(orgMembers.userId, args.userId),
          ),
        )
        .returning();

      return removed;
    },
  },
};
