/**
 * Centralized route definitions for the application.
 *
 * Console path pattern: /c/:role/:sidebar/:sub
 *   - role: "admin" | "user"
 *   - sidebar: main nav item (URL-encoded Chinese)
 *   - sub: sub-item or "__root__" for items without children
 *
 * Auth flow:
 *   /login        -> GuestGuard (redirects to / if authenticated)
 *   /c/*          -> AuthGuard  (redirects to /login if not authenticated)
 *   /             -> ConsoleHomeRedirect (redirects to default console path)
 *   *             -> NotFoundPage
 */

export { AuthGuard } from './guards/AuthGuard';
export { GuestGuard } from './guards/GuestGuard';
export { RoleGuard } from './guards/RoleGuard';
export { ConsoleHomeRedirect } from './ConsoleHomeRedirect';
