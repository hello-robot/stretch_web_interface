'use strict';

class PoseManager {
    constructor(db, poseContainerId) {
        this.db = db;
        this.poseContainerId = poseContainerId;
        this.poses;
    }

    initialize() {
        $("#"+this.poseContainerId).empty();
        this.db.getAllPoses().then(poses => {
            this.poses = poses.val();
            for (const id in this.poses) {
                this.createPoseButton(this.poses[id], id);
            }
        });
    }

    createPoseButton(pose, id) {
        $("#"+this.poseContainerId).append(`
            <button
                id="${pose.name}Button"
                type="button"
                class="btn btn-secondary btn-block my-2"
                title="${pose.description}"
                onclick="moveToPose('${id}')">
            ${pose.description}
            </button>
        `);
    }

}
