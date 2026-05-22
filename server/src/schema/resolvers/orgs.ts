import { orgMembers, orgs } from '@cubicecho/notes-db';
import { delegateToSchema } from '@graphql-tools/delegate';
import { OperationTypeNode } from 'graphql';
import type {
  MutationCreateOrgArgs,
  MutationResolvers,
  QueryResolvers,
} from '../../__generated__/resolvers.ts';

export const orgResolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
} = {
  Query: {
    myOrgs: async (_parent, _args, context, info) => {
      const memberships = await context.getUserMemberships();
      const orgIds = memberships.map((m) => m.orgId);

      if (orgIds.length === 0) {
        return [];
      }

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
    // Overrides the auto-generated createOrg to also add the caller as owner.
    // Cannot delegate to createOrg (would recurse), so inserts directly.
    createOrg: async (_parent, args: MutationCreateOrgArgs, context) => {
      const [org] = await context.db
        .insert(orgs)
        .values({ name: args.values.name })
        .returning();

      await context.db.insert(orgMembers).values({
        orgId: org.id,
        userId: context.userId,
        role: 'owner',
      });

      return org;
    },
  },
};
