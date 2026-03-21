/**
 * Centralized route definitions for the application.
 *
 * Hash-based routing pattern: /#/:role/:page[/:id]
 *   - role: "admin" | "user"
 *   - page: flat page identifier (e.g. "dashboard", "agent-list")
 *   - id: optional entity ID for detail pages
 *
 * Auth flow:
 *   /#/login      -> GuestGuard (redirects to / if authenticated)
 *   /#/*          -> AuthGuard  (redirects to /login if not authenticated)
 *   /#/           -> ConsoleHomeRedirect (redirects to default path)
 */

export { AuthGuard } from './guards/AuthGuard';
export { GuestGuard } from './guards/GuestGuard';
export { RoleGuard } from './guards/RoleGuard';
export { ConsoleHomeRedirect } from './ConsoleHomeRedirect';
