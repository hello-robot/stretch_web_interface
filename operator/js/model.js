const DEFAULTS = {
    "pose": {},
    "setting": {
        "armReachVisualization": false,
        "showPermanentIconsGripper": true,
        "showPermanentIconsOverhead": true,
        "showPermanentIconsPantilt": true,
    },
    "navsetting" : {
        "displayMode": "action-overlay",
        "actionMode": "incremental",
        "startStopMode": "click-click",
        "velocityControlMode": "discrete",
        "velocityScale": 2,
        "continuousVelocityStepSize": 0.15,
    },
    "manipsetting": {
        "actionMode": "incremental",
        "startStopMode": "click-click",
        "velocityControlMode": "discrete",
        "velocityScale": 2,
        "continuousVelocityStepSize": 0.15,
    },
    // Set a flag so that we know whether a model was initialized from defaults
    "reserved": {
        "initialized": true
    }
}

class Model {
    addPose(id, pose) {
        console.error("Not implemented")
    }

    removePose(id) {
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
        var savedSettings = new Map();
    }

    addPose(name, pose) {
        localStorage.setItem(`pose.${name}`, JSON.stringify(pose))
    }

    getPose(name) {
        return JSON.parse(localStorage.getItem(`pose.${name}`))
    }

    getPoses() {
        let poses = this._getAllInNamespace("pose")
        // Poses are kept as JSON blobs
        return poses.map(([name, pose]) => JSON.parse(pose))
    }

    removePose(name) {
        localStorage.removeItem(`pose.${name}`)
    }

    setSetting(key, value, namespace="setting") {
        localStorage.setItem(`${namespace}.${key}`, value)
    }

    loadSavedSettings() {
        console.log(this.savedSettings);
        for (const [namespace, savedSettings] of this.savedSettings.entries()) { 
            for (const [key, value] of savedSettings.entries()) {
                this.setSetting(key, value, namespace);
            }
        }
    }

    saveSettings() {
        this.savedSettings = new Map([
            ["setting", this.getSettings("setting")],
            ["navsetting", this.getSettings("navsetting")],
            ["manipsetting", this.getSettings("manipsetting")]
        ])
    }

    getSetting(key, namespace="setting") {
        return localStorage.getItem(`${namespace}.${key}`)
    }

    getSettings(namespace="setting") {
        return new Map(this._getAllInNamespace(namespace))
    }

    _getAllInNamespace(namespace) {
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
