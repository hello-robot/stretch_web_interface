import * as ROSLIB from "roslib";
import { BaseComponent, Component } from "../../../shared/base.cmp";
import { ROSOccupancyGrid } from "../../../shared/util";
import { Bitmap } from "./bitmap";

const template = `<div id="map_viewer"></div>`;

@Component('map-ros')
export class MapROS extends BaseComponent {
    width?: number
    height?: number
    resolution?: number
    origin?: ROSLIB.Pose
    mapTopic?: ROSLIB.Topic<ROSOccupancyGrid>
    mapDataURL?: string
    mapDatURLPromise?: Promise<string>

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

        let resolveMapDataURLPromise: (value: string | PromiseLike<string>) => void;
        this.mapDatURLPromise = new Promise((res, rej) => {
            resolveMapDataURLPromise = res;
        })

        this.mapTopic.subscribe((message) => {
            this.width = message.info.width;
            this.height = message.info.height;
            this.resolution = message.info.resolution;
            this.origin = message.info.origin;

            this.mapDataURL = convertToImage(message.data, this.width, this.height)
            resolveMapDataURLPromise(this.mapDataURL);

            this.mapTopic?.unsubscribe();
        });
    }

    async getMapB64(): Promise<string> {
        if (this.mapDataURL) {
            return this.mapDataURL;
        }

        if (this.mapDatURLPromise) {
            return await this.mapDatURLPromise;
        }

        return "";
    }
}

function convertToImage(data: number[], width: number, height: number) {
    // data is a 1 x (width * height) array of -1,0,100

    const bitmap = new Bitmap(width, height);

    /// modified from ROS2D ///
    for (var row = 0; row < height; row++) {
        for (var col = 0; col < width; col++) {
            const mapI = col + ((height - row - 1) * width);

            const pixel = data[mapI];
            let brightness;
            if (pixel === 100) {
                brightness = 0;
            } else if (pixel === 0) {
                brightness = 255;
            } else {
                brightness = 127;
            }

            bitmap.pixel[col][row] = [brightness, brightness, brightness, 255];
        }
    }
    return bitmap.dataURL();
}