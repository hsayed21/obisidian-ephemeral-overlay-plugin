import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const manifest = readJson('manifest.json');
const packageJson = readJson('package.json');
const versions = readJson('versions.json');
const errors = [];

if (manifest.version !== packageJson.version) {
	errors.push(`manifest version ${manifest.version} does not match package version ${packageJson.version}`);
}
if (versions[manifest.version] !== manifest.minAppVersion) {
	errors.push(`versions.json does not map ${manifest.version} to ${manifest.minAppVersion}`);
}
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== manifest.version) {
	errors.push(`release tag ${process.env.RELEASE_TAG} does not match manifest version ${manifest.version}`);
}
if (packageJson.license !== 'MIT') {
	errors.push('package license must match the MIT LICENSE file');
}
for (const file of ['main.js', 'manifest.json', 'styles.css']) {
	if (!existsSync(file)) errors.push(`missing release asset: ${file}`);
}

if (errors.length > 0) {
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log(`Release ${manifest.version} is ready: main.js, manifest.json, styles.css`);

function readJson(file) {
	return JSON.parse(readFileSync(file, 'utf8'));
}
