import { delegateToSchema } from '@graphql-tools/delegate';
import { OperationTypeNode } from 'graphql';
import type {
  MutationCreateNoteArgs,
  MutationResolvers,
  QueryResolvers,
} from '../../__generated__/resolvers.ts';

export const noteResolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
} = {
  Query: {
    myNotes: (_parent, _args, context, info) =>
      delegateToSchema({
        schema: info.schema,
        operation: OperationTypeNode.QUERY,
        fieldName: 'note',
        args: { where: { userId: { eq: context.userId } } },
        context,
        info,
      }),
  },
  Mutation: {
    createNote: async (
      _parent,
      args: MutationCreateNoteArgs,
      context,
      info,
    ) => {
      if (args.orgId) {
        const membership = await context.db.query.orgMembers.findFirst({
          where: { orgId: args.orgId, userId: context.userId },
        });
        if (!membership) throw new Error('Not a member of this org');
      }

      return delegateToSchema({
        schema: info.schema,
        operation: OperationTypeNode.MUTATION,
        fieldName: 'insertIntoNote',
        args: {
          values: {
            userId: context.userId,
            orgId: args.orgId ?? null,
            title: args.title ?? 'Untitled',
            content: args.content ?? '',
          },
        },
        context,
        info,
      });
    },
  },
};
