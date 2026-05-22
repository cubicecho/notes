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
    </ScrollView>
  );
}
