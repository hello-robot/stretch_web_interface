'use strict';

function respondToRequest(request) {
    switch(request.requestType) {
        case "jointState":
            sendData({
                type: "response",
                id: request.id,
                responseHandler: request.responseHandler,
                data: jointState
            });
            break;
    }
}

function receiveResponse(response) {
    switch (response.responseHandler) {
        case "poseManager":
            poseManager.pending_requests[response.id].handleResponse(response.data);
            break;

    }
}