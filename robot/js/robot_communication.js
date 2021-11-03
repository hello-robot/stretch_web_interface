'use strict';

var socket = io.connect();
setupSocketIO(socket);

function addTracksToPeerConnection() {
    if (pantiltStream.localStream != undefined) {
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
    } else {
        console.warn('Video tracks have not been started')
    }
}


function handleRemoteTrackAdded(event) {
    console.warn("The operator should not be adding any tracks:", event);
}