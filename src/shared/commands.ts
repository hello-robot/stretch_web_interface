import { ValidJoints, Pose2D, NamedPose, uuid } from "./util";
import { Crop } from "./video_dimensions";

export type cmd = GeneralCommand | IncrementalMoveCommand | VelocityMoveCommand | NavGoalCommand | PoseGoalCommand | ClickMoveCommand | ConfigureCommand;

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