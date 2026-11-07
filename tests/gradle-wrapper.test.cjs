#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const wrapperJar = path.join(root, 'gradle', 'wrapper', 'gradle-wrapper.jar');
const shellScript = path.join(root, 'gradlew');
const batchScript = path.join(root, 'gradlew.bat');
const propertiesPath = path.join(root, 'gradle', 'wrapper', 'gradle-wrapper.properties');

for (const file of [wrapperJar, shellScript, batchScript, propertiesPath]) {
  assert.ok(fs.statSync(file).isFile(), 'Required Gradle wrapper file is missing: ' + path.relative(root,file));
}

const actualJarSha = crypto.createHash('sha256').update(fs.readFileSync(wrapperJar)).digest('hex');
const expectedJarSha = '498495120a03b9a6ab5d155f5de3c8f0d986a449153702fb80fc80e134484f17';
assert.equal(actualJarSha, expectedJarSha, 'Gradle 8.9 wrapper JAR must match the official published checksum');

const properties = fs.readFileSync(propertiesPath, 'utf8');
assert.match(properties, /^distributionUrl=https\\:\/\/services\.gradle\.org\/distributions\/gradle-8\.9-bin\.zip$/m);
assert.match(properties, /^distributionSha256Sum=d725d707bfabd4dfdc958c624003b3c80accc03f7037b5122c4b1d0ef15cecab$/m,
  'Gradle 8.9 distribution must match the official published checksum');
assert.match(fs.readFileSync(shellScript,'utf8'), /gradle-wrapper\.jar/);
assert.match(fs.readFileSync(batchScript,'utf8'), /gradle-wrapper\.jar/i);

if (process.platform !== 'win32') {
  const mode = fs.statSync(shellScript).mode;
  assert.ok((mode & 0o111) !== 0, 'gradlew must be executable in Git');
}
console.log('ok - official Gradle 8.9 wrapper JAR and distribution checksums');
