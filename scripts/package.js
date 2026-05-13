'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageName = `ban-list-importer-v${manifest.version}.zip`;
const packagePath = path.join(dist, packageName);

const files = [
    'manifest.json',
    'banListImporter.js',
    'popup.html',
    'popup.css',
    'popup.js',
    'icon-16.png',
    'icon-48.png',
    'icon-128.png'
];

fs.mkdirSync(dist, { recursive: true });

if (fs.existsSync(packagePath)) {
    fs.rmSync(packagePath);
}

for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) {
        throw new Error(`Missing package file: ${file}`);
    }
}

execFileSync('zip', ['-X', '-r', packagePath, ...files], {
    cwd: root,
    stdio: 'inherit'
});

console.log(`Packaged ${path.relative(root, packagePath)}`);
