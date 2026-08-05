import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const forbiddenMarks = [0x2013, 0x2014].map((codePoint) =>
  Buffer.from(String.fromCodePoint(codePoint))
);

test('pliki śledzone przez Git używają zwykłych łączników', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const offenders = files.filter((file) => {
    const content = readFileSync(file);
    return forbiddenMarks.some((mark) => content.includes(mark));
  });

  assert.deepEqual(
    offenders,
    [],
    `Zastąp typograficzny myślnik zwykłym łącznikiem (-) w plikach: ${offenders.join(', ')}`
  );
});
