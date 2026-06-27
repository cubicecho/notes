import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Actions,
  Subject,
  defineAbilitiesFor,
  typed,
} from '../../../middleware/permissions/abilities.ts';

const owner = [{ orgId: 'org1', role: 'owner' as const }];
const member = [{ orgId: 'org1', role: 'member' as const }];
const noOrgs: never[] = [];

describe('defineAbilitiesFor', () => {
  describe('unauthenticated', () => {
    it('cannot do anything', () => {
      const ability = defineAbilitiesFor(undefined, noOrgs);
      assert.equal(ability.can(Actions.read, Subject.User), false);
      assert.equal(ability.can(Actions.create, Subject.Note), false);
      assert.equal(ability.can(Actions.read, Subject.Org), false);
    });
  });

  describe('users', () => {
    it('cannot create or delete users', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      assert.equal(ability.can(Actions.create, Subject.User), false);
      assert.equal(ability.can(Actions.delete, Subject.User), false);
    });

    it('can read users', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      assert.equal(ability.can(Actions.read, Subject.User), true);
    });

    it('can update themselves but not others', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      assert.equal(
        ability.can(Actions.update, typed('User', { id: 'u1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.update, typed('User', { id: 'u2' })),
        false,
      );
    });
  });

  describe('notes', () => {
    it('cannot create notes when not in any org', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      assert.equal(
        ability.can(Actions.create, typed('Note', { orgId: 'org1' })),
        false,
      );
    });

    it('can create notes in member orgs', () => {
      const ability = defineAbilitiesFor('u1', member);
      assert.equal(
        ability.can(Actions.create, typed('Note', { orgId: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.create, typed('Note', { orgId: 'org2' })),
        false,
      );
    });

    it('can update notes in member orgs', () => {
      const ability = defineAbilitiesFor('u1', member);
      assert.equal(
        ability.can(Actions.update, typed('Note', { orgId: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.update, typed('Note', { orgId: 'org2' })),
        false,
      );
    });

    it('can delete notes in member orgs', () => {
      const ability = defineAbilitiesFor('u1', member);
      assert.equal(
        ability.can(Actions.delete, typed('Note', { orgId: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Note', { orgId: 'org2' })),
        false,
      );
    });
  });

  describe('orgs', () => {
    it('can read and create orgs when authenticated', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      assert.equal(ability.can(Actions.read, Subject.Org), true);
      assert.equal(ability.can(Actions.create, Subject.Org), true);
    });

    it('owner can update and delete their org', () => {
      const ability = defineAbilitiesFor('u1', owner);
      assert.equal(
        ability.can(Actions.update, typed('Org', { id: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Org', { id: 'org1' })),
        true,
      );
    });

    it('member cannot update or delete org', () => {
      const ability = defineAbilitiesFor('u1', member);
      assert.equal(
        ability.can(Actions.update, typed('Org', { id: 'org1' })),
        false,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Org', { id: 'org1' })),
        false,
      );
    });

    it('cannot update or delete an org the user does not own', () => {
      const ability = defineAbilitiesFor('u1', owner);
      assert.equal(
        ability.can(Actions.update, typed('Org', { id: 'org2' })),
        false,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Org', { id: 'org2' })),
        false,
      );
    });
  });

  describe('orgMembers', () => {
    it('can read org members when authenticated', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      assert.equal(ability.can(Actions.read, Subject.OrgMember), true);
    });

    it('owner can create, update, delete members in their org', () => {
      const ability = defineAbilitiesFor('u1', owner);
      assert.equal(
        ability.can(Actions.create, typed('OrgMember', { orgId: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.update, typed('OrgMember', { orgId: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.delete, typed('OrgMember', { orgId: 'org1' })),
        true,
      );
    });

    it('member cannot manage members', () => {
      const ability = defineAbilitiesFor('u1', member);
      assert.equal(
        ability.can(Actions.create, typed('OrgMember', { orgId: 'org1' })),
        false,
      );
      assert.equal(
        ability.can(Actions.update, typed('OrgMember', { orgId: 'org1' })),
        false,
      );
      assert.equal(
        ability.can(Actions.delete, typed('OrgMember', { orgId: 'org1' })),
        false,
      );
    });

    it('cannot manage members of orgs the user is not in', () => {
      const ability = defineAbilitiesFor('u1', owner);
      assert.equal(
        ability.can(Actions.create, typed('OrgMember', { orgId: 'org2' })),
        false,
      );
    });
  });

  describe('personal org', () => {
    const personalOnly = [{ orgId: 'personal1', role: 'owner' as const }];
    const withShared = [
      { orgId: 'personal1', role: 'owner' as const },
      { orgId: 'shared1', role: 'owner' as const },
    ];

    it('cannot rename, delete, or share the personal org', () => {
      const ability = defineAbilitiesFor('u1', personalOnly, 'personal1');
      assert.equal(
        ability.can(Actions.update, typed('Org', { id: 'personal1' })),
        false,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Org', { id: 'personal1' })),
        false,
      );
      assert.equal(
        ability.can(Actions.create, typed('OrgMember', { orgId: 'personal1' })),
        false,
      );
    });

    it('can still create and delete notes in the personal org', () => {
      const ability = defineAbilitiesFor('u1', personalOnly, 'personal1');
      assert.equal(
        ability.can(Actions.create, typed('Note', { orgId: 'personal1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Note', { orgId: 'personal1' })),
        true,
      );
    });

    it('can still manage a separate shared org they own', () => {
      const ability = defineAbilitiesFor('u1', withShared, 'personal1');
      assert.equal(
        ability.can(Actions.update, typed('Org', { id: 'shared1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Org', { id: 'shared1' })),
        true,
      );
    });
  });

  describe('api token actor (isApiToken=true)', () => {
    const isApiToken = true;

    it('can still manage notes and tokens within its org', () => {
      const ability = defineAbilitiesFor('u1', owner, null, isApiToken);
      assert.equal(
        ability.can(Actions.create, typed('Note', { orgId: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.delete, typed('Note', { orgId: 'org1' })),
        true,
      );
      assert.equal(
        ability.can(Actions.create, typed('ApiToken', { orgId: 'org1' })),
        true,
      );
    });

    it('cannot mutate the user account', () => {
      const ability = defineAbilitiesFor('u1', owner, null, isApiToken);
      assert.equal(
        ability.can(Actions.update, typed('User', { id: 'u1' })),
        false,
      );
    });

    it('cannot create a new org', () => {
      const ability = defineAbilitiesFor('u1', owner, null, isApiToken);
      assert.equal(ability.can(Actions.create, Subject.Org), false);
    });

    it('a session actor keeps both abilities', () => {
      const ability = defineAbilitiesFor('u1', owner, null);
      assert.equal(
        ability.can(Actions.update, typed('User', { id: 'u1' })),
        true,
      );
      assert.equal(ability.can(Actions.create, Subject.Org), true);
    });
  });
});
