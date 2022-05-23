import { VideoControl } from "./video_control.cmp";
import { PageComponent } from 'shared/page.cmp';
import { RemoteRobot, VelocityCommand } from "./remoterobot";
import { WebRTCConnection } from "shared/webrtcconnection";
import { Model } from "./model/model";
import { LocalStorageModel } from "./model/localstoragemodel";
import { FirebaseModel } from "./model/firebasemodel";
import {
    GripperOverlay,
    OverheadManipulationOverlay,
    OverheadNavigationOverlay,
    OverheadClickNavigationOverlay,
    PanTiltManipulationOverlay,
    PanTiltNavigationOverlay,
    ReachOverlay
} from "./stretchoverlays";
import { MapInteractive } from "./mapinteractive.cmp";
import { bootstrapCSS, Component } from "shared/base.cmp";
import { PerspectiveCamera } from "three";
import { cmd } from "shared/commands"
import ROSLIB from "roslib";
import { SettingsModal } from "./settings.cmp";
import { overheadManipCrop, overheadNavCrop } from "shared/video_dimensions";
import { navModes, ValidJoints, WebRTCMessage } from "shared/util";
import { mapView } from "shared/requestresponse";
import { AvailableRobots } from "shared/socketio";
import { CommandRecorder } from "./commandrecorder.cmp";
import { PoseLibrary } from "./poselibrary.cmp";
import { Tooltip } from "bootstrap";

const template = `
<style>${bootstrapCSS}</style>
<div class="mode-buttons px-3 py-3 d-flex justify-content-left">
    <div class="d-flex flex-fill justify-content-start ">
        <div class="btn-group" role="group" aria-label="Select mode" id="mode-toggle" data-ref="mode-toggle">
            <input type="radio" id="mode-navigation" class="btn-check" name="mode" autocomplete="off" value="nav" checked disabled> 
            <label class="btn btn-secondary btn-sm" for="mode-navigation">Navigation</label>
      
            <input type="radio" id="mode-manipulation" class="btn-check" name="mode" value="manip" autocomplete="off" disabled> 
            <label class="btn btn-secondary btn-sm" for="mode-manipulation">Manipulation</label>
        </div>
    </div>
    <command-recorder data-ref="recorder"></command-recorder>
</div>

<div class="card mx-auto text-left">
<div class="card-header">
<div class="d-flex flex-fill justify-content-between">
    <div class="d-flex justify-content-start ">
        <h5 data-ref="action-mode-title">Action Mode: </h5>
    </div>
    <div class="btn-group velocity-toggle" role="group" aria-label="Select velocity" data-ref="velocity-toggle">
        <input type="radio" name="velocity" id="speed-1" class="btn-check" value="0" autocomplete="off">
        <label class="btn btn-sm btn-outline-secondary" for="speed-1">Slowest</label>
        <input type="radio" name="velocity" id="speed-2" class="btn-check" value="1" autocomplete="off">
        <label class="btn btn-sm btn-outline-secondary" for="speed-2">Slow</label>
        <input type="radio" name="velocity" id="speed-3" class="btn-check" value="2" autocomplete="off" checked>
        <label class="btn btn-sm btn-outline-secondary" for="speed-3">Medium</label>
        <input type="radio" name="velocity" id="speed-4" class="btn-check" value="3" autocomplete="off">
        <label class="btn btn-sm btn-outline-secondary" for="speed-4">Fast</label>
        <input type="radio" name="velocity" id="speed-5" class="btn-check" value="4" autocomplete="off">
        <label class="btn btn-sm btn-outline-secondary" for="speed-5">Fastest</label>
    </div>
    <div hidden id="velocity-slider" data-ref="velocity-slider">
        <!-- <span id="rangeValue" class="justify-content-end">0.1</span> -->
        <input id="slider" data-ref="continuous-velocity-input" class="range" type="range" value="0.125" min="0.025" max="0.2" step=0.025>
        <!-- <button class="up-btn" data-ref="slider-step-up">&#8593;</button>
        <button class="down-btn" data-ref="slider-step-down">&#8595;</button> -->
    </div>
</div>
</div>
<div class="card-body">

<section class="px-sm-2 py-sm-2 mb-3 d-flex justify-content-center gap-1" id="video-control-container" data-ref="video-control-container"></section>
<template id="pantilt-extra-controls">
    <div class="d-flex justify-content-around mt-2">
        <div class='form-check form-check-inline justify-content-left'>
            <input type='checkbox' class="form-check-input" value='follow' id="follow-check" />
            <label class="form-check-label" for="follow-check">
                Follow gripper
            </label>
            <button class="btn btn-sm tooltip-btn" data-toggle="tooltip" title="Camera will follow the gripper while you move the arm.">&#9432</button>    
        </div>
        <div class="justify-content-right">
            <button class='btn btn-secondary btn-sm'>Reset view</button>
            <button class="btn btn-sm tooltip-btn" data-toggle="tooltip" title="Camera will look at the robot base.">&#9432</button>        
        </div>
    </div>
</template>

<section class="justify-content-left d-flex px-sm-2" data-ref="map-interactive"></section>

<section class="container-fluid px-sm-2">
    <pose-library data-ref="pose-library" disabled></pose-library>
</section>
<br/>
<div class="container-fluid d-flex flex-row card-footer">
    <div class="d-flex justify-content-start">
        <div class="input-group input-group-sm" >
            <select data-ref="select-robot" class="form-select" aria-label="Select robot">
                <option value="no robot connected">no robot connected</option>
            </select>
            <input id="hangup" type="button" class="btn btn-sm btn-warning" value="hang up" data-ref="hangup" disabled/>
        </div>
    </div>

    <div class="d-flex flex-fill justify-content-end">
        <button type="button" class="btn btn-primary btn-sm" data-ref="settings-button">
            Settings
        </button>
    </div>
</div>
</div>
</div>
<settings-modal data-ref="settings"></settings-modal>
`;

import * as operatorCSS from '../css/operator.css';
import {CONFIG} from "./model/firebase.config";
@Component('operator-page', operatorCSS)
export class OperatorComponent extends PageComponent {
    title = '';
    controls = {}
    robot?: RemoteRobot
    connection
    pc?: WebRTCConnection
    allRemoteStreams = new Map()
    currentMode = undefined
    model: Model
    settingsPane: SettingsModal
    header_tooltip: Tooltip
    tooltips = []

    activeVelocityRegion?: ValidJoints
    activeVelocityAction?: VelocityCommand
    velocityExecutionHeartbeat?: number // ReturnType<typeof setInterval>
    activeVelocityActionTimeout?: number // ReturnType<typeof setTimeout>
    activeVelocityRegionPath?: SVGPathElement
    activeVelocityRegionPathTimeout?: number // ReturnType<typeof setTimeout>

    controlsContainer: HTMLElement
    mapInteractive?: MapInteractive

    commandRecorder?: CommandRecorder

    VELOCITIES = [0.25, 0.5, 1.0, 1.5, 2.0];
    JOINT_INCREMENTS: { [key in ValidJoints]?: number } = {
        "joint_head_tilt": 0.1,
        "joint_head_pan": 0.1,
        "joint_gripper_finger_left": .075,
        "wrist_extension": 0.075,
        "joint_lift": .075,
        "joint_wrist_yaw": .2,
        "translate_mobile_base": .1,
        "rotate_mobile_base": .2
    }

    JOINT_VELOCITIES: { [key in ValidJoints]?: number } = {
        "joint_head_tilt": .3,
        "joint_head_pan": .3,
        "wrist_extension": .04,
        "joint_lift": .04,
        "joint_wrist_yaw": .1,
        "translate_mobile_base": .1,
        "rotate_mobile_base": .1
    }

    SETTING_NAMESPACES: { [key: string]: "manip" | "nav" } = {
        "wrist_extension": "manip",
        "joint_lift": "manip",
        "joint_wrist_yaw": "manip",
        "translate_mobile_base": "nav",
        "rotate_mobile_base": "nav"
    }

    ACTION_MODE_TOOLTIPS: { [key: string]: [string, string] } = {
        "incremental": ["Step Actions", "When the button is clicked, the robot moves a fixed amount based on the selected speed."],
        "press-release": ["Press-Release", "Press and hold the button to move the robot. When the button is released, the robot will stop moving."],
        "click-click": ["Click-Click", "Click the button to move the robot. Click again to stop the robot."]
    }

    constructor() {
        super(template);
        this.settingsPane = this.refs.get("settings") as SettingsModal
        let poseLibrary = this.refs.get("pose-library")!
        poseLibrary.getCurrentPose = async () => {
            return await this.connection.makeRequest("jointState")
        }


        // Firebase Code
        if (FirebaseModel.isConfigurationValid(CONFIG)) {
            this.model = new FirebaseModel(CONFIG, (model) => {
                this.modelReadyCallback(model)
                this.settingsPane.configureAuthCallback(() => {
                    this.model.authenticate();
                })
            })
        } else {
            // Local Storage Code
            console.warn("No valid Firebase configuration. Using LocalStorage backend.")
            this.model = new LocalStorageModel();
            this.modelReadyCallback(this.model)
        }


        this.controlsContainer = this.refs.get("video-control-container")!
        // Bind events from the pose library so that they actually do something to the model
        this.addEventListener("posecreated", event => {
            let pose = event.detail
            this.model.addPose(pose.name, pose)
        })
        this.addEventListener("posedeleted", event => {
            let poseName = event.detail
            this.model.removePose(poseName)
        })
        this.addEventListener("poseclicked", event => {
            let pose = event.detail
            this.robot!.setPoseGoal(pose);
        })
        this.connection = new WebRTCConnection("OPERATOR", true, {
            onConnectionEnd: this.disconnectFromRobot.bind(this),
            onMessage: this.handleMessage.bind(this),
            onTrackAdded: this.handleRemoteTrackAdded.bind(this),
            onAvailableRobotsChanged: this.availableRobotsChanged.bind(this),
            onMessageChannelOpen: this.configureRobot.bind(this),
            onRequestChannelOpen: this.requestChannelReadyCallback.bind(this),
        })

        this.refs.get("hangup")!.addEventListener("click", () => {
            this.disconnectFromRobot()
            this.refs.get("select-robot")!.selectedIndex = 0
            this.refs.get("hangup")!.disabled = "true"
        })

        this.refs.get("select-robot")!.onchange = () => {
            const robot = this.refs.get("select-robot")!.value;
            if (robot === 'no robot connected') {
                console.log('no robot selected, hanging up');
                this.refs.get("hangup")!.disabled = "true"
                this.disconnectFromRobot()
            } else {
                this.refs.get("hangup")!.disabled = null
                this.connection.connectToRobot(robot)
            }
        };
        this.refs.get("mode-toggle")!.querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                this.updateNavDisplay()
                this.configureVelocityControls()
                this.updateColors(this.model.getSetting("colorblindMode"))
                this.dispatchCommand({ type: "mode-toggle", mode: option.value })
            })
        })
        this.refs.get("velocity-toggle")!.querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                this.dispatchCommand({ type: "velocity-toggle", mode: option.value })

                let currMode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value
                this.dispatchEvent(new CustomEvent("settingchanged", {
                    bubbles: true,
                    composed: true,
                    detail: {
                        key: "velocity",
                        value: option.value,
                        namespace: currMode
                    }
                }))
            })
        })
        this.connection.availableRobots()
        window.onbeforeunload = () => {
            this.connection.hangup()
        };

        this.refs.get("settings-button")!.addEventListener("click", () => {
            this.settingsPane.showModal()
        })
        this.addEventListener("createprofile", event => {
            this.model.saveSettingProfile(event.detail.name)
        })
        this.addEventListener("loadprofile", event => {
            this.model.loadSettingProfile(event.detail.name)
            this.settingsPane.configureInputs(this.model.getSettings())
            this.configureVelocityControls(event.detail.namespace)
            this.updateNavDisplay()
        })
        this.addEventListener("deleteprofile", event => {
            this.model.deleteSettingProfile(event.detail.name)
        })

        this.addEventListener("downloadsettings", () => {
            let element = document.createElement('a');
            let settings = this.model.getSettings()
            let data = "text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(settings, null, 4));
            element.setAttribute('href', 'data:' + data);

            // TODO [vinitha]: find better way for make unique file name
            var d = new Date();
            var pst_date = d.toLocaleString("en-US", {
                timeZone: "America/Los_Angeles"
            })
            element.setAttribute('download', 'settings-' + pst_date + '.json');
            document.body.appendChild(element);
            element.click()
            document.body.removeChild(element);
        })


        this.addEventListener("settingchanged", event => {
            // Emitted when user has interactively changed a setting
            const change = event.detail
            this.model.setSetting(change.key, change.value, change.namespace)

            // User changed this setting in the modal pane, so we may need to reflect changes here
            if (change.key === "displayMode") {
                this.configureVelocityControls(change.namespace)
            }
            if (change.key === "velocity" || change.key === "colorblindMode") {
                this.updateColors(this.model.getSetting("colorblindMode"))
            }
            if (change.key.startsWith("showPermanentIcons")) {
                let controlName = change.key.substring(18).toLowerCase()
                let control = this.controls[controlName]
                // Might not have controls on screen!
                if (!control) return;
                control.showIcons = change.value
                return;
            }
            // Most of the other keys are for controls
            this.updateNavDisplay()

        })

        // this.refs.get("slider-step-up").addEventListener("click", () => {
        //     this.shadowRoot.getElementById("slider").value =
        //         parseFloat(this.shadowRoot.getElementById("slider").value) +
        //         parseFloat(this.shadowRoot.getElementById("slider").step);
        // })

        // this.refs.get("slider-step-down").addEventListener("click", () => {
        //     this.shadowRoot.getElementById("slider").value =
        //         parseFloat(this.shadowRoot.getElementById("slider").value) -
        //         parseFloat(this.shadowRoot.getElementById("slider").step);
        // })
    }

    private modelReadyCallback(model: Model) {
        // TODO (kavidey): this function can get called twice if the user authenticates with google
        // make sure that each of these functions reacts okay to that
        this.settingsPane.configureInputs(model.getSettings())
        this.settingsPane.setProfiles(model.getSettingProfiles())

        let poseLibrary = this.refs.get("pose-library")! as PoseLibrary;
        poseLibrary.clearPoses();
        model.getPoses().forEach(pose => poseLibrary.addPose(pose))

        this.configureVelocityControls()

        this.commandRecorder = this.refs.get("recorder") as CommandRecorder;
        this.commandRecorder.initializeLogging(model);

        this.updateColors(this.model.getSetting("colorblindMode"))
    }

    updateNavDisplay() {
        let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
        this.setMode(currMode)

        let mode: [string, string];
        let actionMode = this.model.getSetting("actionMode", currMode)
        let startStopMode = this.model.getSetting("startStopMode", currMode)
        if (actionMode === "control-continuous") {
            mode = this.ACTION_MODE_TOOLTIPS[startStopMode]
        } else {
            mode = this.ACTION_MODE_TOOLTIPS[actionMode]
        }

        this.refs.get("action-mode-title").innerHTML = `Action Mode: ${mode[0]} <button class="btn btn-lg tooltip-btn" data-toggle="tooltip" title="${mode[1]}">&#9432</button>`
        this.header_tooltip = new Tooltip(this.refs.get("action-mode-title").querySelector("button"), {
            placement: "right",
            container: 'body',
        })
    }

    configureVelocityControls(namespace?: string) {
        const displayMode = this.model.getSetting("displayMode", "nav")
        let mode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value;
        if (displayMode == "predictive-display" && mode == "nav") {
            this.refs.get("velocity-toggle")!.style.display = "none";
            this.refs.get("velocity-slider")!.style.display = "none";
            return
        } 

        const controlType = this.model.getSetting("velocityControlMode")
        if (controlType === "continuous") {
            this.refs.get("velocity-toggle")!.style.display = "none";
            this.refs.get("velocity-slider")!.style.display = null;
        } else {
            this.refs.get("velocity-toggle")!.style.display = null;
            this.refs.get("velocity-slider")!.style.display = "none";
        }
        // const stepSize = parseFloat(this.model.getSetting("continuousVelocityStepSize"))
        // this.shadowRoot.getElementById("slider").step = stepSize
    }

    updateColors(colorBlindMode: boolean) {
        // Reset all background colors
        this.refs.get("velocity-toggle").querySelectorAll("input").forEach(option => {
            this.shadowRoot.querySelector(`.btn-check + .btn[for="${option.id}"]`).style.background = "white";
            this.shadowRoot.querySelector(`.btn-check + .btn[for="${option.id}"]`).style.color = "black";   
        })

        let speed = this.refs.get("velocity-toggle").querySelector("input:checked").id
        let speed_idx = this.refs.get("velocity-toggle").querySelector("input:checked").value
        let colors = colorBlindMode ? ["#006164", "#57C4AD", "#E6E1BC", "#EDA247", "#DB4325"] : ["#00ff00", "#80FF00", "#ffff00", "#ff8000", "#ff0000"]
        this.shadowRoot.querySelector(`.btn-check:checked + .btn[for="${speed}"]`).style.background = colors[speed_idx];   
        
        if (speed === "speed-2" || speed === "speed-3") {
            this.shadowRoot.querySelector(`.btn-check:checked + .btn[for="${speed}"]`).style.color = "black";   
        }
        if (speed === "speed-1") {
            this.shadowRoot.querySelector(`.btn-check:checked + .btn[for="${speed}"]`).style.color = colorBlindMode ? "white" : "black" 
        }
    }

    getVelocityForJoint(jointName: ValidJoints) {
        let scale = 1;
        // Do not scale velocity for head tilt/pan
        if (jointName in this.SETTING_NAMESPACES) {
            scale = Number(this.model.getSetting("velocityScale"));
        }
        if (this.model.getSetting("velocityControlMode") === "continuous") {
            return this.refs.get("continuous-velocity-input")!.value * scale
        } else {
            let velocity = this.refs.get("velocity-toggle")!.querySelector("input[type=radio]:checked")!.value
            return this.JOINT_VELOCITIES[jointName]! * this.VELOCITIES[velocity] * scale
        }
    }

    getIncrementForJoint(jointName: ValidJoints) {
        let scale = 1;
        // Do not scale velocity for head tilt/pan
        if (jointName in this.SETTING_NAMESPACES) {
            scale = this.model.getSetting("velocityScale")
        }
        if (this.model.getSetting("velocityControlMode") === "continuous") {
            return this.refs.get("continuous-velocity-input")!.value * scale
        } else {
            let velocity = parseInt(this.refs.get("velocity-toggle")!.querySelector("input[type=radio]:checked")!.value)
            var increment = (this.JOINT_INCREMENTS[jointName]! * this.VELOCITIES[velocity] * scale)
            return increment
        }
    }

    setMode(modeId: navModes) {
        let displayMode = this.model.getSetting("displayMode", "nav")
        // Tell the controls so they can swap out the overlays if necessary
        for (const control in this.controls) {
            if ((control === "overhead" || control === "pantilt") && displayMode === "predictive-display" && modeId == "nav") {
                this.controls[control].setMode("clickNav")
            } else {
                this.controls[control].setMode(modeId)
            }
        }

        let velocity = this.model.getSetting("velocity", modeId)
        this.refs.get("velocity-toggle").querySelector(`input[value='${velocity}']`).checked = true

        if (!this.shadowRoot.getElementById("pantilt-extra-controls").content.querySelector("#follow-check").checked) {
            let pan = this.model.getSetting("joint_head_pan", modeId)
            let tilt = this.model.getSetting("joint_head_tilt", modeId)
            this.robot?.setPanTilt({"pan": pan, "tilt": tilt})
        }

        if (modeId === 'nav') {
            this.robot?.configureOverheadCamera(true, overheadNavCrop)
            if (this.controlsContainer.contains(this.controls["gripper"])) {
                this.controlsContainer.removeChild(this.controls["gripper"])
                this.controls["gripper"].removeRemoteStream()
            }
        } else if (modeId === 'manip') {
            this.robot?.configureOverheadCamera(false, overheadManipCrop)
            if (!this.controlsContainer.contains(this.controls["gripper"])) {
                this.controlsContainer.appendChild(this.controls["gripper"])
                this.controls["gripper"].addRemoteStream(this.allRemoteStreams.get("gripper").stream)
            }
        } else {
            console.error('Invalid mode: ' + modeId);
            console.trace();
        }
    }

    dispatchCommand(cmd: cmd) {
        window.dispatchEvent(new CustomEvent("commandsent", { bubbles: false, detail: cmd }))
    }

    disconnectFromRobot() {
        // Remove controls
        this.controlsContainer.innerHTML = ""

        this.refs.get("pose-library")!.disabled = "true"
        this.refs.get("recorder")!.disabled = "true"
        this.refs.get("map-interactive")!.disabled = "true";
        this.shadowRoot!.querySelectorAll("input[name=mode]").forEach(input => input.disabled = true)

        this.connection.hangup()
        for (const control in this.controls) {
            this.controls[control].removeRemoteStream()
        }
    }

    handleMessage(message: WebRTCMessage | WebRTCMessage[]) {
        if (message instanceof Array) {
            for (const subMessage of message) {
                this.handleMessage(subMessage)
            }
            return
        }
        switch (message.type) {
            case "sensor":
                this.robot!.sensors.set(message.subtype, message.name, message.value)
                break;
            case "goal":
                switch (message.name) {
                    case "nav":
                        this.mapInteractive?.clearGoal();
                        if (message.status == "success") {
                            this.commandRecorder?.completeGoal(message.value.id);
                        } else if (message.status == "failure" && this.commandRecorder?.recording) {
                            this.commandRecorder?.logCommand({
                                detail: {
                                    type: "cancelledGoal",
                                    timestamp: message.value.timestamp,
                                    name: "nav",
                                    goal: message.value.goal,
                                    id: message.value.id
                                }
                            } as CustomEvent<cmd>)
                        }
                        break;
                    case "pose":
                        if (message.status == "success") {
                            this.commandRecorder?.completeGoal(message.value.id);
                        } else if (message.status == "failure" && this.commandRecorder?.recording) {
                            this.commandRecorder?.logCommand({
                                detail: {
                                    type: "cancelledGoal",
                                    timestamp: message.value.timestamp,
                                    name: "pose",
                                    goal: message.value.goal,
                                    id: message.value.id
                                }
                            } as CustomEvent<cmd>)
                        }
                        break;
                }
                break;
            case 'jointState':
                this.robot!.sensors.setJointState(message.jointState);
                break;
            default:
                console.error("Unknown message type", message.type)
        }
    }

    handleRemoteTrackAdded(event: RTCTrackEvent) {
        console.log('Remote track added.');
        const track = event.track;
        const stream = event.streams[0];
        console.log('got track id=' + track.id, track);
        if (stream) {
            console.log('stream id=' + stream.id, stream);
        }
        console.log('OPERATOR: adding remote tracks');

        let streamName = this.connection.cameraInfo[stream.id]
        this.allRemoteStreams.set(streamName, { 'track': track, 'stream': stream });

    }

    availableRobotsChanged(available_robots: AvailableRobots) {
        const robotSelection = this.refs.get("select-robot")! as HTMLSelectElement
        // remove any old options, leaving the "no robot" option at the front
        for (let i = 1; i < robotSelection.options.length; i++) {
            robotSelection.remove(i)
        }

        // add all new options
        for (let r of available_robots) {
            let option = document.createElement('option');
            option.value = r;
            option.text = r;
            robotSelection.appendChild(option);
        }
    }

    drawAndExecuteTraj(eventX: number, eventY: number, overlay, execute = true) {
        let videoWidth = this.controlsContainer!.firstChild!.clientWidth;
        let videoHeight = this.controlsContainer!.firstChild!.clientHeight;
        let overlayWidth = overlay.w;
        let overlayHeight = overlay.h;
        let scaleWidth = videoWidth / overlayWidth;
        let scaleHeight = videoHeight / overlayHeight;
        let px = eventX / scaleWidth;
        let py = eventY / scaleHeight;

        let dx = px - 45; // robot position x offset
        let dy = py - 70; // robot position y offset
        let magnitude = Math.sqrt(Math.pow(dx / overlayWidth, 2) + Math.pow(dy / overlayHeight, 2));
        let heading = Math.atan2(-dy + 10, -dx) // offset for behind the robot
        let scale = Number(this.model.getSetting("velocityScale"))
        let colorBlind = this.model.getSetting("colorblindMode")
        // If click on the robot, rotate in place
        if (overlay.inBaseRect(px, py)) {
            if (execute) {
                this.activeVelocityAction = heading < Math.PI / 2 ? this.robot!.driveWithVelocities(0, scale * 0.2) : this.robot!.driveWithVelocities(0, scale * -0.2);
            }
            heading <= Math.PI / 2 ? overlay.drawRotateIcon('rotate_left', execute) : overlay.drawRotateIcon('rotate_right', execute)
        }
        // If clicking behind the robot, move backward
        else if (heading < 0) {
            this.activeVelocityAction = execute ? this.robot!.driveWithVelocities(scale * -magnitude * 0.5, 0.0) : undefined;
            overlay.drawArc(px, py, Math.PI / 2, Math.PI / 2 - 0.001, colorBlind, execute);
        }
        // Otherwise move based off heading and magnitude of vector
        else {
            this.activeVelocityAction = execute ? this.robot!.driveWithVelocities(scale * magnitude * 0.3, -(heading - Math.PI / 2) * 0.3 * scale) : undefined;
            overlay.drawArc(px, py, Math.PI / 2, heading, colorBlind, execute);
        }
    }

    stopCurrentAction() {
        if (this.activeVelocityAction) {
            // No matter what region this is, stop the currently running action
            this.activeVelocityAction.stop()
            this.activeVelocityAction = undefined
            clearInterval(this.velocityExecutionHeartbeat)
            this.velocityExecutionHeartbeat = undefined
            clearTimeout(this.activeVelocityActionTimeout)
            this.activeVelocityActionTimeout = undefined
        }
    }

    setIncrementalVelocities(regionName, lin_vel, ang_vel) {
        // If new action; stop current action and start new action
        if (this.activeVelocityRegion != regionName) {
            this.stopCurrentAction()
            this.velocityExecutionHeartbeat = window.setInterval(() => {
                this.activeVelocityAction = this.robot!.driveWithVelocities(lin_vel, ang_vel);
            }, 100);
        } 
        // If same action, set new timeout (handles repetitive clicking)
        else if (this.activeVelocityActionTimeout) {
            clearTimeout(this.activeVelocityActionTimeout)
            this.activeVelocityActionTimeout = undefined
        } 
        // If no current action being executed
        else {
            this.velocityExecutionHeartbeat = window.setInterval(() => {
                this.activeVelocityAction = this.robot!.driveWithVelocities(lin_vel, ang_vel);
            }, 100);
        }
        this.activeVelocityActionTimeout = setTimeout(() => {this.stopCurrentAction()}, 1000)
    }

    configureRobot() {
        this.robot = new RemoteRobot((message: cmd) => this.connection.sendData(message));

        this.refs.get("pose-library")!.disabled = null
        this.refs.get("recorder")!.disabled = null
        this.shadowRoot!.querySelectorAll("input[name=mode]").forEach(input => input.disabled = null)

        const overhead = new VideoControl();
        const pantilt = new VideoControl(new Map([
            ["left", {
                title: "look left",
                label: "&#9665",
                action: () => {
                    let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
                    let inc = this.getIncrementForJoint("joint_head_pan")
                    this.robot.incrementalMove("joint_head_pan", 1, inc)
                    this.model.setSetting("joint_head_pan", this.model.getSetting("joint_head_pan", currMode) + inc, currMode) 
                }
        }], ["right", {
                title: "look right",
                label: "&#9655",
                action: () => {
                    let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
                    let inc = this.getIncrementForJoint("joint_head_pan")
                    this.robot.incrementalMove("joint_head_pan", -1, inc)
                    this.model.setSetting("joint_head_pan", this.model.getSetting("joint_head_pan", currMode) - inc, currMode) 
                }
        }], ["top", {
                title: "look up",
                label: "&#9651",
                action: () => {
                    let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
                    let inc = this.getIncrementForJoint("joint_head_tilt")
                    this.robot.incrementalMove("joint_head_tilt", 1, inc)
                    this.model.setSetting("joint_head_tilt", this.model.getSetting("joint_head_tilt", currMode) + inc, currMode) 
                }
        }], ["bottom", {
                title: "look down",
                label: "&#9661",
                action: () => {
                    let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
                    let inc = this.getIncrementForJoint("joint_head_tilt")
                    this.robot.incrementalMove("joint_head_tilt", -1, inc)
                    this.model.setSetting("joint_head_tilt", this.model.getSetting("joint_head_tilt", currMode) - inc, currMode) 
                }
        }]]));
        let extraPanTiltButtons = this.shadowRoot.getElementById("pantilt-extra-controls").content.querySelector("div").cloneNode(true)
        extraPanTiltButtons.querySelector("#follow-check").onchange = (event) => {
            this.shadowRoot.getElementById("pantilt-extra-controls").content.querySelector("#follow-check").checked = event.target.checked
            this.robot!.setPanTiltFollowGripper(event.target.checked)
        }
        extraPanTiltButtons.querySelector("button").onclick = () => {
            let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
            currMode === "nav" ? this.robot!.lookAtBase() : this.robot!.lookAtArm() 
            this.model.resetSetting("joint_head_pan", currMode);
            this.model.resetSetting("joint_head_tilt", currMode); 
            this.robot!.setPanTiltFollowGripper(false)           
            extraPanTiltButtons.querySelector("#follow-check").checked = false;
        }
        extraPanTiltButtons.querySelectorAll('[data-toggle=tooltip').forEach(option => {
            this.tooltips.push(new Tooltip(option, {
                placement: "bottom",
                container: "body",
                html: true       
            }))
        })
        pantilt.setExtraContents(extraPanTiltButtons)
        const gripper = new VideoControl();

        this.controls = { "overhead": overhead, "pantilt": pantilt, "gripper": gripper }
        for (let [name, control] of Object.entries(this.controls)) {
            let capitalizedName = name.substring(0, 1).toUpperCase() + name.substring(1)
            control.showIcons = this.model.getSetting(`showPermanentIcons${capitalizedName}`)
        }

        for (const [streamName, info] of this.allRemoteStreams) {
            this.controls[streamName].addRemoteStream(info.stream)
        }

        Array(overhead, pantilt, gripper).forEach(control => {
            this.controlsContainer.appendChild(control)
        })
        let panTiltTrack = this.allRemoteStreams.get("pantilt").stream.getVideoTracks()[0]

        let ptAspectRatio = panTiltTrack.getSettings().aspectRatio || .52
        const threeCamera = new PerspectiveCamera(69, ptAspectRatio, 0.1, 1000);

        var ptNavOverlay = new PanTiltNavigationOverlay(1);
        var reachOverlayTHREE = new ReachOverlay(threeCamera);
        this.robot.sensors.listenToKeyChange("head", "transform", (transform) => {
            reachOverlayTHREE.updateTransform(transform)
        })

        let ptManipOverlay = new PanTiltManipulationOverlay(1);
        ptManipOverlay.Ready.then(() => {
            this.robot.sensors!.listenToKeyChange("lift", "inJointLimits", value => {
                ptManipOverlay.updateLiftJointLimits(value)
            })
            this.robot.sensors!.listenToKeyChange("arm", "inJointLimits", value => {
                ptManipOverlay.updateExtensionJointLimits(value)
            })
            this.robot.sensors!.listenToKeyChange("wrist", "inJointLimits", value => {
                ptManipOverlay.updateWristJointLimits(value)
            })
            this.robot.sensors!.listenToKeyChange("gripper", "inJointLimits", value => {
                ptManipOverlay.updateGripperJointLimits(value)
            })
            this.robot.sensors!.listenToKeyChange("lift", "effort", value => {
                ptManipOverlay.updateLiftEffort(value, this.model.getSetting("showPermanentIconsPantilt"))
            })
            this.robot!.sensors.listenToKeyChange("arm", "effort", value => {
                ptManipOverlay.updateExtensionEffort(value, this.model.getSetting("showPermanentIconsPantilt"))
            })
            this.robot.sensors!.listenToKeyChange("gripper", "effort", value => {
                ptManipOverlay.updateGripperEffort(value, this.model.getSetting("showPermanentIconsPantilt"))
            })
            this.robot!.sensors.listenToKeyChange("wrist", "effort", value => {
                ptManipOverlay.updateWristEffort(value, this.model.getSetting("showPermanentIconsPantilt"))
            })
        })
        pantilt.addOverlay(reachOverlayTHREE, "all");
        pantilt.addOverlay(ptNavOverlay, 'nav');
        pantilt.addOverlay(ptManipOverlay, 'manip');

        let overheadManipOverlay = new OverheadManipulationOverlay(1);
        overheadManipOverlay.Ready.then(() => {
            this.robot.sensors.listenToKeyChange("arm", "inJointLimits", value => {
                overheadManipOverlay.updateExtensionJointLimits(value)
            })
            this.robot.sensors.listenToKeyChange("wrist", "inJointLimits", value => {
                overheadManipOverlay.updateWristJointLimits(value)
            })
            this.robot.sensors.listenToKeyChange("arm", "effort", value => {
                overheadManipOverlay.updateExtensionEffort(value, this.model.getSetting("showPermanentIconsOverhead"))
            })
            this.robot.sensors.listenToKeyChange("wrist", "effort", value => {
                overheadManipOverlay.updateWristEffort(value, this.model.getSetting("showPermanentIconsOverhead"))
            })
        })
        overhead.addOverlay(overheadManipOverlay, 'manip');

        let overheadNavOverlay = new OverheadNavigationOverlay(1);
        let overheadClickNavOverlay = new OverheadClickNavigationOverlay(1);
        overhead.addOverlay(overheadNavOverlay, 'nav');
        overhead.addOverlay(overheadClickNavOverlay, 'clickNav');

        let gripperOverlay = new GripperOverlay(1);
        gripperOverlay.Ready.then(() => {
            this.robot.sensors.listenToKeyChange("lift", "effort", value => {
                gripperOverlay.updateLiftEffort(value, this.model.getSetting("showPermanentIconsGripper"))
            })
            this.robot.sensors.listenToKeyChange("gripper", "effort", value => {
                gripperOverlay.updateGripperEffort(value, this.model.getSetting("showPermanentIconsGripper"))
            })
            this.robot.sensors.listenToKeyChange("wrist", "effort", value => {
                gripperOverlay.updateWristEffort(value, this.model.getSetting("showPermanentIconsGripper"))
            })
            this.robot.sensors.listenToKeyChange("lift", "inJointLimits", value => {
                gripperOverlay.updateLiftJointLimits(value)
            })
            this.robot.sensors.listenToKeyChange("gripper", "inJointLimits", value => {
                gripperOverlay.updateGripperJointLimits(value)
            })
            this.robot.sensors.listenToKeyChange("wrist", "inJointLimits", value => {
                gripperOverlay.updateWristJointLimits(value)
            })
        })
        gripper.addOverlay(gripperOverlay, 'all');

        this.setMode('nav')
        this.robot?.setBaseMode("navigation")
        this.updateNavDisplay()
        this.updateColors(this.model.getSetting("colorblindMode"))

        let overheadControl = this.controls["overhead"]
        var mouseMoveX = 0;
        var mouseMoveY = 0;
        // Event handlers
        var updateAction = (event: MouseEvent) => {
            overheadClickNavOverlay.removeTraj();
            mouseMoveX = event.offsetX
            mouseMoveY = event.offsetY
            this.drawAndExecuteTraj(mouseMoveX, mouseMoveY, overheadClickNavOverlay)
        }
        var stopAction = (event: MouseEvent) => {
            event.stopPropagation();
            this.stopCurrentAction();
            overheadClickNavOverlay.resetTraj(this.model.getSetting("colorblindMode"));
            overheadControl.removeEventListener('mousemove', updateAction);
            overheadControl.addEventListener('mousemove', drawTraj);
        };
        var drawTraj = (event: MouseEvent) => {
            let x = event.offsetX;
            let y = event.offsetY;
            mouseMoveX = x;
            mouseMoveY = y;
            let namespace = 'nav'
            let mode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value;
            if (this.model.getSetting("displayMode", namespace) === "predictive-display" && mode === 'nav') {
                overheadClickNavOverlay.removeTraj();
                this.drawAndExecuteTraj(mouseMoveX, mouseMoveY, overheadClickNavOverlay, false)
            }
        }

        overheadControl.addEventListener("mousemove", drawTraj)
        overheadControl.addEventListener("mouseleave", (event: MouseEvent) => {
            let mode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value;
            if (this.model.getSetting("displayMode", 'nav') === "predictive-display" && mode === 'nav') {
                stopAction(event);
                overheadClickNavOverlay.removeTraj()
            }
        })

        // Predictive Display Mode
        overheadControl.addEventListener("mousedown", (event: MouseEvent) => {
            let x = event.offsetX;
            let y = event.offsetY;
            mouseMoveX = x;
            mouseMoveY = y;

            // Remove old event handlers
            overheadControl.removeEventListener('mousemove', updateAction);
            overheadControl.removeEventListener('mousemove', drawTraj);
            let namespace = 'nav'
            let mode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value;
            if (this.model.getSetting("displayMode", namespace) === "predictive-display" && mode === 'nav') {
                if (this.model.getSetting("actionMode", namespace) === "control-continuous") {
                    // Update trajectory when mouse moves
                    overheadControl.addEventListener("mousemove", updateAction);

                    if (this.model.getSetting("startStopMode", namespace) === "press-release") {
                        // Execute trajectory as long as mouse is held down using last position of cursor
                        // Wait for predictive trajectory calculation to complete before creating mouseup
                        // event (handles repeated clicking)
                        const promise = new Promise((resolve, reject) => {
                            if (!this.activeVelocityAction) {
                                this.velocityExecutionHeartbeat = window.setInterval(() => {
                                    overheadClickNavOverlay.removeTraj();
                                    this.drawAndExecuteTraj(mouseMoveX, mouseMoveY, overheadClickNavOverlay)
                                }, 100)
                                resolve()
                            }
                            reject()
                        })
                        promise.then(() => document.body.addEventListener("mouseup", stopAction));
                    }
                    // Click-click mode: if action is being executed stop it
                    else if (this.activeVelocityAction) {
                        stopAction(event);
                    }
                    // Click-click mode: if no action start new action
                    else {
                        document.body.removeEventListener('mouseup', stopAction);
                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            overheadClickNavOverlay.removeTraj();
                            this.drawAndExecuteTraj(mouseMoveX, mouseMoveY, overheadClickNavOverlay)
                        }, 10)
                    }
                } else {
                    // action mode is incremental/step actions
                    // execute trajectory once
                    this.drawAndExecuteTraj(x, y, overheadClickNavOverlay);
                    setTimeout(() => {
                        overheadClickNavOverlay.resetTraj(this.model.getSetting("colorblindMode"))
                    }, 1500);
                    overheadControl.addEventListener("mousemove", drawTraj)
                }
            }
        });

        let jointName: ValidJoints;
        const onOverlayMouseUp = (event: MouseEvent) => {
            event.stopPropagation()
	        if (jointName != "translate_mobile_base" && 
                jointName != "rotate_mobile_base" && 
                jointName != "joint_wrist_yaw" && 
                jointName != "joint_gripper_finger_left") {
    	        this.robot!.velocityMove(jointName, 0);
    	    }
            this.stopCurrentAction();
            let composedTarget = event.composedPath()[0]
            composedTarget.setAttribute("stroke", "white");
            composedTarget.setAttribute("stroke-opacity", "0.3");
        };

        // Action Overlay Display Mode
        this.controlsContainer.addEventListener("mousedown", (event: MouseEvent) => {
            event.preventDefault();
            if (event.target!.tagName !== "VIDEO-CONTROL") return;

            let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
            if (currMode == 'nav' && this.model.getSetting("displayMode", "nav") === "predictive-display") return;

            let composedTarget = event.composedPath()[0]
            let regionName = composedTarget.dataset.name
            if (!regionName || regionName === "doNothing") return;

            if (this.activeVelocityRegionPath && this.activeVelocityRegionPath != composedTarget) {
                this.activeVelocityRegionPath.setAttribute("stroke", "white");
                this.activeVelocityRegionPath.setAttribute("stroke-opacity", "0.3");
            } else {
                clearTimeout(this.activeVelocityRegionPathTimeout)
                this.activeVelocityRegionPathTimeout = undefined
            }
            this.activeVelocityRegionPath = composedTarget
            this.activeVelocityRegionPath.setAttribute("stroke", "red");
            this.activeVelocityRegionPath.setAttribute("stroke-opacity", "1.0");

            // Remove old event handlers
            document.body.removeEventListener('click', onOverlayMouseUp);

            // This region is named after a joint
            let sign = regionName.substring(regionName.length - 3) === "pos" ? 1 : -1
            jointName = regionName.substring(0, regionName.length - 4)
            let namespace = currMode === "nav" ? "nav" : "manip";
            if (this.model.getSetting("actionMode", namespace) === "incremental") {
                let vel = sign * this.getVelocityForJoint(jointName)
                if (jointName == "translate_mobile_base") {
                    this.setIncrementalVelocities(regionName, vel, 0);
                } else if (jointName == "rotate_mobile_base") {
                    this.setIncrementalVelocities(regionName, 0, vel);
                } else {
                    this.activeVelocityAction = this.robot!.incrementalMove(jointName, sign, this.getIncrementForJoint(jointName))
                }
                this.activeVelocityRegion = regionName
                this.activeVelocityRegionPathTimeout = setTimeout(() => {
                    this.activeVelocityRegionPath.setAttribute("stroke", "white");
                    this.activeVelocityRegionPath.setAttribute("stroke-opacity", "0.3");
                }, 1500)
            } else if (this.model.getSetting("actionMode", namespace) === "control-continuous") {
                if (this.model.getSetting("startStopMode", namespace) === "press-release") {
                    this.activeVelocityRegion = regionName
                    if (jointName == "translate_mobile_base") {
                        this.activeVelocityAction = this.robot!.driveWithVelocities(sign * this.getVelocityForJoint(jointName), 0.0)
                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            this.activeVelocityAction = this.robot!.driveWithVelocities(sign * this.getVelocityForJoint(jointName), 0.0)
                        }, 150);
                    } else if (jointName == "rotate_mobile_base") {
                        this.activeVelocityAction = this.robot!.driveWithVelocities(0.0, sign * this.getVelocityForJoint(jointName))
                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            this.activeVelocityAction = this.robot!.driveWithVelocities(0.0, sign * this.getVelocityForJoint(jointName))
                        }, 150)
                    } else if (jointName == "joint_wrist_yaw" || jointName == "joint_gripper_finger_left") {
                        this.activeVelocityAction = this.robot!.incrementalMove(jointName, sign, this.getIncrementForJoint(jointName))
                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            this.activeVelocityAction = this.robot!.incrementalMove(jointName, sign, this.getIncrementForJoint(jointName))
                        }, 150)
                    } else {
                        this.activeVelocityAction = this.robot!.velocityMove(jointName, sign * this.getVelocityForJoint(jointName))
                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            this.activeVelocityAction!.affirm!()
                        }, 150)
                    }
                    // When mouse is up, delete trajectory
                    document.body.addEventListener("click", onOverlayMouseUp);

                } else {
                    let lastActiveRegion = this.activeVelocityRegion
                    // If they just clicked the joint that was active, assume that stopping was the point and return early
                    if (lastActiveRegion === regionName && this.activeVelocityAction) {
                        onOverlayMouseUp(event);
                        return;
                    }

                    // If this is a new joint, start a new action!
                    this.stopCurrentAction()
                    this.activeVelocityRegion = regionName
                    if (jointName == "translate_mobile_base") {
                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            this.activeVelocityAction = this.robot!.driveWithVelocities(sign * this.getVelocityForJoint(jointName), 0.0)
                        }, 10);
                    } else if (jointName == "rotate_mobile_base") {
                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            this.activeVelocityAction = this.robot!.driveWithVelocities(0.0, sign * this.getVelocityForJoint(jointName))
                        }, 10)
                    } else {
                        if (jointName == "joint_wrist_yaw" || jointName == "joint_gripper_finger_left") {
                            this.activeVelocityAction = this.robot!.incrementalMove(jointName, sign, this.getIncrementForJoint(jointName))
                        } else {
                            this.activeVelocityAction = this.robot!.velocityMove(jointName, sign * this.getVelocityForJoint(jointName))
                        }

                        this.velocityExecutionHeartbeat = window.setInterval(() => {
                            if (!this.activeVelocityAction) {
                                // clean up
                                clearInterval(this.velocityExecutionHeartbeat)
                                this.velocityExecutionHeartbeat = undefined
                            } else {
                                if (jointName == "joint_wrist_yaw" || jointName == "joint_gripper_finger_left") {
                                    this.activeVelocityAction = this.robot!.incrementalMove(jointName, sign, this.getIncrementForJoint(jointName))
                                } else {
                                    this.activeVelocityAction!.affirm!()
                                }
                            }
                        }, 150)
                    }
                }
            }
        })

        // Safety: Set velocity to 0 when mouse leaves clicked region
        this.addEventListener("mousemove", event => {
            let navDisplayMode = this.model.getSetting("displayMode", "nav")
            if (this.activeVelocityAction && this.activeVelocityRegion) {
                let currMode = this.refs.get("mode-toggle")!.querySelector("input[type=radio]:checked")!.value
                if ((currMode === 'nav' && navDisplayMode === "action-overlay") || (currMode === 'manip')) {
                    let composedTarget = event.composedPath()[0]
                    let regionName = composedTarget.dataset.name
                    if (regionName != this.activeVelocityRegion) {
                        this.stopCurrentAction()
                        let jointName = this.activeVelocityRegion!.substring(0, this.activeVelocityRegion!.length - 4)
                        if (jointName != "translate_mobile_base" && jointName != "rotate_mobile_base") {
                            this.robot!.velocityMove(jointName as ValidJoints, 0);
                        }
                        this.activeVelocityRegionPath.setAttribute("stroke", "white");
                        this.activeVelocityRegionPath.setAttribute("stroke-opacity", "0.3");
                    }
                }
            }
            // Work around for scenarios where mouseleave doesn't fire
            if (navDisplayMode === "predictive-display") {
                let rect = overheadControl.getBoundingClientRect()
                let x = event.clientX - rect.left
                let y = event.clientY - rect.top
                if (x >= 700 || x <= 0 || y >= 700 || y <= 0) {
                    stopAction(event);
                    overheadClickNavOverlay.removeTraj()
                }
            }
        })

        // Decide what to keep on screen based on what's saved in the settings
        this.updateNavDisplay()

        // Pass a reference of robot to the command recorder so it can playback actions
        this.commandRecorder!.setupPlayback(this.robot);
    }

    requestChannelReadyCallback() {
        this.refs.get("map-interactive")!.disabled = null;
        this.mapInteractive = new MapInteractive((goal) => {
            this.robot!.setNavGoal(goal);
        });

        this.refs.get("map-interactive")!.append(this.mapInteractive);

        this.connection.makeRequest<mapView>("mapView").then((map) => {
            this.mapInteractive!.updateMap(map.mapData, map.mapWidth, map.mapHeight, map.mapResolution, map.mapOrigin);
        });

        this.robot?.sensors.listenToKeyChange("base", "transform", (value) => {
            this.mapInteractive!.updateMapDisplay(value);
        })
    }
}
