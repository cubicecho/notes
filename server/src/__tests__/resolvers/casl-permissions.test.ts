import { describe, expect, it } from 'vitest';
import {
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
      expect(ability.can('read', 'User')).toBe(false);
      expect(ability.can('create', 'Note')).toBe(false);
      expect(ability.can('read', 'Org')).toBe(false);
    });
  });

  describe('users', () => {
    it('cannot create or delete users', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('create', 'User')).toBe(false);
      expect(ability.can('delete', 'User')).toBe(false);
    });

    it('can read users', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('read', 'User')).toBe(true);
    });

    it('can update themselves but not others', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('update', typed('User', { id: 'u1' }))).toBe(true);
      expect(ability.can('update', typed('User', { id: 'u2' }))).toBe(false);
    });
  });

  describe('notes', () => {
    it('can create personal notes (no orgId)', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('create', typed('Note', { orgId: null }))).toBe(true);
    });

    it('cannot create org notes when not a member', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('create', typed('Note', { orgId: 'org1' }))).toBe(
        false,
      );
    });

    it('can create org notes when a member', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(ability.can('create', typed('Note', { orgId: 'org1' }))).toBe(
        true,
      );
    });

    it('can update own personal notes', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('update', typed('Note', { userId: 'u1' }))).toBe(true);
      expect(ability.can('update', typed('Note', { userId: 'u2' }))).toBe(
        false,
      );
    });

    it('can update notes in member orgs', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(ability.can('update', typed('Note', { orgId: 'org1' }))).toBe(
        true,
      );
      expect(ability.can('update', typed('Note', { orgId: 'org2' }))).toBe(
        false,
      );
    });

    it('cannot delete notes', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can('delete', typed('Note', { userId: 'u1' }))).toBe(
        false,
      );
    });
  });

  describe('orgs', () => {
    it('can read and create orgs when authenticated', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('read', 'Org')).toBe(true);
      expect(ability.can('create', 'Org')).toBe(true);
    });

    it('owner can update and delete their org', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can('update', typed('Org', { id: 'org1' }))).toBe(true);
      expect(ability.can('delete', typed('Org', { id: 'org1' }))).toBe(true);
    });

    it('member cannot update or delete org', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(ability.can('update', typed('Org', { id: 'org1' }))).toBe(false);
      expect(ability.can('delete', typed('Org', { id: 'org1' }))).toBe(false);
    });

    it('cannot update or delete an org the user does not own', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can('update', typed('Org', { id: 'org2' }))).toBe(false);
      expect(ability.can('delete', typed('Org', { id: 'org2' }))).toBe(false);
    });
  });

  describe('orgMembers', () => {
    it('can read org members when authenticated', () => {
      const ability = defineAbilitiesFor('u1', noOrgs);
      expect(ability.can('read', 'OrgMember')).toBe(true);
    });

    it('owner can create, update, delete members in their org', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can('create', typed('OrgMember', { orgId: 'org1' }))).toBe(
        true,
      );
      expect(ability.can('update', typed('OrgMember', { orgId: 'org1' }))).toBe(
        true,
      );
      expect(ability.can('delete', typed('OrgMember', { orgId: 'org1' }))).toBe(
        true,
      );
    });

    it('member cannot manage members', () => {
      const ability = defineAbilitiesFor('u1', member);
      expect(ability.can('create', typed('OrgMember', { orgId: 'org1' }))).toBe(
        false,
      );
      expect(ability.can('update', typed('OrgMember', { orgId: 'org1' }))).toBe(
        false,
      );
      expect(ability.can('delete', typed('OrgMember', { orgId: 'org1' }))).toBe(
        false,
      );
    });

    it('cannot manage members of orgs the user is not in', () => {
      const ability = defineAbilitiesFor('u1', owner);
      expect(ability.can('create', typed('OrgMember', { orgId: 'org2' }))).toBe(
        false,
      );
    });
  });
});
