/**
 * Warstwa dostępu do Firestore.
 *
 * Jedyne miejsce w aplikacji, które zna nazwy kolekcji i kształt dokumentów.
 * Hooki opakowują to w stan Reacta, komponenty nie dotykają Firestore wprost.
 */

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
  addDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Comment, FavoritesByUser, Photo, Rating, RatingsByUser } from '../types';
import { compareNames } from './sort';

// --- Manifest --------------------------------------------------------------

/**
 * Manifest czytany jest raz przy starcie, bo zmienia się wyłącznie przy wysyłce
 * nowej partii zdjęć. Nasłuchiwanie na żywo byłoby tu marnowaniem odczytów.
 */
export async function fetchManifest(): Promise<Photo[]> {
  const snap = await getDocs(query(collection(db, 'manifest'), orderBy('index')));

  const photos = snap.docs.flatMap((d) => (d.data().photos ?? []) as Photo[]);
  return photos.sort((a, b) => compareNames(a.name, b.name));
}

// --- Oceny -----------------------------------------------------------------

export function subscribeRatings(
  onChange: (r: RatingsByUser) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'ratings'),
    (snap) => {
      const out: RatingsByUser = {};
      snap.forEach((d) => {
        out[d.id] = d.data() as Record<string, Rating>;
      });
      onChange(out);
    },
    (error) => onError?.(error)
  );
}

/**
 * Zapis oceny albo jej cofnięcie (`null`).
 *
 * `setDoc` z `merge` tworzy dokument przy pierwszej ocenie i dopisuje pojedyncze
 * pole przy kolejnych, więc nie trzeba nigdzie osobno zakładać dokumentu.
 */
export function setRating(uid: string, photoId: string, value: Rating | null): Promise<void> {
  return setDoc(
    doc(db, 'ratings', uid),
    { [photoId]: value === null ? deleteField() : value },
    { merge: true }
  );
}

// --- Ulubione --------------------------------------------------------------

/** Zwykły użytkownik czyta wyłącznie własny dokument - tak samo jak pozwalają reguły. */
export function subscribeMyFavorites(
  uid: string,
  onChange: (f: Record<string, true>) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    doc(db, 'favorites', uid),
    (snap) => {
      onChange((snap.data() ?? {}) as Record<string, true>);
    },
    (error) => onError?.(error)
  );
}

/**
 * Admin czyta wszystkie dokumenty. Zapytanie o całą kolekcję przechodzi tylko
 * dlatego, że dla admina reguła jest prawdziwa niezależnie od dokumentu.
 */
export function subscribeAllFavorites(
  onChange: (f: FavoritesByUser) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'favorites'),
    (snap) => {
      const out: FavoritesByUser = {};
      snap.forEach((d) => {
        out[d.id] = d.data() as Record<string, true>;
      });
      onChange(out);
    },
    (error) => onError?.(error)
  );
}

export function setFavorite(uid: string, photoId: string, value: boolean): Promise<void> {
  return setDoc(
    doc(db, 'favorites', uid),
    { [photoId]: value ? true : deleteField() },
    { merge: true }
  );
}

// --- Komentarze ------------------------------------------------------------

const toDate = (value: unknown): Date | null =>
  value instanceof Timestamp ? value.toDate() : null;

function toComment(id: string, data: DocumentData): Comment {
  return {
    id,
    photoId: String(data.photoId ?? ''),
    uid: String(data.uid ?? ''),
    text: String(data.text ?? ''),
    createdAt: toDate(data.createdAt),
    editedAt: toDate(data.editedAt),
  };
}

/**
 * Wszystkie komentarze jednym nasłuchem. Licznik na kafelku i filtr "skomentowane"
 * i tak wymagają wiedzy o wszystkich, a przy kilkuset dokumentach to ułamek
 * dziennego limitu odczytów.
 */
export function subscribeComments(
  onChange: (c: Comment[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'comments'), orderBy('createdAt')),
    (snap) => {
      onChange(snap.docs.map((d) => toComment(d.id, d.data())));
    },
    (error) => onError?.(error)
  );
}

export async function addComment(uid: string, photoId: string, text: string): Promise<void> {
  await addDoc(collection(db, 'comments'), {
    photoId,
    uid,
    text: text.trim(),
    // Reguły wymagają, żeby `createdAt` był równy czasowi serwera - nikt nie
    // podstawi własnej daty.
    createdAt: serverTimestamp(),
  });
}

export function editComment(commentId: string, text: string): Promise<void> {
  return updateDoc(doc(db, 'comments', commentId), {
    text: text.trim(),
    editedAt: serverTimestamp(),
  });
}

export function deleteComment(commentId: string): Promise<void> {
  return deleteDoc(doc(db, 'comments', commentId));
}
