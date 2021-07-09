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

var editedFps = 15;
var handRoll = 0.0;
var degToRad = (2.0* Math.PI)/360.0;

class VideoStream {
    constructor(videoId, width, height, topicName) {
        this.videoId = videoId;
        this.canvas = document.createElement('canvas');
        this.displayElement = document.getElementById(videoId);
        this.camDim = {w:width, h:height};
        this.editedDim = {w:height, h:width}; // Different per camera
        this.canvas.width = this.editedDim.w;
        this.canvas.height = this.editedDim.h;
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle="black";
        this.context.fillRect(0, 0, editedDim.w, editedDim.h);

        this.localStream = null;
        this.displayStream = null;
        this.editedVideoStream = this.canvas.captureStream(editedFps);

        this.imageReceived = false;
        this.topic = new ROSLIB.Topic({
            ros : ros,
            name : topicName
            messageType : 'sensor_msgs/CompressedImage'
        });
        this.img = document.createElement("IMG");
        this.img.style.visibility = 'hidden';

        this.topic.subscribe(function(message) {
            this.img.src = 'data:image/jpg;base64,' + message.data;
            if (this.imageReceived === false) {
                console.log('Received first compressed image from ROS topic ' + imageTopic.name);
                this.imageReceived = true;
            }
        });
    }

    // TODO: Different per video and even modes
    drawVideo() {
        if (this.imageReceived === true) {
            var d435iRotation = 90.0 * degToRad;
            this.context.fillStyle="black";
            this.context.fillRect(0, 0, this.editedDim.w, this.editedDim.h);
            this.context.translate(this.editedDim.w/2, this.editedDim.h/2);
            this.context.rotate(d435iRotation);
            this.context.drawImage(this.img, -this.camDim.w/2, -this.camDim.h/2, this.camDim.w, this.camDim.h)
            this.context.rotate(-d435iRotation);
            this.context.translate(-this.editedDim.w/2, -this.editedDim.h/2);
        }
        requestAnimationFrame(this.drawVideo); // EEH will this work?
    }

    // TODO: This is work in progress but should not impact anything
    start() {
        this.displayStream = new MediaStream(this.editedVideoStream); // make a copy of the stream for local display
        // remove audio tracks from displayStream
        for (let a of this.displayStream.getAudioTracks()) {
            this.displayStream.removeTrack(a);
        }
        this.localStream = new MediaStream(this.editedVideoStream);
        this.displayElement.srcObject = this.displayStream; // display the stream    
    
        drawVideo(); 
    }
}

var audioStream;
var localStream;
var audioInId;
var audioOutId;

var videoEditingCanvas = document.createElement('canvas');
var videoDisplayElement = document.querySelector('video');
var camDim = {w:videoDimensions.w, h:videoDimensions.h};
// Make room for -90 deg rotation due to D435i orientation.
var editedDim = {w:camDim.h, h:camDim.w}

videoEditingCanvas.width = editedDim.w;
videoEditingCanvas.height = editedDim.h;
var videoEditingContext = videoEditingCanvas.getContext('2d');
videoEditingContext.fillStyle="black";
videoEditingContext.fillRect(0, 0, editedDim.w, editedDim.h);
var editedVideoStream = videoEditingCanvas.captureStream(editedFps);

function drawVideo() {
    if (rosImageReceived === true) {
    	var d435iRotation = 90.0 * degToRad;
    	videoEditingContext.fillStyle="black";
    	videoEditingContext.fillRect(0, 0, editedDim.w, editedDim.h);
    	videoEditingContext.translate(editedDim.w/2, editedDim.h/2);
    	videoEditingContext.rotate(d435iRotation);
    	videoEditingContext.drawImage(img, -camDim.w/2, -camDim.h/2, camDim.w, camDim.h)
    	videoEditingContext.rotate(-d435iRotation);
    	videoEditingContext.translate(-editedDim.w/2, -editedDim.h/2);
    }
    requestAnimationFrame(drawVideo);
}

function findDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.

    var i = 0;
    for (let d of deviceInfos) {
        console.log('');
        console.log('device number ' + i);
        i++;
        console.log('kind: ' + d.kind);
        console.log('label: ' + d.label);
        console.log('ID: ' + d.deviceId);

        // javascript switch uses === comparison
        switch (d.kind) {
        case 'audioinput':
            //if(d.label === 'USB Audio Device Analog Mono') {
                audioInId = d.deviceId;
                console.log('using this device for robot audio input');
            //}
            break; 
        case 'audiooutput':
            //      if(d.label === 'HDA NVidia Digital Stereo (HDMI 2)') {
            //if(d.label === 'USB Audio Device Analog Stereo') {
                audioOutId = d.deviceId;
                console.log('using this device for robot audio output');
            //}
            break;
        default: 
            console.log('* unrecognized kind of device * ', d);
        }
    }
    
    start();
}


navigator.mediaDevices.enumerateDevices().then(findDevices).catch(handleError);

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

function changeAudioDestination() {
    var audioDestination = audioOutId;
    attachSinkId(videoDisplayElement, audioDestination);
}

function gotAudioStream(stream) {
    console.log('setting up audioStream for the microphone');
    audioStream = stream;

    // remove audio tracks from localStream
    for (let a of localStream.getAudioTracks()) {
        localStream.removeTrack(a);
    }
    var localAudio = stream.getAudioTracks()[0]; // get audio track from robot microphone
    localStream.addTrack(localAudio); // add audio track to localStream for transmission to operator
}


function start() {

    if(audioOutId) {
        changeAudioDestination();
    } else {
        console.log('no audio output found or selected');
        console.log('attempting to use the default audio output');
    }

    displayStream = new MediaStream(editedVideoStream); // make a copy of the stream for local display
    // remove audio tracks from displayStream
    for (let a of displayStream.getAudioTracks()) {
        displayStream.removeTrack(a);
    }

    localStream = new MediaStream(editedVideoStream);

    videoDisplayElement.srcObject = displayStream; // display the stream    
    
    var constraints;
    
    console.log('trying to obtain videos with');
    console.log('width = ' + camDim.w);
    console.log('height = ' + camDim.h);
    
    if(audioInId) {
	constraints = {
            audio: {deviceId: {exact: audioInId}},
            video: false
        };
        console.log('attempting to acquire audio input stream');
        navigator.mediaDevices.getUserMedia(constraints).
            then(gotAudioStream).catch(handleError);
    } else {
        console.log('the robot audio input was not found!');
    }

    drawVideo();
}


function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}
