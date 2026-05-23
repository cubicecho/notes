const path = require('node:path');
const Module = require('node:module');
const localModules = path.resolve(__dirname, 'node_modules');

// Patch NODE_PATH so root-hoisted packages (nativewind, react-native-css-interop)
// can find react-native, which npm keeps in this workspace's local node_modules.
if (!process.env.NODE_PATH?.split(path.delimiter).includes(localModules)) {
  process.env.NODE_PATH = [localModules, process.env.NODE_PATH]
    .filter(Boolean)
    .join(path.delimiter);
  Module._initPaths();
}

const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const workspaceRoot = path.resolve(__dirname, '..');

const expoConfig = getDefaultConfig(__dirname);

const workspaceConfig = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      localModules,
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
};

const merged = mergeConfig(expoConfig, workspaceConfig);

const nativeWindConfig = withNativeWind(merged, { input: './global.css' });

// Metro doesn't auto-resolve .js imports to .ts files.
// Wrap the resolver: if a .js request fails, retry with .ts before giving up.
const nwResolveRequest = nativeWindConfig.resolver?.resolveRequest ?? null;
nativeWindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = nwResolveRequest ?? context.resolveRequest;
  if (moduleName.endsWith('.js')) {
    const base = moduleName.slice(0, -3);
    for (const ext of ['.ts', '.tsx']) {
      try {
        return resolve(context, `${base}${ext}`, platform);
      } catch {
        // try next
      }
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = nativeWindConfig;
