import { Pose } from "shared/util"
export const DEFAULTS: Settings = {
    "pose": {},
    "setting": {
        "armReachVisualization": false,
        "showPermanentIconsGripper": true,
        "showPermanentIconsOverhead": true,
        "showPermanentIconsPantilt": true,
        "velocityControlMode": "discrete",
        "velocityScale": 2,
        "continuousVelocityStepSize": 0.15,
        "nav": {
            "displayMode": "action-overlay",
            "actionMode": "incremental",
            "startStopMode": "click-click",
        },
        "manip": {
            "actionMode": "incremental",
            "startStopMode": "click-click",
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
    "pose": { [key: string]: Pose};
    "setting": { [key: string]: SettingEntry | { [key: string]: SettingEntry } };
    "settingsProfiles": { [key: string]: { [key: string]: SettingEntry | { [key: string]: SettingEntry } } };
    "reserved": { [key: string]: SettingEntry | { [key: string]: SettingEntry } };
}

export abstract class Model {
    protected enabled: boolean = true;

    abstract addPose(name: string, pose: Pose): void;

    abstract getPose(id: string): Pose | undefined;

    abstract getPoses(): Pose[];
    
    abstract removePose(id: string): void;
    
    abstract setSetting(key: string, value: SettingEntry, namespace?: string): void;

    abstract loadSettingProfile(profileName: string): void;

    abstract deleteSettingProfile(profileName: string): boolean;

    abstract saveSettingProfile(profileName: string): void;

    abstract getSetting(key: string, namespace?: string): SettingEntry;

    abstract getSettings(): Settings;

    abstract reset(): void

    get disabled(): boolean {
        return !this.enabled;
    }

    set disabled(value: boolean) {
        this.enabled = !value;
    }
}
