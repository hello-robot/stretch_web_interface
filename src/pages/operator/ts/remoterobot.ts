import { Pose2D, ValidJoints } from "../../../shared/util";
import { cmd, generalCommand, incrementalMove, velocityMove, navGoal, clickMove, setRobotNavMode, setRobotPosMode, rotateCameraView, resetCameraView } from "../../../shared/commands";

export type robotChannel = (message: cmd) => void;
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

    constructor(robotChannel: robotChannel) {
        this.robotChannel = robotChannel
    }

    setPanTiltFollowGripper(value: number) {
        let cmd: generalCommand = {
            type: "command",
            subtype: "head",
            name: "gripper_follow",
            modifier: value,
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
    }

    incrementalMove(jointName: ValidJoints, direction: number, increment: number) {
        let cmd: incrementalMove = { type: "incrementalMove", jointName: jointName, increment: direction * increment }
        this.robotChannel(cmd)
        this.emitCommandEvent(cmd);
    }

    velocityMove(jointName: ValidJoints, velocity: number) {
        let cmd: velocityMove = { type: "velocityMove", jointName: jointName, velocity: velocity }
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
        let cmd: navGoal = { type: "navGoal", goal: goal }
        this.robotChannel(cmd)
        this.emitCommandEvent(cmd)
    }

    emitCommandEvent(cmd) {
        window.dispatchEvent(new CustomEvent("commandsent", { bubbles: false, detail: cmd }))
    }

    clickMove(lin_vel: number, ang_vel: number) {
        let cmd: clickMove = {
            type: "clickMove",
            lin_vel: lin_vel,
            ang_vel: ang_vel
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
        return {
            "stop": () => {
                this.robotChannel({ type: "stopClickMove" })
                this.emitCommandEvent({ type: "stopClickMove" })
            }
        }
    }

    // TODO (kavidey): combine these into one command with an additional property specifying the mode (and same for camera view)
    setRobotNavMode() {
        let cmd: setRobotNavMode = { type: "setRobotNavMode" }
        this.robotChannel(cmd);
    }

    setRobotPosMode() {
        let cmd: setRobotPosMode = { type: "setRobotPosMode" }
        this.robotChannel(cmd);
    }

    rotateCameraView() {
        let cmd: rotateCameraView = { type: "rotateCameraView" }
        this.robotChannel(cmd);
        // this.emitCommandEvent(cmd);
    }

    resetCameraView() {
        let cmd: resetCameraView = { type: "resetCameraView" }
        this.robotChannel(cmd);
        // this.emitCommandEvent(cmd);
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
    sensors: { [group: string]: { [key: string]: number | undefined } } = {
        //"drive": {},
        "lift": { "effort": undefined },
        "arm": { "effort": undefined },
        // Yaw effort is primary, bend and roll are for dex wrist only
        "wrist": { "effort": undefined, "bend_torque": undefined, "roll_torque": undefined },
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