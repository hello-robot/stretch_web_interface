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
let debug = false;

navigator.mediaDevices.enumerateDevices().then(findDevices).catch(handleError).then(startStreams);

function startStreams() {
    pantiltStream = new PanTiltVideoStream("pantiltVideo", videoDimensions, '/camera/color/image_raw/compressed');

    overheadStream = new WideAngleVideoStream("overheadVideo",
        '/navigation_camera/image_raw/compressed', wideVideoDimensions.overheadNavCropDim);

    gripperStream = new WideAngleVideoStream("gripperVideo",
        '/gripper_camera/image_raw/compressed', wideVideoDimensions.gripperCropDim);

    pantiltStream.start();
    overheadStream.start();
    gripperStream.start();

    // Audio stuff
    if(audioOutId) {
        // NOTE(nickswalker12-1-21): Setting the audio output is failing consistently for me. Disabling
        // until I can debug
        //changeAudioDestination(pantiltStream.displayElement);
    } else {
        console.log('no audio output found or selected');
    }
    if(audioInId) {
        let constraints = {
            audio: {deviceId: {exact: audioInId}},
            video: false
        };
        console.log('attempting to acquire audio input stream');
        navigator.mediaDevices.getUserMedia(constraints).
            then((stream) => {
                console.log('setting up audioStream for the microphone');
                audioStream = stream.getAudioTracks()[0]; // get audio track from robot microphone
        }).catch(handleError);
    } else {
        console.warn('the robot audio input was not found!');
    }
}

///////////////////
/* Video streams */
///////////////////


var editedFps = 15;
var handRoll = 0.0;
const degToRad = (2.0* Math.PI)/360.0;

let overheadStream, gripperStream, pantiltStream, audioStream;

class VideoStream {
    constructor(videoId, camDim, topicName) {
        this.videoId = videoId;
        this.camDim = camDim;

        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute("class", 'border border-warning');
        this.canvas.width = this.camDim.w;
        this.canvas.height = this.camDim.h;
        this.displayElement = document.getElementById(videoId);
        this.displayElement.setAttribute("width", camDim.w);        
        this.displayElement.setAttribute("height", camDim.h);
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle="pink";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);


        // We won't add this to the DOM, but you may want to if you need to see the raw images for debugging
        this.img = document.createElement("img")
        //document.body.append(this.img)

        let canvasDisplay = document.getElementById(videoId + 'Canvas');
        if (canvasDisplay) {
            canvasDisplay.appendChild(this.canvas);
        }
        this.imageReceived = false;
        this.topic = new ROSLIB.Topic({
            ros : ros,
            name : topicName,
            messageType : 'sensor_msgs/CompressedImage'
        });
    }

    drawVideo() {
        this.renderVideo();
        requestAnimationFrame(this.drawVideo.bind(this));
    }

    renderVideo() {
        if (!this.imageReceived) {
            // console.info("Not rendering because no image has been received yet")
            return;
        }
        this.context.drawImage(this.img,
            0, 0, this.camDim.w, this.camDim.h);

    }

    imageCallback(message) {
        if (debug)
            this.img.src = 'dummy_overhead.png';
        else
            this.img.src = 'data:image/jpg;base64,' + message.data;
        if (this.imageReceived === false) {
            console.log('Received first compressed image from ROS topic ' + this.topic.name);
            this.imageReceived = true;
        }
    }

    start() {
        // For debugging
        if (debug){
            // Hallucinate image messages so we don't have to run ROS to debug this
            window.setInterval(this.imageCallback.bind(this), 1000);
        }
        this.editedVideoStream = this.canvas.captureStream(editedFps);
        this.displayElement.srcObject = this.editedVideoStream; // display the stream

        this.drawVideo();
    }
}


class PanTiltVideoStream extends VideoStream {
    constructor(videoId, dimensions, topicName) {
        let rotatedDim = {w:dimensions.h, h:dimensions.w};
        super(videoId, rotatedDim, topicName);
        this.topic.subscribe(this.imageCallback.bind(this));
    }

    renderVideo() {
        if (!this.imageReceived) {
            // console.info("Not rendering because no image has been received yet for " + this.videoId)
            return;
        }
        // Just rotate
        const rotation = 90.0 * degToRad;
        this.context.fillStyle="black";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.rotate(rotation);
        this.context.drawImage(this.img,
            0, -this.canvas.width,
            this.canvas.height, this.canvas.width);
        this.context.rotate(-rotation);
    }
}

class WideAngleVideoStream extends VideoStream {
    constructor(videoId, topicName, crop) {
        let wideCamDim = {w:crop.dw,
            h:crop.dh};

        super(videoId, wideCamDim, topicName);
        this.crop = crop;
        this.topic.subscribe(this.imageCallback.bind(this));

    }

    renderVideo() {
        if (!this.imageReceived) {
            // console.info("Not rendering because no image has been received yet for " + this.videoId)
            return;
        }
        if (this.videoId == "overheadVideo") {
            if (backendRobotMode == 'nav'){
                const rotation = 90.0 * degToRad;
                this.context.fillStyle="black";
                this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.context.translate(this.camDim.w/2, this.camDim.h/2);
                this.context.rotate(rotation);
                this.context.drawImage(this.img,
                    -this.camDim.w/2, -this.camDim.h/2,
                    this.camDim.w, this.camDim.h);
                this.context.rotate(-rotation);
                this.context.translate(-this.camDim.w/2, -this.camDim.h/2);
            }
            else if (backendRobotMode == 'manip') {
                let dim = this.crop
                this.context.drawImage(this.img,
                    dim.sx, dim.sy, dim.sw, dim.sh,
                    dim.dx, dim.dy, dim.dw, dim.dh);
            }
            else {
                console.error('Unknown mode:', backendRobotMode);
            }
        }
        else if (this.videoId == "gripperVideo") {
            let dim = this.crop
            this.context.drawImage(this.img,
                dim.sx, dim.sy, dim.sw, dim.sh,
                dim.dx, dim.dy, dim.dw, dim.dh);
        }
    }

}

//////////// Beign replaced ///////////

///////////////////
/* Audio streams */
///////////////////

var audioInId;
var audioOutId;


function findDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.

    var i = 0;
    for (let d of deviceInfos) {
        console.log('device ' + i, d);
        i++;

        // Chrome helpfully has a default device of each type. For now, we'll just use
        // the default.
        if (d.label !== "Default") {
            continue;
        }
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
                console.log(`ignoring unrecognized kind of device: ${d.kind} (${d.label})`, d);
        }
    }
}


// Attach audio output device to video element using device/sink ID.

function changeAudioDestination(element) {
    var audioDestination = audioOutId;
    if (typeof element.sinkId !== 'undefined') {
        element.setSinkId(audioDestination)
            .then(function() {
                console.log('Success, audio output device attached: ' + audioDestination);
            })
            .catch(function(error) {
                var errorMessage = error;
                if (error.name === 'SecurityError') {
                    errorMessage = 'You need to use HTTPS for selecting audio output ' +
                        'device: ' + error;
                }
                console.error(errorMessage);
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}

function handleError(error) {
    console.error('navigator.getUserMedia error: ', error);
}
