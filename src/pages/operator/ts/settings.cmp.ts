import { BaseComponent } from "../../../shared/base.cmp"


// FIXME: Speed switch and mode switch don't work fully now. Each probably needs its own component
// FIXME: Settings page not reintegrated
const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<!-- SETTINGS -->
<div class="modal fade bd-example-modal-lg" id="settings" tabindex="-1" role="dialog" aria-labelledby="settingsTitle"
     aria-hidden="true" data-ref="modal-container">
    <link href="/operator/css/settings.css" rel="stylesheet">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="settingsTitle">Settings</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-check mb-4">
                    <input class="form-check-input" type="checkbox" value="" name="showPermanentIconsOverhead" id="showPermanentIconsOverhead" checked>
                    <label class="form-check-label" for="showPermanentIconsOverhead">
                        Overhead view permanent icons
                    </label>
                </div>
                <div class="form-check mb-4">
                    <input class="form-check-input" type="checkbox" value="" name="showPermanentIconsPantilt" id="showPermanentIconsPantilt" checked>
                    <label class="form-check-label" for="showPermanentIconsPantilt">
                        Pan-Tilt view permanent icons
                    </label>
                </div>
                <div class="form-check mb-4">
                    <input class="form-check-input" type="checkbox" value="" name="showPermanentIconsGripper" id="showPermanentIconsGripper" checked>
                    <label class="form-check-label" for="showPermanentIconsGripper">
                        Gripper view permanent icons
                    </label>
                </div>

                <div class="d-flex flex-row">
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="sendAudio">
                      <label class="form-check-label" for="sendAudio">Send audio</label>
                    </div>
                    <div class="ml-4 my-3">
                        <label for="audioSource">Audio in: </label><select id="audioSource"></select>
                    </div>
                    <div class="ml-2 my-3">
                        <label for="audioOutput">Audio out: </label><select id="audioOutput"></select>
                    </div>
                </div>
                
                 <div class="btn-group mode-toggle" role="group" id="control-mode-toggle" data-ref="control-mode-toggle">
                    <input type="radio" id="control-incremental" class="btn-check" name="control-mode" autocomplete="off" value="incremental" checked />
                    <label class="btn btn-secondary btn-sm" for="control-incremental">Incremental</label>
                    <input type="radio" id="control-continuous" class="btn-check" name="control-mode" autocomplete="off" value="continuous"/>
                    <label class="btn btn-secondary btn-sm" for="control-continuous">Continuous</label>
                </div>

                <div class="d-flex flex-row flex-fill">
                    <div class="ml-3 my-3">
                        <div class="btn-group mode-toggle" role="group" id="vmode-toggle" data-ref="vmode-toggle">
                            <input type="radio" id="discrete" class="btn-check" name="velocity-mode" autocomplete="off" value="discrete" checked />
                            <label class="btn btn-secondary btn-sm" for="discrete">Discrete</label>
                            <input type="radio" id="continuous" class="btn-check" name="velocity-mode" autocomplete="off" value="continuous"/>
                            <label class="btn btn-secondary btn-sm" for="continuous">Continuous</label>
                        </div>
                        <div id="settings-vscale" data-ref="settings-vscale">
                            <div class="d-flex flex-row">
                                <label>Velocity Scale:&nbsp</label>
                                <div class="btn-group vscale-toggle" role="group" data-ref="vscale-toggle">
                                    <input type="radio" name="velocity-scale" id="speed-1" class="btn-check" value="1" autocomplete="off" checked>
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-1">1x</label>
                                    <input type="radio" name="velocity-scale" id="speed-2" class="btn-check" value="2" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-2">2x</label>
                                    <input type="radio" name="velocity-scale" id="speed-3" class="btn-check" value="3" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-3">3x</label>
                                </div>
                            </div>
                        </div>
                        <div id="settings-step-size" data-ref="settings-step-size">
                          <div class="d-flex flex-row">
                            <label>Step Size:&nbsp</label>
                                <div class="btn-group step-size-toggle" role="group" data-ref="step-size-toggle">
                                    <input type="radio" name="stepsize" id="speed-4" class="btn-check" value="0.05" autocomplete="off" checked>
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-4">Small</label>
                                    <input type="radio" name="stepsize" id="speed-5" class="btn-check" value="0.10" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-5">Medium</label>
                                    <input type="radio" name="stepsize" id="speed-6" class="btn-check" value="0.15" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-6">Large</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-row">
                    <div class="checkbox ml-2 my-3">
                        <label class="checkbox-inline no_indent" for="armReachVisualization">Arm Reach Visualization:</label>
                        <input type="checkbox" name="armReachVisualization" id="armReachVisualization">
               
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
</div>
`;

export class SettingsModal extends BaseComponent {
    constructor() {
        super(template, false);
        this.modalContainer = this.refs.get("modal-container")
        this.modal = new bootstrap.Modal(this.refs.get('modal-container'), {})
        // Discrete settings are the default
        this.hideContinuousSettings();

        // Tell anyone who cares that the user has changed a setting
        this.refs.get("modal-container").addEventListener("change", event => {
            let target = event.target
            let isInput = target.tagName === "INPUT"
            if (!isInput || !target.name || (!target.value && !target.type === "checkbox")) return;

            let value = target.value
            if (target.type === "checkbox") {
                value = target.checked
            }
            this.dispatchEvent(new CustomEvent("settingchanged", {
                bubbles: true,
                composed: true,
                detail: {
                    key: target.name,
                    value: value
                }
            }))
        })
        this.refs.get("vmode-toggle").querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                if (option.value === "discrete") {
                    this.hideContinuousSettings();
                } else {
                    this.showContinuousSettings();
                }
            })
        })

    }

    configureInputs(values) {
        for (let [key, value] of values) {
            let inputForSetting = this.shadowRoot.querySelector(`input[name='${key}']`)
            if (key === "velocity-mode" && value === "continuous") {
                // FIXME: This doesn't work, maybe because of the modal cloning before display
                this.showContinuousSettings()
            } else {
                this.hideContinuousSettings()
            }
            if (inputForSetting.type === "checkbox") {
                inputForSetting.checked = value === "true" ? "true" : null
            } else if (inputForSetting.type === "radio") {
                inputForSetting = this.shadowRoot.querySelector(`input[value='${value}']`)
                inputForSetting.checked = "true"
            } else {
                console.warn(inputForSetting)
            }
        }
    }

    showModal() {
        this.modal.show();
    }

    hideContinuousSettings() {
        this.refs.get("settings-step-size").style.display = "none";
    }

    showContinuousSettings() {
        this.refs.get("settings-step-size").style.display = null;
    }

}