/**
 * Jedno miejsce spinające wszystkie dane aplikacji.
 *
 * Manifest czytany jest raz, reszta nasłuchuje na żywo - dzięki temu ocena
 * wystawiona przez jedną osobę pojawia się u pozostałych bez odświeżania.
 *
 * Zapisy nie wymagają optymistycznej aktualizacji ręcznie: Firestore natychmiast
 * odzwierciedla własny zapis w nasłuchu, jeszcze przed potwierdzeniem z serwera,
 * więc gwiazdka zapala się od razu mimo bucketu po drugiej stronie Atlantyku.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Comment, FavoritesByUser, Photo, Rating, RatingsByUser } from '../types';
import {
  addComment,
  deleteComment,
  editComment,
  fetchManifest,
  setFavorite,
  setRating,
  subscribeAllFavorites,
  subscribeComments,
  subscribeMyFavorites,
  subscribeRatings,
} from '../lib/db';
import { computeStats, countComments, latestCommentAt } from '../lib/stats';

export interface AppData {
  photos: Photo[];
  ratings: RatingsByUser;
  myRatings: Record<string, Rating>;
  favorites: FavoritesByUser;
  myFavorites: Record<string, true>;
  comments: Comment[];
  stats: ReturnType<typeof computeStats>;
  commentCounts: Map<string, number>;
  latestComment: Map<string, number>;
  loading: boolean;
  error: string | null;
  rate: (photoId: string, value: Rating | null) => void;
  toggleFavorite: (photoId: string) => void;
  comment: {
    add: (photoId: string, text: string) => Promise<void>;
    edit: (commentId: string, text: string) => Promise<void>;
    remove: (commentId: string) => Promise<void>;
  };
}

export function useAppData(uid: string | null, admin: boolean): AppData {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ratings, setRatings] = useState<RatingsByUser>({});
  const [favorites, setFavorites] = useState<FavoritesByUser>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [manifestLoaded, setManifestLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    fetchManifest()
      .then((p) => {
        if (cancelled) return;
        setPhotos(p);
        setManifestLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError('Nie udało się wczytać listy zdjęć. Odśwież stronę.');
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return subscribeRatings(setRatings);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    // Admin widzi ulubione wszystkich - to jego raport. Zwykły użytkownik czyta
    // wyłącznie swój dokument, bo reguły nie pozwalają mu na nic więcej.
    return admin ? subscribeAllFavorites(setFavorites) : subscribeMyFavorites(uid, (f) => setFavorites({ [uid]: f }));
  }, [uid, admin]);

  useEffect(() => {
    if (!uid) return;
    return subscribeComments(setComments);
  }, [uid]);

  const myRatings = useMemo(() => (uid ? (ratings[uid] ?? {}) : {}), [ratings, uid]);
  const myFavorites = useMemo(() => (uid ? (favorites[uid] ?? {}) : {}), [favorites, uid]);

  const stats = useMemo(() => computeStats(ratings), [ratings]);
  const commentCounts = useMemo(() => countComments(comments), [comments]);
  const latestComment = useMemo(() => latestCommentAt(comments), [comments]);

  const rate = useCallback(
    (photoId: string, value: Rating | null) => {
      if (!uid) return;
      void setRating(uid, photoId, value).catch((err) => {
        console.error(err);
        setError('Nie udało się zapisać oceny. Sprawdź połączenie.');
      });
    },
    [uid]
  );

  const toggleFavorite = useCallback(
    (photoId: string) => {
      if (!uid) return;
      void setFavorite(uid, photoId, !myFavorites[photoId]).catch((err) => {
        console.error(err);
        setError('Nie udało się zapisać ulubionych. Sprawdź połączenie.');
      });
    },
    [uid, myFavorites]
  );

  const comment = useMemo(
    () => ({
      add: (photoId: string, text: string) => addComment(uid ?? '', photoId, text),
      edit: editComment,
      remove: deleteComment,
    }),
    [uid]
  );

  return {
    photos,
    ratings,
    myRatings,
    favorites,
    myFavorites,
    comments,
    stats,
    commentCounts,
    latestComment,
    loading: !manifestLoaded && error === null,
    error,
    rate,
    toggleFavorite,
    comment,
  };
}
