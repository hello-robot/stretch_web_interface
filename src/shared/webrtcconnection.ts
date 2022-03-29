//
// initial code retrieved from the following link on 9/13/2017
// https://github.com/googlecodelabs/webrtc-web/blob/master/step-05/js/main.js
//
// initial code licensed with Apache License 2.0
//

import { io, Socket } from "socket.io-client";
import { Robot } from "../pages/robot/js/robot";
import { generateUUID, safelyParseJSON } from "./util";
import type { WebRTCMessage, Request, Response, Responder, CameraInfo, SignallingMessage } from "./util";

// Free STUN server offered by Google
const pcConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};
export class WebRTCConnection {
    private socket: Socket
    private pc?: RTCPeerConnection
    private onConnectionStart: () => void
    private requestResponders: Map<string, Responder> = new Map()
    private pendingRequests = new Map()
    private cameraInfo: CameraInfo = {}
    private makingOffer = false
    private ignoreOffer = false
    private isSettingRemoteAnswerPending = false

    private onConnectionEnd: () => void
    private onMessage: (obj: WebRTCMessage) => void
    private onMessageChannelOpen: () => void
    private onTrackAdded: () => void
    private onRequestChannelOpen: () => void

    private messageChannel?: RTCDataChannel
    private requestChannel?: RTCDataChannel

    constructor(peerName: string, polite: boolean, {
        // TODO: make these placeholder functions match the definitions above
        onConnectionStart = () => { },
        onConnectionEnd = () => { },
        onMessage = () => { },
        onMessageChannelOpen = () => { },
        onTrackAdded = () => { },
        onAvailableRobotsChanged = () => { },
        onRequestChannelOpen = () => { }
    } = {}) {
        this.onConnectionStart = onConnectionStart;
        // Fired when the disconnection is NOT manually triggered, but happens for an external reason
        this.onConnectionEnd = onConnectionEnd;
        this.onMessage = onMessage;
        this.onMessageChannelOpen = onMessageChannelOpen;
        this.onTrackAdded = onTrackAdded;
        this.onRequestChannelOpen = onRequestChannelOpen;
        this.createPeerConnection();

        this.socket = io();

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
            let { sessionDescription, cameraInfo } = message;
            console.log('Received message:', sessionDescription, cameraInfo);
            if (cameraInfo) {
                if (Object.keys(cameraInfo).length === 0) {
                    console.warn("Received a camera info mapping with no entries")
                }
                this.cameraInfo = cameraInfo
            }
            if (sessionDescription.type === 'offer' || sessionDescription.type === 'answer') {
                if (!this.pc) throw 'pc is undefined';
                const readyForOffer =
                    !this.makingOffer &&
                    (this.pc.signalingState === "stable" || this.isSettingRemoteAnswerPending);
                const offerCollision = sessionDescription.type === "offer" && !readyForOffer;

                this.ignoreOffer = !polite && offerCollision;

                if (this.ignoreOffer) {
                    console.error("Ignoring offer")
                    return;
                }
                this.isSettingRemoteAnswerPending = sessionDescription.type === "answer";

                this.pc.setRemoteDescription(sessionDescription).then(async () => {
                    this.isSettingRemoteAnswerPending = false;
                    if (sessionDescription.type === "offer") {
                        if (!this.pc) throw 'pc is undefined';
                        return this.pc.setLocalDescription();
                    } else {
                        return false;
                    }
                }).then(() => {
                    if (!this.pc?.localDescription) throw 'pc is undefined';
                    this.sendSignallingMessage(this.pc.localDescription);
                });
            } else if (sessionDescription.type === 'candidate' && this.pc) {
                this.pc.addIceCandidate(sessionDescription.candidate).catch(e => {
                    if (!this.ignoreOffer) {
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
        if (!this.pc) throw 'pc is undefined';
        this.messageChannel = this.pc.createDataChannel('messages');
        this.requestChannel = this.pc.createDataChannel('requestresponse');

        this.messageChannel.onmessage = this.onReceiveMessageCallback.bind(this);
        // FIXME (kavidey): I think this error is due to how we are passing the function reference 
        // Additionally this exact same line of code appears in `createPeerConnection`, need to test if both are necessary
        // this.requestChannel.onmessage = this.processRequestResponse.bind(this);
    }

    createPeerConnection() {
        console.log('Creating peer connection');
        try {
            this.pc = new RTCPeerConnection(pcConfig);
            this.pc.onicecandidate = (event) => {
                this.sendSignallingMessage({
                    // FIXME (kavidey): According to the TS documentation, this is an invalid type
                    type: 'candidate',
                    candidate: event.candidate
                });
            };
            this.pc.ondatachannel = event => {
                if (event.channel.label === "messages") {
                    this.messageChannel = event.channel;
                    this.messageChannel.onmessage = this.onReceiveMessageCallback.bind(this);
                    let onDataChannelStateChange = () => {
                        if (!this.messageChannel) throw 'messageChannel is undefined';
                        const readyState = this.messageChannel.readyState;
                        console.log('Data channel state is: ' + readyState);
                        if (readyState === 'open') {
                            if (this.onMessageChannelOpen) this.onMessageChannelOpen();
                        }
                    }
                    this.messageChannel.onopen = onDataChannelStateChange;
                    this.messageChannel.onclose = onDataChannelStateChange;
                } else if (event.channel.label === "requestresponse") {
                    this.requestChannel = event.channel
                    this.requestChannel.onmessage = this.processRequestResponse.bind(this);

                    if (this.onRequestChannelOpen) this.onRequestChannelOpen();
                } else {
                    console.error("Unknown channel opened:", event.channel.label)
                }

            };
            // TODO (kavidey): Figure out why typescript doesn't think that these callbacks exist
            this.pc.onopen = () => {
                console.log('RTC channel opened.');
            };

            this.pc.ontrack = this.onTrackAdded

            this.pc.onremovestream = (event: any) => {
                console.log('Remote stream removed. Event: ', event);
            };

            this.pc.onnegotiationneeded = async () => {
                console.log("Negotiation needed")
                try {
                    this.makingOffer = true;
                    if (!this.pc) throw 'pc is undefined';
                    await this.pc.setLocalDescription();
                    if (this.pc.localDescription) {
                        this.sendSignallingMessage(this.pc.localDescription, this.cameraInfo);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    this.makingOffer = false;
                }
            };

            this.pc.oniceconnectionstatechange = () => {
                if (!this.pc) throw 'pc is undefined';
                if (this.pc.iceConnectionState === "failed") {
                    this.pc.restartIce();
                }
            };

            this.pc.onconnectionstatechange = () => {
                if (!this.pc) throw 'pc is undefined';
                if (this.pc.connectionState === "failed" || this.pc.connectionState === "disconnected") {
                    console.error(this.pc.connectionState, "Resetting the PeerConnection")
                    this.createPeerConnection()
                    if (this.onConnectionEnd) this.onConnectionEnd();
                }
            }

            console.log('Created RTCPeerConnection');
        } catch (e: any) {
            console.error('Failed to create PeerConnection, exception: ' + e.message);
            return;
        }
    }

    sendSignallingMessage(sessionDescription: RTCSessionDescription, cameraInfo?: CameraInfo) {
        let message = {
            sessionDescription: sessionDescription,
            cameraInfo: cameraInfo
        }
        this.socket.emit('signalling', message);
    }

    availableRobots() {
        console.log('asking server what robots are available');
        this.socket.emit('what robots are available');
    }

    connectToRobot(robot: Robot) {
        console.log('attempting to connect to robot =');
        console.log(robot);
        this.socket.emit('join', robot);
    }

    hangup() {
        // Tell the other end that we're ending the call so they can stop, and get us kicked out of the robot room
        console.warn("Hanging up")
        this.socket.emit('bye');
        if (!this.pc) throw 'pc is undefined';
        if (this.pc.connectionState === "new") {
            // Don't reset PCs that don't have any state to reset
            return;
        }
        console.log('Hanging up.');
        this.stop();

    }

    addTrack(track: MediaStreamTrack, stream: MediaStream, streamName: string) {
        // Keep track of the mapping from the random ID and the nice stream name so we can send this to the other end later
        this.cameraInfo[stream.id] = streamName
        if (!this.pc) throw 'pc is undefined';
        this.pc.addTrack(track, stream)
    }

    stop() {
        if (!this.pc) throw 'pc is undefined';
        const senders = this.pc.getSenders();
        senders.forEach((sender) => this.pc?.removeTrack(sender));
        this.pc.close();
        this.createPeerConnection()
    }

    ////////////////////////////////////////////////////////////
    // RTCDataChannel
    // on Sept. 15, 2017 copied initial code from
    // https://github.com/googlecodelabs/webrtc-web/blob/master/step-03/js/main.js
    // initial code licensed with Apache License 2.0
    ////////////////////////////////////////////////////////////

    sendData(obj: WebRTCMessage) {
        if (!this.messageChannel || (this.messageChannel.readyState !== 'open')) {
            //console.warn("Trying to send data, but data channel isn't ready")
            return;
        }
        const data = JSON.stringify(obj);
        this.messageChannel.send(data)
    }

    onReceiveMessageCallback(event: {data: string}) {
        const obj: WebRTCMessage = safelyParseJSON(event.data);
        if (this.onMessage) this.onMessage(obj)
    }

    makeRequest(type: string) {
        return new Promise((resolve, reject) => {
            let id = generateUUID();
            if (!this.requestChannel) throw 'requestChannel is undefined';
            this.requestChannel.send(JSON.stringify({
                type: "request",
                id: id,
                requestType: type
            }));

            this.pendingRequests.set(id, (responseData: any) => {
                resolve(responseData);
                this.pendingRequests.delete(id);
            });
        });
    }

    registerRequestResponder(requestType: string, responder: Responder) {
        this.requestResponders.set(requestType, responder)
    }

    processRequestResponse(message: Request | Response): void {
        message = safelyParseJSON(message.data)
        if (message.type === "request") {
            let response: Response = {
                type: "response",
                id: message.id,
                requestType: message.requestType
            }
            if (!this.requestChannel) throw 'requestChannel is undefined';
            if (this.requestResponders.has(message.requestType)) {
                // TODO (kavidey): find the correct way to do this
                // response.data = await this.requestResponders.get(message.requestType)();
                this.requestChannel.send(JSON.stringify(response))
            } else {
                console.error("Heard request with no responder")
                // Send a response so the other side can error out
                this.requestChannel.send(JSON.stringify(response))
            }

        } else {
            if (this.pendingRequests.has(message.id)) {
                this.pendingRequests.get(message.id)(message.data)
            } else {
                console.error("Heard response for request we didn't send")
            }
        }
    }
}
