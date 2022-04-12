import * as ROSLIB from "roslib";
import { BaseComponent, Component } from "../../../shared/base.cmp";
import { ROSOccupancyGrid } from "../../../shared/util";
import { pgmArray } from "../../../shared/requestresponse";

const template = `<div id="map_viewer"></div>`;

@Component('map-ros')
export class MapROS extends BaseComponent {
    width?: number
    height?: number
    resolution?: number
    origin?: ROSLIB.Pose
    mapTopic?: ROSLIB.Topic<ROSOccupancyGrid>
    mapData?: pgmArray
    mapDataPromise?: Promise<pgmArray>

    constructor() {
        super(template, true, false);
    }

    init(ros: ROSLIB.Ros) {
        /*
         * This needs to be called after the map_display is added to the DOM
         * Otherwise ROS2D.Viewer will not be able to find map_viewer
        */

        this.mapTopic = new ROSLIB.Topic({
            ros: ros,
            name: '/map',
            messageType: 'nav_msgs/OccupancyGrid',
            compression: 'png'
        });

        let resolveMapDataURLPromise: (value: pgmArray | PromiseLike<pgmArray>) => void;
        this.mapDataPromise = new Promise((res, rej) => {
            resolveMapDataURLPromise = res;
        })

        this.mapTopic.subscribe((message) => {
            this.width = message.info.width;
            this.height = message.info.height;
            this.resolution = message.info.resolution;
            this.origin = message.info.origin;

            this.mapData = message.data as pgmArray;
            resolveMapDataURLPromise(this.mapData);

            this.mapTopic?.unsubscribe();
        });
    }

    async getMap(): Promise<pgmArray> {
        if (this.mapData) {
            return this.mapData;
        }

        if (this.mapDataPromise) {
            return await this.mapDataPromise;
        }

        return [];
    }
}
