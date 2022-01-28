'use strict';


/*
* Base class for a video overlay
*/
export class Overlay {
    constructor() {
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
export class OverlaySVG extends Overlay {
    constructor() {
        super();
        this.regions = [];
        this.type = 'control';

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('preserveAspectRatio', 'none');
        this.svg.setAttribute('viewBox', "0 0 100 100");
        // FIXME: Old implementation had a "curtain" feature. What was this and do we need it?

    }

    addRegion(region) {
        this.regions.push(region);
        this.svg.appendChild(region.path)
        if (region.icon) this.svg.appendChild(region.icon)
    }

    createRegion(args) {
        const region = new Region(args)
        this.addRegion(region)
        return region
    }

    hide() {
        this.svg.style.display = "none"

    }

    show() {
        this.svg.style.display = ""
    }

}

/*
* Class for an THREE.js video overlay
*/
export class OverlayTHREE extends Overlay {
    constructor(camera) {
        super();
        this.objs = {};
        this.type = 'viz';
        this.scene = new THREE.Scene();
        this.camera = camera
        this.renderer = new THREE.WebGLRenderer({alpha: true});
        //this.renderer.setSize(200, 200);

        this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
        this.composer.addPass(new POSTPROCESSING.RenderPass(this.scene, camera));

        this.enabled = true;
    }

    getSVG() {
        return this.renderer.domElement;
    }

    addItem(obj) {
        this.objs[obj.name] = obj;
        this.scene.add(obj.mesh);
    }

    hide() {
        for (const obj in this.objs) {
            this.objs[obj].hide();
        }
        this.enabled = false
    }

    show() {
        this.enabled = true
        for (const obj in this.objs) {
            this.objs[obj].show();
        }
        this.animate()
    }

    render() {
        this.composer.render();
    }

    animate() {
        if (!this.enabled) {
            return;
        }
        this.render();
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Camera Position Information
const global_rotation_point = new THREE.Vector3(
    -0.001328,
    0,
    -0.053331
);

const global_reference_point = new THREE.Vector3(
    -0.001328,
    0.027765,
    -0.053331
);

const global_target_point = new THREE.Vector3(
    0.037582,
    -0.002706,
    0.019540000000000113
).add(global_reference_point);

let reference_to_rotation_offset = global_rotation_point.clone().sub(global_reference_point);
let rotation_to_target_offset = global_target_point.clone().sub(global_rotation_point);

export class ReachOverlay extends OverlayTHREE {

    constructor(camera) {
        super(camera);
        let reachCircle = new THREEObject(
            'reach_visualization_circle',
            new THREE.CircleGeometry(0.52, 32), // The arm has a 52 centimeter reach (source: https://hello-robot.com/product#:~:text=range%20of%20motion%3A%2052cm)
            new THREE.MeshBasicMaterial({color: 'rgb(246, 179, 107)', transparent: true, opacity: 0.25}),
        )
        this.addItem(reachCircle);
        let outlineEffect = new POSTPROCESSING.OutlineEffect(
            this.scene,
            this.camera,
            {visibleEdgeColor: 0xff9900});
        let outlineEffectPass = new POSTPROCESSING.EffectPass(
            this.camera,
            outlineEffect
        );
        outlineEffectPass.renderToScreen = true;
        outlineEffect.selectObject(reachCircle.mesh);
        this.composer.addPass(outlineEffectPass);
    }

    updateTransform(transform) {
        // Update the rotation and translation of the THREE.js camera to match the physical one
        let q_ros_space = new THREE.Quaternion(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);

        let order = 'XYZ'
        let e = new THREE.Euler(0, 0, 0, order);
        e.setFromQuaternion(q_ros_space, order);

        let q_inverse = q_ros_space.clone().invert();

        let reference_point = new THREE.Vector3(transform.translation.x, transform.translation.y, transform.translation.z);
        // z in global space is y in ros space
        let rotated_reference_to_rotation_offset = reference_to_rotation_offset.clone().applyEuler(new THREE.Euler(0, -e.z, e.y, 'XZY'));

        // TODO: Shouldn't this always be static, meaning that the previous math is unnecessary?
        let rotation_point = reference_point.clone().add(rotated_reference_to_rotation_offset);

        let rotated_rotation_offset_to_target_offset = rotation_to_target_offset.clone().applyEuler(new THREE.Euler(0, -e.z, e.y, 'XZY'));

        let target_point = rotation_point.clone().add(rotated_rotation_offset_to_target_offset);

        //threeManager.camera.position.copy(target_point);
        this.camera.position.copy(rosPostoTHREE(transform.translation));

        let e_three_space = rosEulerToTHREE(e, 'YZX');
        this.camera.rotation.copy(e_three_space);
    }
}

/*
* Class for an overlay region
*/
export class Region {
    path
    icon

    constructor({label, poly, iconImage, iconPosition, fillOpacity = 0.0, clickHandler, mouseDownHandler}) {
        this.label = label;

        const stroke_width = 2
        const width = 10

        if (iconImage) {
            let icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            icon.setAttribute("class", "overlay-icon")
            icon.setAttribute('width', String(width));
            icon.setAttribute('href', iconImage);
            if (!iconPosition) {
                iconPosition = getPolyCenter(poly)
            }
            icon.setAttribute('x', String(iconPosition.x));
            icon.setAttribute('y', String(iconPosition.y));
            icon.setAttribute('transform', `translate(${-width / 2},${-width / 2})`)
            this.icon = icon
        }

        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'overlay-region')
        path.setAttribute('fill-opacity', '0.3');
        path.setAttribute('stroke-opacity', '1.0');
        path.setAttribute('stroke-linejoin', "round");
        path.setAttribute('stroke-width', String(stroke_width));
        path.setAttribute('vector-effect', "non-scaling-stroke")
        path.setAttribute('d', svgPolyString(poly));
        if (iconImage) {
            path.style.cursor = `url(${iconImage}), pointer`
        }
        let tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title')
        tooltip.textContent = label
        path.appendChild(tooltip)
        this.path = path

        if (clickHandler) {
            this.setClickHandler(clickHandler)
        }
        if (mouseDownHandler) {
            this.setMouseDownHandler(mouseDownHandler)
        }
    }

    setClickHandler(handler) {
        this.path.onclick = handler
        this.path.classList.add("interactive", "clickable")
    }

    setMouseDownHandler(handler) {
        this.path.onmousedown = handler
        this.path.classList.add("interactive", "holdable")
    }
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


/*
* Class for a THREE.js object
*/
export class THREEObject {
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


/////// UTILITY FUNCTIONS //////////

export function svgPolyString(points) {
    let str = 'M ';
    for (let p of points) {
        str = str + p.x + ',' + p.y + ' ';
    }
    str = str + 'Z';
    return str;
}

export function makeRectangle(ulX, ulY, width, height) {
    return {
        ul: {x: ulX, y: ulY},
        ur: {x: ulX + width, y: ulY},
        ll: {x: ulX, y: ulY + height},
        lr: {x: ulX + width, y: ulY + height}
    };
}

export function makeSquare(ulX, ulY, width) {
    return makeRectangle(ulX, ulY, width, width);
}

export function rectToPoly(rect) {
    return [rect.ul, rect.ur, rect.lr, rect.ll];
}

function rosPostoTHREE(p) {
    return new THREE.Vector3(p.x, -p.y, p.z);
}

function rosEulerToTHREE(e, order) {
    return new THREE.Euler(
        e.z + (Math.PI / 2),
        0,
        e.y + (Math.PI / 2),
        order
    )
}

function encodeSvg(svgString) {
    return svgString.replace('<svg', (~svgString.indexOf('xmlns') ? '<svg' : '<svg xmlns="http://www.w3.org/2000/svg"'))

        //
        //   Encode (may need a few extra replacements)
        //
        .replace(/"/g, '\'')
        .replace(/%/g, '%25')
        .replace(/#/g, '%23')
        .replace(/{/g, '%7B')
        .replace(/}/g, '%7D')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E')

        .replace(/\s+/g, ' ')
//
//    The maybe list (add on documented fail)
//
//  .replace(/&/g, '%26')
//  .replace('|', '%7C')
//  .replace('[', '%5B')
//  .replace(']', '%5D')
//  .replace('^', '%5E')
//  .replace('`', '%60')
//  .replace(';', '%3B')
//  .replace('?', '%3F')
//  .replace(':', '%3A')
//  .replace('@', '%40')
}