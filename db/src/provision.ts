import type { DB } from './index.ts';
import { orgMembers } from './models/org_members.ts';
import { orgs } from './models/orgs.ts';
import { type User, users } from './models/users.ts';

export interface ProvisionUserInput {
  email: string;
  /** Optional fixed id (used by the seed); otherwise the DB assigns one. */
  id?: string;
}

/**
 * Find-or-create a user together with the personal org they own.
 *
 * Every user owns exactly one personal org (`orgs.personalForUserId`) plus an
 * `owner` membership in it — this is the single ownership axis that notes and
 * other entities hang off of. Idempotent: safe to call on every login, so a
 * personal org is recreated if it ever goes missing. Runs in a transaction so a
 * user is never left without their org.
 */
export async function provisionUser(
  db: DB,
  input: ProvisionUserInput,
): Promise<{ user: User; personalOrgId: string }> {
  const email = input.email.toLowerCase().trim();

  return db.transaction(async (tx: DB) => {
    let user = await tx.query.users.findFirst({ where: { email } });
    if (!user) {
      [user] = await tx
        .insert(users)
        .values(input.id ? { id: input.id, email } : { email })
        .returning();
    }

    let personalOrg = await tx.query.orgs.findFirst({
      where: { personalForUserId: user.id },
    });
    if (!personalOrg) {
      [personalOrg] = await tx
        .insert(orgs)
        .values({ name: 'Personal', personalForUserId: user.id })
        .returning();

      await tx
        .insert(orgMembers)
        .values({ orgId: personalOrg.id, userId: user.id, role: 'owner' });
    }

    return { user, personalOrgId: personalOrg.id };
  });
}
