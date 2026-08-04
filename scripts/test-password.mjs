import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPasswordValid, passwordRules } from '../src/lib/password.ts';
import { checkPassword } from './lib/password.mjs';

const cases = [
  ['Aa$12345', true],
  ['short$', false],
  ['bez-wielkiej1', false],
  ['BEZ-MALEJ1', false],
  ['BezSpecjalnego1', false],
  ['Zażółć$Gęślą1', true],
];

for (const [password, expected] of cases) {
  test(`polityka hasła: ${expected ? 'akceptuje' : 'odrzuca'} przypadek`, () => {
    assert.equal(isPasswordValid(password), expected);
    assert.equal(checkPassword(password).length === 0, expected, 'frontend i skrypt admina muszą być zgodne');
  });
}

test('formularz zwraca cztery czytelne reguły i oznacza ich stan', () => {
  const rules = passwordRules('Aa$12345');
  assert.equal(rules.length, 4);
  assert.ok(rules.every((rule) => rule.met));
});
