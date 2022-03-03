import {BaseComponent, Component} from "../../shared/base.cmp.js";


const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div class="manip-tab-container" data-ref="manip-tab-container">
    <fieldset class="row mb-3">
        <legend class="col-form-label col-sm-2 tab-legend"><br/>Action Mode</legend>
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

export class ManipulationSettings extends BaseComponent {
    constructor() {
        super(template, false);
        this.manipTabContainer = this.refs.get("manip-tab-container")
        // Discrete settings are the default
        this.hideContinuousSettings();
        this.hideStartStopMode();

        this.refs.get("control-mode-toggle").querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                this.configureSettingDisplay();
            })
        })
    }

    configureInputs(values) {
        for (let [key, value] of values) {
            let inputForSetting = this.manipTabContainer.querySelector(`input[name='${key}']`)

            if (inputForSetting.type === "checkbox") {
                inputForSetting.checked = value === "true" ? "true" : null
            } else if (inputForSetting.type === "radio") {
                inputForSetting = this.manipTabContainer.querySelector(`input[value='${value}']`)
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
        if (actionMode === "control-continuous") {
            this.showStartStopMode();
        } else {
            this.hideStartStopMode();
        }
    }

    hideStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = "none";
    }

    showStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = null;
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

Component('manipulation-settings', ManipulationSettings, '/operator/css/manipulationsettings.css')