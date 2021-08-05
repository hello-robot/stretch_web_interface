'use strict';

class PoseManager {
    constructor(db, poseContainerId) {
        this.db = db;
        this.poseContainerId = poseContainerId;
        this.poses  = {};
        this.pending_requests = {};
    }

    initialize() {
        $("#"+this.poseContainerId).empty();

        this.db.getGlobalPoses().then(poses => {
            this.poses.global = poses.val();
            for (const id in this.poses.global) {
                this.createPoseButton(this.poses.global[id], id);
            }
        });

        this.db.getUserPoses().then(poses => {
            if (poses.val() !== null) {
                this.poses.user = poses.val();
                for (const id in this.poses.user) {
                    this.createPoseButton(this.poses.user[id], id);
                }
            } else {
                this.poses.user = {};
            }
        });

        $("#"+this.poseContainerId).append(`
            <button
                type="button"
                class="btn btn-primary btn-block my-4"
                data-toggle="modal"
                data-target="#posesModal">
            Save pose
            </button>`);
    }

    createPoseButton(pose, id) {
        $("#"+this.poseContainerId).append(`
            <button
                id="${id}Button"
                type="button"
                class="btn btn-secondary btn-block my-2"
                title="${pose.description}"
                onclick="moveToPose('${id}')">
            ${pose.description}
            </button>
        `);
    }

    getPose(id) {
        if (id in this.poses.global) {
            return this.poses.global[id];
        }
        if (id in this.poses.user) {
            return this.poses.user[id];
        }
        console.error(`No pose with id ${id} found`);
    }

    async getRobotState(id) {
        let statePromise = new Promise((resolve, reject)=> {
            sendData({
                type: 'request',
                id: id,
                requestType: 'jointState',
                responseHandler: 'poseManager'
            });

            this.pending_requests[id] = {
                "handleResponse": (state) => {
                        if (state.responseType === 'jointState') {
                            resolve(state);
                            delete this.pending_requests[id];
                        } else {
                            console.error(`Invalid response ${state.responseType}. Expected: jointState`);
                        }
                    },
                "requestType": "jointState"
        }
        });

        return statePromise;
    }

    async addPose() {
        let poseFilter = {
            head: !!$('input[name="head"]:checked'),
            gripper: !!$('input[name="gripper"]:checked'),
            arm: !!$('input[name="arm"]:checked'),
        };
        let description = $("#poseModalDescription").val();
        let id = description.replace(/\s/g, '');

        let fullPose = await this.getRobotState(id);

        let pose = {};

        /*
        this.db.addPose(id, description, pose)
        this.createPoseButton({pose: pose, description: description}, id);
        this.poses.user[id] = {pose: pose, description: description};
        */
        console.log(fullPose);
    }

}
$("#addPoseForm").on("submit",function(e) {
    e.preventDefault();
    $('#posesModal').modal('hide');
    poseManager.addPose();
});