import { useEffect, useState } from 'react';

/**
 * Reakcja na zapytanie medialne w JavaScripcie.
 *
 * Używane tam, gdzie sam CSS nie wystarcza, bo chodzi o to, żeby czegoś w ogóle
 * NIE renderować - na telefonie gwiazdki na kafelkach byłyby nietrafialne, a przy
 * 594 kafelkach oznaczałyby też blisko 3000 zbędnych pól formularza.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Od tej szerokości kafelek mieści gwiazdki w rozmiarze nadającym się do klikania. */
export const useIsWide = () => useMediaQuery('(min-width: 768px)');
