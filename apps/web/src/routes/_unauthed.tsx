/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useActions } from '@/store';
import { getSession, useSession } from '@repo/sdk/auth';
import { Button } from '@repo/ui/components/button';
import {
  createFileRoute,
  ErrorRouteComponent,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect, useLayoutEffect } from 'react';

const UnauthedRouteErrorComponent: ErrorRouteComponent = ({ error, reset }) => {
  useEffect(() => {
    console.error('Error in Unauthed Route:', error);
  }, [error]);
  return (
    <div className="w-full flex-1 flex items-center justify-center p-4 flex-col gap-4">
      <h1 className="text-2xl font-bold mb-4 text-destructive text-center">
        An unexpected error occurred
      </h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Go to Home Page</Link>
        </Button>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_unauthed')({
  beforeLoad: async ({ context: { session, store } }) => {
    if (session.isLoading) {
      const { data, error } = await getSession();
      if (error || data !== null) {
        throw redirect({ to: '/' });
      }
    } else if (session.data !== null) {
      throw redirect({ to: '/' });
    }
    store.setState({
      user: null,
    });
  },
  component: RouteComponent,
  errorComponent: UnauthedRouteErrorComponent,
});
function RouteComponent() {
  return (
    <>
      <Outlet />
      <UserSync />
    </>
  );
}
function UserSync() {
  const { data: session } = useSession();
  const { setUser } = useActions();
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (session?.user) {
      const cover_image = session.user.coverMeta;
      const avatar_image = session.user.imageMeta;
      const cover_image_url = session.user.cover;
      const avatar_image_url = session.user.image;
      setUser({
        ...session.user,
        cover_image: cover_image
          ? {
              url: cover_image_url ?? null,
              x: cover_image?.x ?? null,
              y: cover_image?.y ?? null,
              width: cover_image?.width ?? null,
              height: cover_image?.height ?? null,
              zoom: cover_image?.zoom ?? null,
              type: 'cover',
              calculatedImage: null,
              isLoading: true,
            }
          : undefined,
        avatar_image: avatar_image
          ? {
              url: avatar_image_url ?? null,
              x: avatar_image?.x ?? null,
              y: avatar_image?.y ?? null,
              width: avatar_image?.width ?? null,
              height: avatar_image?.height ?? null,
              zoom: avatar_image?.zoom ?? null,
              type: 'avatar',
              calculatedImage: null,
              isLoading: true,
              provider: 'supabase',
            }
          : undefined,
        editor_settings: {
          id: '',
          createdAt: new Date(),
          userId: session.user.id,
          keepPreviousRevision: false,
          autosave: false,
        },
        isGuest: false,
      });
      navigate({ to: '/' });
    }
  }, [session, setUser, navigate]);
  return null;
}
