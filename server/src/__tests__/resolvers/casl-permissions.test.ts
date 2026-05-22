import { describe, expect, it } from 'vitest';
import {
  Actions,
  Subject,
  defineAbilitiesFor,
  typed,
} from '../../middleware/casl-permissions/abilities.ts';

const owner = [{ orgId: 'org1', role: 'owner' as const }];
const member = [{ orgId: 'org1', role: 'member' as const }];
const noOrgs: never[] = [];

describe('defineAbilitiesFor', () => {
  describe('unauthenticated', () => {
    it('cannot do anything', () => {
      const ability = defineAbilitiesFor(undefined, noOrgs);
      expect(ability.can(Actions.read, Subject.User)).toBe(false);
      expect(ability.can(Actions.create, Subject.Note)).toBe(false);
      expect(ability.can(Actions.read, Subject.Org)).toBe(false);
    });
  });

  describe('users', () => {
    it('cannot create or delete users', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can(Actions.create, Subject.User)).toBe(false);
      expect(ability.can(Actions.delete, Subject.User)).toBe(false);
    });

    it('can read users', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can(Actions.read, Subject.User)).toBe(true);
    });

    it('can update themselves but not others', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can(Actions.update, typed('User', { id: 'u1' }))).toBe(
        true,
      );
      expect(ability.can(Actions.update, typed('User', { id: 'u2' }))).toBe(
        false,
      );
    });
  });

  describe('notes', () => {
    it('can create personal notes (no orgId)', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can(Actions.create, typed('Note', { orgId: null }))).toBe(
        true,
      );
    });

    it('cannot create org notes when not a member', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(
        ability.can(Actions.create, typed('Note', { orgId: 'org1' })),
      ).toBe(false);
    });

    it('can create org notes when a member', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(
        ability.can(Actions.create, typed('Note', { orgId: 'org1' })),
      ).toBe(true);
    });

    it('can update own personal notes', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can(Actions.update, typed('Note', { userId: 'u1' }))).toBe(
        true,
      );
      expect(ability.can(Actions.update, typed('Note', { userId: 'u2' }))).toBe(
        false,
      );
    });

    it('can update notes in member orgs', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(
        ability.can(Actions.update, typed('Note', { orgId: 'org1' })),
      ).toBe(true);
      expect(
        ability.can(Actions.update, typed('Note', { orgId: 'org2' })),
      ).toBe(false);
    });

    it('cannot delete notes', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can(Actions.delete, typed('Note', { userId: 'u1' }))).toBe(
        false,
      );
    });
  });

  describe('orgs', () => {
    it('can read and create orgs when authenticated', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can(Actions.read, Subject.Org)).toBe(true);
      expect(ability.can(Actions.create, Subject.Org)).toBe(true);
    });

    it('owner can update and delete their org', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can(Actions.update, typed('Org', { id: 'org1' }))).toBe(
        true,
      );
      expect(ability.can(Actions.delete, typed('Org', { id: 'org1' }))).toBe(
        true,
      );
    });

    it('member cannot update or delete org', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(ability.can(Actions.update, typed('Org', { id: 'org1' }))).toBe(
        false,
      );
      expect(ability.can(Actions.delete, typed('Org', { id: 'org1' }))).toBe(
        false,
      );
    });

    it('cannot update or delete an org the user does not own', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can(Actions.update, typed('Org', { id: 'org2' }))).toBe(
        false,
      );
      expect(ability.can(Actions.delete, typed('Org', { id: 'org2' }))).toBe(
        false,
      );
    });
  });

  describe('orgMembers', () => {
    it('can read org members when authenticated', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can(Actions.read, Subject.OrgMember)).toBe(true);
    });

    it('owner can create, update, delete members in their org', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(
        ability.can(Actions.create, typed('OrgMember', { orgId: 'org1' })),
      ).toBe(true);
      expect(
        ability.can(Actions.update, typed('OrgMember', { orgId: 'org1' })),
      ).toBe(true);
      expect(
        ability.can(Actions.delete, typed('OrgMember', { orgId: 'org1' })),
      ).toBe(true);
    });

    it('member cannot manage members', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(
        ability.can(Actions.create, typed('OrgMember', { orgId: 'org1' })),
      ).toBe(false);
      expect(
        ability.can(Actions.update, typed('OrgMember', { orgId: 'org1' })),
      ).toBe(false);
      expect(
        ability.can(Actions.delete, typed('OrgMember', { orgId: 'org1' })),
      ).toBe(false);
    });

    it('cannot manage members of orgs the user is not in', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(
        ability.can(Actions.create, typed('OrgMember', { orgId: 'org2' })),
      ).toBe(false);
    });
  });
});
