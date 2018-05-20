import { ActiveRouter, Listener, RouteSubscription, MatchResults } from './interfaces';
import { shallowEqual } from '../utils/shallow-equal';
import { canUseDOM } from '../utils/dom-utils';

declare var Context: any;

let routerHasLoaded: boolean = false;
let routerWaitPromise: Promise<any> = null;
// Adapted from ionic-router
function waitUntilRouter() {
  if (!canUseDOM || routerHasLoaded) { return Promise.resolve(null); }
  if (routerWaitPromise) { return routerWaitPromise; }

  routerWaitPromise = new Promise((resolve) => {
    window.addEventListener('stencilRouterWillLoad', (data) => {
      routerHasLoaded = true;
      resolve(data);
    }, { once: true }); //
  });
  return routerWaitPromise;
}

Context.activeRouter = (function() {
  let init: boolean = false;
  let state: { [key: string]: any } = {};
  const nextListeners: RouteSubscription[] = [];

  function getDefaultState(): { [key: string]: any } {
    return {
      location: {
        pathname: Context.window.location.pathname,
        search: Context.window.location.search
      }
    };
  }

  function waitForRouter(): Promise<any> {
    return waitUntilRouter();
  }

  function set(value: { [key: string]: any }) {
    if (!init) {
      init = true;
      // Initialize the router listener before the router raises its event.
      waitUntilRouter();
    }
    state = {
      ...state,
      ...value
    };
    dispatch();
  }

  function get(attrName?: string) {
    if (Object.keys(state).length === 0) {
      return getDefaultState()[attrName];
    }
    if (!attrName) {
      return state;
    }
    return state[attrName];
  }

  async function dispatch() {
    const listeners = nextListeners;
    const matchList: [ number, MatchResults, string ][] = [];
    const pathname = get('location').pathname;

    // Assume listeners are ordered by group and then groupIndex
    for (let i = 0; i < listeners.length; i++) {
      let match = null;
      // Check if this listener belongs to a route that matches, and is part of a group.
      const isGroupMatch = matchList.some(me => {
        return me[1] && me[2] && me[2] === listeners[i].groupId;
      });

      // If we don't have a match in the group, check this listener for a match
      if (!isGroupMatch) {
        match = listeners[i].isMatch(pathname);
      } else {
        // Otherwise we already have a match, so do not calculate one for this listener
        match = null;
      }

      if (!shallowEqual(listeners[i].lastMatch, match)) {
        if (!isGroupMatch && listeners[i].groupId) {
          matchList.unshift([i, match, listeners[i].groupId]);
        } else {
          matchList.push([i, match, listeners[i].groupId]);
        }
      }
      listeners[i].lastMatch = match;
    }

    for (const [listenerIndex, matchResult, groupId] of matchList) {
      if (groupId && matchResult) {
        await listeners[listenerIndex].listener(matchResult);
      } else {
        listeners[listenerIndex].listener(matchResult);
      }
    }
  }

  function addListener(routeSubscription: RouteSubscription) {
    const pathname = get('location').pathname;
    const match = routeSubscription.isMatch(pathname);

    routeSubscription.lastMatch = match;
    routeSubscription.listener(match);

    // If the new route does not have a group then add to the end of the list
    // If this is the first item push it on the list.
    if (routeSubscription.groupId == null || routeSubscription.groupIndex == null || nextListeners.length === 0) {
      nextListeners.push(routeSubscription);
    } else {
      for (let i = 0; i < nextListeners.length; i++) {
        const { groupId, groupIndex } = nextListeners[i];

        if (groupId == null) {
          nextListeners.splice(i, 0, routeSubscription);
          break;
        }

        if (groupId === routeSubscription.groupId) {
          if (groupIndex > routeSubscription.groupIndex) {
            nextListeners.splice(i, 0, routeSubscription); // insert before
          } else {
            nextListeners.splice(i + 1, 0, routeSubscription); // insert after
          }
          break;
        }
      }
    }
  }

  function removeListener(routeSubscription: RouteSubscription) {
    const index = nextListeners.indexOf(routeSubscription);
    nextListeners.splice(index, 1);
  }

  /**
   * Subscribe to the router for changes
   * The callback that is returned should be used to unsubscribe.
   */
  function subscribe(routeSubscription: RouteSubscription): Listener {

    addListener(routeSubscription);

    let isSubscribed = true;

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      removeListener(routeSubscription);

      isSubscribed = false;
    };
  }

  return {
    set,
    get,
    subscribe,
    dispatch,
    waitForRouter
  } as ActiveRouter;
})();
