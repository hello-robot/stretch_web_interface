import {VideoControl} from "./video_control.cmp.js";
import {Component} from '../../shared/base.cmp.js';
import {PageComponent} from '../../shared/page.cmp.js';
import {SettingsComponent} from './settings.cmp.js';
import {
    OverlaySVG,
    makeRectangle,
    makeSquare,
    rectToPoly
} from "./overlay.js";
import {RemoteRobot} from "./remoterobot.js";
import {WebRTCConnection} from "../../shared/webrtcconnection.js";
import {LocalStorageModel} from "./model.js";
import {
    GripperOverlay,
    OverheadManipulationOverlay,
    OverheadNavigationOverlay,
    PanTiltManipulationOverlay,
    PanTiltNavigationOverlay,
    ReachOverlay
} from "./stretchoverlays.js";

// FIXME: Speed switch and mode switch don't work fully now. Each probably needs its own component
// FIXME: Settings page not reintegrated
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
            <input type="radio" name="velocity" id="speed-1" class="btn-check" value="verysmall" autocomplete="off">
            <label class="btn btn-sm btn-outline-secondary" for="speed-1">Slowest</label>
            <input type="radio" name="velocity" id="speed-2" class="btn-check" value="small" autocomplete="off">
            <label class="btn btn-sm btn-outline-secondary" for="speed-2">Slow</label>
            <input type="radio" name="velocity" id="speed-3" class="btn-check" value="medium" autocomplete="off" checked>
            <label class="btn btn-sm btn-outline-secondary" for="speed-3">Medium</label>
            <input type="radio" name="velocity" id="speed-4" class="btn-check" value="large" autocomplete="off">
            <label class="btn btn-sm btn-outline-secondary" for="speed-4">Fast</label>
            <input type="radio" name="velocity" id="speed-5" class="btn-check" value="verylarge" autocomplete="off">
            <label class="btn btn-sm btn-outline-secondary" for="speed-5">Fastest</label>
        </div>
        <div data-ref="velocity-slider">
            <span id="rangeValue" class="justify-content-end">0.1</span>
            <Input id="slider" class="range" type="range" value="0.1" min="0.1" max="2.0" step=0.05></Input>
            <button class="up-btn">&#8593;</button>
            <button class="down-btn">&#8595;</button>
        </div>
    </div>
</div>

<section class="px-sm-2 py-sm-2 mb-3 d-flex justify-content-center gap-1 bg-danger" id="video-control-container" data-ref="video-control-container">
    </div>
</section>
<template id="pantilt-extra-controls">
<div class="d-flex justify-content-around mt-2">
<div class='form-check form-check-inline'> <input type='checkbox' class="form-check-input" value='follow' id="follow-check"><label class="form-check-label" for="follow-check">Follow gripper</label></div><button class='btn btn-secondary btn-sm'>Reset view</button></div></template>


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
        <button type="button" class="btn btn-primary btn-sm" data-toggle="modal" data-target="#settings" data-ref="settings">
            Settings
        </button>
    </div>
</div>
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

    constructor() {
        super(template);
        this.model = new LocalStorageModel()

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
            onMessageChannelOpen: this.configureRobot.bind(this)
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

        this.settings = new SettingsComponent();

        this.refs.get("settings").addEventListener("click", () => {
            this.settings.showModal()
        })
        
        this.refs.get("velocity-slider").style.display = "none";
        this.settings.refs.get("vmode-toggle").onchange = () => {
            const speedMode = this.settings.getSpeedMode()
            if (speedMode == "discrete") {
                this.refs.get("velocity-toggle").style.display = "block";
                this.refs.get("velocity-slider").style.display = "none";
            } else { 
                this.refs.get("velocity-toggle").style.display = "none";
                this.refs.get("velocity-slider").style.display = "block";
            }
        }
    }

    getVelocityModifier() {
        console.log(this.shadowRoot.querySelector("input[name=velocity]:checked").value)
        return this.shadowRoot.querySelector("input[name=velocity]:checked").value
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
            //this.robot.setCameraView('nav', true);

        } else if (modeId === 'manip') {
            // FIXME: use configure camera to set crop for overhead stream
            //this.robot.setCameraView('manip', true);
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

        const overhead = new VideoControl('nav');
        const pantilt = new VideoControl('nav', new Map([["left", {
            title: "look left",
            action: () => this.robot.lookLeft("medium")
        }], ["right", {
            title: "look right",
            action: () => this.robot.lookRight("medium")
        }],
            ["top", {
                title: "look up",
                action: () => this.robot.lookUp("medium")
            }],
            ["bottom", {
                title: "look down",
                action: () => this.robot.lookDown("medium")
            }]]));
        let extraPanTiltButtons = this.shadowRoot.getElementById("pantilt-extra-controls").content.querySelector("div").cloneNode(true)
        extraPanTiltButtons.querySelector("#follow-check").onchange = (event) => {
            this.robot.setPanTiltFollowGripper(event.target.checked)
        }
        extraPanTiltButtons.querySelector("button").onclick = () => {
            this.robot.goToPose({joint_head_tilt: 0, joint_head_pan: 0})
        }
        pantilt.setExtraContents(extraPanTiltButtons)
        const gripper = new VideoControl('nav');

        this.controls = {"overhead": overhead, "pantilt": pantilt, "gripper": gripper}

        for (const [streamName, info] of this.allRemoteStreams) {
            this.controls[streamName].addRemoteStream(info.stream)
        }

        Array(overhead, pantilt, gripper).forEach(control => {
            this.refs.get("video-control-container").appendChild(control)
        })


        let panTiltTrack = this.allRemoteStreams.get("pantilt").stream.getVideoTracks()[0]

        let ptAspectRatio = panTiltTrack.getSettings().aspectRatio || .52
        const threeCamera = new THREE.PerspectiveCamera(69, ptAspectRatio, 0.1, 1000);

        // FIXME: This is unreliable, and icons don't yet pop into the right place with the correct aspect ratio
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

        overhead.addOverlay(overheadNavOverlay, 'nav');
        overhead.addOverlay(overheadManipOverlay, 'manip');

        let gripperOverlay = new GripperOverlay(1);
        gripper.addOverlay(gripperOverlay, 'all');
        this.setMode('nav')

        // FIXME: Add back mousedown and continuous actions

        this.refs.get("video-control-container").addEventListener("click", event => {
            if (event.target.tagName !== "VIDEO-CONTROL") return;
            let composedTarget = event.composedPath()[0]
            if (composedTarget.tagName !== "path") return;
            let regionName = composedTarget.dataset.name
            if (regionName === "doNothing") return;
            // Treat region name as method name on robot
            this.robot[regionName](this.getVelocityModifier())
        })
    }

}

Component('operator-page', OperatorComponent, '/operator/css/operator.css')