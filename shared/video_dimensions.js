'use strict';


function generateVideoDimensions() {
    
    
    // D435i 1280x720 for now. Could be 1920 x 1080 if launch file
    // were changed. The camera is rotated -90 on our robots. For
    // efficiency for now render as small images for video transport
    // 360x640.
    var wHeight = window.innerHeight;
    var iwDefault = 640;
    var ihDefault = 360;

    // Rescaling the video based on window height
    var iw = wHeight*0.8;
    if (iw < 300)
    	iw = 300;

    var ih = iw*ihDefault*1.0/iwDefault;
    console.log("iw:" + iw);
    console.log("ih:" + ih);

    var cameraFpsIdeal = 15.0;
    var ix = (iw - ih)/2.0;
    var oneUnit = ih/2.0;
    var dExtra = iw - (3.0*oneUnit);
    var aspectRatio = (oneUnit + (dExtra/2.0))/oneUnit;

    var bigDim = {sx: ix - (dExtra/4.0),
		  sy: 0,
		  sw: ih + (dExtra/2.0),
		  sh: ih,
		  dx: 0,
		  dy: 0,
		  dw: ih + (dExtra/2.0),
		  dh: ih};

    var smallTopDim = {sx: (iw - (aspectRatio * ih))/2.0,
		       sy: 0,
		       sw: aspectRatio * ih,
		       sh: ih,
		       dx: ih + (dExtra/2.0),
		       dy: 0,
		       dw: (ih/2.0) + (dExtra/2.0),
		       dh: ih/2.0};

    var smallBotDim = {sx: (iw - (aspectRatio * ih))/2.0,
		       sy: 0,
		       sw: aspectRatio * ih,
		       sh: ih,
		       dx: ih + (dExtra/2.0),
		       dy: ih/2.0,
		       dw: (ih/2.0) + (dExtra/2.0),
		       dh: ih/2.0};

    var smallBotDimNoWrist = {sx: (iw - (aspectRatio * ih))/2.0,
			      sy: 0,
			      sw: aspectRatio * ih,
			      sh: ih,
			      dx: ih + (dExtra/2.0),
			      dy: ih/4.0,
			      dw: (ih/2.0) + (dExtra/2.0),
			      dh: ih/2.0};
    
    var smallBotDimZoom = {sx: ((1.0/5.0) * (aspectRatio * ih)) + ((iw - (aspectRatio * ih))/2.0),
			   sy: 0,
			   sw: (2.0/3.0) * (aspectRatio * ih),
			   sh: (2.0/3.0) * ih,
			   dx: ih + (dExtra/2.0),
			   dy: ih/2.0,
			   dw: (ih/2.0) + (dExtra/2.0),
			   dh: ih/2.0};
    
    var smallBotDimZoomNoWrist = {sx: ((1.0/5.0) * (aspectRatio * ih)) + ((iw - (aspectRatio * ih))/2.0),
				  sy: 0,
				  sw: (2.0/3.0) * (aspectRatio * ih),
				  sh: (2.0/3.0) * ih,
				  dx: ih + (dExtra/2.0),
				  dy: ih/4.0,
				  dw: (ih/2.0) + (dExtra/2.0),
				  dh: ih/2.0};
    
    return {w:iw, h:ih, cameraFpsIdeal:cameraFpsIdeal, big: bigDim, smallTop: smallTopDim, 
    	smallBot: smallBotDim, smallBotNoWrist: smallBotDimNoWrist, smallBotZoom: smallBotDimZoom, 
    	smallBotZoomNoWrist: smallBotDimZoomNoWrist};
}


function generateWideVideoDimensions() {

    // Full dimensions of the WebRTC video transmitted from the robot
    // to the operator. Use only the navigation camera and the gripper
    // camera side by side.
    var iw = 2048;
    var ih = 768;

    // wide-angle camera dimensions (i.e., gripper and navigation
    // cameras)
    var camW = 1024;
    var camH = 768;

    var aspectRatio = camW/camH;

    var cameraFpsIdeal = 20.0;
    // var cameraFpsIdeal = 15.0;
    // var cameraFpsIdeal = 30.0;

    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage

    var leftDim = {sx: 0,
		   sy: 0,
		   sw: camW,
		   sh: camH,
		   dx: 0,
		   dy: 0,
		   dw: camW,
		   dh: camH};

    
    var rightDim = {sx: 0,
		    sy: 0,
		    sw: camW,
		    sh: camH,
		    dx: camW,
		    dy: 0,
		    dw: camW,
		    dh: camH};

    var zoom = 1.5
    var rightZoomDim = {sx: camW / 5.0,
			sy: 0,
			sw: camW / zoom,
			sh: camH / zoom,
			dx: camW,
			dy: 0,
			dw: camW,
			dh: camH};
    
    return {w:iw, h:ih,
	    camW:camW, camH:camH,
	    cameraFpsIdeal:cameraFpsIdeal,
	    leftDim:leftDim, rightDim:rightDim, rightZoomDim:rightZoomDim};
}

var wideVideoDimensions = generateWideVideoDimensions();
var videoDimensions = generateVideoDimensions();


