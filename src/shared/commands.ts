import { Settings } from "../pages/operator/ts/model/model";
import { ValidJoints, Pose2D, NamedPose, uuid, RobotPose } from "./util";
import { Crop } from "./video_dimensions";

export type cmd = GeneralCommand | IncrementalMoveCommand | VelocityMoveCommand | NavGoalCommand | PoseGoalCommand | ClickMoveCommand | ConfigureCommand | CancelledGoalCommand | StartSessionCommand | StopSessionCommand;

interface Command {
    robotState?: {
        basePos: ROSLIB.Transform,
        jointStates: RobotPose
    }
    timestamp?: number
}

interface GeneralCommand extends Command {
    type: "command",
    subtype: string,
    name: string,
    modifier?: any
}
interface IncrementalMoveCommand extends Command {
    type: "incrementalMove",
    jointName: ValidJoints,
    increment: number
}

interface VelocityMoveCommand extends Command {
    type: "velocityMove",
    jointName: ValidJoints,
    velocity: number
}

export interface NavGoalCommand extends Command {
    type: "navGoal",
    goal: Pose2D,
    id: uuid,
}

export interface PoseGoalCommand extends Command {
    type: "poseGoal",
    goal: NamedPose,
    id: uuid
}

export type CancelledGoalCommand = CancelledNavGoalCommand | CancelledPoseGoalCommand;

interface CancelledNavGoalCommand extends Command {
    type: "cancelledGoal",
    name: "nav",
    goal: Pose2D,
    id: uuid,
}

interface CancelledPoseGoalCommand extends Command {
    type: "cancelledGoal",
    name: "pose",
    goal: NamedPose,
    id: uuid,
}

export interface ClickMoveCommand extends Command {
    type: "clickMove",
    lin_vel: number,
    ang_vel: number
}

type ConfigureCommand = ConfigureDriveCommand | ConfigureGripperCommand;

interface ConfigureDriveCommand extends Command {
    type: "configure",
    subtype: "drive",
    name: "configure_mode",
    modifier: "position" | "navigation"
}

interface ConfigureGripperCommand extends Command {
    type: "configure",
    subtype: "gripper" | "head",
    name: "camera" | "overhead_camera" | "pantilt_camera",
    crop: Crop,
    rotate: boolean
}

interface StartSessionCommand extends Command {
    type: "startSession",
    username: string,
    settings: Settings,
    timestamp: number
}

interface StopSessionCommand extends Command {
    type: "stopSession",
    timestamp: number
}