import { Pose } from "../../../shared/util"
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

    setSetting(key: string, value: any) {
        localStorage.setItem(`setting.${key}`, value)
    }

    getSetting(key: string): any {
        return localStorage.getItem(`setting.${key}`)
    }

    getSettings() {
        return new Map(this._getAllInNamespace("setting"))
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
}
