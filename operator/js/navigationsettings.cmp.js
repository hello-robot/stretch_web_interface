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
        for (let [key, value] of values) {
            let inputForSetting = this.navTabContainer.querySelector(`input[name='${key}']`)
            if (!inputForSetting) continue;

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
            this.showStartStopMode();
        } else {
            this.hideStartStopMode()
        }
    }

    hideStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = "none";
    }

    showStartStopMode() { 
        this.refs.get("continuous-mode-field").style.display = null;
    }
}

Component('navigation-settings', NavigationSettings, '/operator/css/navigationsettings.css')