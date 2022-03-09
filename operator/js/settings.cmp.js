import {BaseComponent, Component} from "../../shared/base.cmp.js";


const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<!-- SETTINGS -->
<div class="modal fade bd-example-modal-lg" id="settings" tabindex="-1" role="dialog" aria-labelledby="settingsTitle"
     aria-hidden="true" data-ref="modal-container">
    <link href="/operator/css/settings.css" rel="stylesheet">
    <div class="alert alert-success alert-dismissible show fade d-none" role="alert" data-ref="settings-save-alert">
      Success! Setting configuration saved
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    <div class="alert alert-warning alert-dismissible show fade d-none" role="alert" data-ref="settings-save-warning-alert">
      Please enter setting name
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
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
                
                <fieldset class="row mb-3" data-ref="settings-vmode">
                   <legend class="col-form-label col-sm-2">Velocity Control Mode</legend>
                    <div class="col-sm-10">
                        <div class="btn-group mode-toggle" role="group" id="vmode-toggle" data-ref="vmode-toggle">
                            <input type="radio" id="discrete" class="btn-check" name="velocityControlMode" autocomplete="off" value="discrete" checked />
                            <label class="btn btn-secondary btn-sm" for="discrete">Discrete</label>
                            <input type="radio" id="continuous" class="btn-check" name="velocityControlMode" autocomplete="off" value="continuous"/>
                            <label class="btn btn-secondary btn-sm" for="continuous">Continuous</label>
                        </div>
                    </div>
                </fieldset>
                
                <fieldset class="row mb-3" id="settings-vscale" data-ref="settings-vscale">
                    <legend class="col-form-label col-sm-2">Velocity Scale</legend>
                    <div class="col-sm-10">
                        <div class="btn-group vscale-toggle" role="group" data-ref="vscale-toggle">
                            <input type="radio" name="velocityScale" id="speed-1" class="btn-check" value="1" autocomplete="off" checked>
                            <label class="btn btn-sm btn-outline-secondary" for="speed-1">1x</label>
                            <input type="radio" name="velocityScale" id="speed-2" class="btn-check" value="2" autocomplete="off">
                            <label class="btn btn-sm btn-outline-secondary" for="speed-2">2x</label>
                            <input type="radio" name="velocityScale" id="speed-3" class="btn-check" value="3" autocomplete="off">
                            <label class="btn btn-sm btn-outline-secondary" for="speed-3">3x</label>
                        </div>
                    </div>
                </fieldset>

                <fieldset class="row mb-3" id="settings-step-size" data-ref="settings-step-size">
                    <legend class="col-form-label col-sm-2 pt-0">Step Size</legend>
                    <div class="col-sm-10">
                        <div class="btn-group step-size-toggle" role="group" data-ref="step-size-toggle">
                            <input type="radio" name="continuousVelocityStepSize" id="speed-4" class="btn-check" value="0.05" autocomplete="off" checked>
                            <label class="btn btn-sm btn-outline-secondary" for="speed-4">Small</label>
                            <input type="radio" name="continuousVelocityStepSize" id="speed-5" class="btn-check" value="0.10" autocomplete="off">
                            <label class="btn btn-sm btn-outline-secondary" for="speed-5">Medium</label>
                            <input type="radio" name="continuousVelocityStepSize" id="speed-6" class="btn-check" value="0.15" autocomplete="off">
                            <label class="btn btn-sm btn-outline-secondary" for="speed-6">Large</label>
                        </div>
                    </div>
                </fieldset>

                <nav>
                    <div class="nav nav-tabs" id="settingsTab" role="tablist" data-ref="nav-tabs">
                        <button class="nav-link active" id="navigation-tab" data-bs-toggle="tab" data-bs-target="#navigation" type="button" role="tab" aria-controls="navigation" aria-selected="true">Robot Base</button>
                        <button class="nav-link" id="manip-tab" data-bs-toggle="tab" data-bs-target="#manip" type="button" role="tab" aria-controls="manip" aria-selected="false">Robot Arm/Wrist</button>
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

                <hr>
                <div class="d-flex flex-fill justify-content-left">
                    <input type="text" id="setting-name" name="setting-name" required size="10" placeholder="Enter setting name">
                    <div class="col-sm-2">
                        <button type="button" class="btn btn-primary btn" data-ref="btn-save-settings">
                            Save
                        </button>
                    </div>
                    <select data-ref="load-setting" class="form-select form-select-sm w-auto" aria-label="Select setting to load">
                        <option value="" disabled selected hidden>Load Setting</option>
                    </select>
                    <div class="col-sm-2" style="padding-left: 10px;">
                        <button type="button" class="btn btn-primary btn" data-ref="btn-load-settings">
                            Load
                        </button>
                    </div>
                    <div class="col-sm-2">
                        <button type="button" class="btn btn-primary btn" data-ref="btn-default-settings">
                            Default
                        </button>
                    </div>
                    <div class="col-sm-2">
                        <button type="button" class="btn btn-primary btn" data-ref="btn-download-settings">
                            Download
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
        this.hideContinuousSettings()

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

        this.refs.get("btn-save-settings").addEventListener("click", event => {
            let settingName = this.getSaveSettingName()
            if (settingName != '') {
                let newOption = document.createElement("option")
                newOption.value = settingName
                newOption.innerText = settingName
                this.refs.get('load-setting').appendChild(newOption)
                this.refs.get('settings-save-alert').classList.remove('d-none')
                setTimeout(() => {this.refs.get('settings-save-alert').classList.add('d-none')}, 2000)
            } else {
                this.refs.get('settings-save-warning-alert').classList.remove('d-none')
                setTimeout(() => {this.refs.get('settings-save-warning-alert').classList.add('d-none')}, 2000)
            }
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

    hideContinuousSettings() {
        this.refs.get("settings-vscale").style.display = null;
        this.refs.get("settings-step-size").style.display = "none";
    }

    showContinuousSettings() {
        this.refs.get("settings-vscale").style.display = "none";
        this.refs.get("settings-step-size").style.display = null;
    }

    getSaveSettingName() {
        return this.modalContainer.querySelector('input[name=setting-name]').value
    }

    getLoadSettingName() {
        return this.refs.get('load-setting').value
    }

    resetSettingName() {
        this.modalContainer.querySelector('input[name=setting-name]').value = ''   
    }
}

Component('settings-modal', SettingsModal, '/operator/css/settings.css')