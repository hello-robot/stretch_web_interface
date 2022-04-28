import { Camera, Material, Mesh, Object3D, Scene, WebGLRenderer } from "three";
import { EffectComposer, RenderPass } from "postprocessing";

/*
* Base class for a video overlay
*/
export interface Overlay {


    configure(width: number, height: number): void;

    hide(): void;

    show(): void;

    getElementToDisplay(): Element;
}

/*
* Class for an SVG video overlay
*/
export class OverlaySVG implements Overlay {
    public Ready!: Promise<any>;

    regions: Map<string, Region>
    svg: SVGSVGElement
    stretchContainer: SVGSVGElement

    constructor(aspectRatio: number) {
        this.regions = new Map();
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

    configure(width: number, height: number) {
        // Noop
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

    getElementToDisplay(): Element {
        return this.svg
    }

    hide() {
        this.svg.style.display = "none"
    }

    show() {
        this.svg.style.display = ""
    }

}

export class TrajectoryOverlay extends OverlaySVG {
    trajectory?: Trajectory

    constructor(aspectRatio: number) {
        super(aspectRatio);
    }

    removeCircle() {
        this.trajectory?.removeCircle()
    }

    removeTraj() {
        this.trajectory?.container.remove()
        this.trajectory = undefined
    }

    addTraj(traj: Trajectory) {
        this.removeTraj();
        this.trajectory = traj
        this.stretchContainer.appendChild(this.trajectory.container)
    }

    createTraj(args) {
        const traj = new Trajectory(args)
        this.addTraj(traj)
        return traj
    }
}

/*
* Class for an THREE.js video overlay
*/
export class OverlayTHREE implements Overlay {
    scene: Scene
    camera: Camera
    renderer: WebGLRenderer
    composer: EffectComposer
    enabled: boolean
    objs: { [name: string]: THREEObject }

    constructor(camera: Camera) {
        this.objs = {};
        this.scene = new Scene();
        this.camera = camera
        this.renderer = new WebGLRenderer({alpha: true});

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, camera));

        this.enabled = true;
    }

    configure(width: number, height: number) {
        this.renderer.setSize(width, height)
    }

    getElementToDisplay(): Element {
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

export class Trajectory {
    container: SVGGElement
    leftPath: SVGPathElement
    centerPath: SVGPathElement
    rightPath: SVGPathElement
    circle?: SVGCircleElement
    icon: SVGImageElement

    constructor({leftTraj, centerTraj, rightTraj, center, iconImage}) {
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        if (iconImage) {
            let icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            // icon.setAttribute("class", "overlay-icon")
            icon.setAttribute('href', iconImage);
            icon.setAttribute('x', "39%");
            icon.setAttribute('y', "69%");
            icon.setAttribute('width', "12")
            this.icon = icon
            this.container.appendChild(icon)
        } else {
            let leftPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            leftPath.setAttribute('stroke', '#4169E1')
            leftPath.setAttribute('fill', 'none')
            leftPath.setAttribute('stroke-width', '1')
            leftPath.setAttribute('d', leftTraj);
            this.leftPath = leftPath
            this.container.appendChild(leftPath)

            let centerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            centerPath.setAttribute('stroke', '#4169E1')
            centerPath.setAttribute('fill', 'none')
            centerPath.setAttribute('stroke-dasharray', "4 1")
            centerPath.setAttribute('stroke-width', '1')
            centerPath.setAttribute('d', centerTraj);
            this.centerPath = centerPath
            this.container.appendChild(centerPath)

            let rightPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            rightPath.setAttribute('stroke', '#4169E1')
            rightPath.setAttribute('fill', 'none')
            rightPath.setAttribute('stroke-width', '1')
            rightPath.setAttribute('d', rightTraj);
            this.rightPath = rightPath
            this.container.appendChild(rightPath)

            if (center) {
                let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', String(center.x));
                circle.setAttribute('cy', String(center.y));
                circle.setAttribute('stroke', 'none')
                circle.setAttribute('fill', '#4169E1')
                circle.setAttribute('r', '6');
                circle.setAttribute('fill-opacity', '0.3');
                this.circle = circle;
                this.container.appendChild(circle)
            }
        }
    }

    removeCircle() {
        if (this.circle) {
            this.circle.style.visibility = "hidden"
        }
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
