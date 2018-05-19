import { ActiveRouter, Listener, RouteSubscription, MatchResults } from './interfaces';
import { shallowEqual } from '../utils/shallow-equal';

declare var Context: any;

Context.activeRouter = (function() {
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

  function set(value: { [key: string]: any }) {
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
      const isGroupMatch = matchList.some(me => {
        return me[1] != null && me[2] != null && me[2] === listeners[i].groupId;
      });

      // If listener has a groupId and group already has a match then don't check
      if (!isGroupMatch) {
        match = listeners[i].isMatch(pathname);

      // If listener does not have a group then just check if it matches
      } else {
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
      if (groupId && matchResult != null) {
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
        if (groupId === routeSubscription.groupId && groupIndex > routeSubscription.groupIndex) {
          nextListeners.splice(i, 0, routeSubscription);
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
    dispatch
  } as ActiveRouter;
})();
