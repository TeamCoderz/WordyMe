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

  if (allDocsQuery.isLoading || !allDocsQuery.data || !user) {
    return null;
  }

  if (allDocsQuery.data.length === 0) {
    return (
      <main className="py-10 max-w-5xl w-full px-6 mx-auto space-y-6 h-full flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto flex flex-col items-center gap-4 mb-14">
          <h1 className="text-xl md:text-2xl lg:text-4xl font-semibold text-center">
            Let's get started, {user.name}!🌥️
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
          {time}, {user.name}!🌥️
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
