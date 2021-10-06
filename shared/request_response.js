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
        case "streamCameras":
            sendData({
                type: "response",
                id: request.id,
                responseHandler: request.responseHandler,
                responseType: request.requestType,
                data: cameraInfo
            });
            break;
    }
}

function receiveResponse(response) {
    globalRequestResponseHandler.pending_requests[response.id].handleResponse(response);
}

class RequestResponseHandler {
    constructor(name) {
        this.pending_requests = {};
        this.name = name;
    }

    makeRequest(requestType) {
        let request = new Promise((resolve, reject) => {
            let id = generateUUID();
            sendData({
                type: "request",
                id: id,
                requestType: requestType,
                responseHandler: this.name
            });


            this.pending_requests[id] = {
                "handleResponse": (state) => {
                        if (state.responseType === this.pending_requests[id].expectedType) {
                            resolve(state.data);
                            delete this.pending_requests[id];
                        } else {
                            reject(`Invalid response type ${state.responseType}. Expected: ${this.pending_requests[id].expectedType}`);
                        }
                    },
                "expectedType": requestType
            };
        });
        return request;
    }
}

// From: https://stackoverflow.com/a/2117523/6454085
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  