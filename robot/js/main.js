import {getJointEffort, getJointValue, Robot} from "./robot.js";
import {WebRTCConnection} from "../../shared/webrtcconnection.js";
import {TransformedVideoStream} from "./camerastream.cmp.js";
import {realsenseDimensions, wideVideoDimensions} from "../../shared/video_dimensions.js";

let cameraInfo
let audioInId;
let audioOutId;
let record = false
let connection
const robot = new Robot({
    jointStateCallback: forwardJointStates,
    tfCallback: forwardTF,
    connectedCallback: connectedToROS
})

let overheadStream, gripperStream, pantiltStream, audioStream;

function connectedToROS() {
    navigator.mediaDevices.enumerateDevices().then(findDevices).catch(handleError).then(() => {
        pantiltStream = new TransformedVideoStream({
            w: realsenseDimensions.camW,
            h: realsenseDimensions.camH
        }, null, true);
        robot.subscribeToVideo('/camera/color/image_raw/compressed', pantiltStream.imageCallback.bind(pantiltStream))

        overheadStream = new TransformedVideoStream({w: wideVideoDimensions.camW, h: wideVideoDimensions.camH});
        robot.subscribeToVideo('/navigation_camera/image_raw/compressed', overheadStream.imageCallback.bind(overheadStream))

        gripperStream = new TransformedVideoStream({
            w: wideVideoDimensions.camW,
            h: wideVideoDimensions.camH
        }, wideVideoDimensions.gripperCropDim);
        robot.subscribeToVideo('/gripper_camera/image_raw/compressed', gripperStream.imageCallback.bind(gripperStream))
        pantiltStream.start();
        overheadStream.start();
        gripperStream.start();

        const displayContainer = document.getElementById("video-display")
        displayContainer.appendChild(pantiltStream)
        displayContainer.appendChild(overheadStream)
        displayContainer.appendChild(gripperStream)

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
                audio: {deviceId: {exact: audioInId}},
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
        connection = new WebRTCConnection('ROBOT', false, record, {
            onConnectionStart: handleSessionStart,
            onMessage: handleMessage
        })
    })
}

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


function forwardTF(message) {
    if (!connection) return;
    let toSend = {
        type: 'sensor',
        subtype: 'head',
        name: 'transform',
        value: message
    }
    connection.sendData(toSend)
}

function forwardJointStates(jointState) {
    if (!connection) return;
    let messages = []
    // send wrist joint effort
    let effort = getJointEffort(jointState, 'joint_wrist_yaw');
    messages.push({'type': 'sensor', 'subtype': 'wrist', 'name': 'yaw_torque', 'value': effort})

    effort = getJointEffort(jointState, 'joint_gripper_finger_left');
    messages.push({'type': 'sensor', 'subtype': 'gripper', 'name': 'gripper_torque', 'value': effort})

    effort = getJointEffort(jointState, 'joint_lift');
    messages.push({'type': 'sensor', 'subtype': 'lift', 'name': 'effort', 'value': effort})

    effort = getJointEffort(jointState, 'joint_arm_l0');
    messages.push({'type': 'sensor', 'subtype': 'arm', 'name': 'effort', 'value': effort})
    connection.sendData(messages);
}

function handleError(error) {
    console.error('navigator.getUserMedia error: ', error);
    console.trace();
}


function handleSessionStart() {
    connection.openDataChannel()

    console.log('adding local media stream to peer connection');

    let info = {};

    let stream = pantiltStream.editedVideoStream;
    stream.getTracks().forEach(t => connection.addTrack(t, stream, "pantilt"));

    stream = overheadStream.editedVideoStream;
    stream.getTracks().forEach(t => connection.addTrack(t, stream, "overhead"));

    stream = gripperStream.editedVideoStream;
    stream.getTracks().forEach(t => connection.addTrack(t, stream, "gripper"));

    // The real robot should have a mic, but we'll allow the call to proceed
    // even if no audio is present
    if (audioStream) {
        connection.pc.addTrack(audioStream)
    } else {
        console.warn("No audio stream")
    }
}

function handleMessage(message) {
    switch (message.type) {
        case "request":
            handleRequest(message)
            break;
        case "command":
            if ("type" in message && message.type === "command") {
                robot.executeCommand(message.subtype, message.name, message.modifier)
            } else {
                console.error("Malformed command", message)
            }
            break;
        default:
            console.error("Unknown message type received", message.type)
    }
}


// FIXME: Determine if this requestresponse mechanism is still needed anywhere.
function handleRequest(request) {
    switch (request.requestType) {
        case "jointState":
            let processedJointPositions = {};
            allJoints.forEach((key, i) => {
                processedJointPositions[key] = getJointValue(jointState, key)
            });
            connection.sendData({
                type: "response",
                id: request.id,
                responseHandler: request.responseHandler,
                responseType: request.requestType,
                data: processedJointPositions
            });
            break;
        case "streamCameras":
            connection.sendData({
                type: "response",
                id: request.id,
                responseHandler: request.responseHandler,
                responseType: request.requestType,
                data: cameraInfo
            });
            break;
    }
}
