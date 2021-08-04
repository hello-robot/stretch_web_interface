'strict'

function respondToRequest(request) {
    switch (peer_name) {
        case "ROBOT":
            break;
        case "OPERATOR":
            break;
    }
}

function receiveResponse(response) {
    switch (peer_name) {
        case "ROBOT":
            break;
        case "OPERATOR":
            switch (response.requestType) {
                case "jointState":
                    poseManager.pending_states[response.id].handleResponse(response.data);
                    break;

            }
            break;
    }
}