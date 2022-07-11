import { BaseComponent, Component } from "shared/base.cmp"
import { Pose2D } from "shared/util";
import { pgmArray } from "shared/requestresponse";
import { Bitmap } from "shared/bitmap";
import * as ROSLIB from "roslib";
import { RemoteRobot } from "./remoterobot";


const template = `
<div id="container-div">
    <h4> Battery: <span data-ref="volts">0</span>v </h4>
</div>
`

@Component("battery-cmp")
export class Battery extends BaseComponent {
    volts = this.refs.get("volts") as HTMLSpanElement
    constructor() {
        super(template);
    }

    setUpCallbacks(robot: RemoteRobot) {
        robot.sensors.listenToKeyChange("battery", "voltage",  v => {this.volts.innerHTML = v});
    }
}
