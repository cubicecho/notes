import { delegateToSchema } from '@graphql-tools/delegate';
import { OperationTypeNode } from 'graphql';
import type {
  MutationResolvers,
  QueryResolvers,
} from '../../__generated__/resolvers.ts';

export const noteResolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
} = {
  Query: {
    // Personal notes = notes in the caller's personal org.
    myNotes: async (_parent, _args, context, info) => {
      const personalOrg = await context.db.query.orgs.findFirst({
        where: { personalForUserId: context.userId },
      });
      if (!personalOrg) {
        return [];
      }

      return delegateToSchema({
        schema: info.schema,
        operation: OperationTypeNode.QUERY,
        fieldName: 'note',
        args: { where: { orgId: { eq: personalOrg.id } } },
        context,
        info,
      });
    },
  },
  Mutation: {},
};
