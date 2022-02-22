import { BaseComponent, Component } from "../../shared/base.cmp.js";

const template = `
<div id="container-div">
    <canvas id="map-canvas" data-ref="map-canvas" width="600" height="500"></canvas>
    <img id="map-img" data-ref="map-img" />
</div>
`

export class MapInteractive extends BaseComponent {

    constructor(navGoalCallback) {
        super(template);
        this.mapImg = this.refs.get("map-img");
        this.mapCanvas = this.refs.get("map-canvas");
        this.mapCanvasCxt = this.mapCanvas.getContext("2d");

        this.mapImg.onclick = this.navigateOnClick.bind(this);

        this.navGoalCallback = navGoalCallback;

        this.robotTransform = {};
    }

    updateMap({ mapData, mapWidth, mapHeight, mapResolution, mapOrigin }) {
        this.mapImg.src = mapData;

        this.mapCanvas.width = mapWidth;
        this.mapCanvas.height = mapHeight;

        this.mapResolution = mapResolution;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.mapOrigin = mapOrigin;
    }

    navigateOnClick(event) {
        const x = event.offsetX;
        const y = event.offsetY;

        const x_in_map = (x * this.mapResolution) + this.mapOrigin.position.x;
        const y_in_map = (y * this.mapResolution) + this.mapOrigin.position.y;

        const goal = {
            x: x_in_map,
            y: y_in_map,
            theta: 0
        };

        console.log(goal);

        this.navGoalCallback(goal);
    }

    updateRobotTransform(robotTransform) {
        this.robotTransform = robotTransform;

        this.mapCanvasCxt.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);4
        this.mapCanvasCxt.beginPath();
        this.mapCanvasCxt.arc(
            (this.robotTransform.translation.x - this.mapOrigin.position.x) / this.mapResolution,
            this.mapHeight - ((this.robotTransform.translation.y - this.mapOrigin.position.y) / this.mapResolution), 4, 0, 2 * Math.PI);
        this.mapCanvasCxt.fillStyle = "blue";
        this.mapCanvasCxt.fill();

        console.log(this.robotTransform);
        console.log((this.robotTransform.translation.x - this.mapOrigin.position.x) / this.mapResolution, (-this.robotTransform.translation.y) / this.mapResolution);
    }
}

Component("map-interactive", MapInteractive, '/operator/css/map-interactive.css');
