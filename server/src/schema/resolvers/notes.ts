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
  Mutation: {},
};
