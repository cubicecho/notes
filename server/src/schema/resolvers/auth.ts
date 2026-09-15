import crypto from 'node:crypto';
import { magicLinks, provisionUser } from '@cubicecho/notes-db';
import { eq } from 'drizzle-orm';
import type {
  MutationResolvers,
  QueryResolvers,
  RequestMagicLinkResult,
} from '../../__generated__/resolvers.ts';
import { magicLinkExposed, magicLinkRequired } from '../../config.ts';
import { signSessionToken } from '../../lib/session.ts';

const TOKEN_TTL_MINUTES = 15;

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

      // Find or create the user along with their personal org (idempotent —
      // also self-heals a missing personal org on any subsequent login).
      const { user } = await provisionUser(context.db, { email });

      // No-link mode: the address alone is the credential. Secure local
      // networks only — see config.ts.
      if (!magicLinkRequired()) {
        console.log(`[auth] Magic links are off; signed ${email} in directly.`);
        return {
          success: true,
          devLink: null,
          token: await signSessionToken(user.id),
          // A plain row: the generated relation resolvers fill in User's
          // relation fields, but codegen has no mappers to know that.
          user: user as RequestMagicLinkResult['user'],
        };
      }

      // Generate token and expiry
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

      await context.db.insert(magicLinks).values({ email, token, expiresAt });

      const link = `${APP_URL}/auth/verify?token=${token}`;

      // TODO: send email via provider (SendGrid, Resend, etc.) when not exposing
      // the link directly.
      console.log(`[auth] magic link for ${email}: ${link}`);
      return {
        success: true,
        devLink: magicLinkExposed() ? link : null,
        token: null,
        user: null,
      };
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

      return { token: await signSessionToken(user.id), user };
    },
  },
};
