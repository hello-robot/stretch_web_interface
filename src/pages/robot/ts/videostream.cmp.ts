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

import {BaseComponent, Component} from "../../../shared/base.cmp";
import { ROSCompressedImage } from "../../../shared/util";

let debug = false;

const degToRad = (2.0 * Math.PI) / 360.0;
const template = `<span data-ref="paused-ui">Click to start</span><video data-ref="video" autoplay></video>`

export class VideoStream extends BaseComponent {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D

    constructor(inDim, outDim) {
        super(template)
        if (outDim === undefined) {
            outDim = inDim
        }
        this.inDim = inDim
        this.outDim = outDim;
        this.style.display = "inline-block"
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.outDim.w;
        this.canvas.height = this.outDim.h;
        this.displayElement = this.refs.get("video");
        this.displayElement.style.display = "block"
        this.displayElement.setAttribute("width", outDim.w);
        this.displayElement.setAttribute("height", outDim.h);
        this.displayElement.onclick = () => this.displayElement.play()
        this.displayElement.onplay = (event) => {
            let pausedUI = this.refs.get("paused-ui")
            if (this.displayElement.paused) {
                pausedUI.style.display = "block"
            } else {
                pausedUI.style.display = "none"
            }

        }
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = "pink";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Using a bright color here can help you spot issues with crops
        this.context.fillStyle = "black";
        // We won't add this to the DOM, but you may want to if you need to see the raw images for debugging
        this.img = document.createElement("img")
        this.img.crossOrigin = 'anonymous'
        //this.shadowRoot.appendChild(this.img)
        //this.shadowRoot.appendChild(this.canvas)
    }

    get imageReceived() {
        return this.img.src != null
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
            0, 0, this.outDim.w, this.outDim.h);

    }

    imageCallback(message: ROSCompressedImage) {
        if (debug)
            this.img.src = 'dummy_overhead.png';
        else
            this.img.src = 'data:image/jpg;base64,' + message.data;
    }

    start() {
        // For debugging
        if (debug){
            // Hallucinate image messages so we don't have to run ROS to debug this
            window.setInterval(this.imageCallback.bind(this), 1000);
        }
        this.editedVideoStream = this.canvas.captureStream(this.inDim.fps);
        this.displayElement.srcObject = this.editedVideoStream; // display the stream
        this.drawVideo();
    }
}

Component('video-stream', VideoStream)


export class RotatedVideoStream extends VideoStream {
    constructor(dimensions) {
        let rotatedDim = {w: dimensions.h, h: dimensions.w};
        super(rotatedDim);
    }

    renderVideo() {
        if (!this.imageReceived) {
            // console.info("Not rendering because no image has been received yet for " + this.videoId)
            return;
        }
        // Just rotate
        const rotation = 90.0 * degToRad;

        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.save()
        this.context.rotate(rotation);
        this.context.drawImage(this.img,
            0, -this.canvas.width,
            this.canvas.height, this.canvas.width);
        this.context.restore()
    }
}

Component('rotated-video-stream', RotatedVideoStream)

interface crop {
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
}
export class TransformedVideoStream extends VideoStream {
    rotate: boolean
    crop: crop

    constructor(inDim, crop: crop, rotate = false) {
        let outDim = inDim
        if (rotate) {
            outDim = {w: inDim.h, h: inDim.w}
        }
        if (crop) {
            outDim = {w: crop.dw, h: crop.dh}
        }
        super(inDim, outDim);
        this.crop = crop;
        this.rotate = rotate

    }

    renderVideo() {
        if (!this.imageReceived) {
            this.context.fillStyle = "red";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            // console.info("Not rendering because no image has been received yet for " + this.videoId)
            return;
        }

        let rotation = 0
        let outDim = this.outDim
        if (this.rotate) {
            rotation = 90.0 * degToRad;
            this.context.save()
            this.context.translate(this.outDim.w, 0);
            this.context.rotate(rotation);
            outDim = {w: this.outDim.h, h: this.outDim.w}
        }
        if (this.crop) {
            let dim = this.crop
            this.context.drawImage(this.img,
                dim.sx, dim.sy, dim.sw, dim.sh,
                dim.dx, dim.dy, dim.dw, dim.dh);
        } else {
            this.context.drawImage(this.img, 0, 0, outDim.w, outDim.h)
        }

        if (this.rotate) {
            this.context.restore()
        }

    }
}

Component('transformed-video-stream', TransformedVideoStream)