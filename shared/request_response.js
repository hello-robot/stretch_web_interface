'use strict';

var allJoints = ['joint_head_tilt', 'joint_head_pan', 'joint_gripper_finger_left', 'wrist_extension', 'joint_lift', 'joint_wrist_yaw'];

function respondToRequest(request) {
    switch(request.requestType) {
        case "jointState":
            var processedJointPositions = {};
            allJoints.forEach((key, i) => {processedJointPositions[key] = getJointValue(jointState, key)});
            sendData({
                type: "response",
                id: request.id,
                responseHandler: request.responseHandler,
                responseType: request.requestType,
                data: processedJointPositions
            });
            break;
    }
}

function receiveResponse(response) {
    switch (response.responseHandler) {
        case "poseManager":
            poseManager.pending_requests[response.id].handleResponse(response);
            break;

    }
}