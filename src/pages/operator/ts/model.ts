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
}
