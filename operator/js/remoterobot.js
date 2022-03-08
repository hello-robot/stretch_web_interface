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

    incrementalMove(jointName, direction, increment) {
        let cmd = {type: "incrementalMove", jointName: jointName, increment: direction * increment}
        this.robotChannel(cmd)
        this.emitCommandEvent(cmd);
    }

    velocityMove(jointName, velocity) {
        let cmd = {type: "velocityMove", jointName: jointName, velocity: velocity}
        this.robotChannel(cmd)
        this.emitCommandEvent(cmd)
        return {
            "affirm": () => {
                this.robotChannel({type: "affirm"})
                this.emitCommandEvent({type: "affirm"})
            }, "stop": () => {
                this.robotChannel({type: "stop"})
                this.emitCommandEvent({type: "stop"})
            }
        }
    }

    setNavGoal(goal) {
        let cmd = {type: "navGoal", goal: goal}
        this.robotChannel(cmd)
        this.emitCommandEvent(cmd)
    }

    emitCommandEvent(cmd) {
        window.dispatchEvent(new CustomEvent("commandsent", {bubbles: false, detail: cmd}))
    }

    clickMove(lin_vel, ang_vel) {
        let cmd = {
            type: "clickMove", 
            lin_vel: lin_vel,
            ang_vel: ang_vel
        };
        this.robotChannel(cmd);
        this.emitCommandEvent(cmd);
        return {
            "stop": () => {
                this.robotChannel({type: "stop"})
                this.emitCommandEvent({type: "stop"})
            }
        }
    }

    setRobotNavMode() {
        let cmd = {type: "setRobotNavMode"}
        this.robotChannel(cmd);
    }

    setRobotPosMode() {
        let cmd = {type: "setRobotPosMode"}
        this.robotChannel(cmd);
    }

    rotateCameraView() {
        let cmd = {type: "rotateCameraView"}
        this.robotChannel(cmd);
        // this.emitCommandEvent(cmd);
    }

    resetCameraView() {
        let cmd = {type: "resetCameraView"}
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
    sensors = {
        //"drive": {},
        "lift": {"effort": undefined},
        "arm": {"effort": undefined},
        // Yaw effort is primary, bend and roll are for dex wrist only
        "wrist": {"effort": undefined, "bend_torque": undefined, "roll_torque": undefined},
        "gripper": {"effort": undefined, "transform": undefined},
        "head": {"transform": undefined},
        "base": {"transform": undefined}
    }

    constructor() {
        this.listeners = {}
        for (const group in this.sensors) {
            this.listeners[group] = {}
            for (const key in this.sensors[group]) {
                this.listeners[group][key] = []
            }
        }
    }

    listenToKeyChange(group, key, listener) {
        this.listeners[group][key].push(listener)
    }

    set(group, key, value) {
        this.sensors[group][key] = value
        for (const listener of this.listeners[group][key]) {
            listener(value)
        }
    }

}