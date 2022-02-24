type uuid = string;
// From: https://stackoverflow.com/a/2117523/6454085
export function generateUUID(): uuid {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


////////////////////////////////////////////////////////////
// safelyParseJSON code copied from
// https://stackoverflow.com/questions/29797946/handling-bad-json-parse-in-node-safely
// on August 18, 2017
export function safelyParseJSON(json: string): any {
    // This function cannot be optimized, it's best to
    // keep it small!
    var parsed;

    try {
        parsed = JSON.parse(json);
    } catch (e) {
        // Oh well, but whatever...
    }

    return parsed; // Could be undefined!
}

export interface WebRTCMessage {

}

export interface Request {
    type: "request",
    requestType: string,
    id: uuid,
    data: any,
}

export interface Response {
    type: "response",
    requestType: string,
    id: uuid,
    data?: any,
}

export type Responder = () => Response;

export interface CameraInfo {
    [key: string]: string
}

export interface SignallingMessage {

}