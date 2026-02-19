/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Navigation utilities
 * Provides a global flag-based system for blocking navigation attempts
 */

// Private module-level variable to store navigation blocking state
let shouldBlockNavigation = false;

/**
 * Sets the navigation blocking flag
 */
export function setShouldBlockNavigation(shouldBlock: boolean): void {
  shouldBlockNavigation = shouldBlock;
}

/**
 * Gets the current navigation blocking flag state
 */
export function getShouldBlockNavigation(): boolean {
  return shouldBlockNavigation;
}

/**
 * Custom event name for when navigation is blocked
 */
export const NAVIGATION_BLOCKED_EVENT = 'navigation-blocked';

/**
 * Dispatches a custom event when navigation is blocked
 */
export function dispatchNavigationBlockedEvent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAVIGATION_BLOCKED_EVENT));
  }
}
