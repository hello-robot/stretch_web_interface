import {BaseComponent, Component} from "../../shared/base.cmp.js";


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
                <!-- <div class="form-check mb-4">
                    <input class="form-check-input" type="checkbox" value="" id="showPermanentIconsOverhead"
                           onchange="checkboxSettingChange(this);" checked>
                    <label class="form-check-label" for="showPermanentIconsOverhead">
                        Overhead view -- permanent icons?
                    </label>
                </div>
                <div class="form-check mb-4">
                    <input class="form-check-input" type="checkbox" value="" id="showPermanentIconsPantilt"
                           onchange="checkboxSettingChange(this);" checked>
                    <label class="form-check-label" for="showPermanentIconsPantilt">
                        Pan-Tilt view -- permanent icons?
                    </label>
                </div>
                <div class="form-check mb-4">
                    <input class="form-check-input" type="checkbox" value="" id="showPermanentIconsGripper"
                           onchange="checkboxSettingChange(this);" checked>
                    <label class="form-check-label" for="showPermanentIconsGripper">
                        Gripper view -- permanent icons?
                    </label>
                </div>

                <div class="d-flex flex-row">
                    <div class="onoffswitch">
                        <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="myonoffswitch" checked>
                        <label class="onoffswitch-label" for="myonoffswitch">
                            <span class="onoffswitch-inner"></span>
                            <span class="onoffswitch-switch"></span>
                        </label>
                    </div>
                    <div class="ml-4 my-3">
                        <label for="audioSource">Audio in: </label><select id="audioSource"></select>
                    </div>
                    <div class="ml-2 my-3">
                        <label for="audioOutput">Audio out: </label><select id="audioOutput"></select>
                    </div>
                </div> -->

                <div class="d-flex flex-row flex-fill">
                    <div class="ml-3 my-3">
                        <div class="btn-group" role="group" id="vmode-toggle" data-ref="vmode-toggle">
                            <input type="radio" id="discrete" class="btn-check" name="velocity-mode" autocomplete="off" value="discrete" checked />
                            <label class="btn btn-secondary btn-sm" for="discrete">Discrete</label>
                            <input type="radio" id="continuous" class="btn-check" name="velocity-mode" autocomplete="off" value="continuous"/>
                            <label class="btn btn-secondary btn-sm" for="continuous">Continuous</label>
                        </div>
                        <div id="settings-vscale">
                            <div class="d-flex flex-row discrete-speed">
                                <label>Velocity Scale:&nbsp</label>
                                <div class="btn-group velocity-toggle" role="group" data-ref="velocity-toggle">
                                    <input type="radio" name="velocity" id="speed-1" class="btn-check" value="low" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-1">1x</label>
                                    <input type="radio" name="velocity" id="speed-2" class="btn-check" value="medium" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-2">2x</label>
                                    <input type="radio" name="velocity" id="speed-3" class="btn-check" value="high" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-3">3x</label>
                                </div>
                            </div>
                        </div>
                        <div id="settings-step-size">
                          <div class="d-flex flex-row continuous-speed">
                            <label>Step Size:&nbsp</label>
                                <div class="btn-group step-size-toggle" role="group" data-ref="step-size-toggle">
                                    <input type="radio" name="stepsize" id="speed-4" class="btn-check" value="small" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-4">Small</label>
                                    <input type="radio" name="stepsize" id="speed-5" class="btn-check" value="medium" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-5">Medium</label>
                                    <input type="radio" name="stepsize" id="speed-6" class="btn-check" value="large" autocomplete="off">
                                    <label class="btn btn-sm btn-outline-secondary" for="speed-6">Large</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-row">
                    <div class="checkbox ml-2 my-3">
                        <label class="checkbox-inline no_indent">
                            Arm Reach Visualization:
                            <input id="reachVisualization" type="checkbox" onchange="updateReachVisualizationDisplay()">
                        </label>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
</div>
`;

export class SettingsComponent extends BaseComponent {
    constructor() {
        super(template, false);
        this.modalContainer = this.refs.get("modal-container")
        this.modal = new bootstrap.Modal(this.refs.get('modal-container'), {})
    }

    showModal() {
        this.modal.show();   
    }
}

Component('settings-page', SettingsComponent, '/operator/css/settings.css')