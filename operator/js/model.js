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
        let poses = []
        for (const key in localStorage) {
            if (key.startsWith("pose.")) {
                poses.push(JSON.parse(localStorage.getItem(key)))
            }
        }
        return poses
    }

    removePose(name) {
        localStorage.removeItem(`pose.${name}`)
    }
}
