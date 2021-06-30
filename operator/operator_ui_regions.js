'use strict';

// TODO: This might be redundant with 'interfaceMode' remove after checking
var currentMode = null;

function turnModeUiOn(modeKey) {
    currentMode = modeKey;
    var buttonName = modeKey + '_mode_button'
    console.log('setting to checked: buttonName = ' + buttonName)
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

var navModeRegionIds
var lowArmModeRegionIds
var highArmModeRegionIds
var handModeRegionIds
var lookModeRegionIds
var modeRegions
var strokeOpacity = 0.0;
var w = videoDimensions.h;
var h = videoDimensions.w;


function createUiRegions(debug) {

    if(debug) {
	   strokeOpacity = 0.1; //1.0;
    }

    let combinedSVG = document.getElementById('video_ui_overlay');

    //////////////////////////////
    // set size of video region

    // D435i has a -90 rotation
    
    var video_region = document.getElementById('video_ui_overlay');
    video_region.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    //////////////////////////////
            
    //////////////////////////////
    
    var sqrW, bgSqr, mdSqr, smSqr, regionPoly;
    var mdBar, smBar, mHoriz, lHoriz, rHoriz, mVert; 
    var color;
    
    /////////////////////////
    color = 'white'
    var cornerRectSize = 40;

    let navOverlaySVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    navOverlaySVG.setAttribute('preserveAspectRatio', 'none');
    navOverlaySVG.setAttribute('id', 'nav_ui_overlay');
    createPath(navOverlaySVG, 'nav_do_nothing_region', null, 'do nothing');
    createPath(navOverlaySVG, 'nav_forward_region', 'moveForward' , 'move forward');
    createPath(navOverlaySVG, 'nav_backward_region', 'moveBackward' , 'move backward');
    createPath(navOverlaySVG, 'nav_turn_left_region', 'turnLeft' , 'turn left');
    createPath(navOverlaySVG, 'nav_turn_right_region', 'turnRight' , 'turn right');
    createPath(navOverlaySVG, 'nav_ccw_region', 'turnCCW' , 'turn 90 degrees CCW');
    createPath(navOverlaySVG, 'nav_cw_region', 'turnCW' , 'turn 90 degrees CW');
    combinedSVG.appendChild(navOverlaySVG);

    // big rectangle at the borders of the video
    var bgRect = makeRectangle(0, 0, w, h);
    // small rectangle around the mobile base
    //var smRect = makeSquare(w*(7.0/16.0), h*(7.0/16.0), w/8.0, h/8.0);
    var smRect = makeSquare((w/2.0)-(w/20.0), (h*(3.0/4.0))-(h/20.0), w/10.0, h/10.0); 
    var leftRect = makeSquare(0, h-cornerRectSize, cornerRectSize);
    var rightRect = makeSquare(w-cornerRectSize, h-cornerRectSize, cornerRectSize); 

    regionPoly = rectToPoly(smRect);
    setRegionPoly('nav_do_nothing_region', regionPoly, color);

    regionPoly = [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul];
    setRegionPoly('nav_forward_region', regionPoly, color);

    regionPoly = [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll];
    setRegionPoly('nav_backward_region', regionPoly, color);

    regionPoly = [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul];
    setRegionPoly('nav_turn_left_region', regionPoly, color);

    regionPoly = [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur];
    setRegionPoly('nav_turn_right_region', regionPoly, color);

    setRegionPoly('nav_cw_region', rectToPoly(leftRect), color, 1, 0.5);
    // drawText('ccw_cw_text_region','⤹ 90°', cornerRectSize/2, h-cornerRectSize+cornerRectSize/1.5, 16, true)
    
    setRegionPoly('nav_ccw_region', rectToPoly(rightRect), color, 1, 0.5);
    // drawText('ccw_cw_text_region','90° ⤸', w-cornerRectSize+cornerRectSize/2, h-cornerRectSize+cornerRectSize/1.5, 16, true);

    navModeRegionIds = ['nav_do_nothing_region', 'nav_forward_region', 
        'nav_backward_region', 'nav_turn_left_region', 'nav_turn_right_region', 
        'nav_ccw_region', 'nav_cw_region']

    
    ///////////////////////
    color = 'white'

    let arm1OverlaySVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arm1OverlaySVG.setAttribute('preserveAspectRatio', 'none');
    arm1OverlaySVG.setAttribute('id', 'low_arm_ui_overlay');
    createPath(arm1OverlaySVG, 'low_arm_up_region', 'liftUp' , 'lift arm');
    createPath(arm1OverlaySVG, 'low_arm_down_region', 'liftDown' , 'lower arm');
    createPath(arm1OverlaySVG, 'low_arm_extend_region', 'armExtend' , 'extend arm');
    createPath(arm1OverlaySVG, 'low_arm_retract_region', 'armRetract' , 'retract arm');
    createPath(arm1OverlaySVG, 'low_arm_base_forward_region', 'moveForward' , 'move forward');
    createPath(arm1OverlaySVG, 'low_arm_base_backward_region', 'moveBackward' , 'move backward');
    combinedSVG.appendChild(arm1OverlaySVG);

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
    
    lowArmModeRegionIds = ['low_arm_down_region', 'low_arm_up_region', 
        'low_arm_extend_region', 'low_arm_retract_region',
        'low_arm_base_forward_region','low_arm_base_backward_region']
    

    ///////////////////////
    color = 'white'

    let arm2OverlaySVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arm2OverlaySVG.setAttribute('preserveAspectRatio', 'none');
    arm2OverlaySVG.setAttribute('id', 'high_arm_ui_overlay');
    createPath(arm2OverlaySVG, 'high_arm_up_region', 'liftUp' , 'lift arm');
    createPath(arm2OverlaySVG, 'high_arm_down_region', 'liftDown' , 'lower arm');
    createPath(arm2OverlaySVG, 'high_arm_extend_region', 'armExtend' , 'extend arm');
    createPath(arm2OverlaySVG, 'high_arm_retract_region', 'armRetract' , 'retract arm');
    createPath(arm2OverlaySVG, 'high_arm_base_forward_region', 'moveForward' , 'move forward');
    createPath(arm2OverlaySVG, 'high_arm_base_backward_region', 'moveBackward' , 'move backward');
    combinedSVG.appendChild(arm2OverlaySVG);


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
    
    highArmModeRegionIds = ['high_arm_down_region', 'high_arm_up_region',
        'high_arm_extend_region', 'high_arm_retract_region',
        'high_arm_base_forward_region','high_arm_base_backward_region']
    

    ///////////////////////
    color = 'white'

    let handOverlaySVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    handOverlaySVG.setAttribute('preserveAspectRatio', 'none');
    handOverlaySVG.setAttribute('id', 'hand_ui_overlay');
    createPath(handOverlaySVG, 'hand_close_region', 'lookUp' , 'look up');
    createPath(handOverlaySVG, 'hand_out_region', 'lookDown' , 'look down');
    createPath(handOverlaySVG, 'hand_in_region', 'lookLeft' , 'look left');
    createPath(handOverlaySVG, 'hand_open_region', 'lookRight' , 'look right');
    combinedSVG.appendChild(handOverlaySVG);

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

    let lookOverlaySVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lookOverlaySVG.setAttribute('preserveAspectRatio', 'none');
    lookOverlaySVG.setAttribute('id', 'look_ui_overlay');
    createPath(lookOverlaySVG, 'look_up_region', 'lookUp' , 'look up');
    createPath(lookOverlaySVG, 'look_down_region', 'lookDown' , 'look down');
    createPath(lookOverlaySVG, 'look_left_region', 'lookLeft' , 'look left');
    createPath(lookOverlaySVG, 'look_right_region', 'lookRight' , 'look right');
    combinedSVG.appendChild(lookOverlaySVG);

    tpRect = makeRectangle(0, 0, w, h/4.0);
    btRect = makeRectangle(0, 3.0*(h/4.0), w, h/4.0);
    let ltRect = makeRectangle(0, h/4.0, w/2.0, h/2.0);
    let rtRect = makeRectangle(w/2.0, h/4.0, w/2.0, h/2.0);
    
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

/////// UTILITY FUNCTIONS //////////

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


