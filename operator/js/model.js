const DEFAULTS = {
    "pose": {},
    "setting": {
        "armReachVisualization": false,
        "actionMode": "incremental",
        "continuousVelocityStepSize": 0.15,
        "velocityControlMode": "discrete",
        "velocityScale": 2,
        "showPermanentIconsGripper": true,
        "showPermanentIconsOverhead": true,
        "showPermanentIconsPantilt": true,
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

    setSetting(key, value) {
        localStorage.setItem(`setting.${key}`, value)
    }

    loadSavedSettings() {
        console.log(this.savedSettings);
        for (const [key, value] of this.savedSettings.entries()) {
            this.setSetting(key, value);
        }
        return this.savedSettings
    }

    saveSettings() {
        this.savedSettings = this.getSettings();
    }

    getSetting(key) {
        return localStorage.getItem(`setting.${key}`)
    }

    getSettings() {
        return new Map(this._getAllInNamespace("setting"))
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
