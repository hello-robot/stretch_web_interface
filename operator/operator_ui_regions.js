'use strict';


/*
* Class for a video stream visualization with an overlay
* This is redundant at the moment but will be necessary
* soon, when we want to have more than one video stream
* visualization.
*/
class VideoControl {
    constructor(videoId, mode, width, height, hasButtons=true) {

        this.currentMode = mode;
        this.overlays = {}; // key is mode id, values are a list of Overlay objects
        
        let containerDiv = document.getElementById(videoId + "Holder");

        ////////////////////////////////

        // Background div including the video element
        let bgDiv = document.createElement('div');
        bgDiv.setAttribute('class', 'background');
        this.video = document.createElement('video');
        this.video.setAttribute('id', videoId);
        this.video.setAttribute('autoplay', true);
        bgDiv.appendChild(this.video);
        
        // Foreground div including the overlay SVG
        let fgDiv = document.createElement('div');
        fgDiv.setAttribute('class', 'foreground');
        //fgDiv.setAttribute('onclick', "setMode('" + mode + "')");
        this.combinedSVG = document.createElement('svg');
        this.combinedSVG.setAttribute('id', videoId + 'Overlay');
        this.combinedSVG.setAttribute('class', 'video_ui_overlay');
        fgDiv.appendChild(this.combinedSVG);

        // Container grid div to combine the video and the overlay
        this.videoDiv = document.createElement('div');
        this.videoDiv.setAttribute('id', videoId + 'Div');
        this.videoDiv.setAttribute('class', 'video_div');
        this.videoDiv.appendChild(fgDiv);
        this.videoDiv.appendChild(bgDiv);

        ////////////////////////////////

        // Top row
        if (hasButtons){
            containerDiv.appendChild(document.createElement('div'));
            let upButtonDiv = document.createElement('div')
            let upButton = document.createElement('button')
            upButton.setAttribute('id', 'lookUpNavButton');
            upButton.setAttribute('type', 'button');
            upButton.setAttribute('class', 'btn btn-secondary btn-sm h-button');
            upButton.setAttribute('onclick', 'lookUp()');
            upButton.setAttribute('onmousedown', "startAction('lookUp')");
            upButton.setAttribute('title', "Look up");
            upButton.innerHTML = "^";
            upButtonDiv.appendChild(upButton);
            containerDiv.appendChild(upButtonDiv);
            containerDiv.appendChild(document.createElement('div'));
        }
        // else {
        //     containerDiv.appendChild(document.createElement('div'));
        // }

        // Middle row

        if (hasButtons){
            let leftButtonDiv = document.createElement('div')
            leftButtonDiv.setAttribute('class', "d-flex justify-content-start");
            let leftButton = document.createElement('button')
            leftButton.setAttribute('id', 'lookLeftNavButton');
            leftButton.setAttribute('type', 'button');
            leftButton.setAttribute('class', 'btn btn-secondary btn-sm v-button');
            leftButton.setAttribute('onclick', 'lookLeft()');
            leftButton.setAttribute('onmousedown', "startAction('lookLeft')");
            leftButton.setAttribute('title', "Look left");
            leftButton.innerHTML = "<"
            leftButtonDiv.appendChild(leftButton);
            containerDiv.appendChild(leftButtonDiv);
        }
        // else {
        //     containerDiv.appendChild(document.createElement('div'));
        // }

        // Add the video at the center
        containerDiv.appendChild(this.videoDiv);

       if (hasButtons){
            let rightButtonDiv = document.createElement('div')
            rightButtonDiv.setAttribute('class', "d-flex justify-content-start");
            let rightButton = document.createElement('button')
            rightButton.setAttribute('id', 'lookRightNavButton');
            rightButton.setAttribute('type', 'button');
            rightButton.setAttribute('class', 'btn btn-secondary btn-sm v-button');
            rightButton.setAttribute('onclick', 'lookRight()');
            rightButton.setAttribute('onmousedown', "startAction('lookRight')");
            rightButton.setAttribute('title', "Look right");
            rightButton.innerHTML = ">"
            rightButtonDiv.appendChild(rightButton);
            containerDiv.appendChild(rightButtonDiv);
        }
        // else {
        //     containerDiv.appendChild(document.createElement('div'));
        // }
  
        // Bottom row
        if (hasButtons){
            containerDiv.appendChild(document.createElement('div'));
            let downButtonDiv = document.createElement('div')
            let downButton = document.createElement('button')
            downButton.setAttribute('id', 'lookDownNavButton');
            downButton.setAttribute('type', 'button');
            downButton.setAttribute('class', 'btn btn-secondary btn-sm h-button');
            downButton.setAttribute('onclick', 'lookDown()');
            downButton.setAttribute('onmousedown', "startAction('lookDown')");
            downButton.setAttribute('title', "Look down");
            downButton.innerHTML = "v"
            downButtonDiv.appendChild(downButton);
            containerDiv.appendChild(downButtonDiv);
        }
        containerDiv.appendChild(document.createElement('div'));


      // Additional row
        if (hasButtons){
           containerDiv.appendChild(document.createElement('div'));
            let resetButtonDiv = document.createElement('div')
            let resetButton = document.createElement('button')
            resetButton.setAttribute('id', 'resetViewNavButton');
            resetButton.setAttribute('type', 'button');
            resetButton.setAttribute('class', 'btn btn-info btn-sm h-button');
            resetButton.setAttribute('onclick', "setCameraView('nav')");
            resetButton.setAttribute('title', "Reset camera view");
            resetButton.innerHTML = "Reset camera view";
            resetButtonDiv.appendChild(resetButton);
            containerDiv.appendChild(resetButtonDiv);
            containerDiv.appendChild(document.createElement('div'));
        }

        this.setDimensions(width, height);
        this.isActive = false;

    }

    addRemoteStream(stream) {
        this.video.srcObject = stream;
    }

    setDimensions(w, h) {
        this.video.setAttribute("width", w);        
        this.video.setAttribute("height", h);
        this.combinedSVG.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    }

    addOverlay(overlay) {
        if (this.overlays.hasOwnProperty(overlay.modeId)) {
            this.overlays[overlay.modeId].push(overlay);
        } else {
            this.overlays[overlay.modeId] = [overlay];
        }
    }

    setMode(modeId) {
        let modeNames = this.getModeNames();
        this.currentMode = modeId;

        // Clean up the SVG
        while (this.combinedSVG.lastChild) {
            this.combinedSVG.removeChild(this.combinedSVG.lastChild);
        }

        for (let m of modeNames) {
            let modeOverlays = this.overlays[m];
            for (let o of modeOverlays) {
                if (m == modeId) {
                    if (o.type === 'control')
                        this.combinedSVG.appendChild(o.svg);
                    o.show();
                }
                else {
                    o.hide();
                }
            }
        }
    }

    setActive(isActive) {
        this.isActive = isActive;
        console.log("this.currentMode", this.currentMode);
        console.log("this.overlays", this.overlays);

        let modeOverlays = this.overlays[this.currentMode];
        if (modeOverlays) {
            for (let o of modeOverlays) {
                if (o.type == 'control') {
                    o.setActive(isActive);
                }
            }
        }
    }

    getModeNames() {
        return Object.keys(this.overlays);
    }


    // setActive(isActive) {
    //     this.isActive = isActive;
    //     if (this.isActive){
    //         this.videoDiv.style.backgroundColor = "rgba(0,0,0,0.1)";
    //         this.overlays[this.currentMode].forEach( function(overlay) {
    //             overlay.show();
    //         });
    //     }
    //     else{
    //         this.videoDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
    //         this.overlays[this.currentMode].forEach( function(overlay) {
    //             overlay.hide();
    //         });
    //     }
    // }

    addIcons() {
        for (let overlay of this.overlays[this.currentMode]) {
            if (overlay.type == 'control') {
                overlay.addIcons(this.isActive);
            }
        }
    }

    removeIcons() {
        for (let overlay of this.overlays[this.currentMode]) {
            if (overlay.type == 'control') {
                overlay.removeIcons();
            }
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
    constructor(videoId, modeId) {
        this.modeId = modeId;
        this.videoId = videoId;
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
    constructor(videoId, modeId, width, height, hasCurtain=false) {
        super(videoId, modeId);
        this.regions = [];
        this.type = 'control';
        this.isActive = true;

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('preserveAspectRatio', 'none');
        this.svg.setAttribute('id', videoId + '_' + modeId + '_ui_overlay');

        ///////////////////////
        this.width = width;
        this.height = height;
        let bigViewBox = String(0) + ' ' + String(0) + ' ' + String(width) + ' ' + String(height);
        this.svg.setAttribute('viewBox', bigViewBox);

        if (hasCurtain) {
            let bgRect = makeRectangle(0, 0, width, height);
            this.curtain = new Region(modeId + '_curtain', null , 'curtain',
                rectToPoly(bgRect), 'white', null, this.svg, true, 0.5);
            
            this.addRegion(this.curtain);     
        }
    }

    addRegion(region) {
        this.regions.push(region);
    }

    hide() {
        for (let i in this.regions) {
            this.regions[i].hide();
        }
    }

    show() {
        for (let i in this.regions) {
            this.regions[i].show();
        }
    }

    setActive(isActive) {
        this.isActive = isActive;
        if (this.curtain){
            if (isActive){
                this.show();
                this.curtain.hide();
            }
            else {
                this.hide();
                this.curtain.show();
            }
        }
    }

    addIcons(isVisible) {
        for (let i in this.regions) {
            this.regions[i].addIcon();
            if (!isVisible)
                this.regions[i].hide();
        }
    }

    removeIcons() {
        for (let i in this.regions) {
            this.regions[i].removeIcon();
        }
    }

}

/*
* Class for an THREE.js video overlay
*/
class OverlayTHREE extends Overlay {
    constructor(videoId, modeId, threeManager) {
        super(videoId, modeId);
        this.objs = {};
        this.type = 'viz';
        this.threeManager = threeManager;
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setSize(this.threeManager.width, this.threeManager.height);
        $(`#${videoId}_${modeId}_ui_overlay`).parent().parent().prepend(this.renderer.domElement);

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
    constructor(regionId, fname, label, poly, color, iconName, parentSVG, isContinuous=true, isConvex=true, fillOpacity=0.0) {
        this.regionId = regionId;
        this.fname = fname;
        this.label = label;
        this.poly = poly;
        this.isContinuous = isContinuous;
        this.parentSVG = parentSVG;
        this.iconName = iconName;

        this.addIcon(isConvex);
        createRegionSVG(this.parentSVG, this.regionId, this.fname, this.label, 
            this.poly, color, this.isContinuous, fillOpacity);
    }

    hide() {
        let elem = document.getElementById(this.regionId);
        if (elem)
            elem.style.display = 'none';
        let iconElement = document.getElementById(this.regionId + "Icon");
        if (iconElement)
            iconElement.style.display = 'none';
    }

    show() {
        let elem = document.getElementById(this.regionId);
        if (elem)
            elem.style.display = 'block';
        let iconElement = document.getElementById(this.regionId + "Icon");
        if (iconElement)
            iconElement.style.display = 'block';
    }

    removeIcon() {
        let id = this.regionId + "Icon";
        let icon = document.getElementById(id);
        if (icon)
            this.parentSVG.removeChild(icon);               
    }

    addIcon(isConvex) {
        const width = 30;
        let id = this.regionId + "Icon";
        if (this.iconName) {
            let icon = document.createElementNS('http://www.w3.org/2000/svg','image');
            icon.setAttributeNS(null,'id', id);
            icon.setAttributeNS(null,'width', width);
            icon.setAttributeNS('http://www.w3.org/1999/xlink','href', 
                this.iconName + '.png');
            let center = getPolyCenter(this.poly, isConvex)
            icon.setAttributeNS(null,'x', center.x-width/2);
            icon.setAttributeNS(null,'y', center.y-width/2);
            icon.setAttributeNS(null, 'visibility', 'visible');
            icon.setAttributeNS(null, 'opacity', "0.5");        
            this.parentSVG.appendChild(icon);               
        }
    }
}


function getPolyCenter(points, isConvex) {
    let avgX = 0;
    let avgY = 0;

    if (!isConvex)
        points = points.slice(1,5);

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
    let modeButtonNav = document.getElementById('modeButtonNav');
    let modeButtonManip = document.getElementById('modeButtonManip');
 
    panTiltVideoControl.setMode(modeId);
    overheadVideoControl.setMode(modeId);
    gripperVideoControl.setMode(modeId);

    if (modeId == 'nav') {
            
        let checkbox = document.getElementById('cameraFollowGripperOn');
        if (checkbox && checkbox.checked)
            changeGripperFollow(false);
        
        setCameraView('nav');
        modeButtonNav.classList.add('btn-info');
        modeButtonManip.classList.remove('btn-info');
    }
    else if (modeId == 'manip') {
        let checkbox = document.getElementById('cameraFollowGripperOn');
        if (checkbox && checkbox.checked)
            changeGripperFollow(true);
        
        setCameraView('manip');
        modeButtonNav.classList.remove('btn-info');
        modeButtonManip.classList.add('btn-info');
    }
    else {
        console.log('Invalid mode: ' + modeId);
    }
}

var threeManager = new THREEManager(new THREE.PerspectiveCamera(69, 
    videoDimensions.h/videoDimensions.w, 0.1, 1000), videoDimensions.h, videoDimensions.w);

var navOverlay = new OverlaySVG('pantiltVideo', 'nav', videoDimensions.h, videoDimensions.w);
var navOverlayTHREE = new OverlayTHREE('pantiltVideo', 'nav', threeManager);
var armOverlay = new OverlaySVG('pantiltVideo', 'manip', videoDimensions.h, videoDimensions.w);

var navOverheadOverlay = new OverlaySVG('overheadVideo', 'nav', wideVideoDimensions.w, wideVideoDimensions.h);
var armOverheadOverlay = new OverlaySVG('overheadVideo', 'manip', wideVideoDimensions.w, wideVideoDimensions.h);

var navGripperOverlay = new OverlaySVG('gripperVideo', 'nav', wideVideoDimensions.w, wideVideoDimensions.h);
var armGripperOverlay = new OverlaySVG('gripperVideo', 'manip', wideVideoDimensions.w, wideVideoDimensions.h);


var overheadVideoControl = new VideoControl('overheadVideo', 'nav', wideVideoDimensions.w, wideVideoDimensions.h, false);
var panTiltVideoControl = new VideoControl('pantiltVideo', 'nav', videoDimensions.h, videoDimensions.w, true);
var gripperVideoControl = new VideoControl('gripperVideo', 'nav', wideVideoDimensions.w, wideVideoDimensions.h, false);


function createUiRegions() {

    var regionPoly;
    var color = 'white';
    var cornerRectSize = 40;
    
    // FIRST PAN_TILT CAMERA OVERLAYS

    let w = videoDimensions.h;
    let h = videoDimensions.w;
    
    /////////////////////////
    // navigation
    /////////////////////////

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

    /////////////// Reach visualization overlay ///////////

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
       
    /////////////////////////
    // manipulation
    /////////////////////////

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

    //////////////////////////////////////////////

    panTiltVideoControl.addOverlay(navOverlay);
    panTiltVideoControl.addOverlay(navOverlayTHREE);
    panTiltVideoControl.addOverlay(armOverlay);
    panTiltVideoControl.setMode('manip');
    panTiltVideoControl.setActive(true);

    //////////////////////////////////////////////

    // navigation

    // big rectangle at the borders of the video
    let camW = wideVideoDimensions.w;
    let camH = wideVideoDimensions.h;
    bgRect = makeRectangle(0, 0, camW, camH);
    let arm_region_width = camW/6.0;
    let navRect = makeRectangle(arm_region_width, 0, 
        camW - 2.0 * arm_region_width, camH);
    let mobile_base_width = camW/10.0;
    let mobile_base_height = camH/10.0;
    
    // small rectangle around the mobile base
    let baseRect = makeSquare((camW/2.0) - (mobile_base_width/2.0),
                  (3*camH/4.0) - (mobile_base_height/2.0),
                  mobile_base_width, mobile_base_height); 

    navOverheadOverlay.addRegion(new Region('overhead_nav_do_nothing_region', 
        '' , 'do nothing', rectToPoly(baseRect), 
        color, '', navOverheadOverlay.svg));

    navOverheadOverlay.addRegion(new Region('overhead_nav_forward_region', 
        'moveForward' , 'move forward', [navRect.ul, navRect.ur, baseRect.ur, baseRect.ul], 
        color, 'up_arrow_medium', navOverheadOverlay.svg));

    navOverheadOverlay.addRegion(new Region('overhead_nav_backward_region', 
        'moveBackward' , 'move back', [navRect.ll, navRect.lr, baseRect.lr, baseRect.ll],    
        color, 'down_arrow_medium', navOverheadOverlay.svg));

    navOverheadOverlay.addRegion(new Region('overhead_nav_turn_left_region', 
        'turnLeft' , 'turn left', [navRect.ul, baseRect.ul, baseRect.ll, navRect.ll],
        color, 'left_turn_medium', navOverheadOverlay.svg));

    navOverheadOverlay.addRegion(new Region('overhead_nav_turn_right_region', 
        'turnRight' , 'turn right', [navRect.ur, baseRect.ur, baseRect.lr, navRect.lr],
        color, 'right_turn_medium', navOverheadOverlay.svg));

    navOverheadOverlay.addRegion(new Region('overhead_nav_arm_retract_region', 
        'armRetract' , 'retract arm', [bgRect.ul, navRect.ul, navRect.ll, bgRect.ll],
        color, 'left_arrow_medium', navOverheadOverlay.svg));

    navOverheadOverlay.addRegion(new Region('overhead_nav_arm_extend_region', 
        'armExtend' , 'extend arm', [navRect.ur, bgRect.ur, bgRect.lr, navRect.lr],
        color, 'right_arrow_medium', navOverheadOverlay.svg));

    var wrist_region_width = camW/5.0;
    var lift_region_height = camH/5.0;
    var handRect = makeRectangle(wrist_region_width, lift_region_height,
                 camW - (2.0*wrist_region_width),
                 camH - (2.0*lift_region_height));
    
    var fingertip_width = camW/5.0;
    var fingertip_height = camH/5.0;
    
    var fingertipRect = makeRectangle((camW/2.0) - (fingertip_width/2.0),
                      (camH/2.0) - (fingertip_height/2.0),
                      fingertip_width, fingertip_height);

    var liftUpRect = makeRectangle(0, 0,
                   camW, lift_region_height);
    var liftDownRect = makeRectangle(0, camH - lift_region_height,
                     camW, lift_region_height);
    
    var wristInRect = makeRectangle(0, lift_region_height,
                    wrist_region_width, camH - (2.0*lift_region_height));
    var wristOutRect = makeRectangle(camW - wrist_region_width, lift_region_height,
                     wrist_region_width, camH - (2.0*lift_region_height));

    navGripperOverlay.addRegion(new Region('gripper_nav_close_region', 
        'gripperClose' , 'close hand', rectToPoly(fingertipRect), 
        color, 'gripper_close_medium', navGripperOverlay.svg));
    regionPoly = [wristInRect.ur, wristOutRect.ul, wristOutRect.ll, fingertipRect.lr,
          fingertipRect.ur, fingertipRect.ul, fingertipRect.ll, fingertipRect.lr,
          wristOutRect.ll, wristInRect.lr];
    navGripperOverlay.addRegion(new Region('gripper_nav_open_region', 
        'gripperOpen' , 'open hand', regionPoly, 
        color, 'gripper_open_medium', navGripperOverlay.svg, true, false)); //concave region
    navGripperOverlay.addRegion(new Region('gripper_nav_in_region', 
        'wristIn' , 'turn wrist in', rectToPoly(wristInRect), 
        color, 'left_turn_medium', navGripperOverlay.svg));
    navGripperOverlay.addRegion(new Region('gripper_nav_out_region', 
        'wristOut' , 'turn wrist out', rectToPoly(wristOutRect), 
        color, 'right_turn_medium', navGripperOverlay.svg));
    navGripperOverlay.addRegion(new Region('gripper_nav_up_region', 
        'liftUp' , 'lift arm up', rectToPoly(liftUpRect), 
        color, 'up_arrow_medium', navGripperOverlay.svg));
    navGripperOverlay.addRegion(new Region('gripper_nav_down_region', 
        'liftDown' , 'lower arm down', rectToPoly(liftDownRect), 
        color, 'down_arrow_medium', navGripperOverlay.svg));

    armGripperOverlay.addRegion(new Region('gripper_manip_close_region', 
        'gripperClose' , 'close hand', rectToPoly(fingertipRect), 
        color, 'gripper_close_medium', armGripperOverlay.svg));
    regionPoly = [wristInRect.ur, wristOutRect.ul, wristOutRect.ll, fingertipRect.lr,
          fingertipRect.ur, fingertipRect.ul, fingertipRect.ll, fingertipRect.lr,
          wristOutRect.ll, wristInRect.lr];
    armGripperOverlay.addRegion(new Region('gripper_manip_open_region', 
        'gripperOpen' , 'open hand', regionPoly, 
        color, 'gripper_open_medium', armGripperOverlay.svg, true, false)); //concave region
    armGripperOverlay.addRegion(new Region('gripper_manip_in_region', 
        'wristIn' , 'turn wrist in', rectToPoly(wristInRect), 
        color, 'left_turn_medium', armGripperOverlay.svg));
    armGripperOverlay.addRegion(new Region('gripper_manip_out_region', 
        'wristOut' , 'turn wrist out', rectToPoly(wristOutRect), 
        color, 'right_turn_medium', armGripperOverlay.svg));
    armGripperOverlay.addRegion(new Region('gripper_manip_up_region', 
        'liftUp' , 'lift arm up', rectToPoly(liftUpRect), 
        color, 'up_arrow_medium', armGripperOverlay.svg));
    armGripperOverlay.addRegion(new Region('gripper_manip_down_region', 
        'liftDown' , 'lower arm down', rectToPoly(liftDownRect), 
        color, 'down_arrow_medium', armGripperOverlay.svg));    

    // /////// MANIPULATION MODE NAVIGATION VIDEO ////////
    color = 'white'

    // big rectangle at the borders of the video
    bgRect = makeRectangle(0, 0, camW, camH);

    var turn_region_width = camW/5.0;
    var arm_region_height = camH/3.0;
    
    navRect = makeRectangle(turn_region_width, 0,
                camW - (2.0*turn_region_width), camH);

    mobile_base_width = camW/10.0;
    mobile_base_height = camH/10.0;
    
    // small rectangle around the mobile base
    baseRect = makeSquare((camW/2.0) - (mobile_base_width/2.0),
              (2.0*(camH/3.0)) - (mobile_base_height/2.0),
              mobile_base_width, mobile_base_height);

    var turnLeftRect = makeRectangle(0, 0, turn_region_width, camH);
    var turnRightRect = makeRectangle(camW-turn_region_width, 0, turn_region_width, camH);
    
    var armExtendRect = makeRectangle(turn_region_width, 0,
                      camW - (2.0*turn_region_width), arm_region_height);
    var armRetractRect = makeRectangle(turn_region_width, camH - arm_region_height,
                       camW - (2.0*turn_region_width), arm_region_height);

    var base_region_width = (camW/2.0)-turn_region_width;
    
    var baseForwardRect = makeRectangle(turn_region_width, arm_region_height,
                    base_region_width, camH-(2.0*arm_region_height));
    var baseBackwardRect = makeRectangle(turn_region_width + base_region_width, arm_region_height,
                     base_region_width, camH-(2.0*arm_region_height));
    
    armOverheadOverlay.addRegion(new Region('overhead_manip_turn_left_region', 
        'wristIn' , 'turn wrist in', rectToPoly(turnLeftRect), 
        color, 'left_turn_medium', armOverheadOverlay.svg));
    
    armOverheadOverlay.addRegion(new Region('overhead_manip_turn_right_region', 
        'wristOut' , 'turn wrist out', rectToPoly(turnRightRect), 
        color, 'right_turn_medium', armOverheadOverlay.svg));

    armOverheadOverlay.addRegion(new Region('overhead_manip_base_forward_region', 
        'moveForward' , 'move base forward', rectToPoly(baseForwardRect), 
        color, 'left_arrow_medium', armOverheadOverlay.svg));

    armOverheadOverlay.addRegion(new Region('overhead_manip_base_backward_region', 
        'moveBackward' , 'move base forward', rectToPoly(baseBackwardRect), 
        color, 'right_arrow_medium', armOverheadOverlay.svg));

    armOverheadOverlay.addRegion(new Region('overhead_manip_arm_retract_region', 
        'armRetract' , 'retract arm', rectToPoly(armRetractRect), 
        color, 'in_arrow', armOverheadOverlay.svg));

    armOverheadOverlay.addRegion(new Region('overhead_manip_arm_extend_region', 
        'armExtend' , 'extend arm', rectToPoly(armExtendRect), 
        color, 'out_arrow', armOverheadOverlay.svg));

    // manipulation

    // armOverheadOverlay.addRegion();

    overheadVideoControl.addOverlay(navOverheadOverlay);
    overheadVideoControl.addOverlay(armOverheadOverlay);

    gripperVideoControl.addOverlay(navGripperOverlay);
    gripperVideoControl.addOverlay(armGripperOverlay);

    overheadVideoControl.setMode('nav');
    overheadVideoControl.setActive(true);

    gripperVideoControl.setMode('nav');
    gripperVideoControl.setActive(true);

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


createUiRegions(); // debug = true or false
threeManager.animate();
