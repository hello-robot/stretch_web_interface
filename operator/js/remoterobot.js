import {WebRTCConnection} from "../../shared/webrtcconnection.js";

var modifiers = {"verysmall": 0, "small": 1, "medium": 2, "large": 3, "verylarge": 4};
var currentV = "medium";
const allJoints = ['joint_head_tilt', 'joint_head_pan', 'joint_gripper_finger_left', 'wrist_extension', 'joint_lift', 'joint_wrist_yaw'];

export class RemoteRobot {

    activeAction = null;
    cameraFollowGripper = false;
    updateFrequency = 400; //milliseconds
    onCommand = null
    sensors = new RobotSensors()
    robotChannel

    constructor(robotChannel, onCommand) {
        this.robotChannel = robotChannel
        this.onCommand = onCommand
        window.setInterval(this.updateInterface, this.updateFrequency);
    }

    setVelocity(newV) {
        if (Object.keys(modifiers).includes(newV)) {
            currentV = newV;
            if (typeof this.onCommand === "function") this.onCommand("SpeedChange", newV);
        } else
            console.error("Invalid velocity: " + newV);
        console.trace()
    }

// Continuous actions

    toggleCameraFollowGripper() {
        this.cameraFollowGripper = !this.cameraFollowGripper;
        this.changeGripperFollow(this.cameraFollowGripper);
    }

    startAction(actionName) {
        console.log("Starting action: " + actionName);
        this.activeAction = actionName;
    }

    stopAction() {
        console.log("Stopping action: " + this.activeAction);
        this.activeAction = null;
    }


    updateInterface() {
        // FIXME: Reimplement this in the operator page component
        if (this.activeAction != null) {
            console.log("activeAction: " + this.activeAction);
            window[activeAction]();
        }
    }


// Discrete (one time) actions

    lookLeft() {
        var cmd = {
            type: "command",
            subtype: "head",
            name: "left",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("LookLeft", currentV);
    }

    lookRight() {
        var cmd = {
            type: "command",
            subtype: "head",
            name: "right",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("LookRight", currentV);
    }

    lookUp() {
        var cmd = {
            type: "command",
            subtype: "head",
            name: "up",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("LookUp", currentV);
    }

    lookDown() {
        var cmd = {
            type: "command",
            subtype: "head",
            name: "down",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("LookDown", currentV);
    }

    changeGripperFollow(isStart) {
        var cmd = {
            type: "command",
            subtype: "head",
            name: "gripper_follow",
            modifier: isStart
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("LookAtGripper", isStart);
    }

    moveForward() {
        var cmd = {
            type: "command",
            subtype: "drive",
            name: "forward",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("MoveForward", currentV);
    }

    moveBackward() {
        var cmd = {
            type: "command",
            subtype: "drive",
            name: "backward",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("MoveBackward", currentV);
    }

    turnLeft() {
        var cmd = {
            type: "command",
            subtype: "drive",
            name: "turn_left",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("TurnLeft", currentV);
    }

    turnRight() {
        var cmd = {
            type: "command",
            subtype: "drive",
            name: "turn_right",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("TurnRight", currentV);
    }

    turnCCW() {
        var cmd = {
            type: "command",
            subtype: "drive",
            name: "turn_ccw",
            modifier: "none"
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("TurnCCW", currentV);
    }

    turnCW() {
        var cmd = {
            type: "command",
            subtype: "drive",
            name: "turn_cw",
            modifier: "none"
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("TurnCW", currentV);
    }

    liftUp() {
        var cmd = {
            type: "command",
            subtype: "lift",
            name: "up",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("LiftUp", currentV);
    }

    liftDown() {
        var cmd = {
            type: "command",
            subtype: "lift",
            name: "down",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("LiftDown", currentV);
    }

    armRetract() {
        var cmd = {
            type: "command",
            subtype: "arm",
            name: "retract",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("ArmRetract", currentV);
    }

    armExtend() {
        var cmd = {
            type: "command",
            subtype: "arm",
            name: "extend",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("ArmExtend", currentV);
    }

    gripperClose() {
        var cmd = {
            type: "command",
            subtype: "gripper",
            name: "close",
            modifier: "medium"
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("GripperClose", "medium");
    }

    moveToPose(id) {
        var cmd = {
            type: "command",
            subtype: "full",
            name: "pose",
            modifier: poseManager.getPose(id)
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("Pose", id);
    }

    gripperOpen() {
        var cmd = {
            type: "command",
            subtype: "gripper",
            name: "open",
            modifier: "medium"
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("GripperOpen", "medium");
    }

    wristIn() {
        var cmd = {
            type: "command",
            subtype: "wrist",
            name: "in",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("WristIn", currentV);
    }

    wristOut() {
        var cmd = {
            type: "command",
            subtype: "wrist",
            name: "out",
            modifier: currentV
        };
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("WristOut", currentV);
    }


    interfaceMode = 'nav';
    interfaceModifier = 'no_wrist';

    /**
     * modekey in {'nav', 'low_arm', 'high_arm', 'hand', 'look' }
     */
    // FIXME: Fix the mode commands
    turnModeOn(modeKey) {

        let autoViewOn = false;
        let onoffButton = document.getElementById("autoViewOn");
        if (onoffButton != undefined)
            autoViewOn = onoffButton.checked;
        console.log("autoViewOn: " + autoViewOn);

        // Send command to back-end to change the camera view based on mode
        if (autoViewOn) {
            setCameraView(modeKey);
        } else {
            console.log("Not changing view automatically on control mode change.");
        }

        if (typeof this.onCommand === "function") this.onCommand("ModeChange", modeKey);
    }

    /**
     * Preset views only available for modeKey in {'nav', 'low_arm', 'high_arm'}
     */

    setCameraView(modeKey, noWristOn) {
        var cmd;
        if (noWristOn === false) {
            cmd = {
                type: "command",
                subtype: "mode",
                name: modeKey,
                modifier: "none"
            };
            this.interfaceModifier = 'none';
        } else {
            cmd = {
                type: "command",
                subtype: "mode",
                name: modeKey,
                modifier: "no_wrist"
            };
            this.interfaceModifier = 'no_wrist';
        }
        this.interfaceMode = modeKey;
        this.robotChannel(cmd);
        if (typeof this.onCommand === "function") this.onCommand("SetCameraView", modeKey);
    }

}

class RobotSensors {
    sensors = {
        //"drive": {},
        "lift": {"effort": undefined},
        "arm": {"effort": undefined},
        "wrist": {"yaw_torque": undefined, "bend_torque": undefined, "roll_torque": undefined},
        "gripper": {"gripper_torque": undefined},
        "head": {"transform": undefined}
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
            this.listeners[group][key](value)
        }
    }

}