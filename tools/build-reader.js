'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SOURCES = [
  'app/src/reader/00-reader-constants.js',
  'app/src/reader/01-chinese-character-pinyin-data.js',
  'app/src/reader/02-dictionary-indexes.js',
  'app/src/reader/10-state-storage-and-dictionary.js',
  'app/src/reader/20-subtitles-and-segmentation.js',
  'app/src/reader/30-reader-audio-and-sessions.js',
  'app/src/reader/40-lookup-and-library-ui.js',
];

function buildReaderBundle(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const fragments = SOURCES.map((relativePath) => {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error('Missing reader source fragment: ' + relativePath);
    }
    return fs.readFileSync(absolutePath, 'utf8');
  });
  return "'use strict';\n(() => {\n" + fragments.join('') + "\n})();\n";
}

function writeReaderBundle(rootDirectory, outputPath) {
  const output = path.resolve(rootDirectory, outputPath);
  const bundle = buildReaderBundle(rootDirectory);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = output + '.tmp';
  fs.writeFileSync(temporary, bundle, 'utf8');
  fs.renameSync(temporary, output);
  return output;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const output = process.argv[2] || 'build/reader/app.js';
  try {
    const destination = writeReaderBundle(root, output);
    process.stdout.write('Reader bundle created: ' + path.relative(root, destination) + '\n');
  } catch (error) {
    process.stderr.write('Reader bundle failed: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = { SOURCES, buildReaderBundle, writeReaderBundle };
