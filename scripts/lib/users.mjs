/**
 * Mapa użytkowników dla skryptów administracyjnych.
 *
 * Czyta ten sam plik co front (`src/config/users.json`), żeby obie strony
 * nie mogły się rozjechać.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '..', '..', 'src', 'config', 'users.json'), 'utf8'));

export const ADMIN_UID = data.adminUid;
export const USERS = data.users;
export const USER_UIDS = Object.keys(USERS);

export function userName(uid) {
  return USERS[uid]?.name ?? 'Nieznany';
}
