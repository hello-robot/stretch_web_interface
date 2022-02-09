import {BaseComponent, Component} from "../../shared/base.cmp.js";

const template = `<div id="map_viewer"></div>`

export class MapROS extends BaseComponent {
    constructor(width, height, mapScale) {
        super(template, true, false);

        this.width = width;
        this.height = height;
        this.mapScale = mapScale;

        //this.map_display = this.refs.get("map-viewer");
    }

    init(ros) {
        /*
         * This needs to be called after the map_display is added to the DOM
         * Otherwise ROS2D.Viewer will not be able to find map_viewer
        */
        this.mapViewer = new ROS2D.Viewer({
            divID: 'map_viewer',
            width: this.width,
            height: this.height
        });


        this.mapGridClient = new ROS2D.OccupancyGridClient({
            ros: ros,
            rootObject: this.mapViewer.scene,
        });

        this.mapGridClient.on('change', () => {
            this.mapViewer.scaleToDimensions(this.mapGridClient.currentGrid.width, this.mapGridClient.currentGrid.height);
            this.mapViewer.shift(this.mapGridClient.currentGrid.pose.position.x, this.mapGridClient.currentGrid.pose.position.y);
        });
    }

    getMapB64() {
        // ROS2DJS Documentation: https://web.archive.org/web/20170709232016/http://robotwebtools.org/jsdoc/ros2djs/current/index.html
        // EaselJS Documentation: https://createjs.com/docs/easeljs/classes/Stage.html
        return this.mapViewer.scene.canvas.toDataURL('image/png');
    }
}

Component('map-ros', MapROS);