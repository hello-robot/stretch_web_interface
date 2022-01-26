'use strict';

var messages_received_body = [];
var commands_sent_body = [];
var messages_received_wrist = [];
var commands_sent_wrist = [];

let inSim = localStorage.getItem('inSim') === "true";

const MODIFIERS = {"verysmall": 0, "small": 1, "medium": 2, "large": 3, "verylarge": 4};

/*
* VELOCITY SETTINGS
*/

const headMedDist = 0.1;
const driveTransMedDist = 100.0;
const driveRotMedDist = 10.0;
const liftMedDist = 100.0;
const extendMedDist = 100.0;
const wristMedDist = 0.1;

const headMedV = 0.1;
const driveTransMedV = 0.02;
const driveRotMedV = 0.1;
const LIFT_MED_V = 0.02;
const EXTEND_MED_V = 0.02;
const WRIST_MED_V = 0.1;

const V_SCALES = [0.1, 0.5, 1.0, 1.5, 2.0];

const HEAD_V = [];
const DRIVE_TRANS_V = [];
const DRIVE_ROT_V = [];
const LIFT_V = [];
const EXTEND_V = [];
const WRIST_V = [];

for (let i = 0; i < V_SCALES.length; i++) {
    let s = V_SCALES[i];
    HEAD_V.push(s * headMedV);
    DRIVE_TRANS_V.push(s * driveTransMedV);
    DRIVE_ROT_V.push(s * driveRotMedV);
    LIFT_V.push(s * LIFT_MED_V);
    EXTEND_V.push(s * EXTEND_MED_V);
    WRIST_V.push(s * WRIST_MED_V);
}

export class Robot {
    ros
    panOffset = 0;
    tiltOffset = 0;

    tfClient
    trajectoryClient
    jointStateTopic

    linkGripperFingerLeftTF;
    linkHeadTiltTF;
    cameraColorFrameTF
    baseTF;

    videoTopics = []

    backendUpdateFrequency = 200; //milliseconds
    backendRobotMode = 'nav';

    isWristFollowingActive = false

    commands = {
        "drive": {
            "forward": size => {
                this.baseTranslate(100, -DRIVE_TRANS_V[MODIFIERS[size]])
            },
            "backward": size => {
                this.baseTranslate(100, DRIVE_TRANS_V[MODIFIERS[size]])
            },
            "turn_right": size => {
                this.baseTurn(driveRotMedDist, DRIVE_ROT_V[MODIFIERS[size]]);
            },
            "turn_left": size => {
                this.baseTurn(driveRotMedDist, -DRIVE_ROT_V[MODIFIERS[size]]);
            },
            "turn_ccw": size => {
                this.baseTurn(driveRotMedDist, Math.PI / 2);
            },
            "turn_cw": size => {
                this.baseTurn(driveRotMedDist, -Math.PI / 2);
            }
        },
        "lift": {
            "up": size => {
                this.liftMove(liftMedDist, -1, LIFT_V[MODIFIERS[size]]);
            },
            "down": size => {
                this.liftMove(liftMedDist, -1, -LIFT_V[MODIFIERS[size]]);
            }
        },
        "arm": {
            "extend": size => {
                this.armMove(extendMedDist, -1, EXTEND_V[MODIFIERS[size]]);
            },
            "retract": size => {
                this.armMove(extendMedDist, -1, -EXTEND_V[MODIFIERS[size]]);
            }
        },
        "wrist": {
            "in": size => {
                this.wristMove(wristMedDist, WRIST_V[MODIFIERS[size]])
            },
            "out": size => {
                this.wristMove(wristMedDist, -WRIST_V[MODIFIERS[size]])
            },
            "stop_all_motion": () => {
                this.wristStopMotion();
            },
            "bend_velocity": deg_per_sec => {
                this.wristBendVelocity(deg_per_sec);
            },
            "auto_bend": ang_deg => {
                this.wristAutoBend(ang_deg);
            },
            "init_fixed_wrist": size => {
                this.initFixedWrist();
            },
            "bend_up": size => {
                this.wristBend(5.0); // attempt to bed the wrist upward by 5 degrees
            },
            "bend_down": size => {
                this.wristBend(-5.0); // attempt to bed the wrist downward by 5 degrees
            },
            "roll_left": size => {
                this.wristRoll(-5.0); // attempt to roll the wrist to the left (clockwise) by 5 degrees
            },
            "roll_right": size => {
                this.wristRoll(5.0); // attempt to roll the wrist to the right (counterclockwise) by 5 degrees
            }
        },
        "gripper": {
            "set_goal": goalWidthCm => {
                this.gripperGoalAperture(goalWidthCm);
            },
            "open": size => {
                this.gripperDeltaAperture(1.0);
            },
            "close": size => {
                this.gripperDeltaAperture(-1.0);
            },
            "fully_close": size => {
                this.gripperFullyClose();
            },
            "half_open": size => {
                this.gripperHalfOpen();
            },
            "fully_open": size => {
                this.gripperFullyOpen();
            }
        },
        "head": {
            "up": size => {
                this.headTilt(HEAD_V[MODIFIERS[size]]);
            },
            "down": size => {
                this.headTilt(-HEAD_V[MODIFIERS[size]]);
            },
            "left": size => {
                this.headPan(HEAD_V[MODIFIERS[size]]);
            },
            "right": size => {
                this.headPan(-HEAD_V[MODIFIERS[size]]);
            },
            "gripper_follow": isStart => {
                this.headLookAtGripper(isStart);
            },
        },
        "full": {
            "pose": pose => {
                this.goToPose(pose);
            }
        },
        "mode": modeCommands
    }

    constructor({jointStateCallback, tfCallback, connectedCallback}) {
        // connect to rosbridge websocket
        this.ros = new ROSLIB.Ros({
            url: 'wss://localhost:9090'
        });
        let that = this
        this.ros.on('connection', function () {
            console.log('Connected to websocket.');

            let simTime = new ROSLIB.Param({
                ros: that.ros,
                name: '/use_sim_time'
            });

            // Get the value of the max linear speed paramater
            simTime.get(function (value) {
                if (value != null) {
                    if (value !== inSim) {
                        localStorage.setItem("inSim", value);
                        location.reload();
                    }
                }
            });
            if (connectedCallback) connectedCallback();
        });

        this.ros.on('error', function (error) {
            console.error('Error connecting to websocket: ', error);
        });

        this.ros.on('close', function () {
            console.log('Connection to websocket has been closed.');
        });

        this.jointStateTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: '/stretch/joint_states/',
            messageType: 'sensor_msgs/JointState'
        });
        this.jointStateTopic.subscribe(message => {
            if (that.jointState === null) {
                console.log('Received first joint state from ROS topic ' + this.jointStateTopic.name);
            }
            that.jointState = message;
            if (jointStateCallback) jointStateCallback(message)
        });

        this.tfClient = new ROSLIB.TFClient({
            ros: this.ros,
            fixedFrame: 'base_link',
            angularThres: 0.01,
            transThres: 0.01
        });


        this.tfClient.subscribe('link_gripper_finger_left', tf => {
            that.linkGripperFingerLeft = tf;
            if (tfCallback) {
                tfCallback(tf)
            }
        });


        this.tfClient.subscribe('link_head_tilt', function (tf) {
            that.linkHeadTiltTF = tf;
            if (tfCallback) {
                tfCallback(tf)
            }
        });


        this.tfClient.subscribe('camera_color_frame', function (tf) {
            that.cameraColorFrameTF = tf;
            if (tfCallback) {
                tfCallback(tf)
            }
        });

        this.tfClient.subscribe('odom', function (tf) {
            that.baseTF = tf;
        });
        this.trajectoryClient = new ROSLIB.ActionClient({
            ros: this.ros,
            serverName: '/stretch_controller/follow_joint_trajectory',
            actionName: 'control_msgs/FollowJointTrajectoryAction'
        });
        window.setInterval(this.updateBackend.bind(this), this.backendUpdateFrequency);
    }

    robotModeOn(modeKey) {
        console.log('robotModeOn called with modeKey = ' + modeKey)

        let debugDiv = document.getElementById("debug-text");
        debugDiv.innerHTML = "Robot mode: " + modeKey;
        this.backendRobotMode = modeKey;

        // This is where the head pose gets set when mode is switched.

        if (modeKey === 'nav') {
            var headNavPoseGoal = generatePoseGoal({
                'joint_head_pan': 0.0,
                'joint_head_tilt': -1.2
            }, this.trajectoryClient);
            headNavPoseGoal.send();
            console.log('sending navigation pose to head');
        } else if (modeKey === 'manip') {
            resetOffset();
            lookAtGripper();
            console.log('sending end-effector pose to head');
        } else if (modeKey === 'low_arm') {
            var headManPoseGoal = generatePoseGoal({
                'joint_head_pan': -1.57,
                'joint_head_tilt': -0.9
            }, this.trajectoryClient);
            headManPoseGoal.send();
            console.log('sending manipulation pose to head');
        } else if (modeKey === 'high_arm') {
            var headManPoseGoal = generatePoseGoal({
                'joint_head_pan': -1.57,
                'joint_head_tilt': -0.45
            }, this.trajectoryClient);
            headManPoseGoal.send();
            console.log('sending manipulation pose to head');
        }
    }

    subscribeToVideo(topicName, callback) {
        let topic = new ROSLIB.Topic({
            ros: this.ros,
            name: topicName,
            messageType: 'sensor_msgs/CompressedImage'
        });
        this.videoTopics.push(topic)
        topic.subscribe(callback)
    }

////////////////////////////////////////////////////////////////////////////////////

//Called from button click
    baseTranslate(dist, vel) {
        // distance in centimeters
        // velocity in centimeters / second
        if (dist > 0.0) {
            var baseForwardPoseGoal = generatePoseGoal({'translate_mobile_base': -vel}, this.trajectoryClient)
            baseForwardPoseGoal.send()
        } else if (dist < 0.0) {
            var baseBackwardPoseGoal = generatePoseGoal({'translate_mobile_base': vel}, this.trajectoryClient)
            baseBackwardPoseGoal.send()
        }
        //sendCommandBody({type: "base",action:"translate", dist:dist, vel:vel});

    }

    baseTurn(ang_deg, vel) {
        // angle in degrees
        // velocity in centimeter / second (linear wheel velocity - same as BaseTranslate)
        if (ang_deg > 0.0) {
            var baseTurnLeftPoseGoal = generatePoseGoal({'rotate_mobile_base': -vel}, this.trajectoryClient)
            baseTurnLeftPoseGoal.send()
        } else if (ang_deg < 0.0) {
            var baseTurnRightPoseGoal = generatePoseGoal({'rotate_mobile_base': vel}, this.trajectoryClient)
            baseTurnRightPoseGoal.send()
        }
        //sendCommandBody({type: "base",action:"turn", ang:ang_deg, vel:vel});
    }

    sendIncrementalMove(jointName, jointValueInc) {
        if (this.jointState !== null) {
            var newJointValue = getJointValue(this.jointState, jointName)
            newJointValue = newJointValue + jointValueInc
            console.log('poseGoal call: jointName =' + jointName)
            var pose = {[jointName]: newJointValue}
            var poseGoal = generatePoseGoal(pose, this.trajectoryClient)
            poseGoal.send()
            return true;
        } else {
            console.warn("Couldn't send incremental move without joint states")
        }
        return false;
    }

    headLookAtGripper(isStarting) {
        this.isWristFollowingActive = isStarting;
        if (isStarting)
            this.resetOffset();
        return true;
    }

    updateHead() {
        if (this.isWristFollowingActive) {
            if (this.linkGripperFingerLeftTF && this.linkHeadTiltTF) {
                this.lookAtGripper();
            }
        }
    }

    resetOffset() {
        this.panOffset = 0;
        this.tiltOffset = 0;
    }

    lookAtGripper() {

        let posDifference = {
            x: this.linkGripperFingerLeftTF.translation.x - this.linkHeadTiltTF.translation.x,
            y: this.linkGripperFingerLeftTF.translation.y - this.linkHeadTiltTF.translation.y,
            z: this.linkGripperFingerLeftTF.translation.z - this.linkHeadTiltTF.translation.z
        };

        // Normalize posDifference
        const scalar = Math.sqrt(posDifference.x ** 2 + posDifference.y ** 2 + posDifference.z ** 2);
        posDifference.x /= scalar;
        posDifference.y /= scalar;
        posDifference.z /= scalar;

        const pan = Math.atan2(posDifference.y, posDifference.x) + this.panOffset;
        const tilt = Math.atan2(posDifference.z, -posDifference.y) + this.tiltOffset;

        let debugDiv = document.getElementById("debug-text");
        debugDiv.innerHTML += "\n lookAtGripper: " + pan + "," + tilt;

        let headFollowPoseGoal = generatePoseGoal({'joint_head_pan': pan, 'joint_head_tilt': tilt})
        headFollowPoseGoal.send()
        console.log('Sending arm look at pose to head.')
    }

    updateBackend() {
        this.updateHead();
    }


    armMove(dist, timeout, vel) {
        console.log('attempting to sendarmMove command')
        var jointValueInc = 0.0
        if (dist > 0.0) {
            jointValueInc = vel;
        } else if (dist < 0.0) {
            jointValueInc = -vel;
        }
        this.sendIncrementalMove('wrist_extension', jointValueInc)
        //this.sendCommandBody({type: "arm", action:"move", dist:dist, timeout:timeout});
    }

    liftMove(dist, timeout, vel) {
        var jointValueInc = 0.0
        if (dist > 0.0) {
            jointValueInc = vel;
        } else if (dist < 0.0) {
            jointValueInc = -vel;
        }
        this.sendIncrementalMove('joint_lift', jointValueInc)
        //this.sendCommandBody({type: "lift", action:"move", dist:dist, timeout:timeout});
    }

    gripperDeltaAperture(deltaWidthCm) {
        // attempt to change the gripper aperture
        var jointValueInc = 0.0
        if (deltaWidthCm > 0.0) {
            jointValueInc = 0.05
        } else if (deltaWidthCm < 0.0) {
            jointValueInc = -0.05
        }
        this.sendIncrementalMove('joint_gripper_finger_left', jointValueInc)
        //this.sendCommandWrist({type:'gripper', action:'delta', delta_aperture_cm:deltaWidthCm});
    }

    wristMove(angRad, vel) {
        var jointValueInc = 0.0
        if (angRad > 0.0) {
            jointValueInc = vel;
        } else if (angRad < 0.0) {
            jointValueInc = -vel;
        }
        this.sendIncrementalMove('joint_wrist_yaw', jointValueInc)
    }

    headTilt(angRad) {
        if (this.isWristFollowingActive) {
            this.tiltOffset += angRad;
        } else {
            this.sendIncrementalMove('joint_head_tilt', angRad);
        }
    }

    headPan(angRad) {
        if (this.isWristFollowingActive) {
            this.panOffset += angRad;
        } else {
            this.sendIncrementalMove('joint_head_pan', angRad);
        }
    }

    goToPose(pose) {
        generatePoseGoal(pose, this.trajectoryClient).send()
    }

    executeCommand(type, name, modifier) {
        this.commands[type][name](modifier)
    }


}

function generatePoseGoal(pose, trajectoryClient) {
    var outStr = '{'
    for (const key in pose) {
        outStr = outStr + String(key) + ':' + String(pose[key]) + ', '
    }
    outStr = outStr + '}'
    console.log('generatePoseGoal( ' + outStr + ' )')

    var jointNames = []
    var jointPositions = []
    for (var key in pose) {
        jointNames.push(key)
        jointPositions.push(pose[key])
    }

    var newGoal = new ROSLIB.Goal({
        actionClient: trajectoryClient,
        goalMessage: {
            trajectory: {
                header: {
                    stamp: {
                        secs: 0,
                        nsecs: 0
                    }
                },
                joint_names: jointNames,
                points: [
                    {
                        positions: jointPositions,
                        // The following might causing the jumpiness in continuous motions
                        time_from_start: {
                            secs: 0,
                            nsecs: 1
                        }

                    }
                ]
            }
        }
    });


    newGoal.on('feedback', function (feedback) {
        console.log('Feedback: ' + feedback.sequence);
    });

    newGoal.on('result', function (result) {
        console.log('Final Result: ' + result.sequence);
    });

    return newGoal

}


var modeKeys = ['nav', 'manip', 'low_arm', 'high_arm', 'hand', 'look'];

function createModeCommands() {
    modeCommands = {}
    for (var index in modeKeys) {
        var key = modeKeys[index]
        // function inside a function used so that commandKey will not
        // change when key changes. For example, without this, the
        // interface mode and robotModeOn commands use key = 'look'
        // (last mode) whenever a function is executed.
        modeCommands[key] = function (commandKey) {
            return function (modifier) {
                if (modifier === 'no_wrist') {
                    this.interfaceModifier = 'no_wrist';
                } else {
                    if (modifier !== 'none') {
                        console.error('modeCommands modifier unrecognized = ', modifier);
                        console.trace()
                    }
                    this.interfaceModifier = 'none';
                }
                console.log('mode: command received with interfaceModifier = ' + this.interfaceModifier + ' ...executing');
                this.interfaceMode = commandKey
                robotModeOn(commandKey)
            }
        }(key)
    }
    return modeCommands;
}

var modeCommands = createModeCommands();


export function getJointEffort(jointStateMessage, jointName) {
    var jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.effort[jointIndex]
}

export function getJointValue(jointStateMessage, jointName) {
    var jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.position[jointIndex]
}

////////////////////////////////////////////////////////////////////////////////////

// Modified from https://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
function quaternionToEuler(q, order) {
    order = order || "YZX";

    var heading, attitude, bank;
    var x = q.x, y = q.y, z = q.z, w = q.w;

    switch (order) {
        case "YZX":
            var test = x * y + z * w;
            if (test > 0.499) { // singularity at north pole
                heading = 2 * Math.atan2(x, w);
                attitude = Math.PI / 2;
                bank = 0;
            }
            if (test < -0.499) { // singularity at south pole
                heading = -2 * Math.atan2(x, w);
                attitude = -Math.PI / 2;
                bank = 0;
            }
            if (isNaN(heading)) {
                var sqx = x * x;
                var sqy = y * y;
                var sqz = z * z;
                heading = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz); // Heading
                attitude = Math.asin(2 * test); // attitude
                bank = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz); // bank
            }
            break;
        default:
            throw new Error("Euler order " + order + " not supported yet.");
    }

    return {
        y: heading,
        z: attitude,
        x: bank
    }
}