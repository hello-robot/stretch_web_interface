'use strict';


var wHeight = window.innerHeight;
var wWidth = window.innerWidth;
var realsenseW = 640;
var realsenseH = 360;
var wideangleW = 1024;
var wideangleH = 768;
var bufferFactorX = 0.9;
var bufferFactorY = 0.9;
var buttonHeight = 18;

// FIXME: Remove window-size based calculations now that UI is responsive
class RealsenseVideoDimensions {
    // D435i 1280x720 for now. Could be 1920 x 1080 if launch file
    // were changed. The camera is rotated -90 on our robots. For
    // efficiency for now render as small images for video transport
    // 360x640.

    constructor() {
	    this.setWidth(wHeight*bufferFactorY);
	    this.cameraFpsIdeal = 15.0;
		this.camW = realsenseW;
		this.camH = realsenseH;
		this.displayW = realsenseH;
		this.displayH = realsenseW;
    }

    setWidth(width) {
    	this.w = width;
	    if (this.w < 300)
	    	this.w = 300;
	    this.h = this.w*realsenseH*1.0/realsenseW;
    }

    setHeight(height) {
    	this.h = height;
	    this.w = this.h*realsenseW*1.0/realsenseH;
    }

}

class WideangleVideoDimensions {

    // Full dimensions of the WebRTC video transmitted from the robot
    // to the operator. Use only the navigation camera and the gripper
    // camera side by side.
    // var iw = 2048;
    // var ih = 768;

    // wide-angle camera dimensions (i.e., gripper and navigation
    // cameras)

    // Rescaling the video based on window height
    constructor(){
		this.camW = wideangleW;
		this.camH = wideangleH;

    	this.cropX = 0.8;
    	this.cropY = 1.0;
    	this.overheadCropX = 0.7;
    	this.overheadCropY = 0.8;
    	this.overheadManipCropX = 0.5;
    	this.overheadManipCropY = 0.7;

		this.displayW = this.camW*Math.max(this.cropX, this.overheadCropX, this.overheadManipCropX);
		this.displayH = this.camH*Math.max(this.cropY, this.overheadCropY, this.overheadManipCropY);
	    this.setHeight(wHeight*bufferFactorY);
	    this.cameraFpsIdeal = 20.0;
	    this.computeDimensions();
    }

    setWidth(width) {
    	this.w = width;
	    if (this.w < 300)
	    	this.w = 300;
	    this.h = this.w*this.displayH*1.0/this.displayW;
    }

    setHeight(height) {
    	this.h = height;
	    if (this.h < 300)
	    	this.h = 300;
	    this.w = this.h*this.displayW*1.0/this.displayH;
    }

    computeDimensions() {
	    this.gripperCropDim = {sx: this.camW * (1.0-this.cropX) / 2.0,
			    sy: this.camH * (1.0-this.cropY) / 2.0,
			    sw: this.camW * this.cropX,
			    sh: this.camH * this.cropY,
			    dx: 0,
			    dy: 0,
			    dw: this.w,
			    dh: this.h};

	    this.overheadNavCropDim = {sx: this.camW * (1.0-this.overheadCropX) / 2.0,
			    sy: 0, // get more from the top
			    sw: this.camW * this.overheadCropX,
			    sh: this.camH * this.overheadCropY,
			    dx: 0,
			    dy: 0,
			    dw: this.w,
			    dh: this.h};

		this.overheadManipCropDim = {
			sx: this.camW * (1.0 - this.overheadManipCropX) / 1.5, //get more from the right
			sy: 0, // get more from the top
			sw: this.camW * this.overheadManipCropX,
			sh: this.camH * this.overheadManipCropY,
			dx: 0,
			dy: 0,
			dw: this.w,
			dh: this.h
		};

		this.zoom = 1.5;
		this.zoomDim = {
			sx: this.camW * (1.0 - 1.0 / this.zoom) / 2.0,
			sy: this.camH * (1.0 - 1.0 / this.zoom) / 2.0,
			sw: this.camW / this.zoom,
			sh: this.camH / this.zoom,
			dx: 0,
			dy: 0,
			dw: this.w,
			dh: this.h
		};
	}
}

export const wideVideoDimensions = new WideangleVideoDimensions();
export const realsenseDimensions = new RealsenseVideoDimensions();
