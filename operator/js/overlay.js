'use strict';


export class THREEManager {
    constructor(camera, width, height) {
        this.camera = camera;
        this.width = width;
        this.height = height;
        this.overlays = [];
    }

    addOverlay(overlay) {
        this.overlays.push(overlay)
    }

    pauseOverlayRender(overlay) {
        overlay.rendering = false
    }

    resumeOverlayRender(overlay) {
        overlay.rendering = true
    }

    animate(doonce = false) {
        // TODO: Figure out how to properly pass self into a callback function
        if (!doonce) {
            requestAnimationFrame(() => {
                this.animate();
            });
        }

        for (const overlay of this.overlays) {
            if (overlay.rendering) {
                overlay.render();
            }
        }
    }
}

/*
* Base class for a video overlay
*/
export class Overlay {
    rendering = true

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
        this.isActive = true;

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

    setActive(isActive) {
        this.isActive = isActive;

    }

}

/*
* Class for an THREE.js video overlay
*/
export class OverlayTHREE extends Overlay {
    constructor(threeManager) {
        super();
        this.objs = {};
        this.type = 'viz';
        this.threeManager = threeManager;
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({alpha: true});
        this.renderer.setSize(this.threeManager.width, this.threeManager.height);

        this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
        this.composer.addPass(new POSTPROCESSING.RenderPass(this.scene, this.threeManager.camera));
    
        this.threeManager.addOverlay(this);

        this.enabled = true;
    }

    getSVG() {
        return this.renderer.domElement;
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
        this.threeManager.pauseOverlayRender(this);
    }

    show() {
        if (this.enabled) {
            for (const obj in this.objs) {
                this.objs[obj].show();
            }
            this.threeManager.resumeOverlayRender(this);
        }
    }

    render() {
        this.composer.render();
    }

    disable() {
        this.enabled = false;
        this.hide();
    }

    enable() {
        this.enabled = true;
        this.threeManager.animate(true);
    }
}

/*
* Class for an overlay region
*/
export class Region {
    path
    icon

    constructor({label, poly, iconImage, isConvex = true, fillOpacity = 0.0, clickHandler, mouseDownHandler}) {
        this.label = label;

        const stroke_width = 2
        const width = 10

        if (iconImage) {
            let icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            icon.setAttribute("class", "overlay-icon")
            icon.setAttribute('width', width);
            icon.setAttribute('href', iconImage);
            let center = getPolyCenter(poly, isConvex)
            icon.setAttribute('x', center.x - width / 2);
            icon.setAttribute('y', center.y - width / 2);
            icon.setAttribute('visibility', 'visible');
            icon.setAttribute('opacity', "0.5");
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
            path.style.cursor = `url(${iconImage}), auto`
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

    hideIcon() {
        this.icon.style.visibility = "hidden"
    }

    showIcon() {
        this.icon.style.visibility = ""
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

function updateReachVisualizationDisplay() {
    var checkbox = document.getElementById('reachVisualization');
    if (checkbox.checked) {
        reachOverlayTHREE.enable();
    } else {
        reachOverlayTHREE.disable();
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
