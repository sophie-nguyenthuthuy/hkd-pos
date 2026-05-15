// Metro config for an Expo app inside a pnpm workspace.
// See: https://docs.expo.dev/guides/monorepos/

const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire workspace, not just this app.
config.watchFolders = [workspaceRoot];

// 2. Tell Metro to look in BOTH the app's and the workspace's node_modules.
//    pnpm symlinks dependencies into nested .pnpm stores; resolving from the
//    workspace root is the documented escape hatch.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Disable hierarchical lookup so we never accidentally hit a hoisted dep
//    above the workspace root.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
