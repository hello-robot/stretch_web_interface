import { Camera, Material, Mesh, Object3D, Scene, WebGLRenderer } from "three";
import { EffectComposer, RenderPass } from "postprocessing";

/*
* Base class for a video overlay
*/
export class Overlay {
    constructor() {
    }

    configure(width: number, height: number) {
        //console.warn("configure(width, height) should be overridden by the child class");
    }

    addItem(item: any) {
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
    regions: Map<string, Region>
    type: string
    svg: SVGSVGElement
    stretchContainer: SVGSVGElement

    constructor(aspectRatio: number) {
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

    addRegion(name: string, region: Region) {
        this.regions.set(name, region);
        // So the outside can pick a handler using the name
        region.path.dataset.name = name
        this.stretchContainer.appendChild(region.path)
        if (region.icon) this.svg.appendChild(region.icon)
    }

    createRegion(name: string, args: RegionArgs) {
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
    type: string
    scene: Scene
    camera: Camera
    renderer: WebGLRenderer
    composer: EffectComposer
    enabled: boolean
    objs: { [name: string]: THREEObject }
    
    constructor(camera: Camera) {
        super();
        this.objs = {};
        this.type = 'viz';
        this.scene = new Scene();
        this.camera = camera
        this.renderer = new WebGLRenderer({alpha: true});

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, camera));

        this.enabled = true;
    }

    configure(width: number, height: number) {
        this.renderer.setSize(width, height, false)
    }

    getSVG() {
        return this.renderer.domElement;
    }

    addItem(obj: THREEObject) {
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

type RegionArgs = {label: string, poly: Polygon, iconImage?: string, iconPosition?: {x: number, y: number}, clickHandler?: (event: MouseEvent) => void, mouseDownHandler?: (event: MouseEvent) => void};

/*
* Class for an overlay region
*/
export class Region {
    path: SVGPathElement
    icon?: SVGImageElement
    label: string

    constructor({label, poly, iconImage, iconPosition, clickHandler, mouseDownHandler }: RegionArgs) {
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

    setClickHandler(handler: (event: MouseEvent) => void) {
        this.path.onclick = handler
        this.path.classList.add("interactive", "clickable")
    }

    setMouseDownHandler(handler: (event: MouseEvent) => void) {
        this.path.onmousedown = handler
        this.path.classList.add("interactive", "holdable")
    }
}

type Polygon = Array<{x: number, y: number}>

function getPolyCenter(points: Polygon) {
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
    name: string
    geo: any
    mat: Material
    mesh: Mesh

    constructor(name: string, geo: any, mat: Material) {
        this.name = name;
        this.geo = geo;
        this.mat = mat;
        this.mesh = new Mesh(this.geo, this.mat);
    }

    hide() {
        this.mesh.visible = false;
    }

    show() {
        this.mesh.visible = true;
    }
}


/////// UTILITY FUNCTIONS //////////

export function svgPolyString(points: Polygon) {
    let str = 'M ';
    for (let p of points) {
        str = str + p.x + ',' + p.y + ' ';
    }
    str = str + 'Z';
    return str;
}

export function makeRectangle(ulX: number, ulY: number, width: number, height: number) {
    return {
        ul: {x: ulX, y: ulY},
        ur: {x: ulX + width, y: ulY},
        ll: {x: ulX, y: ulY + height},
        lr: {x: ulX + width, y: ulY + height}
    };
}

export function makeSquare(ulX: number, ulY: number, width: number) {
    return makeRectangle(ulX, ulY, width, width);
}

export function rectToPoly(rect: {ul: {x: number, y: number}, ur: {x: number, y: number}, ll: {x: number, y: number}, lr: {x: number, y: number}}) {
    return [rect.ul, rect.ur, rect.lr, rect.ll];
}