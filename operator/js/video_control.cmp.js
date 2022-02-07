import {BaseComponent, Component} from '../../shared/base.cmp.js';

const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div id="top" class="control-button">
    <button  class="btn btn-secondary"></button>
</div>
<div id="right" class="control-button">
    <button  class="btn btn-secondary"></button>
</div>
<div id="bottom" class="control-button">
    <button  class="btn btn-secondary"></button>
</div>
<div id="left" class="control-button">
    <button class="btn btn-secondary"></button>
</div>
<div id="extra"></div>
<div class="video-container">
    <div class="overlays-container" data-ref="overlays-container"></div><video autoplay="true" data-ref="video"></video>
</div>
`;

export class VideoControl extends BaseComponent {

    constructor(buttonMappings = undefined) {
        super(template);
        this.overlays = new Map(); // key is mode id, values are a list of Overlay objects
        this.overlayResizeNotifier = new ResizeObserver(entries => {
            let entry = entries[0]
            if (entry.contentBoxSize) {
                for (let [_, overlays] of this.overlays) {
                    for (let overlay of overlays) {
                        overlay.configure(entry.contentRect.width, entry.contentRect.height)
                    }
                }
            }
        })
        this.overlayResizeNotifier.observe(this.refs.get("video"))
        if (buttonMappings) {
            for (const [name, {action, label, title}] of buttonMappings) {
                const button = this.shadowRoot.getElementById(name).querySelector("button")
                button.title = title
                button.textContent = label
                button.onclick = action
            }
        } else {
            for (const button of this.shadowRoot.querySelectorAll(".control-button")) {
                button.remove()
            }
        }
    }

    setExtraContents(html) {
        this.shadowRoot.getElementById("extra").appendChild(html)
    }

    set showIcons(value) {
        // Idempotent: setting same value has no effect
        if (value === this.showIcons) return;
        this.classList.toggle("no-icons")
    }

    get showIcons() {
        return !this.classList.contains("no-icons")
    }

    addRemoteStream(stream) {
        this.refs.get("video").srcObject = stream;
    }

    removeRemoteStream() {
        this.refs.get("video").srcObject = null
    }

    addOverlay(overlay, mode) {
        if (this.overlays.has(mode)) {
            this.overlays.get(mode).push(overlay);
        } else {
            this.overlays.set(mode, [overlay]);
        }
    }

    setMode(modeId) {
        this.currentMode = modeId;

        // Clean up the SVG
        let overlays = this.refs.get("overlays-container")
        while (overlays.lastChild) {
            overlays.removeChild(overlays.lastChild);
        }

        for (let [m, modeOverlays] of this.overlays.entries()) {
            for (let o of modeOverlays) {
                if (m === modeId || m === "all") {
                    if (o.type === 'control')
                        overlays.appendChild(o.svg);
                    else if (o.type === 'viz')
                        overlays.appendChild(o.getSVG());
                    o.show();
                } else {
                    o.hide();
                }
            }
        }
    }


}

Component('video-control', VideoControl, '/operator/css/video-control.css')