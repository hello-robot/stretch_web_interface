import { Pose } from "shared/util"
export const DEFAULTS = {
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
    "settingsProfiles": [],

    // Set a flag so that we know whether a model was initialized from defaults
    "reserved": {
        "initialized": true
    }
}

export type SettingEntry = boolean | number | string;
export interface Settings {
    [key: string]: SettingEntry | { [key: string]: SettingEntry };
}

export abstract class Model {
    protected enabled: boolean = true;

    // NOTE: Any functions that don't return void have return promises because of firebase

    abstract getPose(id: string): Promise<Pose | undefined>;

    abstract getPoses(): Promise<Pose[]>;
    
    abstract removePose(id: string): void;
    
    abstract setSetting(key: string, value: SettingEntry, namespace?: string): void;

    abstract loadSettingProfile(profileName: string): void;

    abstract deleteSettingProfile(profileName: string): Promise<boolean>;

    abstract saveSettingProfile(profileName: string): void;

    abstract getSetting(key: string, namespace?: string): Promise<SettingEntry>;

    abstract getSettings(): Promise<Settings>;

    abstract reset(): void

    get disabled(): boolean {
        return !this.enabled;
    }

    set disabled(value: boolean) {
        this.enabled = !value;
    }
}
