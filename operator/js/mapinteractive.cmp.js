import {BaseComponent, Component} from "../../shared/base.cmp.js";

const template = `
<div id="container-div">
    <img data-ref="map-img" />
    <canvas id="map-canvas" data-ref="map-canvas" width="600" height="500"></canvas>
</div>
`

export class MapInteractive extends BaseComponent {

    constructor(navGoalCallback) {
        super(template);
        this.mapImg = this.refs.get("map-img");
        this.mapCanvas = this.refs.get("map-canvas");

        this.mapCanvas.addEventListener("onclick", this.navigateOnClick);

        this.navGoalCallback = navGoalCallback;
    }

    updateMap({mapData, mapWidth, mapHeight, mapResolution, mapOrigin}) {
        this.mapImg.src = mapData;

        this.mapCanvas.width = mapWidth;
        this.mapCanvas.height = mapHeight;

        this.mapResolution = mapResolution;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.mapOrigin = mapOrigin;
    }

    navigateOnClick(event) {
        console.log(event.offsetX, event.offsetY);
        const x = event.offsetX;
        const y = event.offsetY;

        const x_in_map = (x / this.mapResolution) + this.mapOrigin.x;
        const y_in_map = (y / this.mapResolution) + this.mapOrigin.y;

        const goal = {
            x: x_in_map,
            y: y_in_map,
            theta: 0
        };

        console.log(goal);

        this.navGoalCallback(goal);
    }
}

Component("map-interactive", MapInteractive, '/operator/css/map-interactive.css');
