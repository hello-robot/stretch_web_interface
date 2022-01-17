'use strict';

let cameraInfo
var socket = io.connect();
setupSocketIO(socket, false, handleSessionStart);
pc.ontrack = handleRemoteTrackAdded;

function handleSessionStart() {
    dataConstraint = null;
    dataChannel = pc.createDataChannel('DataChannel', dataConstraint);
    console.log('Creating data channel.');
    dataChannel.onmessage = onReceiveMessageCallback;
    function runOnOpenDataChannel() {
        sendTfs();
    }
    dataChannel.onopen = runOnOpenDataChannel;
    //dataChannel.onclose = runOnOpenDataChannel;
    // Adding tracks is going to trigger renegotiation
    addTracksToPeerConnection();
}

function addTracksToPeerConnection() {
    if (pantiltStream.editedVideoStream === undefined) {
        console.warn('Video tracks have not been started')
        return;
    }
    console.log('adding local media stream to peer connection');

    let info = {};

    let stream = pantiltStream.editedVideoStream;
    stream.getTracks().forEach(t => {pc.addTrack(t, stream); info[stream.id] = "pantiltStream";});

    stream = overheadStream.editedVideoStream;
    stream.getTracks().forEach(t => {pc.addTrack(t, stream); info[stream.id] = "overheadStream";});

    stream = gripperStream.editedVideoStream;
    stream.getTracks().forEach(t => {pc.addTrack(t, stream); info[stream.id] = "gripperStream";});

    // The real robot should have a mic, but we'll allow the call to proceed
    // even if no audio is present
    if (audioStream) {
        pc.addTrack(audioStream)
    } else {
        console.warn("No audio stream")
    }
    cameraInfo = {'type':'camerainfo', 'info': info};
}

function handleRemoteTrackAdded(event) {
    console.warn("The operator should not be adding any tracks:", event);
}