import { ValidJoints } from "../../../shared/util";

export class RemoteRobot {
    sensors = new RobotSensors()
    robotChannel

    static COMMANDS = {
        "drive": {
            "forward": null,
            "backward": null,
            "turn_right": "turnRight",
            "turn_left": "turnLeft",
            "turn_ccw": "turnCCW",
            "turn_cw": "turnCW"
        },
        "lift": {
            "up": null,
            "down": null
        },
        "arm": {
            "extend": null,
            "retract": null
        },
        "wrist": {
            "in": null,
            "out": null,
        },
        "gripper": {
            "open": null,
            "close": null,
            "configure_camera": "gripperConfigureCamera"
        },
        "head": {
            "up": "lookUp",
            "down": "lookDown",
            "left": "lookLeft",
            "right": "lookRight",
            "configure_overhead_camera": "headConfigureOverheadCamera"
        },
        "full": {
            "pose": "goToPose"
        }
    }

    constructor(robotChannel) {
        this.robotChannel = robotChannel
    }

    setPanTiltFollowGripper(value) {
        let cmd = {
            type: "command",
            subtype: "head",
            name: "gripper_follow",
            modifier: value,
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    incrementalMove(jointName: ValidJoints, direction: number, increment: number) {
        this.robotChannel({type: "incrementalMove", jointName: jointName, increment: direction * increment})
    }

    velocityMove(jointName: ValidJoints, velocity: number) {
        this.robotChannel({type: "velocityMove", jointName: jointName, velocity: velocity})
        return {
            "affirm": () => {
                this.robotChannel({type: "affirm"})
            }, "stop": () => {
                this.robotChannel({type: "stop"})
            }
        }
    }

    emitCommandEvent(cmd) {
        window.dispatchEvent(new CustomEvent("commandsent", {bubbles: false, detail: cmd}))
    }

}

for (let [groupName, groups] of Object.entries(RemoteRobot.COMMANDS)) {
    for (let [name, methodName] of Object.entries(groups)) {
        if (methodName === null) {
            methodName = groupName + name[0].toUpperCase() + name.substr(1);
        }
        RemoteRobot.prototype[methodName] = function (modifier) {
            let cmd = {
                type: "command",
                subtype: groupName,
                name: name,
                modifier: modifier,
            };
            this.robotChannel(cmd);
            this.emitCommandEvent(cmd);
        }
    }
}
class RobotSensors {
    sensors: {[group: string]: {[key: string]: number | undefined}} = {
        //"drive": {},
        "lift": {"effort": undefined},
        "arm": {"effort": undefined},
        // Yaw effort is primary, bend and roll are for dex wrist only
        "wrist": {"effort": undefined, "bend_torque": undefined, "roll_torque": undefined},
        "gripper": {"effort": undefined, "transform": undefined},
        "head": {"transform": undefined}
    }
    listeners: {[group: string]: {[key: string]: Array<(value: number) => void>}} = {}

    constructor() {
        this.listeners = {}
        for (const group in this.sensors) {
            this.listeners[group] = {}
            for (const key in this.sensors[group]) {
                this.listeners[group][key] = []
            }
        }
    }

    listenToKeyChange(group: string, key: string, listener: (value: number) => void) {
        this.listeners[group][key].push(listener)
    }

    set(group: string, key: string, value: number) {
        this.sensors[group][key] = value
        for (const listener of this.listeners[group][key]) {
            listener(value)
        }
    }

}