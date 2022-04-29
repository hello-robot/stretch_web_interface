import { generateUUID, NamedPose, Pose2D, ValidJoints } from "shared/util";
import { cmd } from "shared/commands";
import { Crop } from "shared/video_dimensions";
import ROSLIB from "roslib";

export type robotChannel = (message: cmd) => void;
export interface VelocityCommand { stop: () => void; affirm?: () => void; }
export class RemoteRobot {
    sensors = new RobotSensors()
    robotChannel: robotChannel

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
            "close": null
        },
        "head": {
            "up": "lookUp",
            "down": "lookDown",
            "left": "lookLeft",
            "right": "lookRight",
        }
    }

    constructor(robotChannel: robotChannel) {
        this.robotChannel = robotChannel
    }

    setPanTiltFollowGripper(value: number) {
        let cmd: cmd = {
            type: "command",
            subtype: "head",
            name: "gripper_follow",
            modifier: value
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    setPanTilt(values: Map) {
        let cmd: cmd = {
            type: "command",
            subtype: "head",
            name: "set_pan_tilt",
            modifier: values
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    lookAtBase() {
        let cmd: cmd = {
            type: "command",
            subtype: "head",
            name: "look_at_base",
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    lookAtArm() {
        let cmd: cmd = {
            type: "command",
            subtype: "head",
            name: "look_at_arm",
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    incrementalMove(jointName: ValidJoints, direction: number, increment: number) {
        let cmd: cmd = {type: "incrementalMove", jointName: jointName, increment: direction! * increment!}
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    velocityMove(jointName: ValidJoints, velocity: number): VelocityCommand {
        let cmd: cmd = { type: "velocityMove", jointName: jointName, velocity: velocity }
        this.robotChannel(cmd)
        this.emitCommandEvent(cmd)
        return {
            "affirm": () => {
                this.robotChannel({ type: "affirm" })
                this.emitCommandEvent({ type: "affirm" })
            }, "stop": () => {
                this.robotChannel({ type: "stop" })
                this.emitCommandEvent({ type: "stop" })
            }
        }
    }

    setNavGoal(goal: Pose2D) {
        let cmd: cmd = {type: "navGoal", goal: goal, id: generateUUID()};
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    setPoseGoal(goal: NamedPose) {
        let cmd: cmd = {type: "poseGoal", goal: goal, id: generateUUID()};
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    emitCommandEvent(cmd: cmd) {
        window.dispatchEvent(new CustomEvent("commandsent", {bubbles: false, detail: cmd}))
    }

    driveWithVelocities(linVel: number, angVel: number): VelocityCommand {
        let cmd: cmd = {
            type: "command",
            subtype: "drive",
            name: "velocities",
            modifier: {
                linVel: linVel,
                angVel: angVel
            }
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
        return {
            "stop": () => {
                let stopEvent: cmd = {
                    type: "command",
                    subtype: "drive",
                    name: "velocities",
                    modifier: {linVel: 0, angVel: 0}
                }
                this.robotChannel(stopEvent)
                this.emitCommandEvent(stopEvent)
            }
        }
    }

    setBaseMode(mode: "position" | "navigation") {
        let cmd: cmd = {type: "command", subtype: "drive", name: "configure_mode", modifier: mode}
        this.robotChannel(cmd);
    }

    configureGripperCamera(rotate: boolean, crop: Crop) {
        let cmd: cmd = {type: "configure", subtype: "gripper", name: "camera", crop: crop, rotate: rotate}
        this.robotChannel(cmd);
    }

    configureOverheadCamera(rotate: boolean, crop: Crop) {
        let cmd: cmd = {type: "configure", subtype: "head", name: "overhead_camera", crop: crop, rotate: rotate}
        this.robotChannel(cmd);
    }

    configurePanTiltCamera(rotate: boolean, crop: Crop) {
        let cmd: cmd = {type: "configure", subtype: "head", name: "pantilt_camera", crop: crop, rotate: rotate}
        this.robotChannel(cmd);
    }

}

for (let [groupName, groups] of Object.entries(RemoteRobot.COMMANDS)) {
    for (let [name, methodName] of Object.entries(groups)) {
        if (methodName === null) {
            methodName = groupName + name[0].toUpperCase() + name.substr(1);
        }
        RemoteRobot.prototype[methodName] = function (modifier: string) {
            let cmd: cmd = {
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
    sensors: { [group: string]: { [key: string]: number | ROSLIB.Transform | undefined } } = {
        //"drive": {},
        "lift": { "inJointLimits": undefined },
        "arm": { "inJointLimits": undefined },
        // Yaw effort is primary, bend and roll are for dex wrist only
        "wrist": { "effort": undefined, "inJointLimits": undefined, "bend_torque": undefined, "roll_torque": undefined },
        "gripper": { "effort": undefined, "transform": undefined },
        "head": { "transform": undefined },
        "base": { "transform": undefined }
    }
    listeners: { [group: string]: { [key: string]: Array<(value: number) => void> } } = {}

    constructor() {
        this.listeners = {}
        for (const group in this.sensors) {
            this.listeners[group] = {}
            for (const key in this.sensors[group]) {
                this.listeners[group][key] = []
            }
        }
    }

    // TODO (kavidey): make this a proper generic type so we know what the input to the callback will be
    listenToKeyChange<T = "effort" | "transform">(group: string, key: string, listener: (value?: number | ROSLIB.Transform) => void) {
        this.listeners[group][key].push(listener)
    }

    set(group: string, key: string, value: number | ROSLIB.Transform) {
        this.sensors[group][key] = value
        for (const listener of this.listeners[group][key]) {
            listener(value as any)
        }
    }

}