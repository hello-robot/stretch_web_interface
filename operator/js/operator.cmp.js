import {VideoControl} from "./video_control.cmp.js";
import {Component} from '../../shared/base.cmp.js';
import {PageComponent} from '../../shared/page.cmp.js';
import {RemoteRobot} from "./remoterobot.js";
import {WebRTCConnection} from "../../shared/webrtcconnection.js";
import {LocalStorageModel} from "./model.js";
import {
    GripperOverlay,
    OverheadManipulationOverlay,
    OverheadNavigationOverlay,
    OverheadClickNavigationOverlay,
    PanTiltManipulationOverlay,
    PanTiltNavigationOverlay,
    ReachOverlay
} from "./stretchoverlays.js";
import { MapInteractive } from "./mapinteractive.cmp.js";

const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div class="px-2 py-3 d-flex justify-content-left">

    <div class="d-flex flex-fill justify-content-start ">
    <div class="btn-group" role="group" aria-label="Select mode" id="mode-toggle" data-ref="mode-toggle">
      <input type="radio" id="mode-navigation" class="btn-check" name="mode" autocomplete="off" value="nav" checked disabled> 
      <label class="btn btn-secondary btn-sm" for="mode-navigation">Navigation</label>
  
      <input type="radio" id="mode-manipulation" class="btn-check" name="mode" value="manip" autocomplete="off" disabled> 
      <label class="btn btn-secondary btn-sm" for="mode-manipulation">Manipulation</label>
    </div>
    </div>
    
    <command-recorder data-ref="recorder" disabled></command-recorder>

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
            <input id="slider" data-ref="continuous-velocity-input" class="range" type="range" value="0.1" min="0.1" max="0.8" step=0.05>
            <button class="up-btn" data-ref="slider-step-up">&#8593;</button>
            <button class="down-btn" data-ref="slider-step-down">&#8595;</button>
        </div>
    </div>
</div>

<section class="px-sm-2 py-sm-2 mb-3 d-flex justify-content-center gap-1 bg-danger" id="video-control-container" data-ref="video-control-container">
    </div>
</section>
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

export class OperatorComponent extends PageComponent {
    title = '';
    controls = {}
    robot
    connection
    pc
    allRemoteStreams = new Map()
    currentMode = undefined
    model

    activeVelocityRegion
    activeVelocityAction
    velocityExecutionHeartbeat

    INCREMENT_SCALES = [0.25, 0.5, 1.0, 1.5, 2.0];
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

    VELOCITY_SCALES = [0.25, 0.5, 1.0, 1.5, 2.0]
    JOINT_VELOCITIES = {
        "joint_head_tilt": .3,
        "joint_head_pan": .3,
        "wrist_extension": .04,
        "joint_lift": .04,
        "joint_wrist_yaw": .3,
        "translate_mobile_base": .2,
        "rotate_mobile_base": .2
    }

    constructor() {
        super(template);
        this.model = new LocalStorageModel()
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
                this.setMode(option.value)
            })
        })
        this.connection.availableRobots()
        window.onbeforeunload = () => {
            this.connection.hangup()
        };

        this.refs.get("settings-button").addEventListener("click", () => {
            this.refs.get("settings").showModal()
        })
        this.refs.get("settings").refs.get("btn-save-settings").addEventListener("click", event => {
            this.model.saveSettings();
        })
        this.refs.get("settings").refs.get("btn-load-settings").addEventListener("click", event => {
            this.refs.get("settings").configureInputs(this.model.loadSavedSettings())
        })
        this.refs.get("settings").refs.get("btn-default-settings").addEventListener("click", event => {
            this.model.reset();
            this.refs.get("settings").configureInputs(this.model.getSettings())
        })

        this.model.reset()
        this.refs.get("settings").configureInputs(this.model.getSettings())
        this.configureVelocityControls()
        this.addEventListener("settingchanged", event => {
            // Emitted when user has interactively changed a setting

            const change = event.detail
            console.log(change)
            this.model.setSetting(change.key, change.value)
            if (event.path[0].tagName === "SETTINGS-MODAL") {
                // User changed this setting in the modal pane, so we may need to reflect changes here
                if (change.key === "velocityControlMode" || change.key === "continuousVelocityStepSize") {
                    this.configureVelocityControls()
                } else if (change.key == "actionMode") {
                    var currMode = this.refs.get("mode-toggle").querySelector("input[type=radio]:checked").value
                    if (change.value == "click-navigate") {
                        this.setMode('clickNav')
                        this.shadowRoot.getElementById('mode-navigation').checked = true;
                    } else {
                        this.setMode(currMode)
                    }
                } else if (change.key.startsWith("showPermanentIcons")) {
                    let controlName = change.key.substring(18).toLowerCase()
                    let control = this.controls[controlName]
                    // Might not have controls on screen!
                    if (!control) return;
                    control.showIcons = change.value
                }
            }
        })

        this.refs.get("slider-step-up").addEventListener("click", () => {
            this.shadowRoot.getElementById("slider").value =
                parseFloat(this.shadowRoot.getElementById("slider").value) +
                parseFloat(this.shadowRoot.getElementById("slider").step);
        })

        this.refs.get("slider-step-down").addEventListener("click", () => {
            this.shadowRoot.getElementById("slider").value =
                parseFloat(this.shadowRoot.getElementById("slider").value) -
                parseFloat(this.shadowRoot.getElementById("slider").step);
        })
    }

    configureVelocityControls() {
        const controlType = this.model.getSetting("velocityControlMode")
        if (controlType === "continuous") {
            this.refs.get("velocity-toggle").style.display = "none";
            this.refs.get("velocity-slider").style.display = null;
        } else {
            this.refs.get("velocity-toggle").style.display = null;
            this.refs.get("velocity-slider").style.display = "none";
        }
        const stepSize = parseFloat(this.model.getSetting("continuousVelocityStepSize"))
        this.shadowRoot.getElementById("slider").step = stepSize
    }

    getVelocityForJoint(jointName) {
        if (this.model.getSetting("velocityControlMode") === "continuous") {
            return this.refs.get("continuous-velocity-input").value
        } else {
            let scale = parseInt(this.model.getSetting("velocityScale"))
            return this.JOINT_VELOCITIES[jointName] * this.VELOCITY_SCALES[scale]
        }
    }

    getIncrementForJoint(jointName) {
        if (this.model.getSetting("velocityControlMode") === "continuous") {
            return this.refs.get("continuous-velocity-input").value
        } else {
            let scale = parseInt(this.model.getSetting("velocityScale"))
            return this.JOINT_INCREMENTS[jointName] * this.INCREMENT_SCALES[scale]
        }
    }

    connectedCallback() {
        let poseLibrary = this.refs.get("pose-library")
        poseLibrary.getCurrentPose = async () => {
            return await this.connection.makeRequest("jointState")
        }
        this.model.getPoses().forEach(pose => poseLibrary.addPose(pose))
    }

    setMode(modeId, button) {

        for (const control in this.controls) {
            this.controls[control].setMode(modeId)
        }

        if (modeId === 'nav') {
            // FIXME: use configure camera to set crop for overhead stream
            this.robot.setCameraView('nav');
        } else if (modeId === 'manip') {
            // FIXME: use configure camera to set crop for overhead stream
            this.robot.setCameraView('manip');
        } else if (modeId === 'clickNav') {
            this.robot.setCameraView('nav');
        } else {
            console.error('Invalid mode: ' + modeId);
            console.trace();
        }
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
        const robotSelection = this.refs.get("select-robot")
        // remove any old options, leaving the "no robot" option at the front
        for (let i = 1; i < this.refs.get("select-robot").options.length; i++) {
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

    configureRobot() {
        this.robot = new RemoteRobot(message => this.connection.sendData(message), (event, val) => {
            console.log(event, val)
        })

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
        const threeCamera = new THREE.PerspectiveCamera(69, ptAspectRatio, 0.1, 1000);

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

        this.refs.get("video-control-container").addEventListener("mousedown", event => {
            if (this.model.getSetting("actionMode") === "click-navigate") {
                let position = 
                    overheadClickNavOverlay.deprojectPixeltoWorldPoint(event.offsetX, event.offsetY);
                position.x += 0.25; // offset
                position.y -= 0.2; // offset
                let magnitude = Math.sqrt(position.x*position.x + position.y*position.y);
                let heading = Math.atan2(-position.y, -position.x)
                console.log(magnitude, heading);
                this.velocityExecutionHeartbeat = window.setInterval(() => {
                    // If click on the robot, rotate in place
                    if (Math.abs(magnitude) <= 0.2) {
                        this.activeVelocityAction = this.robot.clickMove(0, 0.2);
                    } 
                    // If clicking behind the robot, move backward
                    else if (heading < 0) {
                        this.activeVelocityAction = this.robot.clickMove(-magnitude*0.4, 0.0);
                    } 
                    // Otherwise move based off heading and magnitude of vector
                    else {
                        this.activeVelocityAction = this.robot.clickMove(magnitude*0.4, -(heading - Math.PI/2)*0.4);
                    }
                }, 100)
            }
        });

        this.refs.get("video-control-container").addEventListener("mouseup", event => {
            if (this.model.getSetting("actionMode") === "click-navigate") {
                if (this.activeVelocityAction) {
                    // No matter what region this is, stop the currently running action
                    this.activeVelocityAction.stop()
                    this.activeVelocityAction = null
                    clearInterval(this.velocityExecutionHeartbeat)
                    this.velocityExecutionHeartbeat = null
                }
            }
        });

        this.refs.get("video-control-container").addEventListener("click", event => {
            if (event.target.tagName !== "VIDEO-CONTROL") return;
            let composedTarget = event.composedPath()[0]
            let regionName = composedTarget.dataset.name
            if (!regionName || regionName === "doNothing") return;

            if (regionName in this.robot) {
                // This region is named after a command we can call directly on the robot
                this.robot[regionName](2)

            } else {
                // This region is named after a joint
                let sign = regionName.substr(regionName.length - 3, 3) === "pos" ? 1 : -1
                let jointName = regionName.substring(0, regionName.length - 4)
                
                if (this.model.getSetting("actionMode") === "incremental") {
                    this.robot.incrementalMove(jointName, sign, this.getIncrementForJoint(jointName))
                } else if (this.model.getSetting("actionMode") === "control-continuous") {
                    let lastActiveRegion = this.activeVelocityRegion
                    if (this.activeVelocityAction) {
                        // No matter what region this is, stop the currently running action
                        this.activeVelocityAction.stop()
                        this.activeVelocityAction = null
                        this.activeVelocityRegion = null
                    }
                    // If they just clicked the joint that was active, assume that stopping was the point and return early
                    if (lastActiveRegion === regionName) {
                        return;
                    }
                    // If this is a new joint, start a new action!
                    this.activeVelocityRegion = regionName
                    this.activeVelocityAction = this.robot.velocityMove(jointName, sign * this.getVelocityForJoint(jointName))
                    this.velocityExecutionHeartbeat = window.setInterval(() => {
                        if (!this.activeVelocityAction) {
                            // clean up
                            clearInterval(this.velocityExecutionHeartbeat)
                            this.velocityExecutionHeartbeat = null
                        } else {
                            this.activeVelocityAction.affirm()
                        }
                    }, 100)
                }


            }
        })
    }

    requestChannelReadyCallback() {
        this.refs.get("map-interactive").disabled = null;
        const mapInteractive = new MapInteractive((goal) => {
            this.robot.setNavGoal(goal);
        });
        this.refs.get("map-interactive").append(mapInteractive);
        this.connection.makeRequest("mapView").then( ( map ) => {
            mapInteractive.updateMap({...map});
        });
        this.robot.sensors.listenToKeyChange("base", "transform", value => {
            mapInteractive.updateRobotTransform(value);
        })
    }

}

Component('operator-page', OperatorComponent, '/operator/css/operator.css')