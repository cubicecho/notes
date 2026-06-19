import type { CodegenConfig } from '@graphql-codegen/cli';

// @vantreeseba/graphql-casl-codegen and graphql-mocks-codegen validate that
// every config value they receive is a string, but graphql-codegen-esm injects
// a boolean `emitLegacyCommonJSImports`. Override it to undefined (both plugins
// skip undefined values) wherever they run.
const noEmitLegacy = { emitLegacyCommonJSImports: undefined } as const;

const config: CodegenConfig = {
  schema: './server/src/__generated__/schema.graphql',
  generates: {
    // Resolver + entity types (typescript-resolvers). Source of truth that the
    // CASL and mock type-map files reference.
    './server/src/__generated__/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context.js#Context',
        useIndexSignature: false,
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
    // CASL subject bindings (Subject / typed / ability / AppSubjectMap) derived
    // from the schema. References Resolvers/ResolversTypes from resolvers.ts via
    // a type-only import so this file stays runtime-loadable under strip-types.
    './server/src/__generated__/permissions.ts': {
      plugins: [
        {
          add: {
            content:
              "import type { Resolvers, ResolversTypes } from './resolvers.js';",
          },
        },
        { '@vantreeseba/graphql-casl-codegen': noEmitLegacy },
      ],
    },
    // Mock type map (SchemaTypeMap) for @vantreeseba/graphql-mocks' buildMocks.
    './server/src/__generated__/schema-type-map.ts': {
      plugins: [{ '@vantreeseba/graphql-mocks-codegen': noEmitLegacy }],
      config: {
        typesImportPath: './resolvers.js',
      },
    },
  },
};

export default config;
