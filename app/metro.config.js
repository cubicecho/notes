const path = require('node:path');
const Module = require('node:module');
const localModules = path.resolve(__dirname, 'node_modules');

// Patch NODE_PATH so root-hoisted packages (nativewind, react-native-css) can
// find react-native, which npm keeps in this workspace's local node_modules.
if (!process.env.NODE_PATH?.split(path.delimiter).includes(localModules)) {
  process.env.NODE_PATH = [localModules, process.env.NODE_PATH]
    .filter(Boolean)
    .join(path.delimiter);
  Module._initPaths();
}

const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const workspaceRoot = path.resolve(__dirname, '..');

const config = getDefaultConfig(__dirname);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  localModules,
  path.resolve(workspaceRoot, 'node_modules'),
];

const nativewindConfig = withNativewind(config);

// Metro doesn't auto-resolve .js imports to .ts files.
// Wrap the resolver: if a .js request fails, retry with .ts before giving up.
const nwResolveRequest = nativewindConfig.resolver?.resolveRequest ?? null;
nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
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

module.exports = nativewindConfig;
