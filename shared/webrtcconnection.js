//
// initial code retrieved from the following link on 9/13/2017
// https://github.com/googlecodelabs/webrtc-web/blob/master/step-05/js/main.js
//
// initial code licensed with Apache License 2.0
//


const save_communication = false;
var objects_received = [];
var objects_sent = [];

// Free STUN server offered by Google
const pcConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};

export class WebRTCConnection {
    socket
    pc
    onConnectionStart
    record
    cameraInfo = {}
    makingOffer = false
    ignoreOffer = false
    isSettingRemoteAnswerPending = false

    constructor(peerName, polite, record, {
        onConnectionStart,
        onMessage,
        onDataChannelOpen,
        onTrackAdded,
        onAvailableRobotsChanged
    } = {}) {
        this.onConnectionStart = onConnectionStart
        this.onMessage = onMessage
        this.onDataChannelOpen = onDataChannelOpen
        this.onTrackAdded = onTrackAdded
        this.createPeerConnection()
        this.record = record
        this.socket = io.connect();

        this.socket.on('created', room => {
            console.log('Created room ' + room);
        });

        this.socket.on('full', room => {
            console.log('Room ' + room + ' is full');
        });

        this.socket.on('available robots', onAvailableRobotsChanged)
        this.socket.on('join', room => {
            console.log('Another peer made a request to join room ' + room);
            console.log('I am ' + peerName + '!');
            if (this.onConnectionStart) this.onConnectionStart()
        });

        this.socket.on('joined', room => {
            console.log('joined: ' + room);
        });

        this.socket.on('bye', () => {
            console.log('Session terminated.');
            this.stop();
        })

        this.socket.on('signalling', message => {
            let ignoreOffer = false
            let {sessionDescription, mediaStreamMetadata} = message
            console.log('Received message:', sessionDescription, mediaStreamMetadata);
            if (mediaStreamMetadata) {
                this.cameraInfo = mediaStreamMetadata
            }
            if (sessionDescription.type === 'offer' || sessionDescription.type === 'answer') {
                const readyForOffer =
                    !this.makingOffer &&
                    (this.pc.signalingState === "stable" || this.isSettingRemoteAnswerPending);
                const offerCollision = sessionDescription.type === "offer" && !readyForOffer;

                ignoreOffer = !polite && offerCollision;

                if (ignoreOffer) {
                    console.error("Ignoring offer")
                    return;
                }
                this.isSettingRemoteAnswerPending = sessionDescription.type === "answer";

                this.pc.setRemoteDescription(sessionDescription).then(() => {
                    this.isSettingRemoteAnswerPending = false;
                    if (sessionDescription.type === "offer") {
                        return this.pc.setLocalDescription();
                    } else {
                        return false;
                    }
                }).then(() => this.sendSignallingMessage(this.pc.localDescription));
            } else if (sessionDescription.type === 'candidate' && this.pc) {
                this.pc.addIceCandidate(sessionDescription.candidate).catch(e => {
                    if (!ignoreOffer) {
                        console.log("Failure during addIceCandidate(): " + e.name);
                        throw e;
                    }
                });
            } else {
                console.error("Unable to handle message")
            }

        });

    }

    openDataChannel() {
        let dataConstraint = null;
        this.dataChannel = this.pc.createDataChannel('DataChannel', dataConstraint);
        console.log('Creating data channel.');
        this.dataChannel.onmessage = this.onReceiveMessageCallback.bind(this);
    }

    createPeerConnection() {
        console.log('Creating peer connection');

        let pc
        try {
            pc = new RTCPeerConnection(pcConfig);
            pc.onicecandidate = (event) => {
                this.sendSignallingMessage({
                    type: 'candidate',
                    candidate: event.candidate
                });
            };
            pc.ondatachannel = (event) => {
                console.log('Data channel callback executed.');
                this.dataChannel = event.channel;
                this.dataChannel.onmessage = this.onReceiveMessageCallback.bind(this);

                let onDataChannelStateChange = () => {
                    const readyState = this.dataChannel.readyState;
                    console.log('Data channel state is: ' + readyState);
                    if (readyState === 'open') {
                        if (this.onDataChannelOpen) this.onDataChannelOpen();
                    }
                }
                this.dataChannel.onopen = onDataChannelStateChange;
                this.dataChannel.onclose = onDataChannelStateChange;
            };
            pc.onopen = () => {
                console.log('RTC channel opened.');
            };

            pc.ontrack = this.onTrackAdded

            pc.onremovestream = (event) => {
                console.log('Remote stream removed. Event: ', event);
            };

            pc.onnegotiationneeded = async () => {
                console.log("Negotiation needed")
                try {
                    this.makingOffer = true;
                    await this.pc.setLocalDescription();
                    this.sendSignallingMessage(this.pc.localDescription, this.cameraInfo);
                } catch (err) {
                    console.error(err);
                } finally {
                    this.makingOffer = false;
                }
            };

            pc.oniceconnectionstatechange = () => {
                if (this.pc.iceConnectionState === "failed") {
                    this.pc.restartIce();
                }
            };

            pc.onconnectionstatechange = () => {
                if (this.pc.connectionState === "failed" || this.pc.connectionState === "disconnected") {
                    console.error(this.pc.connectionState, "Resetting the PeerConnection")
                    this.createPeerConnection()
                }
            }

            console.log('Created RTCPeerConnnection');
        } catch (e) {
            console.error('Failed to create PeerConnection, exception: ' + e.message);
            return;
        }
        this.pc = pc
    }

    sendSignallingMessage(sessionDescription, mediaStreamMetadata) {
        let message = {
            sessionDescription: sessionDescription
        }
        if (mediaStreamMetadata) {
            message.mediaStreamMetadata = mediaStreamMetadata
        }
        console.log('Sending signalling message: ', message);
        this.socket.emit('signalling', message);
    }

    addTrack(track, stream, streamName) {
        this.cameraInfo[stream.id] = streamName
        this.pc.addTrack(track, stream)
    }


    hangup() {
        console.log('Hanging up.');
        this.stop();
        // Tell the other end that we're ending the call so they can stop
        this.socket.emit('bye');
    }

    stop() {
        const senders = this.pc.getSenders();
        senders.forEach((sender) => this.pc.removeTrack(sender));
        this.pc.close();
        this.createPeerConnection()
    }

////////////////////////////////////////////////////////////
// RTCDataChannel
// on Sept. 15, 2017 copied initial code from
// https://github.com/googlecodelabs/webrtc-web/blob/master/step-03/js/main.js
// initial code licensed with Apache License 2.0
////////////////////////////////////////////////////////////

    sendData(obj) {
        if (!this.dataChannel || (this.dataChannel.readyState !== 'open')) {
            //console.warn("Trying to send data, but data channel isn't ready")
            return;
        }

        const data = JSON.stringify(obj);
        if (obj instanceof Array) {
            this.dataChannel.send(data)
            return;
        }
        switch (obj.type) {
            case 'command':
                if (this.record && this.addToCommandLog) {
                    this.addToCommandLog(obj);
                }
                if (save_communication)
                    objects_sent.push(obj);
                this.dataChannel.send(data);
                console.log('Sent Data: ' + data);
                break;
            case 'sensor':
                // unless being recorded, don't store or write information to the console due to high
                // frequency and large amount of data (analogous to audio and video).
                this.dataChannel.send(data);
                break;
            case 'request':
                this.dataChannel.send(data);
                console.log('Sent request: ' + data);
                break;
            case 'response':
                this.dataChannel.send(data);
                console.log('Sent response: ' + data);
                break;
            default:
                console.log('*************************************************************');
                console.log('REQUEST TO SEND UNRECOGNIZED MESSAGE TYPE, SO NOTHING SENT...', obj.type);
                console.log('Received Data: ' + data);
                console.log('Received Object: ' + obj);
                console.trace();
                console.log('*************************************************************');
        }
    }

    onReceiveMessageCallback(event) {
        const obj = safelyParseJSON(event.data);
        if (this.onMessage) this.onMessage(obj)
    }

    availableRobots() {
        console.log('asking server what robots are available');
        this.socket.emit('what robots are available');
    }

    connectToRobot(robot) {
        console.log('attempting to connect to robot =');
        console.log(robot);
        this.socket.emit('join', robot);

    }
}

////////////////////////////////////////////////////////////
// safelyParseJSON code copied from
// https://stackoverflow.com/questions/29797946/handling-bad-json-parse-in-node-safely
// on August 18, 2017
function safelyParseJSON(json) {
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

