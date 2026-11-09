import { Combobox } from '@/components/combobox';
import { type Workspace, useWorkspace } from '@/context/WorkspaceContext';
import { useQuery } from '@apollo/client/react';
import { graphql } from '../../../__generated__/index.js';

const MY_ORGS_PICKER = graphql(`
  query WorkspacePickerMyOrgs {
    myOrgs {
      id
      name
    }
  }
`);

const PERSONAL = 'personal';

/** Which workspace's notes are listed: your own, or one of your orgs'. */
export function WorkspacePicker({ className }: { className?: string }) {
  const { workspace, setWorkspace } = useWorkspace();
  const { data } = useQuery(MY_ORGS_PICKER);
  const orgs = data?.myOrgs ?? [];

  const options = [
    { value: PERSONAL, label: 'Personal' },
    ...orgs.map((org) => ({ value: org.id, label: org.name })),
  ];

  function choose(value: string) {
    if (value === PERSONAL) {
      setWorkspace({ type: 'personal' });
      return;
    }
    const org = orgs.find((o) => o.id === value);
    if (org) {
      const next: Workspace = { type: 'org', id: org.id, name: org.name };
      setWorkspace(next);
    }
  }

  return (
    <Combobox
      aria-label="Workspace"
      className={className}
      options={options}
      value={workspace.type === 'org' ? workspace.id : PERSONAL}
      onValueChange={choose}
    />
  );
}
