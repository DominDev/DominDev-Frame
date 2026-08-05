import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const forbiddenMark = Buffer.from(String.fromCodePoint(0x2014));

test('pliki śledzone przez Git nie zawierają znaku em dash', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const offenders = files.filter((file) => readFileSync(file).includes(forbiddenMark));

  assert.deepEqual(
    offenders,
    [],
    `Zastąp znak em dash zwykłym łącznikiem (-) w plikach: ${offenders.join(', ')}`
  );
});
