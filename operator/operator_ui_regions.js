'use strict';

// TODO: This might be redundant with 'interfaceMode' remove after checking
var currentMode = null;
var navModeRegionIds
var lowArmModeRegionIds
var highArmModeRegionIds
var handModeRegionIds
var lookModeRegionIds
var modeRegions
var strokeOpacity = 0.0;
var w = videoDimensions.h;
var h = videoDimensions.w;


function turnModeUiOn(modeKey) {
    currentMode = modeKey;
    var buttonName = modeKey + '_mode_button'
    console.log('setting to checked: buttonName = ' + buttonName)
    document.getElementById(buttonName).checked = true
    arrangeOverlays(modeKey)
    // TODO update to operate on class objects, not svg names
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


var panTiltCameraModes = ['nav', 'low_arm', 'high_arm', 'hand', 'look'];
var panTiltCameraVideoControl = new VideoControl(panTiltCameraVideo, panTiltCameraModes);

/*
* Class for a video stream visualization with an overlay
* This is redundant at the moment but will be necessary
* soon, when we want to have more than one video stream
* visualization.
*/
function VideoControl(videoId) {
    this.videoId = videoId;
    this.combinedSVG = document.getElementById('video_ui_overlay'); //TODO unique name per video stream
    this.combinedSVG.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    this.overlays = {}; // key is mode id, value is the Overlay object

    this.addOverlay = function(overlay) {
        this.overlays[overlay.modeId] = overlay;
        this.combinedSVG.appendChild(overlay.svg);
    }
}

/*
* Class for a video overlay
*/
function Overlay(modeId) {
    this.videoId = videoId;
    this.regions = [];

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('id', modeId + '_ui_overlay');

    this.addRegion = function(region) {
        this.regions.push(region);
    }
}

/*
* Class for a video overlay
*/
function Region(regionId, fname, label, poly, color, parentSVG) {
    this.regionId = regionId;
    this.fname = fname;
    this.label = label;
    this.poly = poly;
    this.parentSVG = parentSVG;

    createPath(this.parentSVG, this.regionId, this.fname, this.label);
    setRegionPoly(this.regionId, this.poly, this.color);
}


function createUiRegions(debug) {

    if(debug) {
	   strokeOpacity = 0.1; //1.0;
    }
    var regionPoly;
    var color = 'white';
    var cornerRectSize = 40;
    
    /////////////////////////
    // nav
    /////////////////////////

    let navOverlay = new Overlay('nav');
    // Big rectangle at the borders of the video
    let bgRect = makeRectangle(0, 0, w, h);
    let smRect = makeSquare((w/2.0)-(w/20.0), (h*(3.0/4.0))-(h/20.0), w/10.0, h/10.0); 
    let leftRect = makeSquare(0, h-cornerRectSize, cornerRectSize);
    let rightRect = makeSquare(w-cornerRectSize, h-cornerRectSize, cornerRectSize); 

    navOverlay.addRegion(new Region('nav_forward_region', null, 'do nothing',
        rectToPoly(smRect), color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_do_nothing_region', 'moveForward', 'move forward',
        [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_backward_region', 'moveBackward' , 'move backward',
        [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_left_region', 'turnLeft' , 'turn left',
        [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_right_region', 'turnRight' , 'turn right',
        [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_cw_region', 'turnCW' , 'turn 90 degrees CW',
        rectToPoly(leftRect), color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_ccw_region', 'turnCCW' , 'turn 90 degrees CCW',
        rectToPoly(rightRect), color, navOverlay.svg));
    panTiltCameraVideoControl.combinedSVG.appendChild(navOverlay.svg);

    
    /////////////////////////
    // low_arm
    /////////////////////////

    let lowArmOverlay = new Overlay('low_arm');
    // Small rectangle at the top of the middle of the video
    let tpRect = makeRectangle(w*(3.0/10.0), h/4.0, w*(4.0/10.0), h/4.0);
    // small rectangle at the bottom of the middle of the video
    let btRect = makeRectangle(w*(3.0/10.0), h/2.0, w*(4.0/10.0), h/4.0);

    lowArmOverlay.addRegion(new Region('low_arm_up_region', 'liftUp' , 'lift arm',
        rectToPoly(tpRect), color, lowArmOverlay.svg));
    lowArmOverlay.addRegion(new Region('low_arm_down_region', 'liftDown' , 'lower arm',
        rectToPoly(btRect), color, lowArmOverlay.svg));
    lowArmOverlay.addRegion(new Region('low_arm_extend_region', 'armExtend' , 'extend arm',
        [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul], color, lowArmOverlay.svg));
    lowArmOverlay.addRegion(new Region('low_arm_retract_region', 'armRetract' , 'retract arm',
        [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll], color, lowArmOverlay.svg));
    lowArmOverlay.addRegion(new Region('low_arm_base_forward_region', 'moveForward' , 'move forward',
        [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll], color, lowArmOverlay.svg));
    lowArmOverlay.addRegion(new Region('low_arm_base_backward_region', 'moveBackward' , 'move backward',
        [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr], color, lowArmOverlay.svg));
    panTiltCameraVideoControl.combinedSVG.appendChild(lowArmOverlay.svg);
    

    /////////////////////////
    // high_arm
    /////////////////////////

    let highArmOverlay = new Overlay('high_arm');

    highArmOverlay.addRegion(new Region('high_arm_up_region', 'liftUp' , 'lift arm',
        rectToPoly(tpRect), color, highArmOverlay.svg));
    highArmOverlay.addRegion(new Region('high_arm_down_region', 'liftDown' , 'lower arm',
        rectToPoly(btRect), color, highArmOverlay.svg));
    highArmOverlay.addRegion(new Region('high_arm_extend_region', 'armExtend' , 'extend arm',
        [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul], color, highArmOverlay.svg));
    highArmOverlay.addRegion(new Region('high_arm_retract_region', 'armRetract' , 'retract arm',
        [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll], color, highArmOverlay.svg));
    highArmOverlay.addRegion(new Region('high_arm_base_forward_region', 'moveForward' , 'move forward',
        [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll], color, highArmOverlay.svg));
    highArmOverlay.addRegion(new Region('high_arm_base_backward_region', 'moveBackward' , 'move backward',
        [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr], color, highArmOverlay.svg));
    panTiltCameraVideoControl.combinedSVG.appendChild(highArmOverlay.svg);

    
    /////////////////////////
    // hand
    /////////////////////////

    let handOverlay = new Overlay('hand');

    tpRect = makeRectangle(0, 0, w, h/4.0);
    btRect = makeRectangle(0, 3.0*(h/4.0), w, h/4.0);
    smRect = makeRectangle(w/3.0, 2.0*(h/5.0), w/3.0, h/5.0);

    handOverlay.addRegion(new Region('hand_close_region', 'gripperClose' , 'close hand',
        rectToPoly(smRect), color, handOverlay.svg));
    handOverlay.addRegion(new Region('hand_out_region', 'gripperOpen' , 'open hand',
        rectToPoly(tpRect), color, handOverlay.svg));
    handOverlay.addRegion(new Region('hand_in_region', 'wristIn' , 'turn hand in',
        rectToPoly(btRect), color, handOverlay.svg));
    handOverlay.addRegion(new Region('hand_open_region', 'wristOut' , 'turn hand out'),
        [tpRect.ll, tpRect.lr, btRect.ur, btRect.ul, tpRect.ll, smRect.ul, 
        smRect.ll, smRect.lr, smRect.ur, smRect.ul], color, handOverlay.svg));
    panTiltCameraVideoControl.combinedSVG.appendChild(handOverlay.svg);

    /////////////////////////
    // look
    /////////////////////////

    let lookOverlay = new Overlay('look');

    tpRect = makeRectangle(0, 0, w, h/4.0);
    btRect = makeRectangle(0, 3.0*(h/4.0), w, h/4.0);
    let ltRect = makeRectangle(0, h/4.0, w/2.0, h/2.0);
    let rtRect = makeRectangle(w/2.0, h/4.0, w/2.0, h/2.0);

    lookOverlay.addRegion(new Region('look_up_region', 'lookUp' , 'look up',
        rectToPoly(tpRect), color, lookOverlay.svg));
    lookOverlay.addRegion(new Region('look_down_region', 'lookDown' , 'look down',
        rectToPoly(btRect), color, lookOverlay.svg));
    lookOverlay.addRegion(new Region('look_left_region', 'lookLeft' , 'look left',
        rectToPoly(ltRect), color, lookOverlay.svg));
    lookOverlay.addRegion(new Region('look_right_region', 'lookRight' , 'look right'),
        rectToPoly(rtRect), color, lookOverlay.svg));
    
    panTiltCameraVideoControl.addOverlay(lookOverlay);

}

/////// UTILITY FUNCTIONS //////////


function createPath(svg, id, fname, title){
    let path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('fill-opacity', '0.0');
    path.setAttribute('stroke-opacity', '1.0');
    path.setAttribute('id', id);
    if (fname) {
        path.setAttribute('onclick', ''+ fname + '()');
        path.setAttribute('onmousedown', "startAction('" + fname + "')");
    }
    path.setAttribute('title', title);    
    svg.appendChild(path);
}

function setRegionPoly(elementId, poly, color, stroke_width = 2, stroke_opacity = false) {
    var region = document.getElementById(elementId);
    region.setAttribute('stroke', color);
    region.setAttribute('stroke-opacity', String(stroke_opacity ? stroke_opacity : strokeOpacity));
    region.setAttribute('stroke-linejoin', "round");
    region.setAttribute('stroke-width', String(stroke_width));
    region.setAttribute('d', svgPolyString(poly));
}

function arrangeOverlays(key) {
    ///////////////////////
    let nx, ny, nw, nh;
    let w = videoDimensions.h
    let h = videoDimensions.w
    nx = 0
    ny = 0
    nw = w
    nh = h
    let bigViewBox = String(nx) + ' ' + String(ny) + ' ' + String(nw) + ' ' + String(nh);
    let overlayName = key + '_ui_overlay'
    let overlay = document.getElementById(overlayName);
    overlay.setAttribute('viewBox', bigViewBox);
}

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


createUiRegions(true); // debug = true or false


