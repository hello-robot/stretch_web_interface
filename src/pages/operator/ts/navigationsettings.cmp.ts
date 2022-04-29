import {BaseComponent, bootstrapCSS, Component} from "shared/base.cmp";
import {configureNamedInputs} from "./settings.cmp";


const template = `
<style>${bootstrapCSS}</style>
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
                <input type="radio" id="control-press-release" class="btn-check" name="startStopMode" autocomplete="off" value="press-release" checked/>
                <label class="btn btn-secondary btn-sm" for="control-press-release">Press-Release</label>
                <input type="radio" id="control-click-click" class="btn-check" name="startStopMode" autocomplete="off" value="click-click"/>
                <label class="btn btn-secondary btn-sm" for="control-click-click">Click-Click</label>
            </div>
        </div>
    </fieldset>
</div>
`;
import * as styles from '../css/navigationsettings.css';
@Component('navigation-settings', styles)
export class NavigationSettings extends BaseComponent {
    container: HTMLDivElement
    constructor() {
        super(template);
        this.container = this.refs.get("nav-tab-container") as HTMLDivElement

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

    configureInputs(values: object) {
        configureNamedInputs(values, this.container)
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