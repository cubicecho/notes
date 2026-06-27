import crypto from 'node:crypto';
import { magicLinks, provisionUser } from '@cubicecho/notes-db';
import { eq } from 'drizzle-orm';
import type {
  MutationResolvers,
  QueryResolvers,
} from '../../__generated__/resolvers.ts';

const TOKEN_TTL_MINUTES = 15;

const IS_DEV = process.env.NODE_ENV !== 'production';
const APP_URL = process.env.APP_URL ?? 'http://localhost:8081';

// Return the magic link directly in the API response instead of (or in addition
// to) emailing it. Always on in dev; opt-in for production-style deployments
// without a mail provider — e.g. local / homelab setups where the operator is
// the only user and can copy the link from the login screen. Never enable this
// on a publicly reachable instance: it hands out login links to anyone who
// knows an email address.
const EXPOSE_MAGIC_LINK = IS_DEV || process.env.EXPOSE_MAGIC_LINK === 'true';

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

      // Find or create the user along with their personal org (idempotent —
      // also self-heals a missing personal org on any subsequent login).
      await provisionUser(context.db, { email });

      // Generate token and expiry
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

      await context.db.insert(magicLinks).values({ email, token, expiresAt });

      const link = `${APP_URL}/auth/verify?token=${token}`;

      // TODO: send email via provider (SendGrid, Resend, etc.) when not exposing
      // the link directly.
      console.log(`[auth] magic link for ${email}: ${link}`);
      return { success: true, devLink: EXPOSE_MAGIC_LINK ? link : null };
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
