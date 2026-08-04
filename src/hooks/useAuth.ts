import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { isAdmin, userName } from '../config/users';

export interface AuthState {
  user: User | null;
  uid: string | null;
  name: string;
  admin: boolean;
  /** `true` dopóki Firebase nie odtworzy zapamiętanej sesji. */
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      }),
    []
  );

  return {
    user,
    uid: user?.uid ?? null,
    name: userName(user?.uid),
    admin: isAdmin(user?.uid),
    loading,
  };
}
