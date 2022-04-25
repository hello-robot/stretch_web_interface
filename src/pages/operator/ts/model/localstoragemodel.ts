import { cmd } from "shared/commands";
import { NamedPose } from "shared/util";
import { Model, DEFAULTS, Settings, parseFromString, generateSessionID } from "./model";


export class LocalStorageModel extends Model {
    sid: string;
    sessions: string[] = []

    constructor() {
        super();
        if (localStorage.getItem("reserved.initialized") !== "true") {
            console.warn("Detected that LocalStorageModel isn't initialized. Reinitializing.");
            this.reset();
        }

        this.sid = "";
    }

    authenticate(): void {
        
    }

    addPose(name: string, pose: NamedPose) {
        localStorage.setItem(`pose.${name}`, JSON.stringify(pose));
    }

    getPose(name: string): NamedPose | undefined {
        return JSON.parse(localStorage.getItem(`pose.${name}`)!);
    }

     getPoses(): NamedPose[] {
        let poses = this.getAllForKeyPrefix("pose");
        // Poses are kept as JSON blobs
        return poses.map(([name, pose]) => JSON.parse(pose));
    }

    removePose(name: string) {
        localStorage.removeItem(`pose.${name}`);
    }

    setSetting(key: string, value: any, namespace?: string) {
        let keyPath = "setting";
        if (namespace) {
            keyPath = `${keyPath}.${namespace}`;
        }
        localStorage.setItem(`${keyPath}.${key}`, value);
    }

    loadSettingProfile(profileName: string) {
        let profile = JSON.parse(localStorage.getItem(`settingProfiles.${profileName}`)!);
        for (const [key, value] in profile) {
            this.setSetting(key, value);
        }
    }

    deleteSettingProfile(profileName: string) {
        if (localStorage.getItem(`settingsProfiles.${profileName}`)) {
            localStorage.removeItem(`settingsProfiles.${profileName}`);
            return true;
        }
        return false;
    }

    saveSettingProfile(profileName: string) {
        let toSave = JSON.stringify(this.getAllForKeyPrefix("setting"));
        localStorage.setItem(`settingsProfiles.${profileName}`, toSave);
    }

    getSetting(key: string, namespace?: string) {
        let keyPath = "setting";
        if (namespace) {
            keyPath = `${keyPath}.${namespace}`;
        }
        return parseFromString(localStorage.getItem(`${keyPath}.${key}`)!);
    }

    getSettings() {
        let settings = this.getAllForKeyPrefix("setting");
        // Try to restore type information for stored numbers, bools
        settings = settings.map(([key, value]) => [key, parseFromString(value) as string]);
        settings = Object.fromEntries(settings);

        // Unpack these so we don't leak the fact that we use a flat keystore
        return unflatten(settings);
    }

    private getAllForKeyPrefix(keyPrefix: string): [string, string][] {
        let items: [string, string][] = [];
        for (const key in localStorage) {
            if (key.startsWith(`${keyPrefix}.`)) {
                const unnamespacedKey = key.substring(keyPrefix.length + 1);
                items.push([unnamespacedKey, localStorage.getItem(key)!]);
            }
        }
        return items;
    }

    reset() {
        localStorage.clear();
        this.loadWithObject("", DEFAULTS);
    }

    private loadWithObject(prefix: string, object: object) {
        for (let [key, value] of Object.entries(object)) {
            let newPrefix;
            if (prefix) {
                newPrefix = `${prefix}.${key}`;
            } else {
                newPrefix = `${key}`;
            }
            if (typeof value === "object") {
                this.loadWithObject(newPrefix, value);
            } else {
                localStorage.setItem(newPrefix, value);
            }

        }
    }

    startSession(sessionId?: string): void {
        this.sid = sessionId ? sessionId : generateSessionID();

        this.sessions.push(this.sid);

        this.logComand({
			type: "startSession",
		});
    }

    stopSession(): void {
        this.sid = "";

        this.logComand({
			type: "stopSession",
		});
    }

    logComand(cmd: cmd): void {
        if (this.sid) {
            let commands = JSON.parse(localStorage.getItem(`session.${this.sid}`)!);
            if (!commands) {
                commands = [];
            }
            commands.push(cmd);
            localStorage.setItem(`session.${this.sid}`, JSON.stringify(commands));
        }
    }

    getSessions(): string[] {
        return this.sessions;
    }

    async getCommands(sessionId: string): Promise<cmd[]> {
        return JSON.parse(localStorage.getItem(`session.${sessionId}`)!);
    }
}

export function unflatten(data: any): any {
    if (Object(data) !== data || Array.isArray(data))
        return data;
    let regex = /\.?([^.\[\]]+)|\[(\d+)\]/g,
        resultholder = {};
    for (let p in data) {
        let cur: any = resultholder,
            prop = "",
            m;
        while (m = regex.exec(p)) {
            cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
            prop = m[2] || m[1];
        }
        cur[prop] = data[p];
    }
    return resultholder[""] || resultholder;
}