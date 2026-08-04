import { useEffect, useMemo, useRef, useState } from 'react';
import type { Photo } from './types';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useRoute } from './hooks/useRoute';
import { useIsWide } from './hooks/useMediaQuery';
import { ratedCount, selectPhotos, type Tab } from './lib/stats';
import { resolveViewer } from './lib/viewer';
import { LoginForm } from './components/auth/LoginForm';
import { AppHeader } from './components/layout/AppHeader';
import { FilterBar } from './components/gallery/FilterBar';
import { GalleryGrid } from './components/gallery/GalleryGrid';
import { PhotoViewer } from './components/viewer/PhotoViewer';
import { AdminPanel } from './components/admin/AdminPanel';
import styles from './App.module.css';

const REVEAL_KEY = 'frame:revealAverages';

export default function App() {
  const auth = useAuth();
  const data = useAppData(auth.uid, auth.admin);
  const route = useRoute();
  const wide = useIsWide();

  // Admin może zdjąć zasłonę ze średnich - przy czytaniu raportów zasłona
  // tylko przeszkadza. Wybór przeżywa odświeżenie strony.
  const [revealAverages, setRevealAverages] = useState(
    () => localStorage.getItem(REVEAL_KEY) === '1'
  );
  useEffect(() => {
    localStorage.setItem(REVEAL_KEY, revealAverages ? '1' : '0');
  }, [revealAverages]);

  const selected = useMemo(
    () =>
      selectPhotos({
        photos: data.photos,
        filters: route.filters,
        myRatings: data.myRatings,
        myFavorites: data.myFavorites,
        stats: data.stats,
        commentCounts: data.commentCounts,
        latestComment: data.latestComment,
      }),
    [data, route.filters]
  );

  const tabCounts = useMemo<Record<Tab, number>>(
    () => ({
      all: data.photos.length,
      unrated: data.photos.filter((p) => data.myRatings[p.id] === undefined).length,
      favorites: data.photos.filter((p) => data.myFavorites[p.id]).length,
      commented: data.photos.filter((p) => (data.commentCounts.get(p.id) ?? 0) > 0).length,
    }),
    [data.photos, data.myRatings, data.myFavorites, data.commentCounts]
  );

  // Podgląd pracuje na liście zamrożonej w chwili otwarcia, żeby ocenienie
  // zdjęcia w zakładce "nieocenione" nie wyrzucało go z listy pod stopami
  // użytkownika. Reguły tego zamrażania siedzą w `resolveViewer`, bo mają
  // testy - potrafią zablokować aplikację na trwałe.
  const frozen = useRef<Photo[] | null>(null);
  const viewer = resolveViewer({
    photoId: route.photoId,
    frozen: frozen.current,
    selected,
    all: data.photos,
  });
  frozen.current = viewer.freeze;

  // Adres wskazujący na nieistniejące zdjęcie zostawiłby aplikację w stanie,
  // z którego użytkownik nie ma jak wyjść klikaniem. Czyścimy go sami.
  const { closePhoto } = route;
  useEffect(() => {
    if (viewer.stale) closePhoto();
  }, [viewer.stale, closePhoto]);

  const firstUnrated = useMemo(
    () => data.photos.find((p) => data.myRatings[p.id] === undefined),
    [data.photos, data.myRatings]
  );

  if (auth.loading) {
    return <p className={styles.splash}>Wczytywanie...</p>;
  }

  if (!auth.user || !auth.uid) {
    return <LoginForm />;
  }

  return (
    <>
      <AppHeader
        name={auth.name}
        admin={auth.admin}
        view={route.view}
        rated={ratedCount(data.myRatings)}
        total={data.photos.length}
        onJumpToUnrated={
          firstUnrated
            ? // Filtry i otwarcie zdjęcia w jednym przejściu. Dwa osobne wywołania
              // nadpisywałyby się nawzajem, bo drugie budowało adres ze starych filtrów.
              () => route.openPhoto(firstUnrated.id, { ...route.filters, tab: 'unrated' })
            : null
        }
        onGoTo={route.goTo}
      />

      <main className="appMain">
        {data.error && (
          <p className={styles.error} role="alert">
            {data.error}
          </p>
        )}

        {data.loading ? (
          <p className={styles.splash}>Wczytywanie zdjęć...</p>
        ) : route.view === 'admin' && auth.admin ? (
          <AdminPanel
            photos={data.photos}
            ratings={data.ratings}
            favorites={data.favorites}
            stats={data.stats}
            revealAverages={revealAverages}
            onToggleReveal={setRevealAverages}
          />
        ) : (
          <>
            <FilterBar
              filters={route.filters}
              onChange={route.setFilters}
              shown={selected.length}
              total={data.photos.length}
              counts={tabCounts}
            />
            <GalleryGrid
              photos={selected}
              myRatings={data.myRatings}
              myFavorites={data.myFavorites}
              stats={data.stats}
              commentCounts={data.commentCounts}
              showStars={wide}
              revealAverage={revealAverages}
              onOpen={route.openPhoto}
              onRate={data.rate}
              onToggleFavorite={data.toggleFavorite}
            />
          </>
        )}
      </main>

      {viewer.index >= 0 && (
        <PhotoViewer
          photos={viewer.photos}
          index={viewer.index}
          myRatings={data.myRatings}
          myFavorites={data.myFavorites}
          stats={data.stats}
          comments={data.comments}
          currentUid={auth.uid}
          admin={auth.admin}
          revealAverage={revealAverages}
          onClose={route.closePhoto}
          onNavigate={(i) => route.openPhoto(viewer.photos[i].id)}
          onRate={data.rate}
          onToggleFavorite={data.toggleFavorite}
          onAddComment={data.comment.add}
          onEditComment={data.comment.edit}
          onDeleteComment={data.comment.remove}
        />
      )}
    </>
  );
}
