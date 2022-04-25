import { ValidJoints, Pose2D } from "./util";

export interface CommandSentEvent extends Event {
    bubbles: boolean;
    detail: cmd;
}
export interface cmd {
    type: string
    timestamp?: number
}

export interface generalCommand extends cmd {
    type: "command",
    subtype: string,
    name: string,
    modifier: number
}

export interface incrementalMove extends cmd {
    type: "incrementalMove",
    jointName: ValidJoints,
    increment: number
}

export interface velocityMove extends cmd {
    type: "velocityMove",
    jointName: ValidJoints,
    velocity: number
}

export interface navGoal extends cmd {
    type: "navGoal",
    goal: Pose2D
}

export interface clickMove extends cmd {
    type: "clickMove",
    lin_vel: number,
    ang_vel: number
}

export interface setRobotNavMode extends cmd {
    type: "setRobotNavMode"
}

export interface setRobotPosMode extends cmd {
    type: "setRobotPosMode"
}

export interface rotateCameraView extends cmd {
    type: "rotateCameraView"
}

export interface resetCameraView extends cmd {
    type: "resetCameraView"
}