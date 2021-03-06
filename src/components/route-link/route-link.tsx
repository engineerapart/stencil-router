import { Component, Prop, State, Watch, Element } from '@stencil/core';
import { matchPath } from '../../utils/match-path';
import { isModifiedEvent } from '../../utils/dom-utils';
import { RouterHistory, Listener, LocationSegments, MatchResults } from '../../global/interfaces';
import ActiveRouter from '../../global/active-router';

/**
  * @name Route
  * @module ionic
  * @description
 */
@Component({
  tag: 'stencil-route-link'
})
export class RouteLink {
  @Element() el: HTMLStencilElement;

  unsubscribe: Listener = () => { return; };

  @Prop() url: string;
  @Prop() urlMatch: string | string[];
  @Prop() activeClass: string = 'link-active';
  @Prop() exact: boolean = false;
  @Prop() strict: boolean = true;

  /**
   *  Custom tag to use instead of an anchor
   */
  @Prop() custom: string = 'a';

  @Prop() anchorClass: string;
  @Prop() anchorRole: string;
  @Prop() anchorTitle: string;
  @Prop() anchorTabIndex: string;

  @Prop() history: RouterHistory;
  @Prop() location: LocationSegments;
  @Prop() root: string;

  @State() match: MatchResults | null = null;

  componentWillLoad() {
    if (this.location) {
      this.computeMatch();
    }
  }

  // Identify if the current route is a match.
  @Watch('location')
  computeMatch() {
    this.match = matchPath(this.location.pathname, {
      path: this.urlMatch || this.url,
      exact: this.exact,
      strict: this.strict
    });
  }

  handleClick(e: MouseEvent) {
    if (isModifiedEvent(e)) {
      return;
    }

    e.preventDefault();
    return this.history.push(this.getUrl(this.url));
  }

  // Get the URL for this route link without the root from the router
  getUrl(url: string) {

    // Don't allow double slashes
    if(url.charAt(0) == '/' && this.root.charAt(this.root.length - 1) == '/') {
      return this.root.slice(0, this.root.length-1) + url;
    }
    return this.root + url;
  }

  render() {
    let anchorAttributes: { [key: string]: any} = {
      class: {
        [this.activeClass]: this.match !== null,
      },
      onClick: this.handleClick.bind(this)
    }

    if (this.anchorClass) {
      anchorAttributes.class[this.anchorClass] = true;
    }

    if (this.custom === 'a') {
      anchorAttributes = {
        ...anchorAttributes,
        href: this.url,
        title: this.anchorTitle,
        role: this.anchorRole,
        tabindex: this.anchorTabIndex
      }
    }
    return (
      <this.custom {...anchorAttributes}>
        <slot />
      </this.custom>
    );
  }
}

ActiveRouter.injectProps(RouteLink, [
  'history',
  'location',
  'root'
]);
