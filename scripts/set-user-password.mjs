/**
 * Zmiana hasła dowolnemu użytkownikowi.
 *
 *   npm run user:password -- <e-mail> <nowe-haslo>
 *   npm run user:password -- --list
 *
 * Konsola Firebase pozwala założyć konto i wysłać mail resetujący, ale
 * bezpośrednie ustawienie komuś hasła jest operacją Admin SDK. Stąd ten skrypt.
 *
 * Zmiana działa natychmiast i NIE wymusza zmiany przy kolejnym logowaniu.
 * Uruchamiany wyłącznie lokalnie, na kluczu spoza repozytorium.
 */

import { auth } from './lib/admin.mjs';
import { USERS, userName } from './lib/users.mjs';
import { checkPassword, describePolicy } from './lib/password.mjs';

const args = process.argv.slice(2);

if (args.includes('--list')) {
  const { users } = await auth().listUsers(50);
  console.log('\nKonta w projekcie:\n');
  for (const u of users) {
    const known = USERS[u.uid];
    console.log(
      `  ${(known?.name ?? '?').padEnd(12)} ${u.email.padEnd(36)} ${u.uid}` +
        (known?.role === 'admin' ? '  [admin]' : '')
    );
  }
  console.log('');
  process.exit(0);
}

const [email, password] = args;

if (!email || !password) {
  console.error('\nUzycie:');
  console.error('  npm run user:password -- <e-mail> <nowe-haslo>');
  console.error('  npm run user:password -- --list\n');
  console.error(describePolicy());
  console.error('');
  process.exit(1);
}

const problems = checkPassword(password);
if (problems.length) {
  console.error('\nHaslo nie spelnia polityki:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

try {
  const user = await auth().getUserByEmail(email);
  await auth().updateUser(user.uid, { password });
  console.log(`\nHaslo zmienione: ${userName(user.uid)} <${email}>`);
  console.log('Dziala natychmiast, bez wymuszania zmiany przy logowaniu.\n');
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    console.error(`\nNie ma konta o adresie ${email}.`);
    console.error('Liste kont pokaze: npm run user:password -- --list\n');
  } else {
    console.error(`\nBlad: ${err.message}\n`);
  }
  process.exit(1);
}
