'use strict';

var socket = io.connect();
setupSocketIO(socket,  handleSessionStart);

function handleSessionStart() {
        addTracksToPeerConnection();
        dataConstraint = null;
        dataChannel = pc.createDataChannel('DataChannel', dataConstraint);
        console.log('Creating data channel.');
        dataChannel.onmessage = onReceiveMessageCallback;
        dataChannel.onopen = onDataChannelStateChange;
        dataChannel.onclose = onDataChannelStateChange;

        console.log('Creating offer');
        pc.createOffer().then((offer)=>
            pc.setLocalDescription(offer)
        ).then(()=> {
            console.log("Sending offer")
            sendWebRTCMessage(pc.localDescription);
        }).catch((error)=>{
            console.error(error)
        })
}

function addTracksToPeerConnection() {
    if (pantiltStream.localStream === undefined) {
        console.warn('Video tracks have not been started')
        return;
    }
    console.log('adding local media stream to peer connection');

    // pc.addStream(pantiltStream.localStream);

    // Adding by tracks, to be tested
    //localStream.getTracks().forEach(t => pc.addTrack(t, stream));

    let info = {};

    let stream = pantiltStream.localStream;
    stream.getTracks().forEach(t => {pc.addTrack(t, stream); info[stream.id] = "pantiltStream";});

    stream = overheadStream.localStream;
    stream.getTracks().forEach(t => {pc.addTrack(t, stream); info[stream.id] = "overheadStream";});

    stream = gripperStream.localStream;
    stream.getTracks().forEach(t => {pc.addTrack(t, stream); info[stream.id] = "gripperStream";});

    cameraInfo = {'type':'camerainfo', 'info': info};
}

function handleRemoteTrackAdded(event) {
    console.warn("The operator should not be adding any tracks:", event);
}