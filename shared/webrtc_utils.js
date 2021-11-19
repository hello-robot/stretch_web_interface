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

let makingOffer = false;
let ignoreOffer = false;
var isChannelReady = false;
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

function setupSocketIO(socket, polite, onConnectionStart) {
    socket.on('created', function(room) {
        console.log('Created room ' + room);
    });
    
    socket.on('full', function(room) {
        console.log('Room ' + room + ' is full');
    });
    
    socket.on('join', function (room){
        console.log('Another peer made a request to join room ' + room);
        console.log('I am ' + peer_name + '!');
        isChannelReady = true;
        maybeStart(onConnectionStart);
    });
    
    socket.on('joined', function(room) {
        console.log('joined: ' + room);
        isChannelReady = true;
    });

    socket.on('webrtc message', function(message) {
        console.log('Received message:', message);
        if (message === 'got user media') {
            maybeStart(onConnectionStart);
        } else if (message.type === 'offer' || message.type === 'answer') {
            maybeStart(onConnectionStart);
            const offerCollision = (message.type === "offer") &&
                (makingOffer || pc.signalingState !== "stable");

            ignoreOffer = !polite && offerCollision;
            if (ignoreOffer) {
                console.error("Ignoring offer")
                return;
            }
            pc.setRemoteDescription(message).then(() => {
                if (message.type === "offer") {
                    return pc.setLocalDescription();
                }
            }).then(() => sendWebRTCMessage(pc.localDescription));
        } else if (message.type === 'candidate' && pc) {
            pc.addIceCandidate(message.candidate).catch(e => {
                if (!ignoreOffer) {
                    console.log("Failure during addIceCandidate(): " + e.name);
                    throw e;
                }
            });
        } else if (message === 'bye' && pc) {
            handleRemoteHangup();
        } else {
            console.error("Unable to handle message")
        }

    });
}

function sendWebRTCMessage(message) {
    console.log('Sending WebRTC message: ', message);
    socket.emit('webrtc message', message);
}

////////////////////////////////////////////////////

function maybeStart(onConnectionStart=() => {}) {
    //console.log('>>>>>>> maybeStart() ', !!pc, isChannelReady);
    if (pc && !isChannelReady) {
        return;
    }
    console.log('Creating peer connection');
    try {
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = (event) => {
            sendWebRTCMessage({
                type: 'candidate',
                candidate: event.candidate
            });
        };
        pc.ondatachannel = (event) => {
            console.log('Data channel callback executed.');
            dataChannel = event.channel;
            dataChannel.onmessage = onReceiveMessageCallback;
            dataChannel.onopen = onDataChannelStateChange;
            dataChannel.onclose = onDataChannelStateChange;
        };
        pc.onopen = function() {
            console.log('RTC channel opened.');
        };

        pc.onremovestream = (event) => {
            console.log('Remote stream removed. Event: ', event);
        };

        pc.onnegotiationneeded = async () => {
            console.log("Negotiation needed")
            try {
                makingOffer = true;
                await pc.setLocalDescription();
                sendWebRTCMessage(pc.localDescription);
            } catch(err) {
                console.error(err);
            } finally {
                makingOffer = false;
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "failed") {
                pc.restartIce();
            }
        };
        pc.ontrack = handleRemoteTrackAdded;

        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.error('Failed to create PeerConnection, exception: ' + e.message);
        return;
    }
    console.log('I am the ' + peer_name + '.');
    onConnectionStart()

}

window.onbeforeunload = function() {
    sendWebRTCMessage('bye');
};

/////////////////////////////////////////////////////////

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
    if (!dataChannel || (dataChannel.readyState !== 'open')) {
        //console.log("Trying to send data, but data channel isn't ready")
        return;
    }
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

function closeDataChannels() {
    console.log('Closing data channels.');
    dataChannel.close();
    console.log('Closed data channel with label: ' + dataChannel.label);
    console.log('Closed peer connections.');
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
