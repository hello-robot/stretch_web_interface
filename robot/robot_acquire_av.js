/*
 *
 *  derived from initial code from the following website with the copyright notice below
 *  https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
 *
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 *
 *
 */

'use strict';

navigator.mediaDevices.enumerateDevices().then(findDevices).catch(handleError);

function startStreams() {

    const videoTopicName = inSim ? '/realsense/color/image_raw/compressed':
                                    '/camera/color/image_raw/compressed';
    pantiltStream = new PanTiltVideoStream("pantiltVideo", videoTopicName);

    overheadStream = new WideAngleVideoStream("overheadVideo",
        '/navigation_camera/image_raw/compressed');

    gripperStream = new WideAngleVideoStream("gripperVideo",
        '/gripper_camera/image_raw/compressed');

    pantiltStream.start();
    overheadStream.start();
    gripperStream.start();

    // displayStream = new MediaStream(editedVideoStream); // make a copy of the stream for local display
    // remove audio tracks from displayStream
    // for (let a of displayStream.getAudioTracks()) {
        // displayStream.removeTrack(a);
    // }
    // localStream = new MediaStream(editedVideoStream);
    // videoDisplayElement.srcObject = displayStream; // display the stream    
    

    // Audio stuff

    if(audioOutId) {
        changeAudioDestination(pantiltStream.displayElement);
    } else {
        console.log('no audio output found or selected');
        console.log('attempting to use the default audio output');
    }

    if(audioInId) {
        let constraints = {
            audio: {deviceId: {exact: audioInId}},
            video: false
        };
        console.log('attempting to acquire audio input stream');
        navigator.mediaDevices.getUserMedia(constraints).
            then(gotAudioStream).catch(handleError);
    } else {
        console.log('the robot audio input was not found!');
    }
}

///////////////////
/* Video streams */
///////////////////


var editedFps = 15;
var handRoll = 0.0;
var degToRad = (2.0* Math.PI)/360.0;

var overheadStream, gripperStream, pantiltStream;

class VideoStream {
    constructor(videoId, camDim, editedDim, topicName) {
        this.videoId = videoId;
        this.canvas = document.createElement('canvas');
        this.displayElement = document.getElementById(videoId);
        this.camDim = camDim;
        this.editedDim = editedDim;
        this.canvas.width = this.editedDim.w;
        this.canvas.height = this.editedDim.h;
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle="black";
        this.context.fillRect(0, 0, editedDim.w, editedDim.h);
        this.isRotated = true;
        this.isZoomed = false;

        this.localStream = null;
        this.displayStream = null;
        this.editedVideoStream = this.canvas.captureStream(editedFps);

        this.imageReceived = false;
        this.topic = new ROSLIB.Topic({
            ros : ros,
            name : topicName,
            messageType : 'sensor_msgs/CompressedImage'
        });
        this.img = document.createElement("IMG");
        this.img.style.visibility = 'hidden';

    }

    drawVideo() {
        console.warn("drawVideo() should be implemented by child class.");
    }

    renderVideo() {
        if (this.imageReceived === true) {
            if (this.isRotated) {
                const rotation = 90.0 * degToRad;
                this.context.fillStyle="black";
                this.context.fillRect(0, 0, this.editedDim.w, this.editedDim.h);
                this.context.translate(this.editedDim.w/2, this.editedDim.h/2);
                this.context.rotate(rotation);
                this.context.drawImage(this.img, 
                    -this.camDim.w/2, -this.camDim.h/2, 
                    this.camDim.w, this.camDim.h);
                this.context.rotate(-rotation);
                this.context.translate(-this.editedDim.w/2, -this.editedDim.h/2);
            }
        }
    }

    start() {
        this.displayStream = new MediaStream(this.editedVideoStream); // make a copy of the stream for local display
        // remove audio tracks from displayStream
        for (let a of this.displayStream.getAudioTracks()) {
            this.displayStream.removeTrack(a);
        }
        this.localStream = new MediaStream(this.editedVideoStream);
        this.displayElement.srcObject = this.displayStream; // display the stream    
    
        this.drawVideo(); 
    }
}


class PanTiltVideoStream extends VideoStream {
    constructor(videoId, topicName) {
        let camDim = {w:videoDimensions.w, h:videoDimensions.h};
        let editedDim = {w:camDim.h, h:camDim.w}
        super(videoId, camDim, editedDim, topicName);
        this.topic.subscribe(pantiltImageCallback);
    }

    drawVideo() {
        this.renderVideo();
        requestAnimationFrame(drawPantiltStream); // EEH will this work?
    }
}

class WideAngleVideoStream extends VideoStream {
    constructor(videoId, topicName) {
        let wideCamDim = {w:wideVideoDimensions.camW, 
            h:wideVideoDimensions.camH};
        let wideEditedDim = {w:wideVideoDimensions.camW, 
            h:wideVideoDimensions.camH};
        super(videoId, wideCamDim, wideEditedDim, topicName);

        if (this.videoId == "gripperVideo") {
            this.topic.subscribe(gripperImageCallback);
        }
        else if (this.videoId == "overheadVideo") {
            this.topic.subscribe(overheadImageCallback);
        }

    }

    drawVideo() {
        this.renderVideo();
        if (this.videoId == "gripperVideo") {
            requestAnimationFrame(drawGripperStream); // EEH will this work?
        }
        else if (this.videoId == "overheadVideo") {
            requestAnimationFrame(drawOverheadStream); // EEH will this work?
        }
    }
}

function drawPantiltStream() {
    pantiltStream.drawVideo();
}

function drawGripperStream() {
    gripperStream.drawVideo();
}

function drawOverheadStream() {
    overheadStream.drawVideo();
}

function pantiltImageCallback(message) {
    pantiltStream.img.src = 'data:image/jpg;base64,' + message.data;
    if (pantiltStream.imageReceived === false) {
        console.log('Received first compressed image from ROS topic ' + pantiltStream.topic.name);
        pantiltStream.imageReceived = true;
    }
}

function gripperImageCallback(message) {
    gripperStream.img.src = 'data:image/jpg;base64,' + message.data;
    if (gripperStream.imageReceived === false) {
        console.log('Received first compressed image from ROS topic ' + gripperStream.topic.name);
        gripperStream.imageReceived = true;
    }
}

function overheadImageCallback(message) {
    overheadStream.img.src = 'data:image/jpg;base64,' + message.data;
    if (overheadStream.imageReceived === false) {
        console.log('Received first compressed image from ROS topic ' + overheadStream.topic.name);
        overheadStream.imageReceived = true;
    }
}

//////////// Beign replaced ///////////

///////////////////
/* Audio streams */
///////////////////

var audioStream;
var audioInId;
var audioOutId;


function findDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.

    var i = 0;
    for (let d of deviceInfos) {
        console.log('');
        console.log('device number ' + i);
        console.log('kind: ' + d.kind);
        console.log('label: ' + d.label);
        console.log('ID: ' + d.deviceId);
        i++;

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
                console.log('* unrecognized kind of device * ', d);
        }
    }
    
    startStreams();
}


// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
        element.setSinkId(sinkId)
            .then(function() {
                console.log('Success, audio output device attached: ' + sinkId);
            })
            .catch(function(error) {
                var errorMessage = error;
                if (error.name === 'SecurityError') {
                    errorMessage = 'You need to use HTTPS for selecting audio output ' +
                        'device: ' + error;
                }
                console.error(errorMessage);
                // Jump back to first output device in the list as it's the default.
                audioOutputSelect.selectedIndex = 0;
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}

function changeAudioDestination(videoElement) {
    var audioDestination = audioOutId;
    attachSinkId(videoElement, audioDestination);
}

function gotAudioStream(stream) {
    console.log('setting up audioStream for the microphone');
    audioStream = stream;

    // remove audio tracks from localStream
    for (let a of pantiltStream.localStream.getAudioTracks()) {
        pantiltStream.localStream.removeTrack(a);
    }
    var localAudio = stream.getAudioTracks()[0]; // get audio track from robot microphone
    pantiltStream.localStream.addTrack(localAudio); // add audio track to localStream for transmission to operator
}

function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}
