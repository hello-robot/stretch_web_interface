'use strict';

/*
* Class for a video stream visualization with an overlay
* This is redundant at the moment but will be necessary
* soon, when we want to have more than one video stream
* visualization.
*/
class VideoControl {
    constructor(videoId, currentMode=null) {
        this.videoId = videoId;
        this.combinedSVG = document.getElementById(videoId + "Overlay");
        this.combinedSVG.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        this.overlays = {}; // key is mode id, values are the Overlay objects
        this.currentMode = currentMode;
        this.videoDiv = document.getElementById(videoId + "Div");
        this.video = document.getElementById(videoId);
        this.video.setAttribute("height", h);
        this.video.setAttribute("width", w);
        this.isActive = false;
    }

    addOverlay(overlay, type="svg") {
        if (this.overlays.hasOwnProperty(overlay.modeId)) {
            this.overlays[overlay.modeId].push(overlay);
        } else {
            this.overlays[overlay.modeId] = [overlay];
        }

        if (type === "svg")
            this.combinedSVG.appendChild(overlay.svg);
    }

    getModeNames() {
        return Object.keys(this.overlays);
    }

    setActive(isActive) {
        this.isActive = isActive;
        if (this.isActive){
            this.videoDiv.style.backgroundColor = "rgba(0,0,0,0.1)";
            this.overlays[this.currentMode].forEach( function(overlay) {
                overlay.show();
            });
        }
        else{
            this.videoDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
            this.overlays[this.currentMode].forEach( function(overlay) {
                overlay.hide();
            });
        }
    }
}

class THREEManager {
    constructor(camera, width, height) {
        this.camera = camera;
        this.width = width;
        this.height = height;

        this.overlays = {};
    }

    addOverlay(overlay) {
        this.overlays[overlay.modeId] = {
            overlay: overlay,
            render: true
        };
    }

    pauseOverlayRender(modeId) {
        this.overlays[modeId].render = false;
        this.overlays[modeId].overlay.render();
    }

    resumeOverlayRender(modeId) {
        this.overlays[modeId].render = true;
        this.overlays[modeId].overlay.render();
    }

    animate() {
        // TODO: Figure out how to properly pass self into a callback function
        requestAnimationFrame(() => {
            this.animate();
        });

        for (const overlay in this.overlays) {
            if (this.overlays[overlay].render) {
                this.overlays[overlay].overlay.render();
            }
        }
    }
}

/*
* Base class for a video overlay
*/
class Overlay {
    constructor(modeId) {
        this.modeId = modeId;
    }

    addItem() {
        console.warn("addItem() should be overridden by the child class");
    }

    hide() {
        console.warn("hide() should be overridden by the child class");
    }

    show() {
        console.warn("show() should be overridden by the child class");
    }
}

/*
* Class for an SVG video overlay
*/
class OverlaySVG extends Overlay {
    constructor(modeId) {
        super(modeId);
        this.regions = [];

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('preserveAspectRatio', 'none');
        this.svg.setAttribute('id', modeId + '_ui_overlay');

        ///////////////////////
        let w = videoDimensions.h;
        let h = videoDimensions.w;
        let bigViewBox = String(0) + ' ' + String(0) + ' ' + String(w) + ' ' + String(h);
        this.svg.setAttribute('viewBox', bigViewBox);


        let bgRect = makeRectangle(0, 0, w, h);
        this.curtain = new Region(modeId + '_curtain', null , 'curtain',
            rectToPoly(bgRect), 'white', null, this.svg, true, 0.5);
        
        this.addRegion(this.curtain);
    }

    addRegion(region) {
        this.regions.push(region);
    }

    hide() {
        for (let i in this.regions) {
            this.regions[i].hide();
        }
        this.curtain.show();
    }

    show() {
        for (let i in this.regions) {
            this.regions[i].show();
        }
        this.curtain.hide();
    }
}

/*
* Class for an THREE.js video overlay
*/
class OverlayTHREE extends Overlay {
    constructor(modeId, threeManager) {
        super(modeId);
        this.objs = {};

        this.threeManager = threeManager;
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setSize(this.threeManager.width, this.threeManager.height);
        $(`#${modeId}_ui_overlay`).parent().parent().prepend(this.renderer.domElement);

        this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
        this.composer.addPass(new POSTPROCESSING.RenderPass(this.scene, this.threeManager.camera));
    
        this.threeManager.addOverlay(this);
    }

    addRenderPass(renderPass) {
        this.composer.addPass(renderPass);
    }

    addItem(obj) {
        this.objs[obj.name] = obj;
        this.scene.add(obj.mesh);
    }

    hide() {
        for (const obj in this.objs) {
            this.objs[obj].hide();
        }
        this.threeManager.pauseOverlayRender(this.modeId);
    }

    show() {
        for (const obj in this.objs) {
            this.objs[obj].show();
        }
        this.threeManager.resumeOverlayRender(this.modeId);
    }

    render() {
        this.composer.render();
    }
}

/*
* Class for an overlay region
*/
class Region {
    constructor(regionId, fname, label, poly, color, iconName, parentSVG, isContinuous=true, fillOpacity=0.0) {
        this.regionId = regionId;
        this.fname = fname;
        this.label = label;
        this.poly = poly;
        this.isContinuous = isContinuous;
        this.parentSVG = parentSVG;

        if (iconName)
            createIconSVG(this.parentSVG, this.regionId + "Icon", iconName, poly);
        createRegionSVG(this.parentSVG, this.regionId, this.fname, this.label, 
            this.poly, color, this.isContinuous, fillOpacity);

    }

    hide() {
        document.getElementById(this.regionId).style.display = 'none';
        let iconElement = document.getElementById(this.regionId + "Icon");
        if (iconElement)
            iconElement.style.display = 'none';
    }

    show() {
        document.getElementById(this.regionId).style.display = 'block';
        let iconElement = document.getElementById(this.regionId + "Icon");
        if (iconElement)
            iconElement.style.display = 'block';
    }
}

function createIconSVG(parentSVG, id, iconName, poly) {
    const width = 30;
    let icon = document.createElementNS('http://www.w3.org/2000/svg','image');
    icon.setAttributeNS(null,'id', id);
    icon.setAttributeNS(null,'width', width);
    icon.setAttributeNS('http://www.w3.org/1999/xlink','href', 
        'icons/' + iconName + '.png');
    let center = getPolyCenter(poly)
    icon.setAttributeNS(null,'x', center.x-width/2);
    icon.setAttributeNS(null,'y', center.y-width/2);
    icon.setAttributeNS(null, 'visibility', 'visible');
    icon.setAttributeNS(null, 'opacity', "0.5");        
    parentSVG.appendChild(icon);    
}

function getPolyCenter(points) {
    let avgX = 0;
    let avgY = 0;
    for (let p of points) {
        avgX += p.x;
        avgY += p.y;
    }
    avgX /= points.length;
    avgY /= points.length;
    return {'x': avgX, 'y': avgY};
}


class THREEObject {
    constructor(name, geo, mat) {
        this.name = name;
        this.geo = geo;
        this.mat = mat;
        this.mesh = new THREE.Mesh(this.geo, this.mat);
    }

    hide() {
        this.mesh.visible = false;
    }

    show() {
        this.mesh.visible = true;
    }
}

function setMode(modeId) {
    if (modeId == 'nav') {
        if (!navigationVideoControl.isActive) {
            navigationVideoControl.setActive(true);
            manipulationVideoControl.setActive(false);
            let checkbox = document.getElementById('cameraFollowGripperOn');
            if (checkbox.checked)
                changeGripperFollow(false);
            
            // turnModeOn('nav');
            setCameraView('nav');
            // TODO: Is there some way to set this button list procedurally?
            document.getElementById('lookUpNavButton').disabled = false;
            document.getElementById('lookLeftNavButton').disabled = false;
            document.getElementById('lookRightNavButton').disabled = false;
            document.getElementById('lookDownNavButton').disabled = false;
            document.getElementById('resetViewNavButton').disabled = false;

            document.getElementById('lookUpManipButton').disabled = true;
            document.getElementById('lookLeftManipButton').disabled = true;
            document.getElementById('lookRightManipButton').disabled = true;
            document.getElementById('lookDownManipButton').disabled = true;
            document.getElementById('resetViewManipButton').disabled = true;
            //document.getElementById('gripperOpenButton').disabled = true;
            //document.getElementById('gripperCloseButton').disabled = true;
            document.getElementById('stowArmButton').disabled = true;
            document.getElementById('prepArmButton').disabled = true;
            document.getElementById('cameraFollowGripperOn').disabled = true;
        }
    }
    else if (modeId == 'manip') {
        if (!manipulationVideoControl.isActive) {
            navigationVideoControl.setActive(false);
            manipulationVideoControl.setActive(true);
            let checkbox = document.getElementById('cameraFollowGripperOn');
            if (checkbox.checked)
                changeGripperFollow(true);
            
            // turnModeOn('manip');
            setCameraView('manip');
            document.getElementById('lookUpNavButton').disabled = true;
            document.getElementById('lookLeftNavButton').disabled = true;
            document.getElementById('lookRightNavButton').disabled = true;
            document.getElementById('lookDownNavButton').disabled = true;
            document.getElementById('resetViewNavButton').disabled = true;

            document.getElementById('lookUpManipButton').disabled = false;
            document.getElementById('lookLeftManipButton').disabled = false;
            document.getElementById('lookRightManipButton').disabled = false;
            document.getElementById('lookDownManipButton').disabled = false;
            document.getElementById('resetViewManipButton').disabled = false;
            //document.getElementById('gripperOpenButton').disabled = false;
            //document.getElementById('gripperCloseButton').disabled = false;
            document.getElementById('stowArmButton').disabled = false;
            document.getElementById('prepArmButton').disabled = false;
            document.getElementById('cameraFollowGripperOn').disabled = false;
        }
    }
    else {
        console.log('Invalid mode: ' + modeId);
    }
}

// TODO: This might be redundant with 'interfaceMode' remove after checking
var strokeOpacity = 0.0;
var w = videoDimensions.h;
var h = videoDimensions.w;


function setCameraViewPreset() {
    if (panTiltCameraVideoControl.currentMode != null)
        setCameraView(panTiltCameraVideoControl.currentMode);
}

var navigationVideoControl = new VideoControl('navigationVideo', 'nav');
var manipulationVideoControl = new VideoControl('manipulationVideo', 'manip');

var threeManager = new THREEManager(new THREE.PerspectiveCamera(69, w/h, 0.1, 1000), w, h);


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

    let navOverlay = new OverlaySVG('nav');
    // Big rectangle at the borders of the video
    let bgRect = makeRectangle(0, 0, w, h);
    let smRect = makeSquare((w/2.0)-(w/20.0), (h*(3.0/4.0))-(h/20.0), w/10.0, h/10.0); 
    let leftRect = makeSquare(0, h-cornerRectSize, cornerRectSize);
    let rightRect = makeSquare(w-cornerRectSize, h-cornerRectSize, cornerRectSize); 

    navOverlay.addRegion(new Region('nav_do_nothing_region', null, 'do nothing',
        rectToPoly(smRect), color, null, navOverlay.svg));
    navOverlay.addRegion(new Region('nav_forward_region', 'moveForward', 'move forward',
        [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul], 
        color, 'up_arrow_medium', navOverlay.svg));
    navOverlay.addRegion(new Region('nav_backward_region', 'moveBackward' , 'move backward',
        [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll], 
        color, 'down_arrow_medium', navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_left_region', 'turnLeft' , 'turn left',
        [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul], 
        color, 'left_turn_medium', navOverlay.svg));
    navOverlay.addRegion(new Region('nav_turn_right_region', 'turnRight' , 'turn right',
        [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur], 
        color, 'right_turn_medium', navOverlay.svg));
    navOverlay.addRegion(new Region('nav_cw_region', 'turnCW' , 'turn 90 degrees CW',
        rectToPoly(leftRect), 
        color, 'rotate_cw', navOverlay.svg, false));
    navOverlay.addRegion(new Region('nav_ccw_region', 'turnCCW' , 'turn 90 degrees CCW',
        rectToPoly(rightRect), 
        color, 'rotate_ccw', navOverlay.svg, false));
    navigationVideoControl.addOverlay(navOverlay);

    /////////////// Reach visualization overlay ///////////

    let navOverlayTHREE = new OverlayTHREE('nav', threeManager);
    navOverlayTHREE.addItem(new THREEObject(
        'reach_visualization_circle',
        new THREE.CircleGeometry(0.52, 32), // The arm has a 52 centimeter reach (source: https://hello-robot.com/product#:~:text=range%20of%20motion%3A%2052cm)
        new THREE.MeshBasicMaterial({color: 'rgb(246, 179, 107)', transparent: true, opacity: 0.25}),
    ));
    var outlineEffect = new POSTPROCESSING.OutlineEffect(
        navOverlayTHREE.scene,
        navOverlayTHREE.threeManager.camera,
        {visibleEdgeColor: 0xff9900});
    var outlineEffectPass = new POSTPROCESSING.EffectPass(
        navOverlayTHREE.threeManager.camera,
        outlineEffect
    );
    outlineEffectPass.renderToScreen = true;
    outlineEffect.selectObject(navOverlayTHREE.objs.reach_visualization_circle.mesh);
    navOverlayTHREE.addRenderPass(outlineEffectPass);
    navigationVideoControl.addOverlay(navOverlayTHREE, "threejs");

    
    /////////////////////////
    // manipulation
    /////////////////////////

    let armOverlay = new OverlaySVG('manip');

    bgRect = makeRectangle(0, h/6.0, w, h-2.0*h/6.0);
    // Small rectangle at the top of the middle of the video
    let tpRect = makeRectangle(w*(3.0/10.0), 2.0*h/6.0, w*(4.0/10.0), h/6.0);
    // small rectangle at the bottom of the middle of the video
    let btRect = makeRectangle(w*(3.0/10.0), 3.0*h/6.0, w*(4.0/10.0), h/6.0);
    
    leftRect = makeRectangle(0, 0, w/2.0, h/6.0);
    rightRect = makeRectangle(w/2.0, 0, w/2.0, h/6.0);
    
    let leftRect2 = makeRectangle(0, 5.0*h/6.0, w/2.0, h/6.0);
    let rightRect2 = makeRectangle(w/2.0, 5.0*h/6.0, w/2.0, h/6.0);

    armOverlay.addRegion(new Region('manip_up_region', 'liftUp' , 'lift arm',
        rectToPoly(tpRect), 
        color, 'up_arrow_medium', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_down_region', 'liftDown' , 'lower arm',
        rectToPoly(btRect), 
        color, 'down_arrow_medium', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_extend_region', 'armExtend' , 'extend arm',
        [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul], 
        color, 'out_arrow', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_retract_region', 'armRetract' , 'retract arm',
        [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll], 
        color, 'in_arrow', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_base_forward_region', 'moveForward' , 'move forward',
        [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll], 
        color, 'left_arrow_medium', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_base_backward_region', 'moveBackward' , 'move backward',
        [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr], 
        color, 'right_arrow_medium', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_in_region', 'wristIn' , 'turn hand in',
        rectToPoly(leftRect), 
        color, 'left_turn_medium', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_out_region', 'wristOut' , 'turn hand out',
        rectToPoly(rightRect), 
        color, 'right_turn_medium', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_close_region', 'gripperClose' , 'open hand',
        rectToPoly(leftRect2), 
        color, 'gripper_close_medium', armOverlay.svg));
    armOverlay.addRegion(new Region('manip_open_region', 'gripperOpen' , 'close hand',
        rectToPoly(rightRect2), 
        color, 'gripper_open_medium', armOverlay.svg));

    manipulationVideoControl.addOverlay(armOverlay);
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

function createRegionSVG(parentSVG, id, fname, title, poly, color, isContinuous, fillOpacity, stroke_width = 2, stroke_opacity = 0.3) {
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
    path.setAttribute('stroke-opacity', String(stroke_opacity));
    path.setAttribute('fill', 'gray');
    path.setAttribute('fill-opacity', String(fillOpacity));
    path.setAttribute('stroke-linejoin', "round");
    path.setAttribute('stroke-width', String(stroke_width));
    path.setAttribute('d', svgPolyString(poly));
    parentSVG.appendChild(path);
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
threeManager.animate();
