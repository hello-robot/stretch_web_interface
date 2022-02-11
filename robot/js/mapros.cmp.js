import { BaseComponent, Component } from "../../shared/base.cmp.js";

const template = `<div id="map_viewer"></div>`;

export class MapROS extends BaseComponent {
    constructor() {
        super(template, true, false);
    }

    init(ros) {
        /*
         * This needs to be called after the map_display is added to the DOM
         * Otherwise ROS2D.Viewer will not be able to find map_viewer
        */

        const mapMetadata = new ROSLIB.Topic({
            ros: ros,
            name: '/map_metadata',
            messageType: 'nav_msgs/MapMetaData'
        });

        mapMetadata.subscribe( (message) => {
            this.width = message.width;
            this.height = message.height;
            this.resolution = message.resolution;
            this.origin = message.origin;

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

            mapMetadata.unsubscribe();
        });
    }

    getMapB64() {
        // TODO (kavi): Find a better way to wait for the map to be loaded
        return new Promise((resolve, reject) => {
            const mapReady = setTimeout(() => {
                if (this.mapViewer !== undefined) {
                    clearTimeout(mapReady);
                    // ROS2DJS Documentation: https://web.archive.org/web/20170709232016/http://robotwebtools.org/jsdoc/ros2djs/current/index.html
                    // EaselJS Documentation: https://createjs.com/docs/easeljs/classes/Stage.html
                    resolve(this.mapViewer.scene.canvas.toDataURL('image/png'));
                }
            }, 10);
        });
    }
}

Component('map-ros', MapROS);