import { warning } from './log';
import { LocationSegments } from '../global/interfaces';

export type Prompt = (location: LocationSegments, action: string) => string;

const createTransitionManager = () => {
  let prompt: Prompt | string;

  const setPrompt = (nextPrompt?: Prompt | string) => {
    warning(
      prompt == null,
      'A history supports only one prompt at a time'
    );

    prompt = nextPrompt;

    return () => {
      if (prompt === nextPrompt) {
        prompt = null;
      }
    };
  }

  const confirmTransitionTo = (location: LocationSegments, action: string, getUserConfirmation: Function, callback: Function) => {
    // TODO: If another transition starts while we're still confirming
    // the previous one, we may end up in a weird state. Figure out the
    // best way to handle this.
    if (prompt != null) {
      const result = typeof prompt === 'function' ? prompt(location, action) : prompt;

      if (typeof result === 'string') {
        if (typeof getUserConfirmation === 'function') {
          getUserConfirmation(result, callback);
        } else {
          warning(
            false,
            'A history needs a getUserConfirmation function in order to use a prompt message'
          );

          callback(true);
        }
      } else {
        // Return false from a transition hook to cancel the transition.
        callback(result !== false);
      }
    } else {
      callback(true);
    }
  }

  let listeners: Function[] = [];

  const appendListener = (fn: Function) => {
    let isActive = true;

    const listener = (...args: any[]) => {
      if (isActive) {
        fn(...args);
      }
    };

    listeners.push(listener);

    return () => {
      isActive = false;
      listeners = listeners.filter(item => item !== listener);
    };
  }

  const notifyListeners = (...args: any[]) => {
    listeners.forEach(listener => listener(...args));
  };

  return {
    setPrompt,
    confirmTransitionTo,
    appendListener,
    notifyListeners
  }
}

export default createTransitionManager;
