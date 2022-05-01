import { insertCSS, JointStateMessage, RobotPose } from "shared/util";

import * as style from "../../../style.css";
import * as bootstrap from "bootstrap/dist/css/bootstrap.min.css"
import * as robotCss from "../css/robot.css"

insertCSS(style);
insertCSS(bootstrap)
insertCSS(robotCss)


import { ALL_JOINTS, getJointEffort, inJointLimits, getJointValue, Robot } from "./robot";
import { WebRTCConnection } from "shared/webrtcconnection";
import { TransformedVideoStream } from "./videostream.cmp";
import { MapROS } from "./mapros.cmp";
import { gripperCrop, overheadNavCrop, realsenseDimensions, wideVideoDimensions } from "shared/video_dimensions";
import { Transform } from "roslib";
import { ROSJointState, ValidJoints, GoalMessage, WebRTCMessage, SensorMessage } from "shared/util";
import { mapView } from "shared/requestresponse";

let audioInId;
let audioOutId;
let connection: WebRTCConnection;
const robot = new Robot(
    forwardJointStates,
    forwardTF,
    forwardGoalState,
);

let overheadStream: TransformedVideoStream, gripperStream: TransformedVideoStream, pantiltStream: TransformedVideoStream, audioStream: TransformedVideoStream;
let mapROS: MapROS;

robot.connect().then(() => {
    return navigator.mediaDevices.enumerateDevices()
}).then(findDevices).then(() => {
    pantiltStream = new TransformedVideoStream(realsenseDimensions, null, true);
    robot.subscribeToVideo('/camera/color/image_raw/compressed', pantiltStream.imageCallback.bind(pantiltStream))

    overheadStream = new TransformedVideoStream(wideVideoDimensions, overheadNavCrop, true);
    robot.subscribeToVideo('/navigation_camera/image_raw/compressed', overheadStream.imageCallback.bind(overheadStream))

    gripperStream = new TransformedVideoStream(wideVideoDimensions, gripperCrop);
    robot.subscribeToVideo('/gripper_camera/image_raw/compressed', gripperStream.imageCallback.bind(gripperStream))
    pantiltStream.start();
    overheadStream.start();
    gripperStream.start();

    const displayContainer = document.getElementById("video-display")!
    displayContainer.appendChild(pantiltStream)
    displayContainer.appendChild(overheadStream)
    displayContainer.appendChild(gripperStream)

    mapROS = new MapROS();
    displayContainer.appendChild(mapROS);
    mapROS.init(robot.ros);

    // Audio stuff
    if (audioOutId) {
        // NOTE(nickswalker12-1-21): Setting the audio output is failing consistently for me. Disabling
        // until I can debug
        //changeAudioDestination(pantiltStream.displayElement);
    } else {
        console.log('no audio output found or selected');
    }

    if (audioInId) {
        let constraints = {
            audio: { deviceId: { exact: audioInId } },
            video: false
        };
        console.log('attempting to acquire audio input stream');
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            console.log('setting up audioStream for the microphone');
            audioStream = stream.getAudioTracks()[0]; // get audio track from robot microphone
        }).catch(handleError);
    } else {
        console.warn('the robot audio input was not found!');
    }
    connection = new WebRTCConnection('ROBOT', false, {
        onConnectionStart: handleSessionStart,
        onMessage: handleMessage
    })
    connection.registerRequestResponder("jointState", async () => {
        let processedJointPositions: {[key in ValidJoints]?: number} = {};
        ALL_JOINTS.forEach((key, _) => {
            if (robot.jointState) {
                processedJointPositions[key] = getJointValue(robot.jointState, key)
            }
        });
        return processedJointPositions
    });
    connection.registerRequestResponder("inJointLimits", async () => {
        let processedJointLimits = {};
        Object.keys(JOINT_LIMITS).forEach((key, i) => {
            processedJointLimits[key] = inJointLimits(robot.jointState, key)
        });
        return processedJointLimits
    });
    connection.registerRequestResponder('mapView', async () => {
        const mapData = await mapROS.getMap();
        const mv: mapView = {
            mapData: mapData!,
            mapWidth: mapROS.width!,
            mapHeight: mapROS.height!,
            mapResolution: mapROS.resolution!,
            mapOrigin: mapROS.origin!,
        };
        console.log(mv);
        return mv;
    });
}).catch(handleError)


function findDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    let i = 0;
    for (let d of deviceInfos) {
        console.log('device ' + i, d);
        i++;

        // Chrome helpfully has a default device of each type. For now, we'll just use
        // the default.
        if (d.label !== "Default") {
            continue;
        }
        // javascript switch uses === comparison
        switch (d.kind) {
            case 'audioinput':
                audioInId = d.deviceId;
                console.log('using this device for robot audio input');
                break;
            case 'audiooutput':
                audioOutId = d.deviceId;
                console.log('using this device for robot audio output');
                break;
            default:
                console.log(`ignoring unrecognized kind of device: ${d.kind} (${d.label})`, d);
        }
    }
}

// Attach audio output device to video element using device/sink ID.

function changeAudioDestination(element) {
    var audioDestination = audioOutId;
    if (typeof element.sinkId !== 'undefined') {
        element.setSinkId(audioDestination)
            .then(function () {
                console.log('Success, audio output device attached: ' + audioDestination);
            })
            .catch(function (error) {
                var errorMessage = error;
                if (error.name === 'SecurityError') {
                    errorMessage = 'You need to use HTTPS for selecting audio output ' +
                        'device: ' + error;
                }
                console.error(errorMessage);
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}


function forwardTF(frame: string, transform: Transform) {
    if (!connection) return;

    let subtype: string;
    if (frame === "link_gripper_finger_left") {
        subtype = "gripper";
    } else if (frame === "camera_color_frame") {
        subtype = "head";
    } else if (frame === "base_frame") {
        subtype = "base";
    } else {
        return;
    }
    let toSend: SensorMessage = {
        type: 'sensor',
        name: 'transform',
        subtype: subtype,
        value: transform
    };
    connection.sendData(toSend);
}

function forwardJointStates(jointState: ROSJointState) {
    if (!connection) return;

    let effort_messages: SensorMessage[] = []
    // send wrist joint effort
    let effort = getJointEffort(jointState, 'joint_wrist_yaw');
    effort_messages.push({ 'type': 'sensor', 'subtype': 'wrist', 'name': 'effort', 'value': effort })

    effort = getJointEffort(jointState, 'joint_gripper_finger_left');
    effort_messages.push({ 'type': 'sensor', 'subtype': 'gripper', 'name': 'effort', 'value': effort })

    effort = getJointEffort(jointState, 'joint_lift');
    effort_messages.push({ 'type': 'sensor', 'subtype': 'lift', 'name': 'effort', 'value': effort })

    effort = getJointEffort(jointState, 'wrist_extension');
    effort_messages.push({ 'type': 'sensor', 'subtype': 'arm', 'name': 'effort', 'value': effort })

    let inLimits = inJointLimits(jointState, 'joint_lift')
    effort_messages.push({ 'type': 'sensor', 'subtype': 'lift', 'name': 'inJointLimits', 'value': inLimits })

    inLimits = inJointLimits(jointState, 'wrist_extension')
    effort_messages.push({ 'type': 'sensor', 'subtype': 'arm', 'name': 'inJointLimits', 'value': inLimits })

    inLimits = inJointLimits(jointState, 'joint_wrist_yaw')
    effort_messages.push({ 'type': 'sensor', 'subtype': 'wrist', 'name': 'inJointLimits', 'value': inLimits })

    inLimits = getJointEffort(jointState, 'joint_gripper_finger_left');
    effort_messages.push({ 'type': 'sensor', 'subtype': 'gripper', 'name': 'inJointLimits', 'value': inLimits })

    connection.sendData(effort_messages);

    let values: RobotPose = {}
    jointState.name.forEach(name => {
        values[name!] = getJointValue(jointState, name!);
    })

    connection.sendData({
        type: 'jointState',
        jointState: values
    });
}

function forwardGoalState(goal: GoalMessage) {
    if (!connection) return;

    connection.sendData(goal);
}

function handleError(error) {
    console.error(error);
    console.trace();
}

function handleSessionStart() {
    connection.openDataChannels()

    console.log('adding local media stream to peer connection');

    let stream = pantiltStream.outputVideoStream!;
    stream.getTracks().forEach(t => connection.addTrack(t, stream, "pantilt"));

    stream = overheadStream.outputVideoStream!;
    stream.getTracks().forEach(t => connection.addTrack(t, stream, "overhead"));

    stream = gripperStream.outputVideoStream!;
    stream.getTracks().forEach(t => connection.addTrack(t, stream, "gripper"));

    // The real robot should have a mic, but we'll allow the call to proceed
    // even if no audio is present
    if (audioStream) {
        connection.pc.addTrack(audioStream)
    } else {
        console.warn("No audio stream")
    }
}

function handleMessage(message: WebRTCMessage) {
    if (!("type" in message)) {
        console.error("Malformed message:", message)
        return
    }
    console.log(message)
    switch (message.type) {
        case "command":
            robot.executeCommand(message.subtype, message.name, message.modifier)
            break
        case "configure":
            if (message.subtype === "head") {
                if (message.name === "overhead_camera") {
                    overheadStream.crop = message.crop;
                    overheadStream.rotate = message.rotate;
                    return;
                } else if (message.name === "pantilt_camera") {
                    pantiltStream.crop = message.crop
                    pantiltStream.rotate = message.rotate
                    return;
                }
            } else if (message.subtype === "gripper") {
                gripperStream.crop = message.crop;
                gripperStream.rotate = message.rotate;
                return;
            }
            throw new Error("Can't handle configuration message", message)
        case "incrementalMove":
            robot.executeIncrementalMove(message.jointName, message.increment)
            break
        case "velocityMove":
            robot.executeVelocityMove(message.jointName, message.velocity)
            break
        case "affirm":
            robot.affirmExecution()
            break
        case "stop":
            robot.stopExecution()
            break
        case "navGoal":
            robot.executeNavGoal(message);
            break;
        case "poseGoal":
            robot.executePoseGoal(message);
            break;
        default:
            console.error("Unknown message type received", message.type)
    }
}