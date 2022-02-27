import {BaseComponent, Component} from "../../shared/base.cmp.js";


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
                <fieldset class="row mb-3">
                    <legend class="col-form-label col-sm-2 pt-0">Permanent Icons</legend>
                    <div class="col-sm-10 pt-0">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="" name="showPermanentIconsOverhead" id="showPermanentIconsOverhead" checked>
                            <label class="form-check-label" for="showPermanentIconsOverhead">
                                Overhead view
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="" name="showPermanentIconsPantilt" id="showPermanentIconsPantilt" checked>
                            <label class="form-check-label" for="showPermanentIconsPantilt">
                                Pan-tilt view
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="" name="showPermanentIconsGripper" id="showPermanentIconsGripper" checked>
                            <label class="form-check-label" for="showPermanentIconsGripper">
                                Gripper view
                            </label>
                        </div>
                    </div>
                </fieldset>
                
                <div class="row mb-3">
                    <label class="col-sm-2" for="armReachVisualization">Arm Reach Visualization</label>
                    <div class="form-check col-sm-10">
                        <input class="form-check-input" type="checkbox" name="armReachVisualization" id="armReachVisualization">
                    </div>
                </div>

                <div class="row mb-3">
                    <legend class="col-form-label col-sm-2 pt-0">Audio</legend>
                    <div class="col-sm-4">
                        <label class="form-label" for="audioSource">In</label><select id="audioSource" class="form-select"></select>
                    </div>
                    <div class="col-sm-4">
                        <label class="form-label" for="audioOutput">Out</label><select id="audioOutput" class="form-select"></select>
                    </div>
                </div>
                
                <nav>
                    <div class="nav nav-tabs" id="settingsTab" role="tablist" data-ref="nav-tabs">
                        <button class="nav-link active" id="navigation-tab" data-bs-toggle="tab" data-bs-target="#navigation" type="button" role="tab" aria-controls="navigation" aria-selected="true">Navigation</button>
                        <button class="nav-link" id="manip-tab" data-bs-toggle="tab" data-bs-target="#manip" type="button" role="tab" aria-controls="manip" aria-selected="false">Manipulation</button>
                    </div>
                </nav>

                <div class="tab-content" id="settingsTabContent">
                    <div class="tab-pane fade show active" id="navigation" role="tabpanel" aria-labelledby="navigation-tab">
                        <navigation-settings class="nav-tab-settings" data-ref="nav-tab-settings"></navigation-settings>
                    </div>
                    <div class="tab-pane fade" id="manip" role="tabpanel" aria-labelledby="manip-tab">
                        <manipulation-settings class="manip-tab-settings" data-ref="manip-tab-settings"></manipulation-settings>
                    </div>
                </div>

                <div class="d-flex flex-fill justify-content-left">
                    <div class="col-sm-3">
                        <button type="button" class="btn btn-primary btn-sm" data-ref="btn-default-settings">
                            Default Settings
                        </button>
                    </div>
                    <div class="col-sm-3">
                        <button type="button" class="btn btn-primary btn-sm" data-ref="btn-save-settings">
                            Save Settings
                        </button>
                    </div>
                    <div class="col-sm-3">
                        <button type="button" class="btn btn-primary btn-sm" data-ref="btn-load-settings">
                            Load Settings
                        </button>
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
        this.navTabContainer = this.refs.get("nav-tab-settings")
        this.manipTabContainer = this.refs.get("manip-tab-settings")

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
                    value: value,
                    namespace: "setting"
                }
            }))
        })
        this.refs.get("nav-tab-settings").navTabContainer.addEventListener("change", event => {
            let target = event.target
            let isInput = target.tagName === "INPUT"
            if (!isInput || !target.name || (!target.value && !target.type === "checkbox")) return;

            let value = target.value
            this.dispatchEvent(new CustomEvent("settingchanged", {
                bubbles: true,
                composed: true,
                detail: {
                    key: target.name,
                    value: value,
                    namespace: "navsetting"
                }
            }))
        })
        this.refs.get("manip-tab-settings").manipTabContainer.addEventListener("change", event => {
            let target = event.target
            let isInput = target.tagName === "INPUT"
            if (!isInput || !target.name || (!target.value && !target.type === "checkbox")) return;

            let value = target.value
            this.dispatchEvent(new CustomEvent("settingchanged", {
                bubbles: true,
                composed: true,
                detail: {
                    key: target.name,
                    value: value,
                    namespace: "manipsetting"
                }
            }))
        })
    }

    configureInputs(values) {
        for (let [key, value] of values) {
            let inputForSetting = this.modalContainer.querySelector(`input[name='${key}']`)

            if (inputForSetting.type === "checkbox") {
                inputForSetting.checked = value === "true" ? "true" : null
            } else if (inputForSetting.type === "radio") {
                inputForSetting = this.modalContainer.querySelector(`input[value='${value}']`)
                inputForSetting.checked = "true"
            } else {
                console.warn(inputForSetting)
            }

            var event = new Event('change', { target: inputForSetting });
            event.initEvent('change', true, false);
            inputForSetting.dispatchEvent(event);
        }
    }

    configureNavInputs(values) {
        this.navTabContainer.configureInputs(values);
    }

    configureManipInputs(values) {
        this.manipTabContainer.configureInputs(values);
    }

    showModal() {
        this.modal.show();
    }
}

Component('settings-modal', SettingsModal, '/operator/css/settings.css')