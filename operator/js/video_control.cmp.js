import {BaseComponent, Component} from '../../shared/base.cmp.js';

const template = `
<div id="top" class="control-button">
    <button class="btn btn-secondary btn-sm h-button"></button>
</div>
<div id="right" class="control-button">
    <button class="btn btn-secondary btn-sm h-button"></button>
</div>
<div id="bottom" class="control-button">
    <button class="btn btn-secondary btn-sm h-button"></button>
</div>
<div id="left" class="control-button">
    <button class="btn btn-secondary btn-sm h-button"></button>
</div>
<div class="video-container">
<div class="overlays-container" data-ref="overlays-container">
</div>
<video autoplay="true" data-ref="video"></video></div>
`;

export class VideoControl extends BaseComponent {

    constructor(mode, width, height, buttonMappings = undefined) {
        super(template);

        this.currentMode = mode;
        this.overlays = new Map(); // key is mode id, values are a list of Overlay objects

        this.setDimensions(width, height);
        this.isActive = false;

        if (buttonMappings) {
            for (const [name, {action, label}] of buttonMappings) {
                // FIXME: Hook up these controls
            }
        } else {
            for (const button of this.shadowRoot.querySelectorAll(".control-button")) {
                button.remove()
            }
        }
    }

    addRemoteStream(stream) {
        this.refs.get("video").srcObject = stream;
    }

    removeRemoteStream() {
        this.refs.get("video").srcObject = null
    }

    setDimensions(w, h) {
        // FIXME: Element is responsive now so this probably isn't needed
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
                if (m === modeId) {
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

    setActive(isActive) {
        this.isActive = isActive;
        console.log("this.currentMode", this.currentMode);
        console.log("this.overlays", this.overlays);

        let modeOverlays = this.overlays[this.currentMode];
        if (modeOverlays) {
            for (let o of modeOverlays) {
                if (o.type === 'control') {
                    o.setActive(isActive);
                }
            }
        }
    }

}

Component('video-control', VideoControl, '/operator/css/video-control.css')