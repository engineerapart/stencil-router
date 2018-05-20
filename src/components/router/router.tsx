import { Component, State, Prop, Watch, Event, EventEmitter } from '@stencil/core';
import createHistory from '../../utils/createBrowserHistory';
import createHashHistory from '../../utils/createHashHistory';
import { ActiveRouter, LocationSegments, HistoryType, MatchResults } from '../../global/interfaces';


const HISTORIES: { [key in HistoryType]: Function } = {
  'browser': createHistory,
  'hash': createHashHistory
};

/**
  * @name Router
  * @module ionic
  * @description
 */
@Component({
  tag: 'stencil-router'
})
export class Router {

  @Event() stencilRouterWillLoad: EventEmitter;

  @Prop() root: string = '/';

  @Prop() historyType: HistoryType = 'browser';

  // A suffix to append to the page title whenever
  // it's updated through RouteTitle
  @Prop() titleSuffix: string = '';

  // Prevent certain operations during ssr
  @Prop({ context: 'isServer' }) private isServer: boolean;
  @Prop({ context: 'location' }) private ctxLocation: LocationSegments;

  @Watch('titleSuffix')
  titleSuffixChanged(newValue: string) {
    this.activeRouter.set({
      titleSuffix: newValue
    });
  }

  @Prop({ context: 'activeRouter' }) activeRouter: ActiveRouter;
  unsubscribe: Function = () => {};

  @State() match: MatchResults | null = null;


  computeMatch(pathname?: string) {
    return {
      path: this.root,
      url: this.root,
      isExact: pathname === this.root,
      params: {}
    } as MatchResults;
  }

  componentWillLoad() {
    console.log('Router componentWillLoad');
    let location = this.isServer ? this.ctxLocation : {};
    let history = null;

    if (!this.isServer) {
      history = HISTORIES[this.historyType]();
      location = history.location;

      console.log('Router setting initial location: ', location);

      history.listen((location: LocationSegments) => {
        console.log('Router received history event: ', location);
        this.activeRouter.set({ location: this.getLocation(location) });
      });
    }

    this.activeRouter.set({
      location: this.getLocation(location), // history.location
      titleSuffix: this.titleSuffix,
      root: this.root,
      history
    });

    // subscribe the project's active router and listen
    // for changes. Recompute the match if any updates get
    // pushed
    this.unsubscribe = this.activeRouter.subscribe({
      isMatch: this.computeMatch.bind(this),
      listener: (matchResult: MatchResults) => {
        this.match = matchResult;
      },
    });

    this.match = this.computeMatch();

    console.log('Router componentWillLoad: emitting event');
    this.stencilRouterWillLoad.emit(location);
  }

  componentDidLoad() {
    console.log('Router did load, dispatching activeRouter');
    this.activeRouter.dispatch();
  }

  getLocation(location: LocationSegments): LocationSegments {
    // Remove the root URL if found at beginning of string
    const pathname = location.pathname.indexOf(this.root) == 0 ?
                     '/' + location.pathname.slice(this.root.length) :
                     location.pathname;

    return {
      ...location,
      pathname
    };
  }

  componentDidUnload() {
    // be sure to unsubscribe to the router so that we don't
    // get any memory leaks
    this.unsubscribe();
  }

  render() {
    return <slot />;
  }
}
