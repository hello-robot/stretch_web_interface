'use strict';


function generateVideoDimensions() {
    
    //var iw = 640;
    //var ih = 480;
    
    // D435i 1280x720 for now. Could be 1920 x 1080 if launch file
    // were changed. The camera is rotated -90 on our robots. For
    // efficiency for now render as small images for video transport
    // 360x640.
    var iw = 640;
    var ih = 360;
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
    
    return {w:iw, h:ih, cameraFpsIdeal:cameraFpsIdeal, big: bigDim, smallTop: smallTopDim, smallBot: smallBotDim, smallBotNoWrist: smallBotDimNoWrist, smallBotZoom: smallBotDimZoom, smallBotZoomNoWrist: smallBotDimZoomNoWrist};
}

var videoDimensions = generateVideoDimensions();
