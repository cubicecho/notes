import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './server/src/__generated__/schema.graphql',
  documents: ['app/src/**/*.{tsx,ts}', 'app/app/**/*.{tsx,ts}'],
  generates: {
    './app/src/__generated__/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'graphql',
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
