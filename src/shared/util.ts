import ROSLIB, { Message, Quaternion } from "roslib";
import { cmd, NavGoalCommand, PoseGoalCommand } from "./commands";

export type uuid = string;
// From: https://stackoverflow.com/a/2117523/6454085
export function generateUUID(): uuid {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


////////////////////////////////////////////////////////////
// safelyParseJSON code copied from
// https://stackoverflow.com/questions/29797946/handling-bad-json-parse-in-node-safely
// on August 18, 2017
export function safelyParseJSON<T = any>(json: string): T {
    // This function cannot be optimized, it's best to
    // keep it small!
    let parsed;

    try {
        parsed = JSON.parse(json);
    } catch (e) {
        console.warn(e);
    }

    return parsed; // Could be undefined!
}

// Modified from https://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
export function quaternionToEuler(q: Quaternion, order: string) {
    order = order || "YZX";

    let heading: number, attitude: number, bank: number;
    let x = q.x, y = q.y, z = q.z, w = q.w;

    switch (order) {
        case "YZX":
            let test = x * y + z * w;
            if (test > 0.499) { // singularity at north pole
                heading = 2 * Math.atan2(x, w);
                attitude = Math.PI / 2;
                bank = 0;
            }
            if (test < -0.499) { // singularity at south pole
                heading = -2 * Math.atan2(x, w);
                attitude = -Math.PI / 2;
                bank = 0;
            }
            if (isNaN(heading)) {
                let sqx = x * x;
                let sqy = y * y;
                let sqz = z * z;
                heading = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz); // Heading
                attitude = Math.asin(2 * test); // attitude
                bank = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz); // bank
            }
            break;
        default:
            throw new Error("Euler order " + order + " not supported yet.");
    }

    return {
        y: heading,
        z: attitude,
        x: bank
    }
}

export type WebRTCMessage = SensorMessage | GoalMessage | cmd | StopMessage | AffirmMessage | JointStateMessage;

export interface SensorMessage {
    type: "sensor",
    subtype: string,
    name: "effort" | "transform" | "value",
    value: number | ROSLIB.Transform
}
export interface JointStateMessage {
    type: "jointState",
    jointState: RobotPose
}

export type GoalMessage =  NavGoalMessage | PoseGoalMessage;

export interface NavGoalMessage {
    type: "goal",
    name: "nav",
    status: "success" | "failure",
    value: NavGoalCommand
}

export interface PoseGoalMessage {
    type: "goal",
    name: "pose",
    status: "success" | "failure",
    value: PoseGoalCommand
}

interface StopMessage {
    type: "stop"
}

interface AffirmMessage {
    type: "affirm"
}

export interface CameraInfo {
    [key: string]: string
}

export interface SignallingMessage {
    candidate?: RTCIceCandidate,
    sessionDescription?: RTCSessionDescription,
    cameraInfo?: CameraInfo
}

// TODO (kavidey): this is currently a modified version of `ALL_JOINTS` in `robot.ts`, find a way to define them both in the same place
export type ValidJoints = 'joint_head_tilt' | 'joint_head_pan' | 'joint_gripper_finger_left' | 'wrist_extension' | 'joint_lift' | 'joint_wrist_yaw' | "translate_mobile_base" | "rotate_mobile_base" | 'gripper_aperture' | 'joint_arm_l0' | 'joint_arm_l1' | 'joint_arm_l2' | 'joint_arm_l3';

export type navModes = 'nav' | 'manip' | 'clickNav';

export type RobotPose = { [key in ValidJoints]?: number }

export interface NamedPose {
    name: string,
    description: string,
    jointState: RobotPose
}

export interface ROSCompressedImage extends Message {
    header: string,
    format: "jpeg" | "png",
    data: string
}

export interface ROSJointState extends Message {
    name: [ValidJoints?],
    position: [number],
    effort: [number],
    velocity: [number],
}

//http://docs.ros.org/en/lunar/api/nav_msgs/html/msg/MapMetaData.html
export interface ROSMapMetaData extends ROSLIB.Message {
    time: number,
    width: number,
    height: number,
    resolution: number,
    origin: ROSLIB.Pose
}

// http://docs.ros.org/en/lunar/api/nav_msgs/html/msg/OccupancyGrid.html
export interface ROSOccupancyGrid extends ROSLIB.Message {
    info: ROSMapMetaData,
    data: number[]
}

export type VelocityGoalArray = [{[key in ValidJoints]?: number}, {[key in ValidJoints]?: number}]

export interface Pose2D {
    x: number,
    y: number,
    theta?: number
}

export async function insertCSS(cssLink: string, location: Element = document.head) {
    const style = document.createElement('style');
    style.textContent = (await cssLink).default;
    location.append(style);
    return style;
}