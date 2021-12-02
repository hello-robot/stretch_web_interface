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
let isSettingRemoteAnswerPending = false;

var turnReady;
let pc
var requestedRobot;

var dataChannel;
var dataConstraint;

// Free STUN server offered by Google
const pcConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};

function createPeerConnection(){
    console.log('Creating peer connection');
    let pc
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

             let onDataChannelStateChange = () =>{
                const readyState = dataChannel.readyState;
                console.log('Data channel state is: ' + readyState);
                if (readyState === 'open') {
                    runOnOpenDataChannel();
                }
            }
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

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed") {
                console.error("The connection has failed. Resetting the PeerConnection")
                pc = createPeerConnection()
            }
        }

        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.error('Failed to create PeerConnection, exception: ' + e.message);
        return;
    }
    return pc
}

pc = createPeerConnection()

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
        onConnectionStart()
    });
    
    socket.on('joined', function(room) {
        console.log('joined: ' + room);
    });

    socket.on('webrtc message', function(message) {
        console.log('Received message:', message);
        if (message === 'got user media') {
        } else if (message.type === 'offer' || message.type === 'answer') {
            const readyForOffer =
                !makingOffer &&
                (pc.signalingState == "stable" || isSettingRemoteAnswerPending);
            const offerCollision = message.type == "offer" && !readyForOffer;

            ignoreOffer = !polite && offerCollision;

            if (ignoreOffer) {
                console.error("Ignoring offer")
                return;
            }
            isSettingRemoteAnswerPending = message.type == "answer";

            pc.setRemoteDescription(message).then(() => {
                isSettingRemoteAnswerPending = false;
                if (message.type === "offer") {
                    return pc.setLocalDescription();
                } else {
                    return false;
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
            console.log('Session terminated.');
            stop();
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

window.onbeforeunload = function() {
    sendWebRTCMessage('bye');
};

/////////////////////////////////////////////////////////

function hangup() {
    console.log('Hanging up.');
    stop();
    // Tell the other end that we're ending the call so they can stop
    sendWebRTCMessage('bye');
}

function stop() {
    pc.close();
    pc = createPeerConnection()
}

////////////////////////////////////////////////////////////
// RTCDataChannel
// on Sept. 15, 2017 copied initial code from
// https://github.com/googlecodelabs/webrtc-web/blob/master/step-03/js/main.js
// initial code licensed with Apache License 2.0
////////////////////////////////////////////////////////////

function sendData(obj) {
    if (!dataChannel || (dataChannel.readyState !== 'open')) {
        //console.warn("Trying to send data, but data channel isn't ready")
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
