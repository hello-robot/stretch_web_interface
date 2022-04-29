import { insertCSS } from "./util";

import * as bootstrap from "bootstrap/dist/css/bootstrap.min.css"

export const bootstrapCSS = bootstrap.default;

/**
 * Decorator for components
 * - Register the element in the custom element registry
 * - Prefetch CSS style for later use
 * @param name Component name for element registry
 * @param cssLink Link to the CSS style sheet
 */
export function Component(name: string, cssLink?: string) {
    return function (constructor: Function) {
        constructor.prototype.name = name;

        // Register component
        customElements.define(name, constructor as any);

        // Prefetch Style
        if (cssLink) {
            constructor.prototype.cssLink = cssLink;
            insertCSS(cssLink)
            console.log(name, constructor.prototype.cssLink)
        }
    }
}

/**
 * Root class for components
 */
@Component('base-cmp')
export class BaseComponent extends HTMLElement {

    cssLink?: string;
    refs: Map<string, Element> = new Map();

    constructor(html = '', makeVisible = true, useShadowRoot = true) {
        // Call parent
        super();

        if (useShadowRoot) {
            // Create a shadow root
            this.attachShadow({ mode: 'open' });
        }

        setTimeout(() => {
            // Create some CSS to apply to the shadow dom
            const { cssLink } = this.constructor.prototype;
            console.log(this.constructor.prototype.name, cssLink == undefined)
            if (cssLink) {
                // console.log(this.constructor.prototype.name)
                if (useShadowRoot) {
                    insertCSS(cssLink, this.shadowRoot);
                } else {
                    insertCSS(cssLink, this);
                }
            }
        }, 10)

        // Build the node
        const container = document.createElement('div');
        container.innerHTML = html;

        // Find refs
        const refs = container.querySelectorAll('[data-ref]');
        refs.forEach((bit) => {
            const bitName = bit.getAttribute('data-ref');
            if (bitName === null) {
                return;
            }
            if (this.refs.get(bitName)) {
                throw new Error(
                    `BaseComponent has been created with duplicated key for '${bitName}'`
                );
            }
            this.refs.set(bitName, bit);
        });

        if (useShadowRoot) {
            // Append child
            this.shadowRoot?.append(...container.children);
        } else {
            this.append(...container.children);
        }

        // Either this element is meant to be hidden, or we need
        // to make it visible later after css loads
        if (!makeVisible) {
            this.style.visibility = 'hidden';
        }
    }
}

