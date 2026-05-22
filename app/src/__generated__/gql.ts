/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query SettingsMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n": typeof types.SettingsMyOrgsDocument,
    "\n  mutation SettingsCreateOrg($name: String!) {\n    createOrg(values: { name: $name }) {\n      id\n      name\n    }\n  }\n": typeof types.SettingsCreateOrgDocument,
    "\n  query SidebarMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n": typeof types.SidebarMyOrgsDocument,
    "\n  query Me {\n    me {\n      id\n      email\n    }\n  }\n": typeof types.MeDocument,
    "\n  mutation RequestMagicLink($email: String!) {\n    requestMagicLink(email: $email) {\n      success\n      devLink\n    }\n  }\n": typeof types.RequestMagicLinkDocument,
    "\n  mutation VerifyMagicLink($token: String!) {\n    verifyMagicLink(token: $token) {\n      token\n      user {\n        id\n        email\n      }\n    }\n  }\n": typeof types.VerifyMagicLinkDocument,
    "\n  query MyNotes {\n    myNotes {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n": typeof types.MyNotesDocument,
    "\n  query OrgNotes($orgId: String!) {\n    note(where: { orgId: { eq: $orgId } }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n": typeof types.OrgNotesDocument,
    "\n  mutation CreateNote($userId: String!, $orgId: String) {\n    createNote(values: { userId: $userId, orgId: $orgId, title: \"Untitled\", content: \"\" }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n": typeof types.CreateNoteDocument,
    "\n  mutation UpdateNote($id: String!, $title: String, $content: String) {\n    updateNotes(\n      set: { title: $title, content: $content }\n      where: { id: { eq: $id } }\n    ) {\n      id\n      title\n      content\n      updatedAt\n    }\n  }\n": typeof types.UpdateNoteDocument,
    "\n  mutation DeleteNote($id: String!) {\n    deleteNotes(where: { id: { eq: $id } }) {\n      id\n    }\n  }\n": typeof types.DeleteNoteDocument,
};
const documents: Documents = {
    "\n  query SettingsMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n": types.SettingsMyOrgsDocument,
    "\n  mutation SettingsCreateOrg($name: String!) {\n    createOrg(values: { name: $name }) {\n      id\n      name\n    }\n  }\n": types.SettingsCreateOrgDocument,
    "\n  query SidebarMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n": types.SidebarMyOrgsDocument,
    "\n  query Me {\n    me {\n      id\n      email\n    }\n  }\n": types.MeDocument,
    "\n  mutation RequestMagicLink($email: String!) {\n    requestMagicLink(email: $email) {\n      success\n      devLink\n    }\n  }\n": types.RequestMagicLinkDocument,
    "\n  mutation VerifyMagicLink($token: String!) {\n    verifyMagicLink(token: $token) {\n      token\n      user {\n        id\n        email\n      }\n    }\n  }\n": types.VerifyMagicLinkDocument,
    "\n  query MyNotes {\n    myNotes {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n": types.MyNotesDocument,
    "\n  query OrgNotes($orgId: String!) {\n    note(where: { orgId: { eq: $orgId } }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n": types.OrgNotesDocument,
    "\n  mutation CreateNote($userId: String!, $orgId: String) {\n    createNote(values: { userId: $userId, orgId: $orgId, title: \"Untitled\", content: \"\" }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n": types.CreateNoteDocument,
    "\n  mutation UpdateNote($id: String!, $title: String, $content: String) {\n    updateNotes(\n      set: { title: $title, content: $content }\n      where: { id: { eq: $id } }\n    ) {\n      id\n      title\n      content\n      updatedAt\n    }\n  }\n": types.UpdateNoteDocument,
    "\n  mutation DeleteNote($id: String!) {\n    deleteNotes(where: { id: { eq: $id } }) {\n      id\n    }\n  }\n": types.DeleteNoteDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SettingsMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  query SettingsMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SettingsCreateOrg($name: String!) {\n    createOrg(values: { name: $name }) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation SettingsCreateOrg($name: String!) {\n    createOrg(values: { name: $name }) {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SidebarMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  query SidebarMyOrgs {\n    myOrgs {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      id\n      email\n    }\n  }\n"): (typeof documents)["\n  query Me {\n    me {\n      id\n      email\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RequestMagicLink($email: String!) {\n    requestMagicLink(email: $email) {\n      success\n      devLink\n    }\n  }\n"): (typeof documents)["\n  mutation RequestMagicLink($email: String!) {\n    requestMagicLink(email: $email) {\n      success\n      devLink\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation VerifyMagicLink($token: String!) {\n    verifyMagicLink(token: $token) {\n      token\n      user {\n        id\n        email\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation VerifyMagicLink($token: String!) {\n    verifyMagicLink(token: $token) {\n      token\n      user {\n        id\n        email\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyNotes {\n    myNotes {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query MyNotes {\n    myNotes {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OrgNotes($orgId: String!) {\n    note(where: { orgId: { eq: $orgId } }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query OrgNotes($orgId: String!) {\n    note(where: { orgId: { eq: $orgId } }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateNote($userId: String!, $orgId: String) {\n    createNote(values: { userId: $userId, orgId: $orgId, title: \"Untitled\", content: \"\" }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  mutation CreateNote($userId: String!, $orgId: String) {\n    createNote(values: { userId: $userId, orgId: $orgId, title: \"Untitled\", content: \"\" }) {\n      id\n      title\n      content\n      userId\n      orgId\n      updatedAt\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateNote($id: String!, $title: String, $content: String) {\n    updateNotes(\n      set: { title: $title, content: $content }\n      where: { id: { eq: $id } }\n    ) {\n      id\n      title\n      content\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateNote($id: String!, $title: String, $content: String) {\n    updateNotes(\n      set: { title: $title, content: $content }\n      where: { id: { eq: $id } }\n    ) {\n      id\n      title\n      content\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteNote($id: String!) {\n    deleteNotes(where: { id: { eq: $id } }) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteNote($id: String!) {\n    deleteNotes(where: { id: { eq: $id } }) {\n      id\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;