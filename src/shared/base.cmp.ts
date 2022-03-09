/**
 * Decorator for components
 * - Register the element in the custom element registry
 * - Prefetch CSS style for later use
 * @param name Component name for element registry
 * @param cssLink Link to the CSS style sheet
 */
export function Component(name: string, constructor: CustomElementConstructor, cssLink?: string) {
    constructor.prototype.cssLink = cssLink;

    // Register component
    customElements.define(name, constructor);

    // Prefetch Style
    if (cssLink) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'prefetch');
        link.setAttribute('href', cssLink);
        document.head.append(link);
    }

}

/**
 * Root class for components
 */
export class BaseComponent extends HTMLElement {

    cssLink;
    refs = new Map();

    constructor(html = '', makeVisible = true, useShadowRoot = true) {
        // Call parent
        super();

        if (useShadowRoot) {
            // Create a shadow root
            this.attachShadow({ mode: 'open' });
        }

        // Create some CSS to apply to the shadow dom
        const { cssLink } = this.constructor.prototype;
        if (cssLink) {
            const link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', cssLink);
            link.onload = () => {
                if (makeVisible) {
                    this.style.visibility = 'visible';
                }
            }
            link.onerror = () => {
                throw new Error(`Fail to load stylesheet for ${this.constructor.name}. 
        CSS Link : ${cssLink}`);
            };
            if (useShadowRoot) {
                this.shadowRoot?.append(link);
            } else {
                this.append(link);
            }
        }

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
        if (!makeVisible || cssLink && makeVisible) {
            this.style.visibility = 'hidden';
        }
    }
}

Component('base-cmp', BaseComponent)
