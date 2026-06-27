import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useMutation, useQuery } from '@apollo/client/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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

/** Copy text to the clipboard on web; a no-op where unavailable. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const clip = (globalThis as { navigator?: { clipboard?: Clipboard } })
      .navigator?.clipboard;
    if (!clip) return false;
    await clip.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatLastUsed(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return 'Never used';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never used';
  return `Last used ${date.toLocaleDateString()}`;
}

function ThemeRow() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ] as const;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-foreground">Appearance</Text>
      <View className="flex-row gap-2">
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setTheme(opt.value)}
            className={`flex-1 items-center rounded-md border py-2 ${
              theme === opt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            }`}
          >
            <Text
              className={`text-sm ${
                theme === opt.value
                  ? 'text-primary font-medium'
                  : 'text-foreground'
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function OrgsSection() {
  const { data, loading, refetch } = useQuery(MY_ORGS);
  const [createOrg, { loading: creating }] = useMutation(CREATE_ORG);
  const [newOrgName, setNewOrgName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!newOrgName.trim()) return;
    setError('');
    try {
      await createOrg({ variables: { name: newOrgName.trim() } });
      setNewOrgName('');
      setShowInput(false);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create org');
    }
  };

  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-foreground">Workspaces</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <View className="gap-1">
          {data?.myOrgs.map((org) => (
            <View
              key={org.id}
              className="flex-row items-center rounded-md border border-border bg-card px-3 py-2.5"
            >
              <Text className="text-foreground">{org.name}</Text>
            </View>
          ))}
          {data?.myOrgs.length === 0 && (
            <Text className="text-sm text-muted-foreground">
              No workspaces yet.
            </Text>
          )}
        </View>
      )}

      {showInput ? (
        <View className="gap-2">
          <TextInput
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
            placeholder="Workspace name"
            value={newOrgName}
            onChangeText={setNewOrgName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          {error ? (
            <Text className="text-destructive text-sm">{error}</Text>
          ) : null}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating || !newOrgName.trim()}
              className="flex-1 items-center rounded-md bg-primary py-2 disabled:opacity-50"
            >
              {creating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-primary-foreground font-medium">
                  Create
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowInput(false);
                setNewOrgName('');
                setError('');
              }}
              className="flex-1 items-center rounded-md border border-border py-2"
            >
              <Text className="text-foreground">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShowInput(true)}
          className="items-center rounded-md border border-dashed border-border py-2.5"
        >
          <Text className="text-sm text-muted-foreground">+ New workspace</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ApiTokensSection() {
  const { data: orgsData, loading: orgsLoading } = useQuery(MY_ORGS);
  const orgs = orgsData?.myOrgs ?? [];

  const [pickedOrgId, setPickedOrgId] = useState<string | null>(null);
  const activeOrgId = pickedOrgId ?? orgs[0]?.id ?? null;

  const { data, loading, refetch } = useQuery(API_TOKENS, {
    variables: { orgId: activeOrgId ?? '' },
    skip: !activeOrgId,
  });
  const [createApiToken, { loading: creating }] = useMutation(CREATE_API_TOKEN);
  const [revokeApiToken] = useMutation(REVOKE_API_TOKEN);

  const [newName, setNewName] = useState('');
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || !activeOrgId) return;
    setError('');
    setPlaintext(null);
    setCopied(false);
    try {
      const result = await createApiToken({
        variables: { orgId: activeOrgId, name: newName.trim() },
      });
      const token = result.data?.createApiToken.token;
      if (token) setPlaintext(token);
      setNewName('');
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create token');
    }
  };

  const handleRevoke = async (id: string) => {
    setError('');
    try {
      await revokeApiToken({ variables: { id } });
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke token');
    }
  };

  const handleCopy = async () => {
    if (!plaintext) return;
    setCopied(await copyToClipboard(plaintext));
  };

  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-foreground">API tokens</Text>
      <Text className="text-xs text-muted-foreground">
        Tokens are scoped to a single workspace. To access another workspace,
        create a separate token for it.
      </Text>

      {orgsLoading ? (
        <ActivityIndicator />
      ) : orgs.length === 0 ? (
        <Text className="text-sm text-muted-foreground">
          Create a workspace to issue API tokens.
        </Text>
      ) : (
        <>
          {/* Workspace picker */}
          {orgs.length > 1 && (
            <View className="flex-row flex-wrap gap-2">
              {orgs.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  onPress={() => {
                    setPickedOrgId(org.id);
                    setPlaintext(null);
                  }}
                  className={`rounded-md border px-3 py-1.5 ${
                    org.id === activeOrgId
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      org.id === activeOrgId
                        ? 'text-primary font-medium'
                        : 'text-foreground'
                    }`}
                  >
                    {org.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Token list */}
          {loading ? (
            <ActivityIndicator />
          ) : (
            <View className="gap-1">
              {data?.apiTokens.map((token) => (
                <View
                  key={token.id}
                  className="flex-row items-center justify-between rounded-md border border-border bg-card px-3 py-2.5"
                >
                  <View className="flex-1">
                    <Text className="text-foreground">{token.name}</Text>
                    <Text className="text-xs text-muted-foreground font-mono">
                      {token.tokenPrefix}… · {formatLastUsed(token.lastUsedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRevoke(token.id)}
                    className="rounded-md border border-destructive px-3 py-1.5"
                  >
                    <Text className="text-destructive text-sm">Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {data?.apiTokens.length === 0 && (
                <Text className="text-sm text-muted-foreground">
                  No tokens for this workspace yet.
                </Text>
              )}
            </View>
          )}

          {/* Freshly minted token — shown exactly once */}
          {plaintext && (
            <View className="gap-2 rounded-md border border-primary bg-primary/10 p-3">
              <Text className="text-sm font-medium text-foreground">
                Copy your token now — you won't be able to see it again.
              </Text>
              <Text
                selectable
                className="text-foreground font-mono text-xs break-all"
              >
                {plaintext}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleCopy}
                  className="rounded-md bg-primary px-3 py-1.5"
                >
                  <Text className="text-primary-foreground text-sm font-medium">
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPlaintext(null)}
                  className="rounded-md border border-border px-3 py-1.5"
                >
                  <Text className="text-foreground text-sm">Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error ? (
            <Text className="text-destructive text-sm">{error}</Text>
          ) : null}

          {/* Create form */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground"
              placeholder="Token name (e.g. CI)"
              value={newName}
              onChangeText={setNewName}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating || !newName.trim()}
              className="items-center justify-center rounded-md bg-primary px-4 disabled:opacity-50"
            >
              {creating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-primary-foreground font-medium">
                  Create
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-6 max-w-lg"
    >
      <Text className="text-xl font-semibold text-foreground">Settings</Text>

      {/* Account */}
      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Account</Text>
        <View className="rounded-md border border-border bg-card px-3 py-2.5">
          <Text className="text-muted-foreground text-sm">{user?.email}</Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          className="items-center rounded-md border border-destructive py-2"
        >
          <Text className="text-destructive text-sm font-medium">Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Theme */}
      <ThemeRow />

      {/* Orgs */}
      <OrgsSection />

      {/* API tokens */}
      <ApiTokensSection />
    </ScrollView>
  );
}
