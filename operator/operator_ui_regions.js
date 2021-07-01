'use strict';

// TODO: This might be redundant with 'interfaceMode' remove after checking
var strokeOpacity = 0.0;
var w = videoDimensions.h;
var h = videoDimensions.w;

    console.log("w:" + w);
    console.log("h:" + h);


function setCameraViewPreset() {
    if (panTiltCameraVideoControl.currentMode != null)
        setCameraView(panTiltCameraVideoControl.currentMode);
}


var navigationVideoControl = new VideoControl('navigationVideo');
var manipulationVideoControl = new VideoControl('manipulationVideo');

/*
* Class for a video stream visualization with an overlay
* This is redundant at the moment but will be necessary
* soon, when we want to have more than one video stream
* visualization.
*/
function VideoControl(videoId) {
    this.videoId = videoId;
    this.combinedSVG = document.getElementById(videoId + "Overlay");
    this.combinedSVG.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    this.overlays = {}; // key is mode id, value is the Overlay object
    this.currentMode = null;
    this.video = document.getElementById(videoId);
    this.video.setAttribute("height", h);
    this.video.setAttribute("width", w);

    this.addOverlay = function(overlay) {
        this.overlays[overlay.modeId] = overlay;
        this.combinedSVG.appendChild(overlay.svg);
    }

    this.setMode = function(modeId) {
        this.currentMode = modeId;
        let buttonName = modeId + '_mode_button';
        let button = document.getElementById(buttonName);
        if (button)
            button.checked = true;
        
        arrangeOverlays(modeId);

        const modeNames = this.getModeNames();
        for (let i in modeNames) {
            if (modeNames[i] !== modeId) {
                this.overlays[modeNames[i]].hide();
            }
        }
        this.overlays[modeId].show();
    }

    this.getModeNames = function() {
        return Object.keys(this.overlays);
    }
}

/*
* Class for a video overlay
*/
function Overlay(modeId) {
    this.modeId = modeId;
    this.regions = [];

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('id', modeId + '_ui_overlay');

    this.addRegion = function(region) {
        this.regions.push(region);
    }

    this.hide = function() {
        for (let i in this.regions) {
            this.regions[i].hide();
        }
    }

    this.show = function() {
        for (let i in this.regions) {
            this.regions[i].show();
        }
    }
}

/*
* Class for a video overlay
*/
function Region(regionId, fname, label, poly, color, parentSVG, isContinuous=true) {
    this.regionId = regionId;
    this.fname = fname;
    this.label = label;
    this.poly = poly;
    this.isContinuous = isContinuous;
    this.parentSVG = parentSVG;

    createRegionSVG(this.parentSVG, this.regionId, this.fname, this.label, 
        this.poly, color, this.isContinuous)

    this.hide = function() {
        document.getElementById(this.regionId).style.display = 'none';
    }

    this.show = function() {
        document.getElementById(this.regionId).style.display = 'block';
    }
}


function createUiRegions(debug) {

    if(debug) {
       strokeOpacity = 0.1; //1.0;
    }
    var regionPoly;
    var color = 'white';
    var cornerRectSize = 40;
    
    /////////////////////////
    // navigation
    /////////////////////////

    let navOverlay = new Overlay('nav');
    // Big rectangle at the borders of the video
    let bgRect = makeRectangle(0, 0, w, h);
    console.log("---w:" + w);
    console.log("---h:" + h);

    let smRect = makeSquare((w/2.0)-(w/20.0), (h*(3.0/4.0))-(h/20.0), w/10.0, h/10.0); 
    let leftRect = makeSquare(0, h-cornerRectSize, cornerRectSize);
    let rightRect = makeSquare(w-cornerRectSize, h-cornerRectSize, cornerRectSize); 

    navOverlay.addRegion(new Region('nav_do_nothing_region', null, 'do nothing',
        rectToPoly(smRect), color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_forward_region', 'moveForward', 'move forward',
        [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_backward_region', 'moveBackward' , 'move backward',
        [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_left_region', 'turnLeft' , 'turn left',
        [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_right_region', 'turnRight' , 'turn right',
        [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_cw_region', 'turnCW' , 'turn 90 degrees CW',
        rectToPoly(leftRect), color, navOverlay.svg, false));
    navOverlay.addRegion(new Region('nav_ccw_region', 'turnCCW' , 'turn 90 degrees CCW',
        rectToPoly(rightRect), color, navOverlay.svg, false));
    navigationVideoControl.addOverlay(navOverlay);
    navigationVideoControl.setMode("nav");

    
    /////////////////////////
    // manipulation
    /////////////////////////

    let armOverlay = new Overlay('low_arm');

    bgRect = makeRectangle(0, h/5.0, w, h-h/5.0);
    // Small rectangle at the top of the middle of the video
    let tpRect = makeRectangle(w*(3.0/10.0), 2.0*h/5.0, w*(4.0/10.0), h/5.0);
    // small rectangle at the bottom of the middle of the video
    let btRect = makeRectangle(w*(3.0/10.0), 3.0*h/5.0, w*(4.0/10.0), h/5.0);
    leftRect = makeRectangle(0, 0, w/2.0, h/5.0);
    rightRect = makeRectangle(w/2.0, 0, w/2.0, h/5.0);

    armOverlay.addRegion(new Region('low_arm_up_region', 'liftUp' , 'lift arm',
        rectToPoly(tpRect), color, armOverlay.svg));
    armOverlay.addRegion(new Region('low_arm_down_region', 'liftDown' , 'lower arm',
        rectToPoly(btRect), color, armOverlay.svg));
    armOverlay.addRegion(new Region('low_arm_extend_region', 'armExtend' , 'extend arm',
        [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul], color, armOverlay.svg));
    armOverlay.addRegion(new Region('low_arm_retract_region', 'armRetract' , 'retract arm',
        [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll], color, armOverlay.svg));
    armOverlay.addRegion(new Region('low_arm_base_forward_region', 'moveForward' , 'move forward',
        [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll], color, armOverlay.svg));
    armOverlay.addRegion(new Region('low_arm_base_backward_region', 'moveBackward' , 'move backward',
        [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr], color, armOverlay.svg));
    
    armOverlay.addRegion(new Region('hand_in_region', 'wristIn' , 'turn hand in',
        rectToPoly(leftRect), color, armOverlay.svg));
    armOverlay.addRegion(new Region('hand_out_region', 'wristOut' , 'turn hand out',
        rectToPoly(rightRect), color, armOverlay.svg));

    manipulationVideoControl.addOverlay(armOverlay);

    
    /////////////////////////
    // hand
    /////////////////////////

    // let handOverlay = new Overlay('hand');

    // tpRect = makeRectangle(0, 0, w, h/4.0);
    // btRect = makeRectangle(0, 3.0*(h/4.0), w, h/4.0);
    // smRect = makeRectangle(w/3.0, 2.0*(h/5.0), w/3.0, h/5.0);

    // handOverlay.addRegion(new Region('hand_close_region', 'gripperClose' , 'close hand',
    //     rectToPoly(smRect), color, handOverlay.svg));
    // handOverlay.addRegion(new Region('hand_out_region', 'wristOut' , 'turn hand out',
    //     rectToPoly(tpRect), color, handOverlay.svg));
    // handOverlay.addRegion(new Region('hand_in_region', 'wristIn' , 'turn hand in',
    //     rectToPoly(btRect), color, handOverlay.svg));
    // handOverlay.addRegion(new Region('hand_open_region', 'gripperOpen' , 'open hand',
    //     [tpRect.ll, tpRect.lr, btRect.ur, btRect.ul, tpRect.ll, smRect.ul, 
    //     smRect.ll, smRect.lr, smRect.ur, smRect.ul], color, handOverlay.svg));

}

const panTiltCameraModes = ['nav', 'low_arm', 'high_arm', 'hand', 'look'];
var panTiltCameraVideoControl;

function createUiV1Regions(debug) {

    panTiltCameraVideoControl = new VideoControl('panTiltCameraVideo');
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

    navOverlay.addRegion(new Region('nav_do_nothing_region', null, 'do nothing',
        rectToPoly(smRect), color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_forward_region', 'moveForward', 'move forward',
        [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_backward_region', 'moveBackward' , 'move backward',
        [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_left_region', 'turnLeft' , 'turn left',
        [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_right_region', 'turnRight' , 'turn right',
        [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur], color, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_cw_region', 'turnCW' , 'turn 90 degrees CW',
        rectToPoly(leftRect), color, navOverlay.svg, false));
    navOverlay.addRegion(new Region('nav_ccw_region', 'turnCCW' , 'turn 90 degrees CCW',
        rectToPoly(rightRect), color, navOverlay.svg, false));
    panTiltCameraVideoControl.addOverlay(navOverlay);

    
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
    panTiltCameraVideoControl.addOverlay(lowArmOverlay);


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
    panTiltCameraVideoControl.addOverlay(highArmOverlay);

    
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
    handOverlay.addRegion(new Region('hand_open_region', 'wristOut' , 'turn hand out',
        [tpRect.ll, tpRect.lr, btRect.ur, btRect.ul, tpRect.ll, smRect.ul, 
        smRect.ll, smRect.lr, smRect.ur, smRect.ul], color, handOverlay.svg));
    panTiltCameraVideoControl.addOverlay(handOverlay);

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
    lookOverlay.addRegion(new Region('look_right_region', 'lookRight' , 'look right',
        rectToPoly(rtRect), color, lookOverlay.svg));
    
    panTiltCameraVideoControl.addOverlay(lookOverlay);

}

/////// UTILITY FUNCTIONS //////////

function createRegionSVG(parentSVG, id, fname, title, poly, color, isContinuous, stroke_width = 2, stroke_opacity = false){
    let path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('fill-opacity', '0.0');
    path.setAttribute('stroke-opacity', '1.0');
    path.setAttribute('id', id);
    if (fname) {
        path.setAttribute('onclick', ''+ fname + '()');
        if (isContinuous) // Don't allow start and stop of action if it is not continuous
            path.setAttribute('onmousedown', "startAction('" + fname + "')");
    }
    path.setAttribute('title', title);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-opacity', String(stroke_opacity ? stroke_opacity : strokeOpacity));
    path.setAttribute('stroke-linejoin', "round");
    path.setAttribute('stroke-width', String(stroke_width));
    path.setAttribute('d', svgPolyString(poly));
    parentSVG.appendChild(path);
}

function arrangeOverlays(key) {
    ///////////////////////
    let w = videoDimensions.h;
    let h = videoDimensions.w;
    let nx = 0;
    let ny = 0;
    let nw = w;
    let nh = h;
    let bigViewBox = String(nx) + ' ' + String(ny) + ' ' + String(nw) + ' ' + String(nh);
    let overlayName = key + '_ui_overlay';
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

createUiRegions(true); // debug = true or false


