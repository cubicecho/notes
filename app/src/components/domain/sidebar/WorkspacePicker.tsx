import { Button } from '@/components/ui/button';
import { type Workspace, useWorkspace } from '@/context/WorkspaceContext';
import { useQuery } from '@apollo/client/react';
import { ScrollView, Text, View } from 'react-native';
import { graphql } from '../../../__generated__/index.js';

const MY_ORGS_SIDEBAR = graphql(`
  query SidebarMyOrgs {
    myOrgs {
      id
      name
    }
  }
`);

export function WorkspacePicker() {
  const { workspace, setWorkspace } = useWorkspace();
  const { data } = useQuery(MY_ORGS_SIDEBAR);
  const orgs = data?.myOrgs ?? [];

  const options: Array<{ label: string; value: Workspace }> = [
    { label: 'Personal', value: { type: 'personal' } },
    ...orgs.map((o) => ({
      label: o.name,
      value: { type: 'org' as const, id: o.id, name: o.name },
    })),
  ];

  return (
    <View className="px-3 py-2 border-b border-border">
      <Text className="text-xs text-muted-foreground mb-1">Workspace</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row gap-1"
      >
        {options.map((opt) => {
          const isActive =
            opt.value.type === workspace.type &&
            (opt.value.type === 'personal' ||
              (opt.value.type === 'org' &&
                opt.value.id === (workspace as { id: string }).id));
          return (
            <Button
              key={opt.label}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onPress={() => setWorkspace(opt.value)}
            >
              <Text
                className={
                  isActive
                    ? 'text-primary-foreground text-xs'
                    : 'text-foreground text-xs'
                }
              >
                {opt.label}
              </Text>
            </Button>
          );
        })}
      </ScrollView>
    </View>
  );
}
