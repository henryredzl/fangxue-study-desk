const assert = require('node:assert/strict');
const fs = require('node:fs');
const { resolve } = require('node:path');

const androidPath = resolve(__dirname, '../android/src/main/AndroidManifest.xml');
const iosPath = resolve(__dirname, '../ios/StudyDesk.xcodeproj/project.pbxproj');
const android = fs.readFileSync(androidPath, 'utf8');
const ios = fs.readFileSync(iosPath, 'utf8');
const name = /android:versionName="(\d+\.\d+\.\d+)"/g;
const code = /android:versionCode="(\d+)"/g;
const marketing = /MARKETING_VERSION = (\d+\.\d+\.\d+);/g;
const build = /CURRENT_PROJECT_VERSION = (\d+);/g;

function read(source, expression, count) {
  const values = Array.from(source.matchAll(expression), match => match[1]);
  assert.equal(values.length, count, `Unexpected number of version fields for ${expression}`);
  assert.ok(values.every(value => value === values[0]), `Version fields disagree for ${expression}`);
  return values[0];
}

const version = read(android, name, 1);
const androidBuild = Number(read(android, code, 1));
const iosBuild = Number(read(ios, build, 2));
assert.equal(read(ios, marketing, 2), version, 'Android and iOS versions must match');

const command = process.argv[2] ?? '--check';
if (command === '--bump-patch') {
  const [major, minor, patch] = version.split('.').map(Number);
  assert.ok([major, minor, patch + 1, androidBuild + 1, iosBuild + 1].every(Number.isSafeInteger));
  const next = `${major}.${minor}.${patch + 1}`;
  fs.writeFileSync(androidPath, android.replace(name, `android:versionName="${next}"`).replace(code, `android:versionCode="${androidBuild + 1}"`));
  fs.writeFileSync(iosPath, ios.replace(marketing, `MARKETING_VERSION = ${next};`).replace(build, `CURRENT_PROJECT_VERSION = ${iosBuild + 1};`));
  console.log(next);
} else if (command === '--check') {
  console.log(version);
} else {
  throw new Error('Use --check or --bump-patch.');
}
