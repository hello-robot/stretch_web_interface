import { Settings } from "../pages/operator/ts/model/model";
import { ValidJoints, Pose2D, NamedPose, uuid } from "./util";
import { Crop } from "./video_dimensions";

export type cmd = GeneralCommand | IncrementalMoveCommand | VelocityMoveCommand | NavGoalCommand | PoseGoalCommand | ClickMoveCommand | ConfigureCommand | CancelledGoalCommand | StartSessionCommand | StopSessionCommand;

interface GeneralCommand {
    type: "command",
    timestamp?: number,
    subtype: string,
    name: string,
    modifier?: any
}
interface IncrementalMoveCommand {
    type: "incrementalMove",
    timestamp?: number,
    jointName: ValidJoints,
    increment: number
}

interface VelocityMoveCommand {
    type: "velocityMove",
    timestamp?: number,
    jointName: ValidJoints,
    velocity: number
}

export interface NavGoalCommand {
    type: "navGoal",
    timestamp?: number,
    goal: Pose2D,
    id: uuid,
}

export interface PoseGoalCommand {
    type: "poseGoal",
    timestamp?: number,
    goal: NamedPose,
    id: uuid
}

export type CancelledGoalCommand = {
    type: "cancelledGoal",
    timestamp?: number,
    name: "nav",
    goal: Pose2D,
    id: uuid,
} | {
    type: "cancelledGoal",
    timestamp?: number,
    name: "pose",
    goal: NamedPose,
    id: uuid,
}

export interface ClickMoveCommand {
    type: "clickMove",
    timestamp?: number,
    lin_vel: number,
    ang_vel: number
}

type ConfigureCommand = {
    type: "configure",
    timestamp?: number,
    subtype: "drive",
    name: "configure_mode",
    modifier: "position" | "navigation"
} | {
    type: "configure",
    timestamp?: number,
    subtype: "gripper" | "head",
    name: "camera" | "overhead_camera" | "pantilt_camera",
    crop: Crop,
    rotate: boolean
}

interface StartSessionCommand {
    type: "startSession",
    timestamp?: number
    username: string,
    settings: Settings
}

interface StopSessionCommand {
    type: "stopSession",
    timestamp?: number
}