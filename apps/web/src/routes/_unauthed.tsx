import { getSession } from '@repo/sdk/auth';
import { Button } from '@repo/ui/components/button';
import {
  createFileRoute,
  ErrorRouteComponent,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { useEffect } from 'react';

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
  beforeLoad: async ({ context: { session } }) => {
    console.log('session.isLoading', session.isLoading);
    if (session.isLoading) {
      const { data, error } = await getSession();
      if (error || data !== null) {
        throw redirect({ to: '/' });
      }
    } else if (session.data !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: RouteComponent,
  errorComponent: UnauthedRouteErrorComponent,
});
function RouteComponent() {
  return <Outlet />;
}
