import { NamedPose, RobotPose, ROSJointState, ValidJoints } from "shared/util"
import { cmd } from "shared/commands"
import ROSLIB from "roslib";

export const DEFAULTS: Settings = {
    "pose": {},
    "setting": {
        "armReachVisualization": false,
        "showPermanentIconsGripper": true,
        "showPermanentIconsOverhead": true,
        "showPermanentIconsPantilt": true,
        "velocityControlMode": "discrete",
        "velocityScale": 1,
        "colorBlindMode": false,
        "continuousVelocityStepSize": 0.15,
        "nav": {
            "displayMode": "action-overlay",
            "actionMode": "incremental",
            "startStopMode": "press-release",
            "velocity": 2,
            "joint_head_pan": 0.05,
            "joint_head_tilt": -1.4,
        },
        "manip": {
            "actionMode": "incremental",
            "startStopMode": "press-release",
            "velocity": 2,
            "joint_head_pan": -1.5,
            "joint_head_tilt": -1.4,
        },
    },
    "settingsProfiles": {},

    // Set a flag so that we know whether a model was initialized from defaults
    "reserved": {
        "initialized": true
    }
}

export type SettingEntry = boolean | number | string;
export interface Settings {
    "pose": { [key: string]: NamedPose};
    "setting": { [key: string]: SettingEntry | { [key: string]: SettingEntry } };
    "settingsProfiles": { [key: string]: { [key: string]: SettingEntry | { [key: string]: SettingEntry } } };
    "reserved": { [key: string]: SettingEntry | { [key: string]: SettingEntry } };
}

export abstract class Model {

    protected enabled: boolean = true;

    abstract authenticate(): void;

    abstract addPose(name: string, pose: NamedPose): void;
    abstract getPose(id: string): NamedPose | undefined;
    abstract getPoses(): NamedPose[];
    abstract removePose(id: string): void;
    
    abstract loadSettingProfile(profileName: string): void;
    abstract deleteSettingProfile(profileName: string): boolean;
    abstract saveSettingProfile(profileName: string): void;
    abstract getSettingProfiles(): string[];

    abstract setSetting(key: string, value: SettingEntry, namespace?: string): void;
    abstract getSetting(key: string, namespace?: string): SettingEntry;
    abstract getSettings(): { [key: string]: SettingEntry | { [key: string]: SettingEntry } };

    abstract startSession(username: string, sessionId?: string): void;
    abstract stopSession(): void;
    abstract logComand(cmd: cmd): void;
    abstract getSessions(): string[];
    abstract getCommands(sessionId: string): Promise<cmd[]>;
    
    abstract reset(): void

    resetSetting(key: string, namespace?: string) {
        this.setSetting(key, DEFAULTS["setting"][namespace][key], namespace)
    }

    get disabled(): boolean {
        return !this.enabled;
    }

    set disabled(value: boolean) {
        this.enabled = !value;
    }
}

export function parseFromString(asString: string): string | number | boolean {
    try {
        // Will catch numbers, booleans (and objects, though we won't pass them)
        return JSON.parse(asString)
    } catch (e) {
        return asString
    }
}

export function generateSessionID(): string {
    return Date.now().toString() + "-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}