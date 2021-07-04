
'use strict';

function svgPolyString(points) {
    var str = 'M ';
    for (let p of points) {
	str = str + p.x + ',' + p.y + ' ';
    }
    str = str + 'Z';
    return str;
}

function makeRectangle(ulX, ulY, width, height) {
    return {ul: {x:ulX, y:ulY},
	    ur: {x:ulX + width, y:ulY},
	    ll: {x:ulX, y:ulY + height},
	    lr: {x:ulX + width, y:ulY + height}
	   };
}

function makeSquare(ulX, ulY, width) {
    return makeRectangle(ulX, ulY, width, width);
}

function rectToPoly(rect) {
    return [rect.ul, rect.ur, rect.lr, rect.ll];
}

function drawText(elementID, text, x, y, font_size=100, center=false, color='white') {
    var txt = document.createElementNS("http://www.w3.org/2000/svg", 'text');
    txt.setAttributeNS(null, 'x', x);
    txt.setAttributeNS(null, 'y', y);
    txt.setAttributeNS(null, 'font-size', String(font_size));
    txt.setAttributeNS(null, 'fill', color);
    txt.setAttributeNS(null, 'stroke', 'black');
    txt.setAttributeNS(null, 'stroke-width', '5');
    txt.setAttributeNS(null, 'paint-order', 'stroke')
    if (center) {
        txt.setAttributeNS(null, 'text-anchor', 'middle')
        txt.setAttributeNS(null, 'alignment-baseline', 'middle')
    }

    txt.innerHTML = text;
    document.getElementById(elementID).appendChild(txt);
}

function hideSvg(elementId) {
    document.getElementById(elementId).style.display = 'none';
}

function showSvg(elementId) {
    document.getElementById(elementId).style.display = 'block';
}

// TODO: This might be redundant with 'interfaceMode' remove after checking
var currentMode = null;

function turnModeUiOn(modeKey) {
    currentMode = modeKey;
    var buttonName = modeKey + '_mode_button'
    console.log('setting to checked: buttonName = ' + buttonName)
    // This might not be working as expected. I may need to set all
    // others to false, or find out how to appropriately utilize a
    // switch like this.
    document.getElementById(buttonName).checked = true
    arrangeOverlays(modeKey)
    for (var key in modeRegions) {
	if (key !== modeKey) {
	    modeRegions[key].map(hideSvg)
	}
    }
    modeRegions[modeKey].map(showSvg)
}

function setCameraViewPreset() {
    if (currentMode != null)
        setCameraView(currentMode);
}

var navModeRegionIds;
var lowArmModeRegionIds;
var highArmModeRegionIds;
var handModeRegionIds;
var lookModeRegionIds;
var modeRegions;

var THREEcamera;
var THREErenderer;
var THREEcomposer;
var THREEscene;

var navModeObjects;
var lowArmModeObjects;
var highArmModeObjects;
var handModeObjects;
var lookModeObjects;

function createUiRegions(debug) {

    var strokeOpacity;
    if(debug) {
	strokeOpacity = 0.1; //1.0;
    } else {
	strokeOpacity = 0.0;
    }

    function setRegionPoly(elementId, poly, color, stroke_width = 2, stroke_opacity = false) {
	var region = document.getElementById(elementId);
	region.setAttribute('stroke', color);
	region.setAttribute('stroke-opacity', String(stroke_opacity ? stroke_opacity : strokeOpacity));
	region.setAttribute('stroke-linejoin', "round");
	region.setAttribute('stroke-width', String(stroke_width));
	
	region.setAttribute('d', svgPolyString(poly));
    }

    //////////////////////////////
    // set size of video region

    // D435i has a -90 rotation
    //    var w = videoDimensions.w;
    //    var h = videoDimensions.h;
    var w = videoDimensions.h;
    var h = videoDimensions.w;
    
    var video_region = document.getElementById('video_ui_overlay');
    video_region.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    //////////////////////////////
            
    //////////////////////////////
    
    var sqrW, bgSqr, mdSqr, smSqr, regionPoly;
    var mdBar, smBar, mHoriz, lHoriz, rHoriz, mVert; 
    var color;
    
    /////////////////////////
    color = 'white'

    // big rectangle at the borders of the video
    var bgRect = makeRectangle(0, 0, w, h);
    // small rectangle around the mobile base
    //var smRect = makeSquare(w*(7.0/16.0), h*(7.0/16.0), w/8.0, h/8.0);
    var smRect = makeSquare((w/2.0)-(w/20.0), (h*(3.0/4.0))-(h/20.0), w/10.0, h/10.0); 

    regionPoly = rectToPoly(smRect);
    setRegionPoly('nav_do_nothing_region', regionPoly, color);

    regionPoly = [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul];
    setRegionPoly('nav_forward_region', regionPoly, color);

    regionPoly = [bgRect.ll, bgRect.lr, smRect.lr, smRect.ll];
    setRegionPoly('nav_backward_region', regionPoly, color);

    regionPoly = [bgRect.ul, smRect.ul, smRect.ll, bgRect.ll];
    setRegionPoly('nav_turn_left_region', regionPoly, color);


    //var region = document.getElementById('right_arrow')
    //region.setAttribute('stroke-opacity', "0.1");
    //region.setAttribute('fill-opacity', "0.1");
    //region.setAttribute('viewBox', "-20.0 -20.0, 200.0, 200.0")
    
    //region.setAttribute('transform', "scale(0.1)");
    //region.setAttribute('transform', "scale(0.1)");
    //region.move(100,100)

    regionPoly = [bgRect.ur, smRect.ur, smRect.lr, bgRect.lr];
    setRegionPoly('nav_turn_right_region', regionPoly, color);

    var size = 80;
    setRegionPoly('nav_ccw_region', rectToPoly(makeSquare(0, h-size, size)), color, 2, 0.5);
    drawText('ccw_cw_text_region','⤹ 90°', size/2, h-size+size/1.5, 25, true)
    setRegionPoly('nav_cw_region', rectToPoly(makeSquare(w-size, h-size, size)), color, 2, 0.5);
    drawText('ccw_cw_text_region','90° ⤸', w-size+size/2, h-size+size/1.5, 25, true)

    navModeRegionIds = ['nav_do_nothing_region', 'nav_forward_region', 'nav_backward_region', 'nav_turn_left_region', 'nav_turn_right_region', 'nav_ccw_region', 'nav_cw_region', 'ccw_cw_text_region']

    
    ///////////////////////
    color = 'white'

    // big rectangle at the borders of the video
    bgRect = makeRectangle(0, 0, w, h);
    // small rectangle at the top of the middle of the video
    var tpRect = makeRectangle(w*(3.0/10.0), h/4.0, w*(4.0/10.0), h/4.0);
    // small rectangle at the bottom of the middle of the video
    var btRect = makeRectangle(w*(3.0/10.0), h/2.0, w*(4.0/10.0), h/4.0);
    
    regionPoly = rectToPoly(tpRect);
    setRegionPoly('low_arm_up_region', regionPoly, color);

    regionPoly = rectToPoly(btRect);
    setRegionPoly('low_arm_down_region', regionPoly, color);
    
    regionPoly = [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul];
    setRegionPoly('low_arm_extend_region', regionPoly, color);

    regionPoly = [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll];
    setRegionPoly('low_arm_retract_region', regionPoly, color);

    regionPoly = [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll];
    setRegionPoly('low_arm_base_forward_region', regionPoly, color);

    regionPoly = [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr];
    setRegionPoly('low_arm_base_backward_region', regionPoly, color);
    
    lowArmModeRegionIds = ['low_arm_down_region', 'low_arm_up_region', 'low_arm_extend_region', 'low_arm_retract_region','low_arm_base_forward_region','low_arm_base_backward_region']
    

    ///////////////////////
    color = 'white'

    // big rectangle at the borders of the video
    bgRect = makeRectangle(0, 0, w, h);
    // small rectangle at the top of the middle of the video
    tpRect = makeRectangle(w*(3.0/10.0), h/4.0, w*(4.0/10.0), h/4.0);
    // small rectangle at the bottom of the middle of the video
    btRect = makeRectangle(w*(3.0/10.0), h/2.0, w*(4.0/10.0), h/4.0);
    
    regionPoly = rectToPoly(tpRect);
    setRegionPoly('high_arm_up_region', regionPoly, color);

    regionPoly = rectToPoly(btRect);
    setRegionPoly('high_arm_down_region', regionPoly, color);
    
    regionPoly = [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul];
    setRegionPoly('high_arm_extend_region', regionPoly, color);

    regionPoly = [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll];
    setRegionPoly('high_arm_retract_region', regionPoly, color);

    regionPoly = [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll];
    setRegionPoly('high_arm_base_forward_region', regionPoly, color);

    regionPoly = [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr];
    setRegionPoly('high_arm_base_backward_region', regionPoly, color);
    
    highArmModeRegionIds = ['high_arm_down_region', 'high_arm_up_region', 'high_arm_extend_region', 'high_arm_retract_region','high_arm_base_forward_region','high_arm_base_backward_region']
    

    ///////////////////////
    color = 'white'

    bgRect = makeRectangle(0, 0, w, h);
    tpRect = makeRectangle(0, 0, w, h/4.0);
    btRect = makeRectangle(0, 3.0*(h/4.0), w, h/4.0);
    smRect = makeRectangle(w/3.0, 2.0*(h/5.0), w/3.0, h/5.0);
        
    regionPoly = rectToPoly(smRect);
    setRegionPoly('hand_close_region', regionPoly, color);

    regionPoly = rectToPoly(tpRect);
    setRegionPoly('hand_out_region', regionPoly, color);

    regionPoly = rectToPoly(btRect);
    setRegionPoly('hand_in_region', regionPoly, color);

    regionPoly = [tpRect.ll, tpRect.lr, btRect.ur, btRect.ul, tpRect.ll,
		  smRect.ul, smRect.ll, smRect.lr, smRect.ur, smRect.ul];
    setRegionPoly('hand_open_region', regionPoly, color);
    
    handModeRegionIds = ['hand_close_region', 'hand_out_region', 'hand_in_region', 'hand_open_region']
    

    ///////////////////////
    color = 'white'

    tpRect = makeRectangle(0, 0, w, h/4.0);
    btRect = makeRectangle(0, 3.0*(h/4.0), w, h/4.0);
    var ltRect = makeRectangle(0, h/4.0, w/2.0, h/2.0);
    var rtRect = makeRectangle(w/2.0, h/4.0, w/2.0, h/2.0);

    
    regionPoly = rectToPoly(tpRect);
    setRegionPoly('look_up_region', regionPoly, color);

    regionPoly = rectToPoly(btRect);
    setRegionPoly('look_down_region', regionPoly, color);

    regionPoly = rectToPoly(ltRect);
    setRegionPoly('look_left_region', regionPoly, color);

    regionPoly = rectToPoly(rtRect);
    setRegionPoly('look_right_region', regionPoly, color);
    
    lookModeRegionIds = ['look_up_region', 'look_down_region', 'look_left_region', 'look_right_region']


    modeRegions = { 'nav' : navModeRegionIds,
		    'low_arm' : lowArmModeRegionIds,
		    'high_arm' : highArmModeRegionIds,
		    'hand' : handModeRegionIds,
		    'look' : lookModeRegionIds}
}

function arrangeOverlays(key) {
    ///////////////////////
    var nx, ny, nw, nh;

    // Handle D435i 90 degree rotation
    //var w = videoDimensions.w;
    //var h = videoDimensions.h;
    var w = videoDimensions.h
    var h = videoDimensions.w

    nx = 0
    ny = 0
    nw = w
    nh = h
    var bigViewBox = String(nx) + ' ' + String(ny) + ' ' + String(nw) + ' ' + String(nh);

    var overlayName = key + '_ui_overlay'
    var overlay = document.getElementById(overlayName);
    overlay.setAttribute('viewBox', bigViewBox);
    
}

///////////////////////////////////////////////////////

const positionOffset = new THREE.Vector3(0, 0, 0); //(0, -0.047, -0.02);

function THREEinit() {
    // General THREE.js setup
    THREEscene = new THREE.Scene();
    THREEcamera = new THREE.PerspectiveCamera( 69, 350/620, 0.1, 1000 );

    THREEcamera.position.set(0.0017999238937422997, 0.00028575863531305964, 1.302089778086701);

    THREErenderer = new THREE.WebGLRenderer({ alpha: true });
    THREErenderer.setSize(350, 620); // matches #remoteVideo dimensions from operator.css
    $("#videoContainer").append(THREErenderer.domElement);

    THREEcomposer = new POSTPROCESSING.EffectComposer(THREErenderer);
    THREEcomposer.addPass(new POSTPROCESSING.RenderPass(THREEscene, THREEcamera));

    var outlineEffect = new POSTPROCESSING.OutlineEffect(THREEscene, THREEcamera, {visibleEdgeColor: 0xff9900});
    const effectPass = new POSTPROCESSING.EffectPass(
        THREEcamera,
        outlineEffect
    );
    effectPass.renderToScreen = true;
    THREEcomposer.addPass(effectPass);


    // navMode
    navModeObjects = {};

    // Reach overlay circle
    var geo = new THREE.CircleGeometry(0.52, 32) // The arm has a 52 centimeter reach (source: https://hello-robot.com/product#:~:text=range%20of%20motion%3A%2052cm)
    var mat = new THREE.MeshBasicMaterial({color: 'rgb(246, 179, 107)', transparent: true, opacity: 0.25});
    var circle = new THREE.Mesh(geo, mat);
    circle.position.copy(positionOffset);
    THREEscene.add(circle);
    navModeObjects.circle = circle;
    outlineEffect.selectObject(circle);

    // Debugging cube
    geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    mat = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    var cube = new THREE.Mesh(geo, mat);
    cube.visible = false;
    THREEscene.add(cube);
    navModeObjects.cube = cube;


    // lowArmMode
    lowArmModeObjects = [];
    
    // highArmMode
    highArmModeObjects = [];
    
    // handMode
    handModeObjects = [];
    
    // lookMode
    lookModeObjects = [];
    
    THREEanimate();
}

function THREEanimate() {
	requestAnimationFrame(THREEanimate);
	THREEcomposer.render()
}


function VelocityUi(elementId, commands, cursor) {
    this.elementId = elementId;
    this.commands = commands;
    this.cursor = cursor;
    this.region = document.getElementById(this.elementId);
    this.clicked = false;
    
    this.scaledXY = function(e) {
	var rect = this.region.getBoundingClientRect();
	var midX = rect.x + (rect.width/2.0);
	var midY = rect.y + (rect.height/2.0);
	var cx = e.clientX;
	var cy = e.clientY;
	var ex = e.clientX - midX;
	var ey = midY - e.clientY;
	var sx = (e.clientX - midX)/rect.width;
	var sy = (midY - e.clientY)/rect.height;
	return ([sx, sy, cx, cy]);
    };	
    
    this.stop = function () {
	if (this.clicked === true) {
	    this.clicked = false;
	    this.commands.stop();
	    console.log('stop!');
	    this.cursor.obj.makeInactive();
	}
    }

    this.callOnXY = function(e) {
	var active = false;
	if ((this.clicked === true) & (e.buttons === 1)) {
	    active = true;
	}
	var [sx, sy, cx, cy] = this.scaledXY(e);
	var [velocity, scaledVelocity] = this.commands.scaledCoordToVelocity(sx, sy);
	if (active) {
	    this.commands.move(velocity);
	    this.cursor.obj.makeActive();
	    console.log('velocity', velocity);
	} else {
	    this.cursor.obj.makeInactive();
	}
	var scale = this.cursor.scale(scaledVelocity);
	var arg = this.cursor.arg(scaledVelocity);
	this.cursor.obj.draw(cx, cy, scale, arg);
    }
    
    this.onMouseMove = function (e) {
	this.cursor.obj.show();
	this.callOnXY(e);
    };

    this.onMouseDown = function (e) {
	console.log('start...');
	this.clicked = true;
	this.callOnXY(e);
    };

    this.onLeave = function (e) {
	this.stop();
	this.cursor.obj.hide();
    }

    this.region.onmousemove = this.onMouseMove.bind(this);
    this.region.onmousedown = this.onMouseDown.bind(this);
    this.region.onmouseleave = this.onLeave.bind(this);
    this.region.onmouseup = this.stop.bind(this);

}

function createVelocityControl() {

    function Cursor(cursorElementId, overlayElementId, initCursor, drawCursor) {

	this.show = function () {
	    //this.cursor.setAttribute('visibility', 'visible');
	    this.element.setAttribute('display', 'inline');
	}

	this.hide = function () {
	    //this.cursor.setAttribute('visibility', 'hidden');
	    this.element.setAttribute('display', 'none');
	}
	
	this.makeActive = function () {
	    this.element.setAttribute('fill', 'white');
	    this.element.setAttribute('stroke', 'black');
	}

	this.makeInactive = function () {
	    this.element.setAttribute('fill', 'lightgrey');
	    this.element.setAttribute('stroke', 'grey');
	}
	
	this.draw = function (cx, cy, scale, arg) {
	    var pt = this.overlayElement.createSVGPoint();
	    pt.x = cx;
	    pt.y = cy;
	    var svgCoord = pt.matrixTransform(this.overlayElement.getScreenCTM().inverse());

	    drawCursor(this.element, svgCoord, scale, arg);
	}

	this.element = document.getElementById(cursorElementId);

	this.overlayElement = document.getElementById(overlayElementId);

	initCursor(this);
    }
    
    function initRotationCursor(obj) {
	var region;
	region = obj.element;

	var arrowWidth = 0.2;
	var arrowRadius = 1.0;
	var arrowHeadWidth = 0.25
	var arrowHeadLength = 0.45;
	
	// unit circle upper right hand 90 deg arc
	// d="M 1,0 a 1,1 0 0 1 1,1"

	var d = '';
	var r1 = arrowRadius + (arrowWidth/2.0);
	var x1 = r1;
	var y1 = 0;
	var x2 = 0;
	var y2 = y1 + r1;
	var r2 = arrowRadius - (arrowWidth/2.0);
	var x3 = 0;
	var y3 = y2 - arrowWidth;
	var x4 = r2;
	var y4 = 0;
	var ymid = y2 - (arrowWidth/2.0);

	// outer arc
	d = d + 'M ' + x1 + ',' + y1;
	d = d + ' A ' + r1 + ',' + r1 + ' 0 0 1 ' + x2 + ',' + y2;

	// arrow head
	d = d + ' L ' + x2 + ',' + y2;
	d = d + ' ' + x2 + ',' + (ymid + arrowHeadWidth);
	d = d + ' ' + (x2 - arrowHeadLength) + ',' + ymid;
	d = d + ' ' + x2 + ',' + (ymid - arrowHeadWidth);
	d = d + ' ' + x3 + ',' + y3;

	// inner arc
	d = d + ' A ' + r2 + ',' + r2 + ' 0 0 0 ' + x4 + ',' + y4;

	// flat end of arc
	d = d + ' Z';
	
	region.setAttribute('d', d);
    }

    function drawRotationCursor(cursorElement, svgCoord, scale, flip) {
	//console.log(this);
	var region;
	region = cursorElement;
	var sign;
	if(flip) {
	    sign = -1;
	} else {
	    sign = 1;
	}
	region.setAttribute('transform',
			    'translate(' + svgCoord.x + ', ' + svgCoord.y + ') scale(' + sign * scale + ',' + scale + ') rotate(-58)');
    }

    var rotationCursor = new Cursor('rotate_arrow', 'video_ui_overlay',
				    initRotationCursor, drawRotationCursor);


    function initArrowCursor(obj) {}
    
    function drawArrowCursor(cursorElement, svgCoord, scale, angleDeg) {
	var region = cursorElement;
	region.setAttribute('transform',
			    'translate(' + svgCoord.x + ', ' + svgCoord.y + ') scale(' + scale + ') rotate(' + angleDeg + ')');
    }

    var arrowCursor = new Cursor('down_arrow', 'video_ui_overlay',
				 initArrowCursor, drawArrowCursor);


    function initGripperCursor(obj) {}
    
    function drawGripperCursor(cursorElement, svgCoord, scale, aperture) {
	var region = cursorElement;
	region.setAttribute('transform',
			    'translate(' + svgCoord.x + ', ' + svgCoord.y + ') scale(' + scale + ')');

	region = document.getElementById('gripper_left_half');
	// aperture should be between 0 and 1
	region.setAttribute('d', 'M ' + -aperture + ',-0.5 a 0.1,0.1 0 0 0 0,1 Z');
	region = document.getElementById('gripper_right_half');
	// aperture should be between 0 and 1
	region.setAttribute('d', 'M ' + aperture + ',-0.5 a 0.1,0.1 0 0 1 0,1 Z');
    }

    var gripperCursor = new Cursor('gripper', 'video_ui_overlay',
				   initGripperCursor, drawGripperCursor);
    
    var maxDegPerSec = 60.0;
    
    function mouseToDegPerSec(d, flip, negative=false) {
	var degPerSec;
	//console.log(y,flip);
	if(flip) {
	    degPerSec = -(maxDegPerSec * (d - 0.5));
	} else {
	    degPerSec = maxDegPerSec * (d + 0.5);
	}
	
	if(degPerSec < 0.0) {
	    degPerSec = 0.0;
	}
	if(degPerSec > maxDegPerSec) {
	    degPerSec = maxDegPerSec;
	}

	if(flip) {
	    degPerSec = -degPerSec;
	}

	if(negative) {
	    degPerSec = -degPerSec;
	}   
	
	var scaledDegPerSec = degPerSec/maxDegPerSec;
	
	return [degPerSec, scaledDegPerSec];
	
    }

    function mouseToApertureWidth(sx) {
	var scaledVelocity = Math.abs(sx);
	var velocity;
	// aperture range: -6.0 to 14.0
	velocity = (scaledVelocity * 40.0) - 6.0;
	return [velocity, scaledVelocity];
    }

    function doNothing () {}

    ///////////

    var gripperCloseCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToApertureWidth(sx)); },
	move: gripperSetGoal,
	stop: doNothing
    }
	
    var gripperCloseCursor = {
	obj: gripperCursor,
	scale: function(scaledVelocity) { return(40.0); },
	arg: function(scaledVelocity) { return(scaledVelocity * 2.0); }
    }
    
    new VelocityUi('gripper_close_region', gripperCloseCommands, gripperCloseCursor);

    ///////////
    
    function arrowScale(scaledVelocity) {
	//console.log('scaledVelocity', scaledVelocity);
	var arrowMult = 20.0;
	var arrowAdd = 10.0;
	return ((Math.abs(scaledVelocity) * arrowMult) + arrowAdd);
    }

    function rotationScale(scaledVelocity) {
	var rotationMult = 50.0;
	var rotationAdd = 20.0;
	return ((Math.abs(scaledVelocity) * rotationMult) + rotationAdd);
    }
    
    ///////////
    
    var bendUpCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sy, false)); },
	move: wristVelocityBend, 
	stop: wristMotionStop,
    }
	
    var bendUpCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(180.0); }
    }

    new VelocityUi('wrist_bend_up_region', bendUpCommands, bendUpCursor);
    
    ///////////
    
    var bendDownCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sy, true)); },
	move: wristVelocityBend, 
	stop: wristMotionStop,
    }
	
    var bendDownCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(0.0); }
    }

    new VelocityUi('wrist_bend_down_region', bendDownCommands, bendDownCursor);

    ///////////
    
    var rollLeftCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sx, true)); },
	move: doNothing,
	stop: doNothing
    }
	
    var rollLeftCursor = {
	obj: rotationCursor,
	scale: function(scaledVelocity) { return(rotationScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(true); }
    }
    
    new VelocityUi('wrist_roll_left_region', rollLeftCommands, rollLeftCursor);

    ///////////
    
    var rollRightCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sx, false)); },
	move: doNothing,
	stop: doNothing
    }
	
    var rollRightCursor = {
	obj: rotationCursor,
	scale: function(scaledVelocity) { return(rotationScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(false); }
    }
    
    new VelocityUi('wrist_roll_right_region', rollRightCommands, rollRightCursor);

    ///////////

    var retractCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sx, false, true)); },
	move: doNothing,
	stop: doNothing
    }
	
    var retractCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(-90.0); }
    }
    
    new VelocityUi('arm_retract_region', retractCommands, retractCursor);

    ///////////
    
    var extendCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sx, true, true)); },
	move: doNothing,
	stop: doNothing
    }
	
    var extendCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(90.0); }
    }
    
    new VelocityUi('arm_extend_region', extendCommands, extendCursor);

    ///////////
    
    var raiseCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sy, false)); },
	move: doNothing,
	stop: doNothing,
    }
	
    var raiseCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(180.0); }
    }

    new VelocityUi('lift_up_region', raiseCommands, raiseCursor);

    ///////////

    var lowerCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sy, true)); },
	move: doNothing,
	stop: doNothing,
    }
	
    var lowerCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(0.0); }
    }

    new VelocityUi('lift_down_region', lowerCommands, lowerCursor);

    ///////////
    
    var forwardCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sy, false)); },
	move: doNothing,
	stop: doNothing,
    }
	
    var forwardCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(180.0); }
    }

    new VelocityUi('robot_forward_region', forwardCommands, forwardCursor);
    
    ///////////
    
    var backwardCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sy, true)); },
	move: doNothing,
	stop: doNothing,
    }
	
    var backwardCursor = {
	obj: arrowCursor,
	scale: function(scaledVelocity) { return(arrowScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(0.0); }
    }

    new VelocityUi('robot_backward_region', backwardCommands, backwardCursor);

    ///////////
    
    var turnLeftCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sx, true)); },
	move: doNothing,
	stop: doNothing
    }
	
    var turnLeftCursor = {
	obj: rotationCursor,
	scale: function(scaledVelocity) { return(rotationScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(true); }
    }
    
    new VelocityUi('robot_turn_left_region', turnLeftCommands, turnLeftCursor);

    ///////////
    
    var turnRightCommands = {
	scaledCoordToVelocity: function(sx, sy) { return(mouseToDegPerSec(sx, false)); },
	move: doNothing,
	stop: doNothing
    }
	
    var turnRightCursor = {
	obj: rotationCursor,
	scale: function(scaledVelocity) { return(rotationScale(scaledVelocity)); },
	arg: function(scaledVelocity) { return(false); }
    }
    
    new VelocityUi('robot_turn_right_region', turnRightCommands, turnRightCursor);

    ///////////
    

    // turn off the right click menu
    document.oncontextmenu = function() {
	return false;
    }
    document.ondrag = function() {
	return false;
    }
    document.ondragstart = function() {
	return false;
    }
}


THREEinit();
createUiRegions(true); // debug = true or false
