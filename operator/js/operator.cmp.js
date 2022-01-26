import {VideoControl} from "./video_control.cmp.js";
import {Component} from '../../shared/base.cmp.js';
import {PageComponent} from '../../shared/page.cmp.js';
import {realsenseDimensions, wideVideoDimensions} from "../../shared/video_dimensions.js";
import {
    THREEManager,
    OverlaySVG,
    OverlayTHREE,
    makeRectangle,
    makeSquare,
    rectToPoly, THREEObject
} from "./overlay.js";
import {RemoteRobot} from "./remoterobot.js";
import {WebRTCConnection} from "../../shared/webrtcconnection.js";

// FIXME: Speed switch and mode switch don't work fully now. Each probably needs its own component
// FIXME: Settings page not reintegrated
const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div class="container-fluid px-sm-3 py-sm-3 d-flex justify-content-left">

    <div data-ref="mode-selector">
        <div class="btn-group" role="group" aria-label="Basic example">
            <button id="modeButtonNav" type="button"
                    class="btn btn-sm btn-secondary btn-info" data-mode="nav">Navigation
            </button>
            <button id="modeButtonManip" type="button"
                    class="btn btn-sm btn-secondary" data-mode="manip">Manipulation
            </button>
        </div>
    </div>

    <div class="d-flex flex-fill justify-content-end mb-4">
        <div class="switch-2">
            <input type="radio" class="switch-input" name="v-switch" value="verysmall" id="verysmall">
                <label htmlFor="verysmall" class="switch-label-sm switch-label-0 switch-speed-1">Slowest</label>

                <input type="radio" class="switch-input" name="v-switch" value="small" id="small">
                    <label htmlFor="small" class="switch-label-sm switch-label-1 switch-speed-2">Slow</label>

                <input type="radio" class="switch-input" name="v-switch" value="medium" id="medium" checked>
                    <label htmlFor="medium" class="switch-label-sm switch-label-2 switch-speed-3">Medium</label>

                <input type="radio" class="switch-input" name="v-switch" value="large" id="large">
                    <label htmlFor="large" class="switch-label-sm switch-label-3 switch-speed-4">Fast</label>

                <input type="radio" class="switch-input" name="v-switch" value="verylarge"
                       id="verylarge">
                    <label htmlFor="verylarge" class="switch-label-sm switch-label-4 switch-speed-5">Fastest</label>
                    <span class="switch-selection switch-selection-sm"></span>
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

    <div class="d-flex flex-row">
        <div class="">
            <div class="select-robot">
                <label htmlFor="robotToControl">Robot: </label><select data-ref="robotToControl">
                <option value="no robot connected">no robot connected</option>
            </select>
                <input id="hangup" type="button" class="btn btn-sm btn-warning" value="hang up" data-ref="hangup"/>
            </div>
        </div>

        <div class="d-flex flex-fill justify-content-end mb-4">
            <div class="mr-4">
                <img id="googleSignInButton" src="../shared/assets/web/2x/btn_google_signin_light_normal_web@2x.png"
                     onClick="db.signInWithGoogle()"/>
                <label id="googleSignInInfo" htmlFor="googleSignInButton"></label>
            </div>
            <!-- Button to open the settings -->
            <div class="recordswitch">
                <button id="record" type="button" class="btn btn-sm btn-secondary">Start Recording</button>
                <button id="download" type="button" class="btn btn-sm btn-secondary" disabled>Download Recording
                </button>
            </div>
            <button type="button" class="btn btn-primary btn-sm ml-4" data-toggle="modal" data-target="#settings">
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
            this.refs.get("robotToControl").selectedIndex = 0
        })

        this.refs.get("robotToControl").onchange = () => {
            const robot = this.refs.get("robotToControl").value;
            if (robot === 'no robot connected') {
                console.log('no robot selected, hanging up');
                this.disconnectFromRobot()
            } else {
                this.connection.connectToRobot(robot)
            }
        };
        this.refs.get("mode-selector").querySelectorAll("button").forEach(button => {
            button.addEventListener("click", () => {
                this.setMode(button.dataset.mode)
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
        const robotSelection = this.refs.get("robotToControl")
        // remove any old options, leaving the "no robot" option at the front
        for (let i = 1; i < this.refs.get("robotToControl").options.length; i++) {
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
        const threeManager = new THREEManager(new THREE.PerspectiveCamera(69, w / h, 0.1, 1000), w, h);

        var ptNavOverlay = new OverlaySVG();
        var reachOverlayTHREE = new OverlayTHREE(threeManager);
        var ptManipOverlay = new OverlaySVG();

        var overheadNavOverlay = new OverlaySVG();
        var overheadManipOverlay = new OverlaySVG();

        var gripperNavOverlay = new OverlaySVG();
        var gripperManipOverlay = new OverlaySVG();


        const overhead = new VideoControl('nav', wideVideoDimensions.w, wideVideoDimensions.h);
        const pantilt = new VideoControl('nav', realsenseDimensions.h, realsenseDimensions.w, new Map([["left", {
            label: "look left",
            action: null
        }]]));
        const gripper = new VideoControl('nav', wideVideoDimensions.w, wideVideoDimensions.h);

        this.controls = {"overhead": overhead, "pantilt": pantilt, "gripper": gripper}

        for (const item of this.allRemoteStreams) {
            this.controls[item.streamName].addRemoteStream(item.stream)
        }
        Array(overhead, pantilt, gripper).forEach(control => {
            this.refs.get("video-control-container").appendChild(control)
        })

        var regionPoly;
        var cornerRectSize = 40;

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
            iconImage: icon("up_arrow_medium"),
            clickHandler: () => this.robot.moveForward()
        });
        ptNavOverlay.createRegion({
            label: 'move backward',
            poly: [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll],
            iconImage: icon("down_arrow_medium"),
            clickHandler: () => this.robot.moveBackward()
        });
        ptNavOverlay.createRegion({
            label: 'turn left',
            poly: [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul],
            iconImage: icon("left_turn_medium"),
            clickHandler: () => this.robot.turnLeft()
        });
        ptNavOverlay.createRegion({
            label: 'turn right',
            poly: [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur],
            iconImage: icon("right_turn_medium"),
            clickHandler: () => this.robot.turnRight()
        });
        ptNavOverlay.createRegion({
            label: 'turn 90 degrees CW',
            poly: rectToPoly(leftRect),
            iconImage: icon("rotate_cw"),
            clickHandler: () => this.robot.turnCW()
        });
        ptNavOverlay.createRegion({
            label: 'turn 90 degrees CCW',
            poly: rectToPoly(rightRect),
            iconImage: icon("rotate_ccw"),
            clickHandler: () => this.robot.turnCCW()
        });

        reachOverlayTHREE.addItem(new THREEObject(
            'reach_visualization_circle',
            new THREE.CircleGeometry(0.52, 32), // The arm has a 52 centimeter reach (source: https://hello-robot.com/product#:~:text=range%20of%20motion%3A%2052cm)
            new THREE.MeshBasicMaterial({color: 'rgb(246, 179, 107)', transparent: true, opacity: 0.25}),
        ));
        var outlineEffect = new POSTPROCESSING.OutlineEffect(
            reachOverlayTHREE.scene,
            reachOverlayTHREE.threeManager.camera,
            {visibleEdgeColor: 0xff9900});
        var outlineEffectPass = new POSTPROCESSING.EffectPass(
            reachOverlayTHREE.threeManager.camera,
            outlineEffect
        );
        outlineEffectPass.renderToScreen = true;
        outlineEffect.selectObject(reachOverlayTHREE.objs.reach_visualization_circle.mesh);
        reachOverlayTHREE.addRenderPass(outlineEffectPass);

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

        function icon(name) {
            return `/operator/images/${name}.png`
        }

        ptManipOverlay.createRegion({
            label: 'lift arm',
            poly: rectToPoly(tpRect),
            iconImage: icon('up_arrow_medium'),
            clickHandler: () => this.robot.liftUp()
        })
        ptManipOverlay.createRegion({
            label: 'lower arm',
            poly: rectToPoly(btRect),
            iconImage: icon('down_arrow_medium'),
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
            iconImage: icon('left_arrow_medium'),
            clickHandler: () => this.robot.moveForward()
        });
        ptManipOverlay.createRegion({
            label: 'move backward',
            poly: [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr],
            iconImage: icon('right_arrow_medium'),
            clickHandler: () => this.robot.moveBackward()
        });
        ptManipOverlay.createRegion({
            label: 'turn hand in',
            poly: rectToPoly(leftRect),
            iconImage: icon('left_turn_medium'),
            clickHandler: () => this.robot.wristIn()
        });
        ptManipOverlay.createRegion({
            label: 'turn hand out',
            poly: rectToPoly(rightRect),
            iconImage: icon('right_turn_medium'),
            clickHandler: () => this.robot.wristOut()
        });
        ptManipOverlay.createRegion({
            label: 'open hand',
            poly: rectToPoly(leftRect2),
            iconImage: icon('gripper_close_medium'),
            clickHandler: () => this.robot.gripperOpen()
        });
        ptManipOverlay.createRegion({
            label: 'close hand',
            poly: rectToPoly(rightRect2),
            iconImage: icon('gripper_open_medium'),
            clickHandler: () => this.robot.gripperClose()
        });

        //////////////////////////////////////////////

        pantilt.addOverlay(reachOverlayTHREE, "threejs");
        pantilt.addOverlay(ptNavOverlay, 'nav');
        pantilt.addOverlay(ptManipOverlay, 'manip');
        pantilt.setActive(true);

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
            iconImage: icon("up_arrow_medium"),
            clickHandler: () => this.robot.moveForward()
        });
        overheadNavOverlay.createRegion({
            label: 'move back',
            poly: [navRect.ll, navRect.lr, baseRect.lr, baseRect.ll],
            iconImage: icon("down_arrow_medium"),
            clickHandler: () => this.robot.moveBackward()
        });
        overheadNavOverlay.createRegion({
            label: 'turn left',
            poly: [navRect.ul, baseRect.ul, baseRect.ll, navRect.ll],
            iconImage: icon("left_turn_medium"),
            clickHandler: () => this.robot.turnLeft()
        });
        overheadNavOverlay.createRegion({
            label: 'turn right',
            poly: [navRect.ur, baseRect.ur, baseRect.lr, navRect.lr],
            iconImage: icon("right_turn_medium"),
            clickHandler: () => this.robot.turnRight()
        });
        overheadNavOverlay.createRegion({
            label: 'retract arm',
            poly: [bgRect.ul, navRect.ul, navRect.ll, bgRect.ll],
            iconImage: icon("left_arrow_medium"),
            clickHandler: () => this.robot.armRetract()
        });
        overheadNavOverlay.createRegion({
            label: 'extend arm',
            poly: [navRect.ur, bgRect.ur, bgRect.lr, navRect.lr],
            iconImage: icon("right_arrow_medium"),
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

        gripperNavOverlay.createRegion({
            label: 'close hand',
            poly: rectToPoly(fingertipRect),
            iconImage: icon('gripper_close_medium'),
            clickHandler: () => this.robot.gripperClose()
        });
        regionPoly = [wristInRect.ur, wristOutRect.ul, wristOutRect.ll, fingertipRect.lr,
            fingertipRect.ur, fingertipRect.ul, fingertipRect.ll, fingertipRect.lr,
            wristOutRect.ll, wristInRect.lr];
        // FIXME: Concave region has wrong icon placement
        gripperNavOverlay.createRegion({
            label: 'open hand',
            poly: regionPoly,
            iconImage: icon('gripper_open_medium'),
            clickHandler: () => this.robot.gripperOpen()
        });
        gripperNavOverlay.createRegion({
            label: 'turn wrist in',
            poly: rectToPoly(wristInRect),
            iconImage: icon('left_turn_medium'),
            clickHandler: () => this.robot.wristIn()
        });
        gripperNavOverlay.createRegion({
            label: 'turn wrist out',
            poly: rectToPoly(wristOutRect),
            iconImage: icon('right_turn_medium'),
            clickHandler: () => this.robot.wristOut()
        });
        gripperNavOverlay.createRegion({
            label: 'lift arm up',
            poly: rectToPoly(liftUpRect),
            iconImage: icon('up_arrow_medium'),
            clickHandler: () => this.robot.liftUp()
        });
        gripperNavOverlay.createRegion({
            label: 'lower arm down',
            poly: rectToPoly(liftDownRect),
            iconImage: icon('down_arrow_medium'),
            clickHandler: () => this.robot.liftDown()
        });

        gripperManipOverlay.createRegion({
            label: 'close hand',
            poly: rectToPoly(fingertipRect),
            iconImage: icon('gripper_close_medium'),
            clickHandler: () => this.robot.gripperClose()
        });


        regionPoly = [wristInRect.ur, wristOutRect.ul, wristOutRect.ll, fingertipRect.lr,
            fingertipRect.ur, fingertipRect.ul, fingertipRect.ll, fingertipRect.lr,
            wristOutRect.ll, wristInRect.lr];

        // FIXME: Concave region has wrong icon placement
        gripperManipOverlay.createRegion({
            label: 'open hand',
            poly: regionPoly,
            iconImage: icon('gripper_open_medium'),
            clickHandler: () => this.robot.gripperOpen()
        });
        gripperManipOverlay.createRegion({
            label: 'turn wrist in',
            poly: rectToPoly(wristInRect),
            iconImage: icon('left_turn_medium'),
            clickHandler: () => this.robot.wristIn()
        });
        gripperManipOverlay.createRegion({
            label: 'turn wrist out',
            poly: rectToPoly(wristOutRect),
            iconImage: icon('right_turn_medium'),
            clickHandler: () => this.robot.wristOut()
        });
        gripperManipOverlay.createRegion({
            label: 'lift arm up',
            poly: rectToPoly(liftUpRect),
            iconImage: icon('up_arrow_medium'),
            clickHandler: () => this.robot.liftUp()
        });
        gripperManipOverlay.createRegion({
            label: 'lower arm down',
            poly: rectToPoly(liftDownRect),
            iconImage: icon('down_arrow_medium'),
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
            iconImage: icon('left_turn_medium'),
            clickHandler: () => this.robot.wristIn()
        });
        overheadManipOverlay.createRegion({
            label: 'turn wrist out',
            poly: rectToPoly(turnRightRect),
            iconImage: icon('right_turn_medium'),
            clickHandler: () => this.robot.wristOut()
        });
        overheadManipOverlay.createRegion({
            label: 'move base forward',
            poly: rectToPoly(baseForwardRect),
            iconImage: icon('left_arrow_medium'),
            clickHandler: () => this.robot.moveForward()
        });
        overheadManipOverlay.createRegion({
            label: 'move base backward',
            poly: rectToPoly(baseBackwardRect),
            iconImage: icon('right_arrow_medium'),
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

        gripper.addOverlay(gripperNavOverlay, 'nav');
        gripper.addOverlay(gripperManipOverlay, 'manip');
        overhead.setActive(true);
        gripper.setActive(true);
        this.setMode('nav')
    }

}

Component('operator-page', OperatorComponent, '/operator/css/operator.css')