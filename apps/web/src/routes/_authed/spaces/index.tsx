import { createFileRoute, Navigate } from '@tanstack/react-router';
export const Route = createFileRoute('/_authed/spaces/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/spaces/manage" />;
}
