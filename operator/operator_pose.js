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
                            resolve(state.data);
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
            head: $('#poseSaveSelection_head').is(':checked'),
            gripper: $('#poseSaveSelection_gripper').is(':checked'),
            arm: $('#poseSaveSelection_arm').is(':checked'),
        };
        let description = $("#poseModalDescription").val();
        let id = description.replace(/\s/g, '');

        let fullPose = await this.getRobotState(id);

        let pose = {};

        if (poseFilter.head) {
            pose.joint_head_tilt = fullPose.joint_head_tilt;
            pose.joint_head_pan = fullPose.joint_head_pan;
        }

        if (poseFilter.gripper) {
            pose.joint_gripper_finger_left = fullPose.joint_gripper_finger_left
            pose.joint_wrist_yaw = fullPose.joint_wrist_yaw;
        }

        if (poseFilter.arm) {
            pose.wrist_extension = fullPose.wrist_extension;
            pose.joint_lift = fullPose.joint_lift;
        }

        this.db.addPose(id, description, pose)
        this.createPoseButton({pose: pose, description: description}, id);
        this.poses.user[id] = {pose: pose, description: description};
    }

}

// Modified from https://stackoverflow.com/a/60108369/6454085
$(document).ready(function(){
    var requiredCheckboxes = $('.poseSaveSelection');
    requiredCheckboxes.change(function() {
        if($('.poseSaveSelection:checked').length > 0) {
            requiredCheckboxes.removeAttr('required');
        } else {
            requiredCheckboxes.attr('required', 'required');
        }
    });
});

// Modified From : https://getbootstrap.com/docs/4.6/components/forms/#validation
(function() {
    'use strict';
    window.addEventListener('load', function() {
        // Fetch all the forms we want to apply custom Bootstrap validation styles to
        var form = $('#addPoseForm');
        form.on('submit', (event) => {
            if (form[0].checkValidity() === false) {
                event.preventDefault();
                event.stopPropagation();
            } else {
                addPoseFormHandler(event);
            }
            form.addClass('was-validated');
        });
    }, false);
})();


function addPoseFormHandler (e) {
    e.preventDefault();
    $('#posesModal').modal('hide');
    poseManager.addPose();
    $('#addPoseForm')[0].reset();
}
