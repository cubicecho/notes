import { apiTokens } from '@cubicecho/notes-db';
import { desc, eq } from 'drizzle-orm';
import type {
  MutationResolvers,
  QueryResolvers,
} from '../../__generated__/resolvers.ts';
import { generateApiToken } from '../../lib/api-token.ts';

export const apiTokenResolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
} = {
  Query: {
    // Membership in `orgId` is enforced by the permissions map. The selected
    // rows include `tokenHash`, but the GraphQL `ApiToken` type omits it, so it
    // is never serialized out.
    apiTokens: async (_parent, args, context) => {
      return context.db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.orgId, args.orgId))
        .orderBy(desc(apiTokens.createdAt));
    },
  },
  Mutation: {
    // Membership in `orgId` is enforced by the permissions map. The plaintext
    // token is returned once here and never persisted (only its hash is stored).
    createApiToken: async (_parent, args, context) => {
      const { token, tokenHash, tokenPrefix } = generateApiToken();

      const [row] = await context.db
        .insert(apiTokens)
        .values({
          orgId: args.orgId,
          createdByUserId: context.userId,
          name: args.name,
          tokenPrefix,
          tokenHash,
        })
        .returning();

      return { apiToken: row, token };
    },

    // The permissions map only coarsely requires the caller to manage tokens in
    // *some* org; the precise per-token check happens here because the token's
    // org is not known until it is looked up by id.
    revokeApiToken: async (_parent, args, context) => {
      const token = await context.db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.id, args.id))
        .then((rows: (typeof apiTokens.$inferSelect)[]) => rows[0]);

      if (!token) {
        // Already gone — nothing to revoke.
        return false;
      }

      const memberships = await context.getUserMemberships();
      const isMember = memberships.some((m) => m.orgId === token.orgId);
      if (!isMember) {
        throw new Error('Forbidden');
      }

      await context.db.delete(apiTokens).where(eq(apiTokens.id, args.id));
      return true;
    },
  },
};
