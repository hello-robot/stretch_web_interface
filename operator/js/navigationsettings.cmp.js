import {BaseComponent, Component} from "../../shared/base.cmp.js";


const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div class="nav-tab-container" data-ref="nav-tab-container">
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
</div>
`;

export class NavigationSettings extends BaseComponent {
    constructor() {
        super(template, false);
        this.navTabContainer = this.refs.get("nav-tab-container")
        // Discrete settings are the default
        this.hideContinuousSettings();

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
                this.configureSettingDisplay();
            })
        })
        this.refs.get("control-display-mode-toggle").querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                this.configureSettingDisplay();
            })
        })
    }

    configureInputs(values) {
        console.log(values)
        for (let [key, value] of values) {
            let inputForSetting = this.navTabContainer.querySelector(`input[name='${key}']`)
            // if (key === "velocityControlMode" && value === "discrete") {
            //     this.hideContinuousSettings()
            // } else if (key === "velocityControlMode" && value === "continuous") {
            //     this.showContinuousSettings()
            // }

            if (inputForSetting.type === "checkbox") {
                inputForSetting.checked = value === "true" ? "true" : null
            } else if (inputForSetting.type === "radio") {
                inputForSetting = this.navTabContainer.querySelector(`input[value='${value}']`)
                inputForSetting.checked = "true"
            } else {
                console.warn(inputForSetting)
            }

            var event = new Event('change', { target: inputForSetting });
            event.initEvent('change', true, false);
            inputForSetting.dispatchEvent(event);
        }
        this.configureSettingDisplay();
    }

    configureSettingDisplay() {
        let actionMode = this.refs.get("control-mode-toggle").querySelector("input[type=radio]:checked").value
        let displayMode = this.refs.get("control-display-mode-toggle").querySelector("input[type=radio]:checked").value
        if (actionMode === "control-continuous") {
            if (displayMode === "predictive-display") {
                this.showStartStopMode();
                this.showPressDragButton();
            } else {
                this.showStartStopMode();
                this.hidePressDragButton();
            }
        } else {
            this.hideStartStopMode()
        }

        if (displayMode === "predictive-display") {
            this.hideVelocitySettings();
        } else {
            this.showVelocitySettings();
        }
    }

    hideStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = "none";
    }

    showStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = null;
    }

    hidePressDragButton() {
        this.refs.get("continuous-mode-toggle").querySelector(`input[value='press-drag']`).style.display = "none";
        this.refs.get("continuous-mode-toggle").querySelector(`label[id="press-drag-label`).style.display = "none";
    }

    showPressDragButton() {
        this.refs.get("continuous-mode-toggle").querySelector(`input[value='press-drag']`).style.display = null;
        this.refs.get("continuous-mode-toggle").querySelector(`label[id="press-drag-label`).style.display = null;
    }
    
    hideVelocitySettings() {
        this.refs.get("settings-vscale").style.display = "none";
        this.refs.get("settings-vmode").style.display = "none";
    }

    showVelocitySettings() {
        this.refs.get("settings-vscale").style.display = null;
        this.refs.get("settings-vmode").style.display = null;
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

Component('navigation-settings', NavigationSettings, '/operator/css/navigationsettings.css')