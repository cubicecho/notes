import crypto from 'node:crypto';
import { magicLinks, users } from '@cubicecho/notes-db';
import { eq } from 'drizzle-orm';
import type {
  MutationResolvers,
  QueryResolvers,
} from '../../__generated__/resolvers.ts';

const TOKEN_TTL_MINUTES = 15;

const IS_DEV = process.env.NODE_ENV !== 'production';
const APP_URL = process.env.APP_URL ?? 'http://localhost:8081';

export const authResolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
} = {
  Query: {
    me: async (_parent, _args, context) => {
      if (!context.userId) return null;
      return (
        context.db.query.users.findFirst({ where: { id: context.userId } }) ??
        null
      );
    },
  },
  Mutation: {
    requestMagicLink: async (_parent, args, context) => {
      const email = args.email.toLowerCase().trim();

      // Find or create user
      let user = await context.db.query.users.findFirst({ where: { email } });
      if (!user) {
        [user] = await context.db.insert(users).values({ email }).returning();
      }

      // Generate token and expiry
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

      await context.db.insert(magicLinks).values({ email, token, expiresAt });

      const link = `${APP_URL}/auth/verify?token=${token}`;

      if (IS_DEV) {
        console.log(`[auth] magic link for ${email}: ${link}`);
        return { success: true, devLink: link };
      }

      // TODO: send email via provider (SendGrid, Resend, etc.)
      console.log(`[auth] PROD magic link for ${email}: ${link}`);
      return { success: true, devLink: null };
    },

    verifyMagicLink: async (_parent, args, context) => {
      const link = await context.db.query.magicLinks.findFirst({
        where: { token: args.token },
      });

      if (!link) throw new Error('Invalid or expired magic link');
      if (link.used) throw new Error('Magic link has already been used');
      if (link.expiresAt < new Date())
        throw new Error('Magic link has expired');

      // Mark used
      await context.db
        .update(magicLinks)
        .set({ used: true })
        .where(eq(magicLinks.token, args.token));

      // Find user (created during requestMagicLink)
      const user = await context.db.query.users.findFirst({
        where: { email: link.email },
      });
      if (!user) throw new Error('User not found');

      // For MVP: userId is the session token — server trusts any valid UUID as a userId
      return { token: user.id, user };
    },
  },
};
