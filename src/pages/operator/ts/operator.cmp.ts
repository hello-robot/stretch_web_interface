import {VideoControl} from "./video_control.cmp";
import {PageComponent} from '../../../shared/page.cmp';
import {RemoteRobot} from "./remoterobot";
import {WebRTCConnection} from "../../../shared/webrtcconnection";
import {LocalStorageModel} from "./model";
import {
    GripperOverlay,
    OverheadManipulationOverlay,
    OverheadNavigationOverlay,
    OverheadClickNavigationOverlay,
    PanTiltManipulationOverlay,
    PanTiltNavigationOverlay,
    ReachOverlay
} from "./stretchoverlays";
import {MapInteractive} from "./mapinteractive.cmp";
import {Component} from "../../../shared/base.cmp";
import {PerspectiveCamera} from "three";
import { cmd } from "../../../shared/commands"
import ROSLIB from "roslib";
import {SettingsModal} from "./settings.cmp";

const template = `
<link href="/bootstrap.css" rel="stylesheet">
<div class="px-2 py-3 d-flex justify-content-left">

    <div class="d-flex flex-fill justify-content-start ">
    <div class="btn-group" role="group" aria-label="Select mode" id="mode-toggle" data-ref="mode-toggle">
      <input type="radio" id="mode-navigation" class="btn-check" name="mode" autocomplete="off" value="nav" checked disabled> 
      <label class="btn btn-secondary btn-sm" for="mode-navigation">Navigation</label>
  
      <input type="radio" id="mode-manipulation" class="btn-check" name="mode" value="manip" autocomplete="off" disabled> 
      <label class="btn btn-secondary btn-sm" for="mode-manipulation">Manipulation</label>
    </div>
    </div>
    
    <command-recorder data-ref="recorder"></command-recorder>

    <div class="d-flex flex-fill justify-content-end">
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
        <div id="velocity-slider" data-ref="velocity-slider">
            <!-- <span id="rangeValue" class="justify-content-end">0.1</span> -->
            <input id="slider" data-ref="continuous-velocity-input" class="range" type="range" value="0.125" min="0.025" max="0.2" step=0.025>
            <!-- <button class="up-btn" data-ref="slider-step-up">&#8593;</button>
            <button class="down-btn" data-ref="slider-step-down">&#8595;</button> -->
        </div>
    </div>
</div>

<section class="px-sm-2 py-sm-2 mb-3 d-flex justify-content-center gap-1 bg-danger" id="video-control-container" data-ref="video-control-container"></section>
<template id="pantilt-extra-controls">
    <div class="d-flex justify-content-around mt-2">
        <div class='form-check form-check-inline'>
            <input type='checkbox' class="form-check-input" value='follow' id="follow-check" />
            <label class="form-check-label" for="follow-check">Follow gripper</label>
        </div>
        <button class='btn btn-secondary btn-sm'>Reset view</button>
    </div>
</template>

<section class="container-fluid px-sm-2" data-ref="map-interactive"></section>

<section class="container-fluid px-sm-2">
    <pose-library data-ref="pose-library" disabled></pose-library>
</section>

<hr />

<div class="container-fluid d-flex flex-row">
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
<settings-modal data-ref="settings"></settings-modal>
`;

@Component('operator-page', '/operator/css/operator.css')
export class OperatorComponent extends PageComponent {
    title = '';
    controls = {}
    robot?: RemoteRobot
    connection
    pc: WebRTCConnection
    allRemoteStreams = new Map()
    currentMode = undefined
    model: LocalStorageModel
    settingsPane: SettingsModal

    activeVelocityRegion
    activeVelocityAction
    velocityExecutionHeartbeat

    VELOCITIES = [0.25, 0.5, 1.0, 1.5, 2.0];
    JOINT_INCREMENTS = {
        "joint_head_tilt": 0.1,
        "joint_head_pan": 0.1,
        "gripper_aperture": .01,
        "wrist_extension": 0.075,
        "joint_lift": .075,
        "joint_wrist_yaw": .2,
        "translate_mobile_base": .1,
        "rotate_mobile_base": .2
    }

    JOINT_VELOCITIES = {
        "joint_head_tilt": .3,
        "joint_head_pan": .3,
        "wrist_extension": .04,
        "joint_lift": .04,
        "joint_wrist_yaw": .1,
        "translate_mobile_base": .2,
        "rotate_mobile_base": .2
    }

    SETTING_NAMESPACES = {
        "wrist_extension": "manip",
        "joint_lift": "manip",
        "joint_wrist_yaw": "manip",
        "translate_mobile_base": "nav",
        "rotate_mobile_base": "nav"
    }

    constructor() {
        super(template);
        this.model = new LocalStorageModel()
        this.settingsPane = this.refs.get("settings") as SettingsModal
        this.settingsPane.configureInputs(this.model.getSettings())
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
            this.robot.goToPose(pose)
        })
        this.connection = new WebRTCConnection("OPERATOR", true, {
            onConnectionEnd: this.disconnectFromRobot.bind(this),
            onMessage: this.handleMessage.bind(this),
            onTrackAdded: this.handleRemoteTrackAdded.bind(this),
            onAvailableRobotsChanged: this.availableRobotsChanged.bind(this),
            onMessageChannelOpen: this.configureRobot.bind(this),
            onRequestChannelOpen: this.requestChannelReadyCallback.bind(this),
        })

        this.refs.get("hangup").addEventListener("click", () => {
            this.disconnectFromRobot()
            this.refs.get("select-robot").selectedIndex = 0
            this.refs.get("hangup").disabled = "true"
        })

        this.refs.get("select-robot").onchange = () => {
            const robot = this.refs.get("select-robot").value;
            if (robot === 'no robot connected') {
                console.log('no robot selected, hanging up');
                this.refs.get("hangup").disabled = "true"
                this.disconnectFromRobot()
            } else {
                this.refs.get("hangup").disabled = null
                this.connection.connectToRobot(robot)
            }
        };
        this.refs.get("mode-toggle").querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                this.updateNavDisplay()
                this.configureVelocityControls()
                this.dispatchCommand({type:"mode-toggle", mode:option.value})
            })
        })
        this.refs.get("velocity-toggle").querySelectorAll("input[type=radio]").forEach(option => {
            option.addEventListener("click", () => {
                this.dispatchCommand({type:"velocity-toggle", mode:option.value})
            })
        })
        this.connection.availableRobots()
        window.onbeforeunload = () => {
            this.connection.hangup()
        };

        this.refs.get("settings-button").addEventListener("click", () => {
            this.settingsPane.showModal()
        })
        this.addEventListener("createprofile", event => {
            this.model.saveSettingProfile(event.detail.name)
        })
        this.addEventListener("loadprofile", event => {
            if (event.detail.name === "default") {
                this.model.reset();
            } else {
                this.model.loadSettingProfile(event.detail.name)
            }
            this.settingsPane.configureInputs(this.model.getSettings())
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
            console.log(change)
            this.model.setSetting(change.key, change.value, change.namespace)

            // User changed this setting in the modal pane, so we may need to reflect changes here
            if (change.key === "velocityControlMode" || change.key === "displayMode") {
                this.configureVelocityControls(change.namespace)
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

        let poseLibrary = this.refs.get("pose-library")!
        poseLibrary.getCurrentPose = async () => {
            return await this.connection.makeRequest("jointState")
        }
        this.model.getPoses().forEach(pose => poseLibrary.addPose(pose))

        this.configureVelocityControls()
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

    updateNavDisplay() {
        let currMode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value
        let namespace = currMode === "nav" ? "nav" : "manip";
        let actionMode = this.model.getSetting("actionMode", namespace)
        if (currMode === "nav") {
            let displayMode = this.model.getSetting("displayMode", "nav")
            if (displayMode === "predictive-display") {
                this.setMode('clickNav')
                this.robot.setRobotNavMode()
            } else {
                this.setMode('nav')
                if (actionMode === "incremental") {
                    this.robot.setRobotPosMode()
                } else {
                    this.robot.setRobotNavMode()
                }
            }
        } else {
            this.setMode(currMode)
            if (actionMode === "incremental") {
                this.robot.setRobotPosMode()
            } else {
                this.robot.setRobotNavMode()
            }
        }
    }

    configureVelocityControls(namespace) {
        const displayMode = this.model.getSetting("displayMode", "nav")
        let mode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value;
        if (displayMode == "predictive-display" && mode == "nav") {
            this.refs.get("velocity-toggle").style.display = "none";
            this.refs.get("velocity-slider").style.display = "none";
            return
        }

        const controlType = this.model.getSetting("velocityControlMode", namespace)
        if (controlType === "continuous") {
            this.refs.get("velocity-toggle").style.display = "none";
            this.refs.get("velocity-slider").style.display = null;
        } else {
            this.refs.get("velocity-toggle").style.display = null;
            this.refs.get("velocity-slider").style.display = "none";
        }
        // const stepSize = parseFloat(this.model.getSetting("continuousVelocityStepSize"))
        // this.shadowRoot.getElementById("slider").step = stepSize
    }

    getVelocityForJoint(jointName) {
        let scale = 1;
        // Do not scale velocity for head tilt/pan
        if (jointName in this.SETTING_NAMESPACES) {
            let namespace = this.SETTING_NAMESPACES[jointName]
            scale = parseFloat(this.model.getSetting("velocityScale", namespace))
        }
        if (this.model.getSetting("velocityControlMode", "setting") === "continuous") {
            return this.refs.get("continuous-velocity-input").value * scale
        } else {
            let velocity = this.refs.get("velocity-toggle").querySelector("input[type=radio]:checked").value
            return this.JOINT_VELOCITIES[jointName] * this.VELOCITIES[velocity] * scale
        }
    }

    getIncrementForJoint(jointName) {
        let scale = 1;
        // Do not scale velocity for head tilt/pan
        if (jointName in this.SETTING_NAMESPACES) {
            let namespace = this.SETTING_NAMESPACES[jointName]
            scale = parseFloat(this.model.getSetting("velocityScale", namespace))
        }
        if (this.model.getSetting("velocityControlMode", "setting") === "continuous") {
            return this.refs.get("continuous-velocity-input").value * scale
        } else {
            let velocity = parseInt(this.refs.get("velocity-toggle").querySelector("input[type=radio]:checked").value)
            var increment = (this.JOINT_INCREMENTS[jointName] * this.VELOCITIES[velocity] * scale)
            return increment
        }
    }

    setMode(modeId) {
        for (const control in this.controls) {
            this.controls[control].setMode(modeId)
        }

        if (modeId === 'nav') {
            this.robot.rotateCameraView();
            if (this.refs.get("video-control-container").contains(this.controls["gripper"])) {
                this.refs.get("video-control-container").removeChild(this.controls["gripper"])
                this.controls["gripper"].removeRemoteStream()
            }
            this.robot.lookAtBase()
        } else if (modeId === 'manip') {
            this.robot.resetCameraView();
            if (!this.refs.get("video-control-container").contains(this.controls["gripper"])) {
                this.refs.get("video-control-container").appendChild(this.controls["gripper"])
                this.controls["gripper"].addRemoteStream(this.allRemoteStreams.get("gripper").stream)
            }
            this.robot.lookAtArm()
        } else if (modeId === 'clickNav') {
            this.robot.rotateCameraView();
            if (this.refs.get("video-control-container").contains(this.controls["gripper"])) {
                this.refs.get("video-control-container").removeChild(this.controls["gripper"])
                this.controls["gripper"].removeRemoteStream()
            }
            this.robot.lookAtBase()
        } else {
            console.error('Invalid mode: ' + modeId);
            console.trace();
        }
    }

    dispatchCommand(cmd) {
        window.dispatchEvent(new CustomEvent("commandsent", {bubbles: false, detail: cmd}))
    }

    disconnectFromRobot() {
        // Remove controls
        this.refs.get("video-control-container").innerHTML = ""

        this.refs.get("pose-library").disabled = "true"
        this.refs.get("recorder").disabled = "true"
        this.shadowRoot.querySelectorAll("input[name=mode]").forEach(input => input.disabled = true)

        this.connection.hangup()
        for (const control in this.controls) {
            this.controls[control].removeRemoteStream()
        }
    }

    handleMessage(message) {
        if (message instanceof Array) {
            for (const subMessage of message) {
                this.handleMessage(subMessage)
            }
            return
        }
        switch (message.type) {
            case "sensor":
                this.robot.sensors.set(message.subtype, message.name, message.value)
                break;
            default:
                console.error("Unknown message type", message.type)
        }
    }

    handleRemoteTrackAdded(event) {
        console.log('Remote track added.');
        const track = event.track;
        const stream = event.streams[0];
        console.log('got track id=' + track.id, track);
        if (stream) {
            console.log('stream id=' + stream.id, stream);
        }
        console.log('OPERATOR: adding remote tracks');

        let streamName = this.connection.cameraInfo[stream.id]
        this.allRemoteStreams.set(streamName, {'track': track, 'stream': stream});

    }

    availableRobotsChanged(available_robots) {
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

    drawAndExecuteTraj(eventX, eventY, overlay, execute=true) {
        let videoWidth = this.refs.get("video-control-container").firstChild.clientWidth;
        let videoHeight = this.refs.get("video-control-container").firstChild.clientHeight;
        let overlayWidth = overlay.w;
        let overlayHeight = overlay.h;
        let scaleWidth = videoWidth/overlayWidth;
        let scaleHeight = videoHeight/overlayHeight;
        let px = eventX/scaleWidth;
        let py = eventY/scaleHeight;

        let dx = px - 45; // robot position x offset
        let dy = py - 70; // robot position y offset
        let magnitude = Math.sqrt(Math.pow(dx/overlayWidth,2) + Math.pow(dy/overlayHeight,2));
        let heading = Math.atan2(-dy + 10, -dx) // offset for behind the robot
        let circle = execute ? true : false;
        let scale = parseFloat(this.model.getSetting("velocityScale"))
        // If click on the robot, rotate in place
        if (Math.abs(magnitude) <= 0.1) {
	    if (execute) {
        	this.activeVelocityAction = heading < Math.PI/2 ? this.robot.clickMove(0, scale * 0.3) : this.robot.clickMove(0, scale * -0.3);
	    }
	    overlay.drawRotateIcon()
        }
        // If clicking behind the robot, move backward
        else if (heading < 0) {
            this.activeVelocityAction = execute ? this.robot.clickMove(scale * -magnitude, 0.0) : null;
            overlay.drawArc(px, py, Math.PI/2, Math.PI/2 - 0.001, circle);
        }
        // Otherwise move based off heading and magnitude of vector
        else {
            this.activeVelocityAction = execute ? this.robot.clickMove(scale*magnitude*0.4, -(heading - Math.PI/2)*0.4*scale) : null;
            overlay.drawArc(px, py, Math.PI/2, heading, circle);
        }
    }

    stopCurrentAction() {
        if (this.activeVelocityAction) {
            // No matter what region this is, stop the currently running action
            this.activeVelocityAction.stop()
            this.activeVelocityAction = null
            clearInterval(this.velocityExecutionHeartbeat)
            this.velocityExecutionHeartbeat = null
        }
    }

    configureRobot() {
        this.robot = new RemoteRobot((message: cmd) => this.connection.sendData(message));

        this.refs.get("pose-library").disabled = null
        this.refs.get("recorder").disabled = null
        this.shadowRoot.querySelectorAll("input[name=mode]").forEach(input => input.disabled = null)

        const overhead = new VideoControl();
        const pantilt = new VideoControl(new Map([["left", {
            title: "look left",
            action: () => this.robot.incrementalMove("joint_head_pan", 1, this.getIncrementForJoint("joint_head_pan"))
        }], ["right", {
            title: "look right",
            action: () => this.robot.incrementalMove("joint_head_pan", -1, this.getIncrementForJoint("joint_head_pan"))
        }],
            ["top", {
                title: "look up",
                action: () => this.robot.incrementalMove("joint_head_tilt", 1, this.getIncrementForJoint("joint_head_tilt"))
            }],
            ["bottom", {
                title: "look down",
                action: () => this.robot.incrementalMove("joint_head_tilt", -1, this.getIncrementForJoint("joint_head_tilt"))
            }]]));
        let extraPanTiltButtons = this.shadowRoot.getElementById("pantilt-extra-controls").content.querySelector("div").cloneNode(true)
        extraPanTiltButtons.querySelector("#follow-check").onchange = (event) => {
            this.robot.setPanTiltFollowGripper(event.target.checked)
        }
        extraPanTiltButtons.querySelector("button").onclick = () => {
            this.robot.goToPose({joint_head_tilt: 0, joint_head_pan: 0})
        }
        pantilt.setExtraContents(extraPanTiltButtons)
        const gripper = new VideoControl();

        this.controls = {"overhead": overhead, "pantilt": pantilt, "gripper": gripper}
        for (let [name, control] of Object.entries(this.controls)) {
            let capitalizedName = name.substring(0, 1).toUpperCase() + name.substring(1)
            control.showIcons = this.model.getSetting(`showPermanentIcons${capitalizedName}`) === "true"
        }

        for (const [streamName, info] of this.allRemoteStreams) {
            this.controls[streamName].addRemoteStream(info.stream)
        }

        Array(overhead, pantilt, gripper).forEach(control => {
            this.refs.get("video-control-container").appendChild(control)
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
        this.robot.sensors.listenToKeyChange("lift", "effort", value => {
            ptManipOverlay.updateLiftEffort(value)
        })

        this.robot.sensors.listenToKeyChange("arm", "effort", value => {
            ptManipOverlay.updateExtensionEffort(value)
        })

        this.robot.sensors.listenToKeyChange("gripper", "effort", value => {
            ptManipOverlay.updateGripperEffort(value)
        })

        this.robot.sensors.listenToKeyChange("wrist", "effort", value => {
            ptManipOverlay.updateWristEffort(value)
        })
        pantilt.addOverlay(reachOverlayTHREE, "all");
        pantilt.addOverlay(ptNavOverlay, 'nav');
        pantilt.addOverlay(ptManipOverlay, 'manip');

        let overheadNavOverlay = new OverheadNavigationOverlay(1);
        let overheadManipOverlay = new OverheadManipulationOverlay(1);
        let overheadClickNavOverlay = new OverheadClickNavigationOverlay(1);
        overhead.addOverlay(overheadNavOverlay, 'nav');
        overhead.addOverlay(overheadManipOverlay, 'manip');
        overhead.addOverlay(overheadClickNavOverlay, 'clickNav');

        let gripperOverlay = new GripperOverlay(1);
        gripper.addOverlay(gripperOverlay, 'all');
        this.setMode('nav')

        var mouseMoveX = 0;
        var mouseMoveY = 0;
        // Event handlers
        var updateAction = (event) => {
            mouseMoveX = event.offsetX
            mouseMoveY = event.offsetY
            this.drawAndExecuteTraj(mouseMoveX, mouseMoveY, overheadClickNavOverlay)
        }
        var stopAction = (event) => {
            this.stopCurrentAction();
            overheadClickNavOverlay.removeCircle();
            this.refs.get("video-control-container").firstChild.removeEventListener('mousemove', updateAction);
            this.refs.get("video-control-container").firstChild.addEventListener('mousemove', drawTraj);
        };
        var drawTraj = (event) => {
            let x = event.offsetX;
            let y = event.offsetY;
            mouseMoveX = x;
            mouseMoveY = y;
            let namespace = 'nav'
            let mode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value;
            if (this.model.getSetting("displayMode", namespace) === "predictive-display" && mode === 'nav') {
                overheadClickNavOverlay.removeTraj();
                this.drawAndExecuteTraj(mouseMoveX, mouseMoveY, overheadClickNavOverlay, false)
            }
        }

        this.refs.get("video-control-container").firstChild.addEventListener("mousemove", drawTraj)
        this.refs.get("video-control-container").firstChild.addEventListener("mouseout", event => {
            let mode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value;
            if (this.model.getSetting("displayMode", 'nav') === "predictive-display" && mode === 'nav') {
                stopAction(event);
                overheadClickNavOverlay.removeTraj()
            }
	    })

        // Predictive Display Mode
        this.refs.get("video-control-container").firstChild.addEventListener("mousedown", event => {
            let x = event.offsetX;
            let y = event.offsetY;
            mouseMoveX = x;
            mouseMoveY = y;

            // Remove old event handlers
            this.refs.get("video-control-container").firstChild.removeEventListener('mouseup', stopAction);
            this.refs.get("video-control-container").firstChild.removeEventListener('mousemove', updateAction);
            this.refs.get("video-control-container").firstChild.removeEventListener('mousemove', drawTraj);
            let namespace = 'nav'
            let mode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value;
            if (this.model.getSetting("displayMode", namespace) === "predictive-display" && mode === 'nav') {
                if (this.model.getSetting("actionMode", namespace) === "control-continuous") {
                    if (this.model.getSetting("startStopMode", namespace) === "press-release") {
                        // When mouse is up, delete trajectory
                        this.refs.get("video-control-container").firstChild.addEventListener("mouseup", stopAction);
                    } else if (this.activeVelocityAction) {
                        stopAction(event);
                        return
                    }

                    // Update trajectory when mouse moves
                    this.refs.get("video-control-container").firstChild.addEventListener("mousemove", updateAction);

                    // Execute trajectory as long as mouse is held down using last position of cursor
                    this.velocityExecutionHeartbeat = window.setInterval(() => {
                        overheadClickNavOverlay.removeTraj();
                        this.drawAndExecuteTraj(mouseMoveX, mouseMoveY, overheadClickNavOverlay)
                    }, 100);

                } else {
                    // action mode is incremental/step actions
                    // execute trajectory once
                    this.drawAndExecuteTraj(x, y, overheadClickNavOverlay);
                    setTimeout(() => {overheadClickNavOverlay.removeCircle()}, 1500);
                    this.refs.get("video-control-container").firstChild.addEventListener("mousemove", drawTraj)
                }
            }
        });

	    var jointName = null;
        var onOverlayMouseUp = (event) => {
            this.stopCurrentAction();
            if (jointName != "translate_mobile_base" && jointName != "rotate_mobile_base") {
	           this.robot.velocityMove(jointName, 0);
            }
        };

        // Action Overlay Display Mode
        this.refs.get("video-control-container").addEventListener("mousedown", event => {
            if (event.target.tagName !== "VIDEO-CONTROL") return;

            let currMode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value
            if (currMode == 'nav' && this.model.getSetting("displayMode", "nav") === "predictive-display") return;

            let composedTarget = event.composedPath()[0]
            let regionName = composedTarget.dataset.name
            if (!regionName || regionName === "doNothing") return;

            // Remove old event handlers
            this.refs.get("video-control-container").removeEventListener('mouseup', onOverlayMouseUp);

            if (regionName in this.robot) {
                // This region is named after a command we can call directly on the robot
                this.robot[regionName](2)

            } else {
                // This region is named after a joint
                let sign = regionName.substr(regionName.length - 3, 3) === "pos" ? 1 : -1
                jointName = regionName.substring(0, regionName.length - 4)
                // let namespace = this.SETTING_NAMESPACES[jointName]
                let namespace = currMode === "nav" ? "nav" : "manip";
                if (this.model.getSetting("actionMode", namespace) === "incremental") {
                    this.robot.incrementalMove(jointName, sign, this.getIncrementForJoint(jointName))
                } else if (this.model.getSetting("actionMode", namespace) === "control-continuous") {
                    if (this.model.getSetting("startStopMode", namespace) === "press-release") {
                        this.activeVelocityRegion = regionName
                        if (jointName == "translate_mobile_base") {
                            this.velocityExecutionHeartbeat = window.setInterval(() => {
                                this.activeVelocityAction = this.robot.clickMove(sign * this.getVelocityForJoint(jointName), 0.0)
                            }, 150);
                        } else if (jointName == "rotate_mobile_base") {
                            this.velocityExecutionHeartbeat = window.setInterval(() => {
                                this.activeVelocityAction = this.robot.clickMove(0.0, sign * this.getVelocityForJoint(jointName))
                            }, 150)
                        } else {
                            this.activeVelocityAction = this.robot.velocityMove(jointName, sign * this.getVelocityForJoint(jointName))
                            this.velocityExecutionHeartbeat = window.setInterval(() => {
                                this.activeVelocityAction.affirm()
                            }, 150)
                        }

                        // When mouse is up, delete trajectory
                        this.refs.get("video-control-container").addEventListener("mouseup", onOverlayMouseUp);
                    } else {
                        let lastActiveRegion = this.activeVelocityRegion
                        // If they just clicked the joint that was active, assume that stopping was the point and return early
                        if (lastActiveRegion === regionName && this.activeVelocityAction) {
                            this.stopCurrentAction()
		                    if (jointName != "translate_mobile_base" && jointName != "rotate_mobile_base") {
                                this.robot.velocityMove(jointName, 0);
                            }
                            return;
                        }

                        // If this is a new joint, start a new action!
                        this.stopCurrentAction()
                        this.activeVelocityRegion = regionName
                        if (jointName == "translate_mobile_base") {
                            this.velocityExecutionHeartbeat = window.setInterval(() => {
                                this.activeVelocityAction = this.robot.clickMove(sign * this.getVelocityForJoint(jointName), 0.0)
                            }, 150);
                        } else if (jointName == "rotate_mobile_base") {
                            this.velocityExecutionHeartbeat = window.setInterval(() => {
                                this.activeVelocityAction = this.robot.clickMove(0.0, sign * this.getVelocityForJoint(jointName))
                            }, 150)
                        } else {
                            this.activeVelocityAction = this.robot.velocityMove(jointName, sign * this.getVelocityForJoint(jointName))
                            this.velocityExecutionHeartbeat = window.setInterval(() => {
                                if (!this.activeVelocityAction) {
                                    // clean up
                                    clearInterval(this.velocityExecutionHeartbeat)
                                    this.velocityExecutionHeartbeat = null
                                } else {
                                    this.activeVelocityAction.affirm()
                                }
                            }, 150)
                        }
                    }
                }
            }
        })

        // Saftey: Set velocity to 0 when mouse leaves clicked region
        this.addEventListener("mousemove", event => {
            if (this.activeVelocityAction) {
                let currMode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value
                let navDisplayMode = this.model.getSetting("displayMode", "nav")
                if ((currMode === 'nav' && navDisplayMode === "action-overlay") || (currMode === 'manip')) {
                    let composedTarget = event.composedPath()[0]
                    let regionName = composedTarget.dataset.name
		            let jointName = this.activeVelocityRegion.substring(0, this.activeVelocityRegion.length - 4)
                    if (regionName != this.activeVelocityRegion) {
                        this.stopCurrentAction()
                    	if (jointName != "translate_mobile_base" && jointName != "rotate_mobile_base") {
                            this.robot.velocityMove(jointName, 0);
                        }
		            }
                }
            }
        })
    }

    requestChannelReadyCallback() {
        this.refs.get("map-interactive").disabled = null;
        const mapInteractive = new MapInteractive((goal) => {
            this.robot?.setNavGoal(goal);
        });
        this.refs.get("map-interactive").append(mapInteractive);
        this.connection.makeRequest("mapView").then( ( map ) => {
            mapInteractive.updateMap({...map});
        });
        this.robot?.sensors.listenToKeyChange("base", "transform", (value: ROSLIB.Transform) => {
            mapInteractive.updateMapDisplay(value);
        })
    }

}
