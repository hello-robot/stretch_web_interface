//
// initial code retrieved from the following link on 9/13/2017
// https://github.com/googlecodelabs/webrtc-web/blob/master/step-05/js/main.js
//
// initial code licensed with Apache License 2.0
//

'use strict';

// Most of this should be on both, though some variables should only be one

// If we don't use these anywhere, we might want to get rid of them
// There is a ton of data being sent, and this is using a lot of ram
const save_communication = false;
var objects_received = [];
var objects_sent = [];

var isChannelReady = false;
var isStarted = false;
var pc;
var remoteStream;
var displayStream;
var turnReady;

var requestedRobot;

var dataChannel;
var dataConstraint;

// Free STUN server offered by Google
var pcConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};

// Prototype STUN and TURN server used internally by Hello Robot
//
// var pcConfig = {
//     iceServers: [
// 	{ urls: "stun:pilot.hello-robot.io:5349",
// 	  username: "r1",
// 	  credential: "kWJuyF5i2jh0"},
// 	{ urls: "turn:pilot.hello-robot.io:5349",
// 	  username: "r1",
// 	  credential: "kWJuyF5i2jh0"}
//     ]
// };

////////////////////////////////////////////////////////////
// safelyParseJSON code copied from
// https://stackoverflow.com/questions/29797946/handling-bad-json-parse-in-node-safely
// on August 18, 2017
function safelyParseJSON (json) {
    // This function cannot be optimised, it's best to
    // keep it small!
    var parsed;
    
    try {
        parsed = JSON.parse(json);
    } catch (e) {
        // Oh well, but whatever...
    }

    return parsed; // Could be undefined!
}

/////////////////////////////////////////////

function setupSocketIO(socket) {
    socket.on('created', function(room) {
        console.log('Created room ' + room);
    });
    
    socket.on('full', function(room) {
        console.log('Room ' + room + ' is full');
    });
    
    socket.on('join', function (room){
        console.log('Another peer made a request to join room ' + room);
        console.log('This peer is the ' + peer_name + '!');
        isChannelReady = true;
        maybeStart();
    });
    
    socket.on('joined', function(room) {
        console.log('joined: ' + room);
        isChannelReady = true;
    });
}


///////////////////////////////////////////////////
// I think that all of this needs to run on both, though there are sections that only need one or the other
function sendWebRTCMessage(message) {
    console.log('Client sending WebRTC message: ', message);
    socket.emit('webrtc message', message);
}

// This client receives a message
socket.on('webrtc message', function(message) {
    console.log('Client received message:', message);
    if (message === 'got user media') {
        maybeStart();
    } else if (message.type === 'offer') {
        maybeStart();
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === 'answer' && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
        handleRemoteHangup();
    }
});

////////////////////////////////////////////////////

function maybeStart() {
    console.log('>>>>>>> maybeStart() ', isStarted, isChannelReady);
    if (!isStarted && isChannelReady) {
        console.log('>>>>>> creating peer connection');
        createPeerConnection();
        console.log('This peer is the ' + peer_name + '.');
        if (peer_name === 'ROBOT') {
            addTracksToPeerConnection();
            dataConstraint = null;
            dataChannel = pc.createDataChannel('DataChannel', dataConstraint);
            console.log('Creating data channel.');
            dataChannel.onmessage = onReceiveMessageCallback;
            dataChannel.onopen = onDataChannelStateChange;
            dataChannel.onclose = onDataChannelStateChange;
            doCall();
        }
	   isStarted = true;
    }
}

window.onbeforeunload = function() {
    sendWebRTCMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
    try {
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        pc.ondatachannel = dataChannelCallback;
        pc.onopen = function() {
            console.log('RTC channel opened.');
        };
        //pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        // TODO: Adding things by track, to be tested..
        pc.ontrack = handleRemoteTrackAdded;
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        sendWebRTCMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
        console.log('End of candidates.');
    }
}

function handleCreateOfferError(event) {
    console.log('createOffer() error: ', event);
}

function doCall() {
    console.log('Sending offer to peer');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}

function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendWebRTCMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function hangup() {
    console.log('Hanging up.');
    stop();
    sendWebRTCMessage('bye');
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
}

function stop() {
    isStarted = false;
    // isAudioMuted = false;
    // isVideoMuted = false;
    pc.close();
    pc = null;
}

////////////////////////////////////////////////////////////
// RTCDataChannel
// on Sept. 15, 2017 copied initial code from
// https://github.com/googlecodelabs/webrtc-web/blob/master/step-03/js/main.js
// initial code licensed with Apache License 2.0
////////////////////////////////////////////////////////////

function sendData(obj) {
    if (isStarted && (dataChannel.readyState === 'open')) {
	var data = JSON.stringify(obj);
	switch(obj.type) {
        case 'command':
            if (recordOn && addToCommandLog) {
            addToCommandLog(obj);
            }
            if (save_communication)
                objects_sent.push(obj);
            dataChannel.send(data);
            console.log('Sent Data: ' + data);
            break;
        case 'sensor':
            // unless being recorded, don't store or write information to the console due to high
            // frequency and large amount of data (analogous to audio and video).
            dataChannel.send(data);
            break;
        case 'request':
            dataChannel.send(data);
            console.log('Sent request: ' + data);
            break;
        case 'response':
            dataChannel.send(data);
            console.log('Sent response: ' + data);
            break;
        default:
            console.log('*************************************************************');
            console.log('REQUEST TO SEND UNRECOGNIZED MESSAGE TYPE, SO NOTHING SENT...');	
            console.log('Received Data: ' + data);
            console.log('Received Object: ' + obj);
            console.trace();
            console.log('*************************************************************');
        }
    }
    // else
    //     console.log("Cannot send data: ", isStarted, dataChannel);
}

function closeDataChannels() {
    console.log('Closing data channels.');
    dataChannel.close();
    console.log('Closed data channel with label: ' + dataChannel.label);
    console.log('Closed peer connections.');
}

function dataChannelCallback(event) {
    console.log('Data channel callback executed.');
    dataChannel = event.channel;
    dataChannel.onmessage = onReceiveMessageCallback;
    dataChannel.onopen = onDataChannelStateChange;
    dataChannel.onclose = onDataChannelStateChange;
}

let cameraInfo = null;
function onReceiveMessageCallback(event) {
    var obj = safelyParseJSON(event.data);
    switch(obj.type) {
        case 'command':
            if (save_communication)
                objects_received.push(obj);
            console.log('Received Data: ' + event.data);
            console.log('Received Object: ' + obj);
            executeCommand(obj);
            break;
        case 'sensor':
            // unless being recorded, don't store or write information to the console due to high
            // frequency and large amount of data (analogous to audio and video).
            if (recordOn && addToSensorLog) {
                addToSensorLog(obj);
            }
            receiveSensorReading(obj);
            break;
        case 'request':
            respondToRequest(obj);
            break;
        case 'response':
            receiveResponse(obj);
            break;
        default:
            console.log('*******************************************************');
            console.log('UNRECOGNIZED MESSAGE TYPE RECEIVED, SO DOING NOTHING...');
            console.log('Received Data: ' + event.data);
            console.log('Received Object: ' + obj);
            console.log('*******************************************************');
    }
}

function onDataChannelStateChange() {
    var readyState = dataChannel.readyState;
    console.log('Data channel state is: ' + readyState);
    if (readyState === 'open') {
    	runOnOpenDataChannel();
    } 
}
