import { useEffect, useMemo, useRef, useState } from 'react';
import type { Photo } from './types';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useRoute } from './hooks/useRoute';
import { useIsWide } from './hooks/useMediaQuery';
import { ratedCount, selectPhotos, type Tab } from './lib/stats';
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

  // Podgląd pracuje na liście zamrożonej w chwili otwarcia. Bez tego ocenienie
  // zdjęcia w zakładce "nieocenione" wyrzucałoby je z listy pod stopami
  // użytkownika i przeskakiwało gdzie indziej.
  const frozen = useRef<Photo[] | null>(null);
  if (route.photoId && frozen.current === null) frozen.current = selected;
  if (!route.photoId && frozen.current !== null) frozen.current = null;

  const viewerPhotos = frozen.current ?? selected;
  const viewerIndex = route.photoId ? viewerPhotos.findIndex((p) => p.id === route.photoId) : -1;

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
            ? () => {
                route.setFilters({ ...route.filters, tab: 'unrated' });
                route.openPhoto(firstUnrated.id);
              }
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

      {viewerIndex >= 0 && (
        <PhotoViewer
          photos={viewerPhotos}
          index={viewerIndex}
          myRatings={data.myRatings}
          myFavorites={data.myFavorites}
          stats={data.stats}
          comments={data.comments}
          currentUid={auth.uid}
          admin={auth.admin}
          revealAverage={revealAverages}
          onClose={route.closePhoto}
          onNavigate={(i) => route.openPhoto(viewerPhotos[i].id)}
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
