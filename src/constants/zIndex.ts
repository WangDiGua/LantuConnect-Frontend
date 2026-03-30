/**
 * Centralized z-index layer definitions.
 * Use these constants instead of arbitrary z-index values throughout the app.
 *
 * Tailwind arbitrary values: className={`z-[${Z.MODAL}]`}
 * Inline styles:            style={{ zIndex: Z.MODAL }}
 */
export const Z = {
  /** Content-level relative stacking (cards, badges) */
  CONTENT: 10,
  /** Page-level sticky headers inside views */
  PAGE_HEADER: 20,
  /** Global header bar */
  HEADER: 30,
  /** Mobile nav overlay backdrop */
  MOBILE_BACKDROP: 40,
  /** Sidebar */
  SIDEBAR: 50,
  /** Header dropdown menus (settings, user, notifications) */
  HEADER_DROPDOWN: 60,
  /** Message panel detail overlay */
  MESSAGE_DETAIL: 70,
  /** Toast / action feedback */
  TOAST: 150,
  /** Quick-access overlay, countdown timer */
  OVERLAY: 200,
  /** Global modal / confirm dialog */
  MODAL: 9000,
  /** Splash screen, global message toast */
  TOP: 9999,
  /** Portal dropdown (escaping overflow containers) */
  PORTAL_DROPDOWN: 9000,
} as const;
