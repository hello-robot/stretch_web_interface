/*
* Base class for a video overlay
*/
export class Overlay {
    constructor() {
    }

    configure(width, height) {
        //console.warn("configure(width, height) should be overridden by the child class");
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
    constructor(aspectRatio) {
        super();
        this.regions = new Map();
        this.type = 'control';

        // The parent has now viewbox and will take the size of the container. Place children
        // using percentage units to have them be responsive to dimension changes
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        // This is a child SVG that will render with a viewbox of 100 x 100, then
        // stretch its contents to fill the parent container
        this.stretchContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.stretchContainer.setAttribute('preserveAspectRatio', 'none');
        this.stretchContainer.setAttribute('viewBox', `0 0 ${100 * aspectRatio} 100`);
        this.svg.appendChild(this.stretchContainer)

        // FIXME: Old implementation had a "curtain" feature. What was this and do we need it?
    }

    addRegion(name, region) {
        this.regions.set(name, region);
        // So the outside can pick a handler using the name
        region.path.dataset.name = name
        this.stretchContainer.appendChild(region.path)
        if (region.icon) this.svg.appendChild(region.icon)
    }

    createRegion(name, args) {
        const region = new Region(args)
        this.addRegion(name, region)
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

        this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
        this.composer.addPass(new POSTPROCESSING.RenderPass(this.scene, camera));

        this.enabled = true;
    }

    configure(width, height) {
        this.renderer.setSize(width, height, false)
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

/*
* Class for an overlay region
*/
export class Region {
    path
    icon

    constructor({label, poly, iconImage, iconPosition, clickHandler, mouseDownHandler}) {
        this.label = label;

        const stroke_width = 2
        const width = 45

        if (iconImage) {
            let icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            icon.setAttribute("class", "overlay-icon")
            icon.setAttribute('href', iconImage);
            if (!iconPosition) {
                iconPosition = getPolyCenter(poly)
            }
            icon.setAttribute('x', String(iconPosition.x) + "%");
            icon.setAttribute('y', String(iconPosition.y) + "%");
            icon.setAttribute('transform', `translate(${-width / 2},${-width / 2})`)
            icon.setAttribute('width', String(width))
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