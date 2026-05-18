import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const mobileNodeModules = path.join(repoRoot, 'apps/mobile/node_modules');
const rootWorklets = path.join(repoRoot, 'node_modules/react-native-worklets');
const mobileWorklets = path.join(mobileNodeModules, 'react-native-worklets');

if (!fs.existsSync(rootWorklets)) {
  process.exit(0);
}

fs.mkdirSync(mobileNodeModules, { recursive: true });

if (fs.existsSync(mobileWorklets)) {
  process.exit(0);
}

const relativeTarget = path.relative(mobileNodeModules, rootWorklets);
fs.symlinkSync(relativeTarget, mobileWorklets, 'dir');
