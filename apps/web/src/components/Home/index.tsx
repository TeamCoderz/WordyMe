import { HomeAllDocuments } from './HomeAllDocuments';
import { HomeFavoriteDocuments } from './HomeFavoriteDocuments';
import { HomeFavoriteSpaces } from './HomeFavoriteSpaces';
import { HomeRecentViewsDocuments } from './HomeRecentViewsDocuments';
import { SortOptions } from '@/types/sort';
import { useLocalStorage } from '@repo/ui/hooks/use-local-storage';
import { useTime } from 'day-time-greet';
import { useSelector } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { getHomeAllDocumentsQueryOptions } from '@/queries/documents';
import { useEffect } from 'react';
import { Skeleton } from '@repo/ui/components/skeleton';

type HomeSortState = {
  favoriteSpaces: SortOptions;
  favoriteDocuments: SortOptions;
  allDocs: SortOptions;
};

export const HomePage = () => {
  const [homeSorts, setHomeSorts] = useLocalStorage<HomeSortState>('home-sorts', {
    favoriteSpaces: 'a-z',
    favoriteDocuments: 'a-z',
    allDocs: 'a-z',
  });
  const { time } = useTime();
  const user = useSelector((state) => state.user);
  const allDocsQuery = useQuery(getHomeAllDocumentsQueryOptions(homeSorts.allDocs));

  useEffect(() => {
    if (homeSorts.allDocs) {
      allDocsQuery.refetch();
    }
  }, [homeSorts.allDocs]);

  if (allDocsQuery.isLoading || !allDocsQuery.data) {
    return (
      <main className="py-10 max-w-5xl w-full px-6 mx-auto space-y-6">
        <div className="max-w-2xl w-full mx-auto flex flex-col items-center gap-4 mb-14">
          <Skeleton className="h-8 w-64 md:h-10 md:w-80 lg:h-12 lg:w-96" />
          <Skeleton className="h-4 w-48 md:w-64" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid @min-[36rem]:grid-cols-4 grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 flex gap-3 items-center flex-1 bg-home-card rounded-md">
                <div className="bg-muted p-2 rounded-md">
                  <Skeleton className="size-5" />
                </div>
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="size-9 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid @min-[36rem]:grid-cols-4 grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 flex gap-3 items-center flex-1 bg-home-card rounded-md">
                <div className="bg-muted p-2 rounded-md">
                  <Skeleton className="size-5" />
                </div>
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="size-9 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 flex gap-3 items-center bg-home-card rounded-md">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 ml-auto" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid @min-[36rem]:grid-cols-4 grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 flex gap-3 items-center flex-1 bg-home-card rounded-md">
                <div className="bg-muted p-2 rounded-md">
                  <Skeleton className="size-5" />
                </div>
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="size-9 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (allDocsQuery.data.length === 0) {
    return (
      <main className="py-10 max-w-5xl w-full px-6 mx-auto space-y-6 h-full flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto flex flex-col items-center gap-4 mb-14">
          <h1 className="text-xl md:text-2xl lg:text-4xl font-semibold text-center">
            Let's get started, {user?.name}!🌥️
          </h1>
          <p className="text-muted-foreground text-center">
            We'll guide you step by step — let's set up your first notes.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="py-10 max-w-5xl w-full px-6 mx-auto space-y-6">
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center gap-4 mb-14">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-semibold text-center">
          {time}, {user?.name}!🌥️
        </h1>
        <p className="text-muted-foreground text-center">
          Every note you take is a step forward. Keep building!
        </p>
      </div>
      <HomeFavoriteSpaces
        favoriteSpacesSort={homeSorts.favoriteSpaces}
        setFavoriteSpacesSort={(value) => {
          setHomeSorts((prev) => ({ ...prev, favoriteSpaces: value }));
        }}
      />
      <HomeFavoriteDocuments
        favoriteDocumentsSort={homeSorts.favoriteDocuments}
        setFavoriteDocumentsSort={(value) => {
          setHomeSorts((prev) => ({ ...prev, favoriteDocuments: value }));
        }}
      />
      <HomeRecentViewsDocuments />
      <HomeAllDocuments
        allDocumentsSort={homeSorts.allDocs}
        setAllDocumentsSort={(value) => {
          setHomeSorts((prev) => ({ ...prev, allDocs: value }));
        }}
      />
    </main>
  );
};
