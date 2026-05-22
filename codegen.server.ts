import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './server/src/__generated__/schema.graphql',
  generates: {
    './server/src/__generated__/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context.js#Context',
        useIndexSignature: true,
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
