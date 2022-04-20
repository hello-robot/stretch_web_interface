import {BaseComponent, Component} from "shared/base.cmp"
import {ManipulationSettings} from "./manipulationsettings.cmp";
import {NavigationSettings} from "./navigationsettings.cmp";
import {Modal} from "bootstrap";


const template = `
<link href="/bootstrap.css" rel="stylesheet">
<!-- SETTINGS -->
<div class="modal fade bd-example-modal-lg" id="settings" tabindex="-1" role="dialog" aria-labelledby="settingsTitle"
     aria-hidden="true" data-ref="modal-container">
    <link href="/operator/css/settings.css" rel="stylesheet">
    <div class="alert alert-success alert-dismissible show fade d-none" role="alert" data-ref="settings-save-alert">
      Profile saved
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    <div class="alert alert-warning alert-dismissible show fade d-none" role="alert" data-ref="settings-save-warning-alert">
      Please enter a name
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
                    <div class="input-group input-group-sm" >
                        <input type="text" class="form-control form-text mt-0" name="profile-name" data-ref="new-profile-name" required size="10" placeholder="Enter profile name">
                        <input type="button" class="btn btn-primary" value="Save" data-ref="btn-save-profile"/>
                        
                    </div>
                
                    <div class="input-group input-group-sm">
                        <select data-ref="select-profile" class="form-select form-select-sm" aria-label="Select profile">
                            <option value="" selected hidden>Select Profile</option>
                            <option value="default">Default</option>
                        </select>
                        <button class="btn btn-secondary" type="button" data-ref="btn-load-profile" disabled>Load</button>
                        <button type="button" class="btn btn-secondary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="visually-hidden">Toggle Dropdown</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="#" data-ref="delete-profile">Delete</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" data-ref="remove-all-profiles">Remove all profiles</a></li>
                        </ul>
                    </div>
  
                    <div class="col-sm-2">
                        <button type="button" class="btn btn-primary btn-sm" data-ref="btn-download-settings">
                            Download
                        </button>
                    </div>
                </div>

                <hr>
                <div class="d-flex flex-fill justify-content-left">
                    <button type="button" class="btn btn-primary btn-sm" data-ref="btn-authenticate">
                        Authenticate
                    </button>
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

@Component('settings-modal', '/operator/css/settings.css')
export class SettingsModal extends BaseComponent {
    modalContainer: HTMLElement
    modal: Modal
    modalContent: HTMLDivElement
    navTabContainer: NavigationSettings
    manipTabContainer: ManipulationSettings
    newProfileName: HTMLInputElement
    saveProfileButton: HTMLInputElement
    loadProfileButton: HTMLInputElement
    profileSelect: HTMLSelectElement
    deleteProfileButton: HTMLElement
    removeAllProfilesButton: HTMLElement
    authButton: HTMLElement

    constructor() {
        super(template, false);
        this.modalContainer = this.refs.get("modal-container")!
        this.modal = new Modal(this.modalContainer, {})
        this.navTabContainer = this.refs.get("nav-tab-settings") as NavigationSettings
        this.manipTabContainer = this.refs.get("manip-tab-settings") as ManipulationSettings
        this.saveProfileButton = this.refs.get("btn-save-profile") as HTMLInputElement
        this.newProfileName = this.refs.get("new-profile-name") as HTMLInputElement
        this.loadProfileButton = this.refs.get("btn-load-profile") as HTMLInputElement
        this.profileSelect = this.refs.get("select-profile") as HTMLSelectElement
        this.deleteProfileButton = this.refs.get("delete-profile")!
        this.removeAllProfilesButton = this.refs.get("remove-all-profiles")!
        this.authButton = this.refs.get("btn-authenticate")!
        this.hideContinuousSettings()

        // Tell anyone who cares that the user has changed a setting
        this.modalContainer.addEventListener("change", this.handleInputChange.bind(this, ""))
        this.navTabContainer.container.addEventListener("change", this.handleInputChange.bind(this, "nav"))
        this.manipTabContainer.container.addEventListener("change", this.handleInputChange.bind(this, "manip"))

        this.newProfileName.addEventListener("change", () => {
            this.saveProfileButton.disabled = this.newProfileName.value.length < 1
        })

        this.saveProfileButton.addEventListener("click", () => {
            let profileName = this.newProfileName.value
            if (profileName.length === 0) {
                this.refs.get('settings-save-warning-alert').classList.remove('d-none')
                setTimeout(() => {
                    this.refs.get('settings-save-warning-alert').classList.add('d-none')
                }, 2000)
                return
            } else {
                this.newProfileName.value = ""
                this.refs.get('settings-save-alert').classList.remove('d-none')
                setTimeout(() => {
                    this.refs.get('settings-save-alert').classList.add('d-none')
                }, 2000)

            }
            let newOption = document.createElement("option")
            newOption.value = profileName
            newOption.innerText = profileName
            this.profileSelect.appendChild(newOption)

            this.dispatchEvent(new CustomEvent("createprofile", {
                bubbles: true,
                composed: true,
                detail: {
                    name: profileName,
                }
            }))

        })

        this.loadProfileButton.addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("loadprofile", {
                bubbles: true,
                composed: true,
                detail: {
                    name: this.profileSelect.value,
                }
            }))
            this.profileSelect.selectedIndex = 0
            this.loadProfileButton.disabled = true
        })

        this.deleteProfileButton.addEventListener("click", () => {
            let profileName = this.profileSelect.value
            if (profileName === "default") {
                return;
            }
            this.dispatchEvent(new CustomEvent("deleteprofile", {
                bubbles: true,
                composed: true,
                detail: {
                    name: profileName,
                }
            }))
            this.profileSelect.querySelector(`option[value='${profileName}']`)?.remove()
            this.profileSelect.selectedIndex = 0
            this.loadProfileButton.disabled = true
        })

        this.profileSelect.addEventListener("change", () => {
            if (this.profileSelect.selectedIndex != 0) {
                this.loadProfileButton.disabled = false
            }
        })

        this.refs.get("btn-download-settings")!.addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("downloadsettings", {
                bubbles: true,
                composed: true
            }))
        })

    }

    configureInputs(values: object) {
        if (values.hasOwnProperty("nav")) {
            this.navTabContainer.configureInputs(values.nav)
            delete values.nav
        }
        if (values.hasOwnProperty("manip")) {
            this.manipTabContainer.configureInputs(values.manip)
            delete values.manip
        }
        configureNamedInputs(values, this.modalContainer)
    }

    configureAuthCallback(callback: () => void) {
        this.authButton.addEventListener("click", () => {
            callback()
        });
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

    private handleInputChange(namespace, event) {
        let target = event.target
        let isInput = target.tagName === "INPUT"
        if (!isInput || !target.name || (!target.value && target.type !== "checkbox")) return;

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
                namespace: namespace
            }
        }))
    }
}

export function configureNamedInputs(values: object, container: HTMLElement) {
    for (let [key, value] of Object.entries(values)) {
        let inputForSetting = container.querySelector<HTMLInputElement>(`input[name='${key}']`)
        if (inputForSetting?.type === "checkbox") {
            inputForSetting.checked = value
        } else if (inputForSetting?.type === "radio") {
            let pairedInput = container.querySelector<HTMLInputElement>(`input[value='${value}']`)
            if (!pairedInput) {
                console.warn("Could not configure", key)
            }
            pairedInput!.checked = true
        } else {
            console.warn("Could not configure", key)
        }

    }
}