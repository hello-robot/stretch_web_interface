import {BaseComponent, bootstrapCSS, Component} from "shared/base.cmp"
import { Overlay } from "./overlay";

const template = `
<style>${bootstrapCSS}</style>
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

import * as styles from '../css/video-control.css';
@Component('video-control', styles)
export class VideoControl extends BaseComponent {
    overlays: Map<string, [Overlay]> = new Map();
    overlayResizeNotifier: ResizeObserver;
    currentMode: string
    private video: HTMLVideoElement
    private overlaysContainer: HTMLElement

    constructor(buttonMappings: [string, { action: (ev: MouseEvent) => any, label: string, title: string }][]) {
        super(template);
        this.video = this.refs.get("video") as HTMLVideoElement
        this.overlaysContainer = this.refs.get("overlays-container")!
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
        this.overlayResizeNotifier.observe(this.video)
        if (buttonMappings) {
            for (const [name, {action, label, title}] of buttonMappings) {
                const button = this.shadowRoot!.getElementById(name)!.querySelector("button")
                button!.title = title
                button!.innerHTML = label
                button!.onclick = action
            }
        } else {
            for (const button of this.shadowRoot!.querySelectorAll(".control-button")) {
                button.remove()
            }
        }
    }

    setExtraContents(html: any) {
        this.shadowRoot!.getElementById("extra")!.appendChild(html)
    }

    set showIcons(value) {
        // Idempotent: setting same value has no effect
        if (value === this.showIcons) return;
        this.classList.toggle("no-icons")
    }

    get showIcons() {
        return !this.classList.contains("no-icons")
    }

    addRemoteStream(stream: MediaStream) {
        this.video.srcObject = stream;
    }

    removeRemoteStream() {
        this.video.srcObject = null
    }

    addOverlay(overlay: Overlay, mode: string) {
        if (this.overlays.has(mode)) {
            this.overlays.get(mode)!.push(overlay);
        } else {
            this.overlays.set(mode, [overlay]);
        }
    }

    setMode(modeId: string) {
        this.currentMode = modeId;

        // Remove all the overlays
        while (this.overlaysContainer.lastChild) {
            this.overlaysContainer.removeChild(this.overlaysContainer.lastChild);
        }

        for (let [m, modeOverlays] of this.overlays.entries()) {
            for (let o of modeOverlays) {
                if (m === modeId || m === "all") {
                    this.overlaysContainer.appendChild(o.getElementToDisplay());
                    o.show();
                } else {
                    o.hide();
                }
            }
        }
    }


}