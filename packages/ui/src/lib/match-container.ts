/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Polyfill for the proposed Element.matchContainer() API.
 * Corresponds to @container queries in CSS (like matchMedia for @media).
 * @see https://github.com/teetotum/match-container
 */

declare global {
  interface Element {
    matchContainer?(containerQueryString: string): ContainerQueryList;
  }

  interface ContainerQueryList extends EventTarget {
    container: string;
    matches: boolean;
  }

  interface ContainerQueryListEvent extends Event {
    container: string;
    matches: boolean;
  }
}

if (
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  !Element.prototype.matchContainer
) {
  const polyfill_key = 'bae45330cd3d4e0e96b60d26b57009b5';
  const polyfill = Symbol.for(polyfill_key);
  const win = window as unknown as Record<symbol, { createID: () => string }>;
  win[polyfill] ??= (() => {
    let count = 0;
    return { createID: () => `${polyfill_key}-${Date.now()}-${count++}` };
  })();
  const createID = win[polyfill].createID;

  class ContainerQueryListEvent extends Event {
    container!: string;
    matches!: boolean;

    constructor(type: string) {
      super(type);
    }
  }

  class ContainerQueryList extends EventTarget {
    container!: string;
    matches!: boolean;

    constructor(element: Element, containerQueryString: string) {
      super();
      this.container = containerQueryString;
      const unique_name = 'container-query-observer-' + createID();
      const markerAttribute = `data-${unique_name}`;
      element.setAttribute(markerAttribute, '');
      const sentinelProperty = `--${unique_name}`;
      const containerQuerySheet = new CSSStyleSheet();
      const css = `
@property ${sentinelProperty} {
  syntax: "*";
  inherits: false;
  initial-value: --false;
}
@container ${containerQueryString} { [${markerAttribute}] { ${sentinelProperty}: --true; } }`;

      containerQuerySheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, containerQuerySheet];
      const style = getComputedStyle(element);
      this.matches = style.getPropertyValue(sentinelProperty) === '--true';

      this.#startObserving(sentinelProperty, containerQueryString, element);
    }

    #startObserving(
      sentinelProperty: string,
      containerQueryString: string,
      observedElement: Element,
    ) {
      const _callback = (values: Record<string, string>) => {
        if (sentinelProperty in values) {
          const matches = values[sentinelProperty] === '--true';
          this.matches = matches;
          const event = new ContainerQueryListEvent('change');
          (event as ContainerQueryListEvent).matches = matches;
          (event as ContainerQueryListEvent).container = containerQueryString;
          this.dispatchEvent(event);
        }
      };

      const _previousValues: Record<string, string> = {};
      const el = observedElement as HTMLElement;

      el.style.setProperty('transition', `${sentinelProperty} 0.001ms step-start`);
      el.style.setProperty('transition-behavior', 'allow-discrete');
      const onTransitionRun = (e: TransitionEvent) => {
        const targetElement = e.target as Element;

        if (el === targetElement) {
          const computedStyle = getComputedStyle(targetElement);
          const changes: Record<string, string> = {};
          const currentValue = computedStyle.getPropertyValue(sentinelProperty);
          const previousValue = _previousValues[sentinelProperty];
          const hasChanged = currentValue !== previousValue;

          if (hasChanged) {
            changes[sentinelProperty] = currentValue;
            _previousValues[sentinelProperty] = currentValue;
            _callback(changes);
          }
        }
      };
      el.addEventListener('transitionrun', onTransitionRun);

      const computedStyle = getComputedStyle(el);
      const currentValue = computedStyle.getPropertyValue(sentinelProperty);
      _previousValues[sentinelProperty] = currentValue;
    }
  }

  Element.prototype.matchContainer = function (containerQueryString: string) {
    return new ContainerQueryList(this, containerQueryString);
  };
}
