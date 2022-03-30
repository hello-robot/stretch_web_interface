import { Pose } from "../../../shared/util"
const DEFAULTS = {
    "pose": {},
    "setting": {
        "armReachVisualization": false,
        "showPermanentIconsGripper": true,
        "showPermanentIconsOverhead": true,
        "showPermanentIconsPantilt": true,
        "velocityControlMode": "discrete",
        "velocityScale": 2,
        "continuousVelocityStepSize": 0.15,
    },
    "navsetting" : {
        "displayMode": "action-overlay",
        "actionMode": "incremental",
        "startStopMode": "click-click",
    },
    "manipsetting": {
        "actionMode": "incremental",
        "startStopMode": "click-click",
    },
    // Set a flag so that we know whether a model was initialized from defaults
    "reserved": {
        "initialized": true
    }
}

class Model {
    addPose(id: string, pose: Pose) {
        console.error("Not implemented")
    }

    removePose(id: string) {
        console.error("Not implemented")
    }

    getPoses() {
        console.error("Not implemented")
    }
}

export class LocalStorageModel extends Model {

    constructor() {
        super();
        if (localStorage.getItem("reserved.initialized") !== "true") {
            console.warn("Detected that LocalStorageModel isn't initialized. Reinitializing.")
            this.reset()
        }
        this.savedSettings = new Map();
    }

    addPose(name: string, pose: Pose) {
        localStorage.setItem(`pose.${name}`, JSON.stringify(pose))
    }

    getPose(name: string): Pose {
        return JSON.parse(localStorage.getItem(`pose.${name}`))
    }

    getPoses(): Pose[] {
        let poses = this._getAllInNamespace("pose")
        // Poses are kept as JSON blobs
        return poses.map(([name, pose]) => JSON.parse(pose))
    }

    removePose(name: string) {
        localStorage.removeItem(`pose.${name}`)
    }

    setSetting(key: string, value: any, namespace="setting") {
        localStorage.setItem(`${namespace}.${key}`, value)
    }

    loadSavedSettings(settingName: string) {
        for (const [namespace, savedSettings] of this.savedSettings.get(settingName).entries()) {
            for (const [key, value] of savedSettings.entries()) {
                this.setSetting(key, value, namespace);
            }
        }
    }

    saveSettings(settingName) {
        this.savedSettings.set(settingName, new Map([
            ["setting", this.getSettings("setting")],
            ["navsetting", this.getSettings("navsetting")],
            ["manipsetting", this.getSettings("manipsetting")]
        ]))
    }

    getSetting(key, namespace="setting") {
        return localStorage.getItem(`${namespace}.${key}`)
    }

    getSettings(namespace="setting") {
        return new Map(this._getAllInNamespace(namespace))
    }

    _getAllInNamespace(namespace: string) {
        let items = []
        for (const key in localStorage) {
            if (key.startsWith(`${namespace}.`)) {
                const unnamespacedKey = key.substring(namespace.length + 1)
                items.push([unnamespacedKey, localStorage.getItem(key)])
            }
        }
        return items
    }

    reset() {
        localStorage.clear()
        for (let [key, subkeys] of Object.entries(DEFAULTS)) {
            for (let [subkey, value] of Object.entries(subkeys)) {
                localStorage.setItem(`${key}.${subkey}`, value)
            }
        }
    }
}
