import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import esbuild from 'esbuild';

const outputDirectory = resolve('.tmp');
const outputFile = resolve(outputDirectory, 'core.test.cjs');
mkdirSync(outputDirectory, { recursive: true });

await esbuild.build({
	entryPoints: ['tests/core.test.ts'],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node18',
	external: ['node:*'],
	outfile: outputFile,
});

const result = spawnSync(process.execPath, ['--test', outputFile], { stdio: 'inherit' });
process.exit(result.status ?? 1);
