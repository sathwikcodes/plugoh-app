#!/usr/bin/env node
import { rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const repoRoot = process.cwd();
const workRoot = path.join(repoRoot, '.graphify-work');
const outRoot = path.join(repoRoot, 'graphify-out');

const targets = [
  ['services-api-src', 'services/api/src'],
  ['services-jobs-src', 'services/jobs/src'],
  ['packages-contracts-src', 'packages/contracts/src'],
  ['packages-db-src', 'packages/db/src'],
  ['packages-config', 'packages/config'],
  ['apps-mobile-app', 'apps/mobile/app'],
  ['apps-mobile-components', 'apps/mobile/components'],
  ['apps-mobile-lib', 'apps/mobile/lib'],
  ['apps-mobile-hooks', 'apps/mobile/hooks'],
  ['apps-mobile-store', 'apps/mobile/store'],
  ['apps-mobile-constants', 'apps/mobile/constants'],
  ['apps-mobile-types', 'apps/mobile/types'],
  ['apps-mobile-scripts', 'apps/mobile/scripts'],
  ['apps-mobile-tests', 'apps/mobile/tests'],
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function readGraph(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function edgeKey(edge) {
  return JSON.stringify([edge.source, edge.target, edge.relation, edge.label, edge.context]);
}

async function mergeGraphs(graphFiles) {
  const nodes = new Map();
  const edges = [];
  const seenEdges = new Set();

  for (const graphFile of graphFiles) {
    const graph = await readGraph(graphFile);
    for (const node of graph.nodes ?? []) {
      if (node.id && !nodes.has(node.id)) {
        nodes.set(node.id, node);
      }
    }
    for (const edge of graph.edges ?? []) {
      const key = edgeKey(edge);
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        edges.push(edge);
      }
    }
  }

  await mkdir(outRoot, { recursive: true });
  await writeFile(
    path.join(outRoot, 'graph.json'),
    `${JSON.stringify(
      {
        nodes: [...nodes.values()],
        edges,
        hyperedges: [],
        directed: false,
        metadata: {
          generated_by: 'scripts/graphify-build.mjs',
          strategy:
            'source-only scoped merge excluding dependencies, build output, caches, and native generated folders',
          targets: targets.map(([, target]) => target),
        },
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Merged root graph: ${nodes.size} nodes, ${edges.length} edges`);
}

async function main() {
  console.log('Graphify source targets:');
  for (const [name, target] of targets) {
    console.log(`- ${name}: ${target}`);
  }

  if (dryRun) {
    console.log('\nDry run only. No files were written.');
    return;
  }

  await rm(workRoot, { recursive: true, force: true });
  await mkdir(workRoot, { recursive: true });

  const graphFiles = [];
  for (const [name, target] of targets) {
    if (!existsSync(path.join(repoRoot, target))) {
      console.warn(`Skipping missing target: ${target}`);
      continue;
    }

    const outDir = path.join('.graphify-work', name);
    await run('graphify', [
      'extract',
      target,
      '--out',
      outDir,
      '--no-cluster',
      '--max-workers',
      '1',
    ]);

    const graphFile = path.join(repoRoot, outDir, 'graphify-out', 'graph.json');
    const graph = await readGraph(graphFile);
    if ((graph.nodes?.length ?? 0) === 0) {
      throw new Error(
        `Graphify produced an empty graph for required target ${target}. ` +
          'This usually means AST extraction failed; rerun with permissions that allow Graphify to inspect source files.',
      );
    }
    graphFiles.push(graphFile);
  }

  if (graphFiles.length === 0) {
    throw new Error('No non-empty Graphify source graphs were generated.');
  }

  await mergeGraphs(graphFiles);
  await run('graphify', [
    'cluster-only',
    '.',
    '--graph',
    path.join('graphify-out', 'graph.json'),
    '--no-label',
  ]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
