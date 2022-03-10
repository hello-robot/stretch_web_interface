import {BaseComponent, Component} from "../../../shared/base.cmp"

const template = `
<div id="container-div">
    <img data-ref="map-img" />
    <canvas id="map-canvas" data-ref="map-canvas" width="600" height="500"></canvas>
</div>
`

export class MapInteractive extends BaseComponent {

    constructor() {
        super(template);
        this.mapImg = this.refs.get("map-img");
        this.mapCanvas = this.refs.get("map-canvas");

        this.width = 600;
        this.height = 500;

        this.mapScale = 1;
    }

    updateMap(mapData, mapWidth, mapHeight, mapScale) {
        console.log(mapData, mapWidth, mapHeight, mapScale)
        this.mapImg.src = mapData;

        this.mapCanvas.width = mapWidth;
        this.mapCanvas.height = mapHeight;

        this.mapScale = mapScale;
        this.width = mapWidth;
        this.height = mapHeight;
    }
}

Component("map-interactive", MapInteractive, '/operator/css/map-interactive.css');
