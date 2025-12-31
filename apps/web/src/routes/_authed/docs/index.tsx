import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/docs/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/docs/manage" />;
}
