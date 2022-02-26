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

                <ul class="nav nav-tabs" id="tablist">
                    <li class="nav-item"><a href="#navigationTab" class="nav-link active">Navigation</a></li>
                    <li class="nav-item"><a href="#manipulationTab" class="nav-link">Manipulation</a></li>
                </ul>

                <fieldset class="row mb-3">
                    <legend class="col-form-label col-sm-2 tab-legend">Control Display</legend>
                    <div class="col-sm-10">
                        <div class="btn-group mode-toggle" role="group" id="control-display-mode-toggle" data-ref="control-display-mode-toggle">
                            <input type="radio" id="display-overlay" class="btn-check" name="displayMode" autocomplete="off" value="action-overlay" checked/>
                            <label class="btn btn-secondary btn-sm" for="display-overlay">Action Overlay</label>
                            <input type="radio" id="display-predictive" class="btn-check" name="displayMode" autocomplete="off" value="predictive-display"/>
                            <label class="btn btn-secondary btn-sm" for="display-predictive">Predictive Display</label>
                        </div>
                    </div>
                </fieldset>

                <fieldset class="row mb-3">
                    <legend class="col-form-label col-sm-2">Action Mode</legend>
                    <div class="col-sm-10">
                        <div class="btn-group mode-toggle" role="group" id="control-mode-toggle" data-ref="control-mode-toggle">
                            <input type="radio" id="control-incremental" class="btn-check" name="actionMode" autocomplete="off" value="incremental" checked />
                            <label class="btn btn-secondary btn-sm" for="control-incremental">Step Actions</label>
                            <input type="radio" id="control-continuous" class="btn-check" name="actionMode" autocomplete="off" value="control-continuous"/>
                            <label class="btn btn-secondary btn-sm" for="control-continuous">Start-Stop</label>
                        </div>
                    </div>
                </fieldset>

                <fieldset class="row mb-3" data-ref="continuous-mode-field">
                    <legend class="col-form-label col-sm-2">Start-Stop Modes</legend>
                    <div class="col-sm-10">
                        <div class="btn-group mode-toggle" role="group" id="continuous-mode-toggle" data-ref="continuous-mode-toggle">
                            <input type="radio" id="control-click-click" class="btn-check" name="startStopMode" autocomplete="off" value="click-click" checked />
                            <label class="btn btn-secondary btn-sm" for="control-click-click">Click-Click</label>
                            <input type="radio" id="control-press-release" class="btn-check" name="startStopMode" autocomplete="off" value="press-release"/>
                            <label class="btn btn-secondary btn-sm" for="control-press-release">Press-Release</label>
                            <input type="radio" id="control-press-drag" class="btn-check" name="startStopMode" autocomplete="off" value="press-drag"/>
                            <label class="btn btn-secondary btn-sm" id="press-drag-label" for="control-press-drag">Press-Drag</label>
                        </div>
                    </div>
                </fieldset>

                <fieldset class="row mb-3">
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
        // Discrete settings are the default
        this.hideContinuousSettings();
        this.hideStartStopMode();

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
        // this.refs.get("vmode-toggle").querySelectorAll("input[type=radio]").forEach(option => {
        //     option.addEventListener("click", () => {
        //         if (option.value === "discrete") {
        //             this.hideContinuousSettings();
        //         } else {
        //             this.showContinuousSettings();
        //         }
        //     })
        // })
        this.refs.get("control-mode-toggle").querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                if (option.value === "control-continuous") {
                    this.showStartStopMode();
                    let displaySetting = this.refs.get("control-display-mode-toggle").querySelector("input[type=radio]:checked").value
                    if (displaySetting == "predictive-display") {
                        this.showPressDragButton();
                    } else {
                        console.log("hiding")
                        this.hidePressDragButton();
                    }
                } else {
                    this.hideStartStopMode();
                }
            })
        })
        this.refs.get("control-display-mode-toggle").querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                let actionModeSetting = this.refs.get("control-mode-toggle").querySelector("input[type=radio]:checked").value
                if (actionModeSetting == "control-continuous") {
                    if (option.value === "predictive-display") {
                        this.showStartStopMode();
                        this.showPressDragButton();
                    } else {
                        this.showStartStopMode();
                        this.hidePressDragButton();
                    }
                }
            })
        })
    }

    configureInputs(values) {
        for (let [key, value] of values) {
            let inputForSetting = this.modalContainer.querySelector(`input[name='${key}']`)
            // if (key === "velocityControlMode" && value === "discrete") {
            //     this.hideContinuousSettings()
            // } else if (key === "velocityControlMode" && value === "continuous") {
            //     this.showContinuousSettings()
            // }

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

    showModal() {
        this.modal.show();
    }

    hideStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = "none";
    }

    showStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = null;
    }

    hidePressDragButton() {
        console.log();
        this.refs.get("continuous-mode-toggle").querySelector(`input[value='press-drag']`).style.display = "none";
        this.refs.get("continuous-mode-toggle").querySelector(`label[id="press-drag-label`).style.display = "none";
    }

    showPressDragButton() {
        this.refs.get("continuous-mode-toggle").querySelector(`input[value='press-drag']`).style.display = null;
        this.refs.get("continuous-mode-toggle").querySelector(`label[id="press-drag-label`).style.display = null;
    }
    
    hideContinuousSettings() {
        this.refs.get("settings-vscale").style.display = null;
        this.refs.get("settings-step-size").style.display = "none";
    }

    showContinuousSettings() {
        this.refs.get("settings-vscale").style.display = "none";
        this.refs.get("settings-step-size").style.display = null;
    }

}

Component('settings-modal', SettingsModal, '/operator/css/settings.css')