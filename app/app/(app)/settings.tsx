import { CardLayout } from '@/components/card-layout';
import { Combobox } from '@/components/combobox';
import { ConfirmButton } from '@/components/confirm-button';
import { LoadState } from '@/components/domain/query/load-state';
import { EmptyState } from '@/components/empty-state';
import { List } from '@/components/list';
import { ListItem } from '@/components/list-item';
import { PageLayout } from '@/components/page-layout';
import { PropertyList, PropertyRow } from '@/components/property-list';
import { SettingRow } from '@/components/setting-row';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code';
import { CopyButton } from '@/components/ui/copy-button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ThemePicker } from '@/components/ui/theme-picker';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { View } from 'react-native';
import { graphql } from '../../src/__generated__/index.js';

const MY_ORGS = graphql(`
  query SettingsMyOrgs {
    myOrgs {
      id
      name
    }
  }
`);

const CREATE_ORG = graphql(`
  mutation SettingsCreateOrg($name: String!) {
    createOrg(values: { name: $name }) {
      id
      name
    }
  }
`);

const API_TOKENS = graphql(`
  query SettingsApiTokens($orgId: String!) {
    apiTokens(orgId: $orgId) {
      id
      name
      tokenPrefix
      lastUsedAt
      createdAt
    }
  }
`);

const CREATE_API_TOKEN = graphql(`
  mutation SettingsCreateApiToken($orgId: String!, $name: String!) {
    createApiToken(orgId: $orgId, name: $name) {
      token
      apiToken {
        id
        name
        tokenPrefix
        createdAt
      }
    }
  }
`);

const REVOKE_API_TOKEN = graphql(`
  mutation SettingsRevokeApiToken($id: String!) {
    revokeApiToken(id: $id)
  }
`);

function formatLastUsed(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return 'Never used';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Never used';
  }
  return `Last used ${date.toLocaleDateString()}`;
}

function AccountCard() {
  const { user, signOut } = useAuth();

  return (
    <CardLayout
      level={2}
      title="Account"
      contentSlot={
        <PropertyList
          contentSlot={[
            <PropertyRow
              key="email"
              label="Email"
              value={user?.email ?? '—'}
            />,
          ]}
        />
      }
      footerActionsSlot={
        <Button variant="outline" content="Sign out" onPress={signOut} />
      }
    />
  );
}

function AppearanceCard() {
  return (
    <CardLayout
      level={2}
      title="Appearance"
      description="System follows your device. The choice is kept on this device."
      contentSlot={<ThemePicker />}
    />
  );
}

function WorkspacesCard() {
  const query = useQuery(MY_ORGS);
  const [createOrg, { loading: creating }] = useMutation(CREATE_ORG);
  const [newOrgName, setNewOrgName] = useState('');
  const [error, setError] = useState('');
  const orgs = query.data?.myOrgs ?? [];

  const handleCreate = async () => {
    if (!newOrgName.trim()) {
      return;
    }
    setError('');
    try {
      await createOrg({ variables: { name: newOrgName.trim() } });
      setNewOrgName('');
      query.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create workspace');
    }
  };

  return (
    <CardLayout
      level={2}
      title="Workspaces"
      description="Shared notes live in a workspace. Your personal notes are always there too."
      contentSlot={
        <>
          <LoadState
            compact
            query={query}
            what="your workspaces"
            count={orgs.length}
            emptySlot={<EmptyState compact title="No workspaces yet." />}
          />
          <List
            label="Workspaces"
            contentSlot={orgs.map((org) => (
              <ListItem key={org.id} title={org.name} />
            ))}
          />
          <View className="flex-row gap-2">
            <Input
              aria-label="New workspace name"
              className="flex-1"
              placeholder="New workspace name"
              value={newOrgName}
              onChangeText={setNewOrgName}
              onSubmitEditing={handleCreate}
            />
            <Button
              content="Create"
              loading={creating}
              disabled={!newOrgName.trim()}
              onPress={handleCreate}
            />
          </View>
          {error ? <FieldError>{error}</FieldError> : null}
        </>
      }
    />
  );
}

function ApiTokensCard() {
  const orgsQuery = useQuery(MY_ORGS);
  const orgs = orgsQuery.data?.myOrgs ?? [];

  const [pickedOrgId, setPickedOrgId] = useState<string | null>(null);
  const activeOrgId = pickedOrgId ?? orgs[0]?.id ?? null;

  const tokensQuery = useQuery(API_TOKENS, {
    variables: { orgId: activeOrgId ?? '' },
    skip: !activeOrgId,
  });
  const tokens = tokensQuery.data?.apiTokens ?? [];
  const [createApiToken, { loading: creating }] = useMutation(CREATE_API_TOKEN);
  const [revokeApiToken] = useMutation(REVOKE_API_TOKEN);

  const [newName, setNewName] = useState('');
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || !activeOrgId) {
      return;
    }
    setError('');
    setPlaintext(null);
    try {
      const result = await createApiToken({
        variables: { orgId: activeOrgId, name: newName.trim() },
      });
      const token = result.data?.createApiToken.token;
      if (token) {
        setPlaintext(token);
      }
      setNewName('');
      tokensQuery.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create token');
    }
  };

  const handleRevoke = async (id: string) => {
    setError('');
    try {
      await revokeApiToken({ variables: { id } });
      tokensQuery.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke token');
    }
  };

  return (
    <CardLayout
      level={2}
      title="API tokens"
      description="Tokens are scoped to a single workspace. To access another workspace, create a separate token for it."
      contentSlot={
        <>
          <LoadState
            compact
            query={orgsQuery}
            what="your workspaces"
            count={orgs.length}
            emptySlot={
              <EmptyState
                compact
                title="Create a workspace to issue API tokens."
              />
            }
          />
          {orgs.length > 1 ? (
            <SettingRow
              title="Workspace"
              description="Whose tokens are listed, and where a new one is made."
              actionSlot={
                <Combobox
                  aria-label="Workspace"
                  className="min-w-40"
                  options={orgs.map((org) => ({
                    value: org.id,
                    label: org.name,
                  }))}
                  value={activeOrgId ?? undefined}
                  onValueChange={(id: string) => {
                    setPickedOrgId(id);
                    setPlaintext(null);
                  }}
                />
              }
            />
          ) : null}
          {activeOrgId ? (
            <>
              <LoadState
                compact
                query={tokensQuery}
                what="the tokens"
                count={tokens.length}
                emptySlot={
                  <EmptyState
                    compact
                    title="No tokens for this workspace yet."
                  />
                }
              />
              <List
                label="API tokens"
                contentSlot={tokens.map((token) => (
                  <ListItem
                    key={token.id}
                    title={token.name}
                    description={`${token.tokenPrefix}… · ${formatLastUsed(token.lastUsedAt)}`}
                    actionSlot={
                      <ConfirmButton
                        variant="destructive-outline"
                        size="xs"
                        content="Revoke"
                        title={`Revoke "${token.name}"?`}
                        description="Anything still using this token loses access at once. This cannot be undone."
                        confirmLabel="Revoke"
                        onConfirm={() => void handleRevoke(token.id)}
                      />
                    }
                  />
                ))}
              />
              {/* Freshly minted token — shown exactly once */}
              {plaintext ? (
                <Alert
                  variant="info"
                  title="Copy your token now"
                  description="You won't be able to see it again."
                  actionSlot={
                    <Button
                      variant="ghost"
                      size="sm"
                      content="Dismiss"
                      onPress={() => setPlaintext(null)}
                    />
                  }
                />
              ) : null}
              {plaintext ? (
                <CodeBlock
                  content={plaintext}
                  wrap
                  actionSlot={
                    <CopyButton value={plaintext} label="Copy token" />
                  }
                />
              ) : null}
              <View className="flex-row gap-2">
                <Input
                  aria-label="Token name"
                  className="flex-1"
                  placeholder="Token name (e.g. CI)"
                  value={newName}
                  onChangeText={setNewName}
                  onSubmitEditing={handleCreate}
                />
                <Button
                  content="Create"
                  loading={creating}
                  disabled={!newName.trim()}
                  onPress={handleCreate}
                />
              </View>
            </>
          ) : null}
          {error ? <FieldError>{error}</FieldError> : null}
        </>
      }
    />
  );
}

export default function SettingsScreen() {
  return (
    <PageLayout
      width="prose"
      title="Settings"
      contentClassName="gap-6 py-6"
      contentSlot={
        <>
          <AccountCard />
          <AppearanceCard />
          <WorkspacesCard />
          <ApiTokensCard />
        </>
      }
    />
  );
}
