import {VideoControl} from "./video_control.cmp.js";
import {Component} from '../../shared/base.cmp.js';
import {PageComponent} from '../../shared/page.cmp.js';
import {realsenseDimensions, wideVideoDimensions} from "../../shared/video_dimensions.js";
import {
    OverlaySVG,
    OverlayTHREE,
    makeRectangle,
    makeSquare,
    rectToPoly, THREEObject, ReachOverlay
} from "./overlay.js";
import {RemoteRobot} from "./remoterobot.js";
import {WebRTCConnection} from "../../shared/webrtcconnection.js";

// FIXME: Speed switch and mode switch don't work fully now. Each probably needs its own component
// FIXME: Settings page not reintegrated
const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div class="container-fluid px-sm-3 py-sm-3 d-flex justify-content-left">

    <div class="d-flex flex-fill justify-content-start mb-4 ">
    <div class="btn-group" role="group" aria-label="Select mode" data-ref="mode-toggle">
      <input type="radio" id="mode-navigation" class="btn-check" name="mode" autocomplete="off" value="nav" checked> 
      <label class="btn btn-secondary btn-sm" for="mode-navigation">Navigation</label>
  
      <input type="radio" id="mode-manipulation" class="btn-check" name="mode" value="manip" autocomplete="off"> 
      <label class="btn btn-secondary btn-sm" for="mode-manipulation">Manipulation</label>
    </div>
    </div>

    <div class="d-flex flex-fill justify-content-end mb-4 ">
    <div class="btn-group velocity-toggle" role="group" aria-label="Select velocity" data-ref="velocity-toggle">
        <input type="radio" name="velocity" id="speed-1" class="btn-check" value="verysmall" autocomplete="off">
        <label class="btn btn-sm btn-secondary" for="speed-1">Slowest</label>
        <input type="radio" name="velocity" id="speed-2" class="btn-check" value="small" autocomplete="off">
        <label class="btn btn-sm btn-secondary" for="speed-2">Slow</label>
        <input type="radio" name="velocity" id="speed-3" class="btn-check" value="medium" autocomplete="off" checked>
        <label class="btn btn-sm btn-secondary" for="speed-3">Medium</label>
        <input type="radio" name="velocity" id="speed-4" class="btn-check" value="large" autocomplete="off">
        <label class="btn btn-sm btn-secondary" for="speed-4">Fast</label>
        <input type="radio" name="velocity" id="speed-5" class="btn-check" value="verylarge" autocomplete="off">
        <label class="btn btn-sm btn-secondary" for="speed-5">Fastest</label>
         
    </div>
    </div>
</div>


<section class="container-fluid px-sm-3 py-sm-3 d-flex justify-content-left bg-danger" id="video-control-section">

    <div class="container-fluid d-flex flex-row justify-content-around" data-ref="video-control-container" id="video-control-container">
    </div>
    <div>
        <div class="d-flex flex-column justify-content-sm-center" id="robotPoseContainer"></div>

    </div>
</section>

<hr>

<div class="container-fluid d-flex flex-row">
    <div class="d-flex justify-content-start mb-4">
    <div class="input-group input-group-sm" >
        <select data-ref="select-robot" class="form-select" aria-label="Select robot">
            <option value="no robot connected">no robot connected</option>
        </select>
        <input id="hangup" type="button" class="btn btn-sm btn-warning" value="hang up" data-ref="hangup" disabled/>
    </div>
    </div>
 

    <div class="d-flex flex-fill justify-content-end mb-4">
        <div class="recordswitch">
            <button id="record" type="button" class="btn btn-sm btn-secondary">Start Recording</button>
            <button id="download" type="button" class="btn btn-sm btn-secondary" disabled>Download Recording
            </button>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-toggle="modal" data-target="#settings">
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
    allRemoteStreams = []
    currentMode = undefined

    constructor() {
        super(template);
        this.connection = new WebRTCConnection("OPERATOR", true, false, {
            onMessage: this.handleMessage.bind(this),
            onTrackAdded: this.handleRemoteTrackAdded.bind(this),
            onAvailableRobotsChanged: this.availableRobotsChanged.bind(this),
            onDataChannelOpen: this.configureRobot.bind(this)
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
            this.disconnectFromRobot()
        };
    }

    setMode(modeId, button) {
        this.refs.get("video-control-container").classList.remove(this.currentMode + "-mode")
        for (const control in this.controls) {
            this.controls[control].setMode(modeId)
        }
        this.refs.get("video-control-container").classList.add(modeId + "-mode")

        if (modeId === 'nav') {
            // FIXME: Fix follow gripper checkbox UI
            let checkbox = document.getElementById('cameraFollowGripperOn');
            if (checkbox && checkbox.checked)
                this.robot.changeGripperFollow(false);

            this.robot.setCameraView('nav', true);

        } else if (modeId === 'manip') {
            let checkbox = document.getElementById('cameraFollowGripperOn');
            if (checkbox && checkbox.checked)
                this.robot.changeGripperFollow(true);

            this.robot.setCameraView('manip', true);
        } else {
            console.error('Invalid mode: ' + modeId);
            console.trace();
        }
        this.currentMode = modeId
    }

    disconnectFromRobot() {
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
        this.allRemoteStreams.push({'track': track, 'stream': stream, 'streamName': streamName});

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

        this.refs.get("video-control-container").innerHTML = ""

        // FIXME: Make the SVGS appropriately responsive to actual video feed aspect ratio
        const w = 100;
        const h = 100;

        // FIXME: threejs overlays haven't been reintegrated. Register listeners on robot sensor model
        //   that feed values to these overlay layers
        const threeCamera = new THREE.PerspectiveCamera(69, w / h, 0.1, 1000);

        var ptNavOverlay = new OverlaySVG();
        var reachOverlayTHREE = new ReachOverlay(threeCamera);
        this.robot.sensors.listenToKeyChange("head", "transform", (transform) => {
            reachOverlayTHREE.updateTransform(transform)
        })


        this.robot.sensors.listenToKeyChange("lift", "effort", value => {
            // FIXME: Color lift up region
            return
            // adjust for the effort needed to hold the arm in place
            // against gravity
            var adjusted_value = value - 53.88;
            var armUpRegion1 = document.getElementById('manip_up_region');
            var armDownRegion1 = document.getElementById('manip_down_region');
            var redRegion1;
            var nothingRegion1;

            if (adjusted_value > 0.0) {
                redRegion1 = armUpRegion1;
                nothingRegion1 = armDownRegion1;
            } else {
                redRegion1 = armDownRegion1;
                nothingRegion1 = armUpRegion1;
            }
            // make the torque positive and multiply it by a factor to
            // make sure the video will always be visible even with
            var redOpacity = Math.abs(adjusted_value) * 0.005;

            if (redRegion1) {
                redRegion1.setAttribute('fill', 'red');
                redRegion1.setAttribute('fill-opacity', redOpacity);
            }

            if (nothingRegion1)
                nothingRegion1.setAttribute('fill-opacity', 0.0);
        })


        this.robot.sensors.listenToKeyChange("arm", "effort", value => {
            // FIXME: Set color of manipulation extension region
            return
            var redRegion1;
            var nothingRegion1;

            if (value > 0.0) {
                redRegion1 = armExtendRegion1;
                nothingRegion1 = armRetractRegion1;
            } else {
                redRegion1 = armRetractRegion1;
                nothingRegion1 = armExtendRegion1;
            }

            // make the torque positive and multiply it by a factor to
            // make sure the video will always be visible even with

            var redOpacity = Math.abs(value) * 0.005;

            if (redRegion1) {
                redRegion1.setAttribute('fill', 'red');
                redRegion1.setAttribute('fill-opacity', redOpacity);
            }

            if (nothingRegion1)
                nothingRegion1.setAttribute('fill-opacity', 0.0);

        })

        this.robot.sensors.listenToKeyChange("gripper", "effort", value => {
            // FIXME: color manip close region
            return
            var handCloseRegion = document.getElementById('manip_close_region');
            var handOpenRegion = document.getElementById('manip_open_region');
            if (handCloseRegion && handOpenRegion) {
                var redRegion;
                var nothingRegion;
                if (value > 0.0) {
                    redRegion = handOpenRegion;
                    nothingRegion = handCloseRegion;
                } else {
                    redRegion = handCloseRegion;
                    nothingRegion = handOpenRegion;
                }

                // make the torque positive and multiply it by a factor to
                // make sure the video will 	always be visible even with

                var redOpacity = Math.abs(value) * 0.015;
                if (redRegion) {
                    redRegion.setAttribute('fill', 'red');
                    redRegion.setAttribute('fill-opacity', redOpacity);
                }
                if (nothingRegion)
                    nothingRegion.setAttribute('fill-opacity', 0.0);
            }
        })

        this.robot.sensors.listenToKeyChange("wrist", "effort", value => {
            // FIXME: color yaw in out regions
            return
            var yawInRegion = document.getElementById('manip_in_region');
            var yawOutRegion = document.getElementById('manip_out_region');
            if (yawInRegion && yawOutRegion) {
                var redRegion;
                var nothingRegion;
                if (value > 0.0) {
                    redRegion = yawOutRegion;
                    nothingRegion = yawInRegion;
                } else {
                    redRegion = yawInRegion;
                    nothingRegion = yawOutRegion;
                }
                redRegion.setAttribute('fill', 'red');
                // make the torque positive and multiply it by a factor to
                // make sure the video will always be visible even with
                var redOpacity = Math.abs(value) * 0.015;
                redRegion.setAttribute('fill-opacity', redOpacity);
                nothingRegion.setAttribute('fill-opacity', 0.0);
            }

        })

        var ptManipOverlay = new OverlaySVG();

        var overheadNavOverlay = new OverlaySVG();
        var overheadManipOverlay = new OverlaySVG();

        var gripperOverlay = new OverlaySVG();
        var gripperManipOverlay = new OverlaySVG();


        const overhead = new VideoControl('nav', wideVideoDimensions.w, wideVideoDimensions.h);
        const pantilt = new VideoControl('nav', realsenseDimensions.h, realsenseDimensions.w, new Map([["left", {
            title: "look left",
            action: () => this.robot.lookLeft()
        }], ["right", {
            title: "look right",
            action: () => this.robot.lookRight()
        }],
            ["top", {
                title: "look up",
                action: () => this.robot.lookUp()
            }],
            ["bottom", {
                title: "look down",
                action: () => this.robot.lookDown()
            }]]));
        const gripper = new VideoControl('nav', wideVideoDimensions.w, wideVideoDimensions.h);

        this.controls = {"overhead": overhead, "pantilt": pantilt, "gripper": gripper}

        for (const item of this.allRemoteStreams) {
            this.controls[item.streamName].addRemoteStream(item.stream)
        }
        Array(overhead, pantilt, gripper).forEach(control => {
            this.refs.get("video-control-container").appendChild(control)
        })

        function icon(name) {
            return `/operator/images/${name}.svg`
        }

        var regionPoly;
        var cornerRectSize = 20;

        /////////////////////////
        // navigation
        /////////////////////////

        // Big rectangle at the borders of the video
        let bgRect = makeRectangle(0, 0, w, h);
        let smRect = makeSquare((w / 2.0) - (w / 20.0), (h * (3.0 / 4.0)) - (h / 20.0), w / 10.0, h / 10.0);
        let leftRect = makeSquare(0, h - cornerRectSize, cornerRectSize);
        let rightRect = makeSquare(w - cornerRectSize, h - cornerRectSize, cornerRectSize);

        ptNavOverlay.createRegion({label: 'do nothing', poly: rectToPoly(smRect)});
        ptNavOverlay.createRegion({
            label: 'move forward',
            poly: [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul],
            iconImage: icon("arrow_up"),
            clickHandler: () => this.robot.moveForward()
        });
        ptNavOverlay.createRegion({
            label: 'move backward',
            poly: [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll],
            iconImage: icon("arrow_down"),
            clickHandler: () => this.robot.moveBackward()
        });
        ptNavOverlay.createRegion({
            label: 'turn left',
            poly: [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul],
            iconImage: icon("turn_left"),
            clickHandler: () => this.robot.turnLeft()
        });
        ptNavOverlay.createRegion({
            label: 'turn right',
            poly: [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur],
            iconImage: icon("turn_right"),
            clickHandler: () => this.robot.turnRight()
        });
        ptNavOverlay.createRegion({
            label: 'turn 90 degrees CCW',
            poly: rectToPoly(leftRect),
            iconImage: icon("rotate_ccw"),
            clickHandler: () => this.robot.turnCCW()
        });
        ptNavOverlay.createRegion({
            label: 'turn 90 degrees CW',
            poly: rectToPoly(rightRect),
            iconImage: icon("rotate_cw"),
            clickHandler: () => this.robot.turnCW()
        });

        /////////////////////////
        // manipulation
        /////////////////////////

        bgRect = makeRectangle(0, h / 6.0, w, h - 2.0 * h / 6.0);
        // Small rectangle at the top of the middle of the video
        let tpRect = makeRectangle(w * (3.0 / 10.0), 2.0 * h / 6.0, w * (4.0 / 10.0), h / 6.0);
        // small rectangle at the bottom of the middle of the video
        let btRect = makeRectangle(w * (3.0 / 10.0), 3.0 * h / 6.0, w * (4.0 / 10.0), h / 6.0);

        leftRect = makeRectangle(0, 0, w / 2.0, h / 6.0);
        rightRect = makeRectangle(w / 2.0, 0, w / 2.0, h / 6.0);

        let leftRect2 = makeRectangle(0, 5.0 * h / 6.0, w / 2.0, h / 6.0);
        let rightRect2 = makeRectangle(w / 2.0, 5.0 * h / 6.0, w / 2.0, h / 6.0);

        ptManipOverlay.createRegion({
            label: 'lift arm',
            poly: rectToPoly(tpRect),
            iconImage: icon('arrow_up'),
            clickHandler: () => this.robot.liftUp()
        })
        ptManipOverlay.createRegion({
            label: 'lower arm',
            poly: rectToPoly(btRect),
            iconImage: icon('arrow_down'),
            clickHandler: () => this.robot.liftDown()
        });
        ptManipOverlay.createRegion({
            label: 'extend arm',
            poly: [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul],
            iconImage: icon('out_arrow'),
            clickHandler: () => this.robot.armExtend()
        });
        ptManipOverlay.createRegion({
            label: 'retract arm',
            poly: [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll],
            iconImage: icon('in_arrow'),
            clickHandler: () => this.robot.armRetract()
        });
        ptManipOverlay.createRegion({
            label: 'move forward',
            poly: [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll],
            iconImage: icon('arrow_left'),
            clickHandler: () => this.robot.moveForward()
        });
        ptManipOverlay.createRegion({
            label: 'move backward',
            poly: [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr],
            iconImage: icon('arrow_right'),
            clickHandler: () => this.robot.moveBackward()
        });
        ptManipOverlay.createRegion({
            label: 'turn hand in',
            poly: rectToPoly(leftRect),
            iconImage: icon('turn_left'),
            clickHandler: () => this.robot.wristIn()
        });
        ptManipOverlay.createRegion({
            label: 'turn hand out',
            poly: rectToPoly(rightRect),
            iconImage: icon('turn_right'),
            clickHandler: () => this.robot.wristOut()
        });
        ptManipOverlay.createRegion({
            label: 'open hand',
            poly: rectToPoly(leftRect2),
            iconImage: '/operator/images/gripper_close.svg',
            clickHandler: () => this.robot.gripperOpen()
        });
        ptManipOverlay.createRegion({
            label: 'close hand',
            poly: rectToPoly(rightRect2),
            iconImage: icon('gripper_open'),
            clickHandler: () => this.robot.gripperClose()
        });

        //////////////////////////////////////////////

        pantilt.addOverlay(reachOverlayTHREE, "all");
        pantilt.addOverlay(ptNavOverlay, 'nav');
        pantilt.addOverlay(ptManipOverlay, 'manip');

        //////////////////////////////////////////////

        // navigation

        // big rectangle at the borders of the video
        let camW = 100;
        let camH = 100;
        bgRect = makeRectangle(0, 0, camW, camH);
        let arm_region_width = camW / 6.0;
        let navRect = makeRectangle(arm_region_width, 0,
            camW - 2.0 * arm_region_width, camH);
        let mobile_base_width = camW / 10.0;
        let mobile_base_height = camH / 10.0;

        // small rectangle around the mobile base
        let baseRect = makeSquare((camW / 2.0) - (mobile_base_width / 2.0),
            (2.0 * camH / 3.0) - (mobile_base_height / 2.0),
            mobile_base_width, mobile_base_height);

        overheadNavOverlay.createRegion({label: 'do nothing', poly: rectToPoly(baseRect)});
        overheadNavOverlay.createRegion({
            label: 'move forward',
            poly: [navRect.ul, navRect.ur, baseRect.ur, baseRect.ul],
            iconImage: icon("arrow_up"),
            clickHandler: () => this.robot.moveForward()
        });
        overheadNavOverlay.createRegion({
            label: 'move back',
            poly: [navRect.ll, navRect.lr, baseRect.lr, baseRect.ll],
            iconImage: icon("arrow_down"),
            clickHandler: () => this.robot.moveBackward()
        });
        overheadNavOverlay.createRegion({
            label: 'turn left',
            poly: [navRect.ul, baseRect.ul, baseRect.ll, navRect.ll],
            iconImage: icon("turn_left"),
            clickHandler: () => this.robot.turnLeft()
        });
        overheadNavOverlay.createRegion({
            label: 'turn right',
            poly: [navRect.ur, baseRect.ur, baseRect.lr, navRect.lr],
            iconImage: icon("turn_right"),
            clickHandler: () => this.robot.turnRight()
        });
        overheadNavOverlay.createRegion({
            label: 'retract arm',
            poly: [bgRect.ul, navRect.ul, navRect.ll, bgRect.ll],
            iconImage: icon("arrow_left"),
            clickHandler: () => this.robot.armRetract()
        });
        overheadNavOverlay.createRegion({
            label: 'extend arm',
            poly: [navRect.ur, bgRect.ur, bgRect.lr, navRect.lr],
            iconImage: icon("arrow_right"),
            clickHandler: () => this.robot.armExtend()
        });

        var wrist_region_width = camW / 5.0;
        var lift_region_height = camH / 5.0;
        var handRect = makeRectangle(wrist_region_width, lift_region_height,
            camW - (2.0 * wrist_region_width),
            camH - (2.0 * lift_region_height));

        var fingertip_width = camW / 5.0;
        var fingertip_height = camH / 5.0;

        var fingertipRect = makeRectangle((camW / 2.0) - (fingertip_width / 2.0),
            (camH / 2.0) - (fingertip_height / 2.0),
            fingertip_width, fingertip_height);

        var liftUpRect = makeRectangle(0, 0,
            camW, lift_region_height);
        var liftDownRect = makeRectangle(0, camH - lift_region_height,
            camW, lift_region_height);

        var wristInRect = makeRectangle(0, lift_region_height,
            wrist_region_width, camH - (2.0 * lift_region_height));
        var wristOutRect = makeRectangle(camW - wrist_region_width, lift_region_height,
            wrist_region_width, camH - (2.0 * lift_region_height));

        gripperOverlay.createRegion({
            label: 'close hand',
            poly: rectToPoly(fingertipRect),
            iconImage: icon('gripper_close'),
            clickHandler: () => this.robot.gripperClose()
        });
        regionPoly = [wristInRect.ur, wristOutRect.ul, wristOutRect.ll, fingertipRect.lr,
            fingertipRect.ur, fingertipRect.ul, fingertipRect.ll, fingertipRect.lr,
            wristOutRect.ll, wristInRect.lr];
        gripperOverlay.createRegion({
            label: 'open hand',
            poly: regionPoly,
            iconImage: icon('gripper_open'),
            iconPosition: {x: 70, y: 50},
            clickHandler: () => this.robot.gripperOpen()
        });
        gripperOverlay.createRegion({
            label: 'turn wrist in',
            poly: rectToPoly(wristInRect),
            iconImage: icon('turn_left'),
            clickHandler: () => this.robot.wristIn()
        });
        gripperOverlay.createRegion({
            label: 'turn wrist out',
            poly: rectToPoly(wristOutRect),
            iconImage: icon('turn_right'),
            clickHandler: () => this.robot.wristOut()
        });
        gripperOverlay.createRegion({
            label: 'lift arm up',
            poly: rectToPoly(liftUpRect),
            iconImage: icon('arrow_up'),
            clickHandler: () => this.robot.liftUp()
        });
        gripperOverlay.createRegion({
            label: 'lower arm down',
            poly: rectToPoly(liftDownRect),
            iconImage: icon('arrow_down'),
            clickHandler: () => this.robot.liftDown()
        });


        // /////// MANIPULATION MODE NAVIGATION VIDEO ////////

        // big rectangle at the borders of the video
        bgRect = makeRectangle(0, 0, camW, camH);

        var turn_region_width = camW / 5.0;
        var arm_region_height = camH / 3.0;

        navRect = makeRectangle(turn_region_width, 0,
            camW - (2.0 * turn_region_width), camH);

        mobile_base_width = camW / 10.0;
        mobile_base_height = camH / 10.0;

        // small rectangle around the mobile base
        baseRect = makeSquare((camW / 2.0) - (mobile_base_width / 2.0),
            (2.0 * (camH / 3.0)) - (mobile_base_height / 2.0),
            mobile_base_width, mobile_base_height);

        var turnLeftRect = makeRectangle(0, 0, turn_region_width, camH);
        var turnRightRect = makeRectangle(camW - turn_region_width, 0, turn_region_width, camH);

        var armExtendRect = makeRectangle(turn_region_width, 0,
            camW - (2.0 * turn_region_width), arm_region_height);
        var armRetractRect = makeRectangle(turn_region_width, camH - arm_region_height,
            camW - (2.0 * turn_region_width), arm_region_height);

        var base_region_width = (camW / 2.0) - turn_region_width;

        var baseForwardRect = makeRectangle(turn_region_width, arm_region_height,
            base_region_width, camH - (2.0 * arm_region_height));
        var baseBackwardRect = makeRectangle(turn_region_width + base_region_width, arm_region_height,
            base_region_width, camH - (2.0 * arm_region_height));

        overheadManipOverlay.createRegion({
            label: 'turn wrist in',
            poly: rectToPoly(turnLeftRect),
            iconImage: icon('turn_left'),
            clickHandler: () => this.robot.wristIn()
        });
        overheadManipOverlay.createRegion({
            label: 'turn wrist out',
            poly: rectToPoly(turnRightRect),
            iconImage: icon('turn_right'),
            clickHandler: () => this.robot.wristOut()
        });
        overheadManipOverlay.createRegion({
            label: 'move base forward',
            poly: rectToPoly(baseForwardRect),
            iconImage: icon('arrow_left'),
            clickHandler: () => this.robot.moveForward()
        });
        overheadManipOverlay.createRegion({
            label: 'move base backward',
            poly: rectToPoly(baseBackwardRect),
            iconImage: icon('arrow_right'),
            clickHandler: () => this.robot.moveBackward()
        });
        overheadManipOverlay.createRegion({
            label: 'retract arm',
            poly: rectToPoly(armRetractRect),
            iconImage: icon('in_arrow'),
            clickHandler: () => this.robot.armRetract()
        });
        overheadManipOverlay.createRegion({
            label: 'extend arm',
            poly: rectToPoly(armExtendRect),
            iconImage: icon('out_arrow'),
            clickHandler: () => this.robot.armExtend()
        });

        overhead.addOverlay(overheadNavOverlay, 'nav');
        overhead.addOverlay(overheadManipOverlay, 'manip');

        gripper.addOverlay(gripperOverlay, 'all');
        this.setMode('nav')
    }

}

Component('operator-page', OperatorComponent, '/operator/css/operator.css')