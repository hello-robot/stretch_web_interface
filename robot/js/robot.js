export const ALL_JOINTS = ['joint_head_tilt', 'joint_head_pan', 'joint_gripper_finger_left', 'wrist_extension', 'joint_lift', 'joint_wrist_yaw'];
const MODIFIERS = {"verysmall": 0, "small": 1, "medium": 2, "large": 3, "verylarge": 4};
const V_SCALE_MODIFIERS = {"low":1, "medium":2, "high":3};
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
const driveTransMedV = 0.1;
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

    isWristFollowingActive = false

    commands = {
        "drive": {
            "forward": (vsize, vscalesize) => {
                this.baseTranslate(100, -DRIVE_TRANS_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize])            
            },
            "backward": (vsize, vscalesize) => {
                this.baseTranslate(100, DRIVE_TRANS_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize])
            },
            "turn_right": (vsize, vscalesize) => {
                this.baseTurn(driveRotMedDist, DRIVE_ROT_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "turn_left": (vsize, vscalesize) => {
                this.baseTurn(driveRotMedDist, -DRIVE_ROT_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "turn_ccw": (vsize, vscalesize) => {
                this.baseTurn(driveRotMedDist, -Math.PI / 2);
            },
            "turn_cw": (vsize, vscalesize) => {
                this.baseTurn(driveRotMedDist, Math.PI / 2);
            }
        },
        "lift": {
            "up": (vsize, vscalesize) => {
                this.liftMove(liftMedDist, -1, LIFT_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "down": (vsize, vscalesize) => {
                this.liftMove(liftMedDist, -1, -LIFT_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            }
        },
        "arm": {
            "extend": (vsize, vscalesize) => {
                this.armMove(extendMedDist, -1, EXTEND_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "retract": (vsize, vscalesize) => {
                this.armMove(extendMedDist, -1, -EXTEND_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            }
        },
        "wrist": {
            "in": (vsize, vscalesize) => {
                this.wristMove(wristMedDist, WRIST_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize])
            },
            "out": (vsize, vscalesize) => {
                this.wristMove(wristMedDist, -WRIST_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize])
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
            "init_fixed_wrist": (vsize, vscalesize) => {
                this.initFixedWrist();
            },
            "bend_up": (vsize, vscalesize) => {
                this.wristBend(5.0); // attempt to bed the wrist upward by 5 degrees
            },
            "bend_down": (vsize, vscalesize) => {
                this.wristBend(-5.0); // attempt to bed the wrist downward by 5 degrees
            },
            "roll_left": (vsize, vscalesize) => {
                this.wristRoll(-5.0); // attempt to roll the wrist to the left (clockwise) by 5 degrees
            },
            "roll_right": (vsize, vscalesize) => {
                this.wristRoll(5.0); // attempt to roll the wrist to the right (counterclockwise) by 5 degrees
            }
        },
        "gripper": {
            "set_goal": goalWidthCm => {
                this.gripperGoalAperture(goalWidthCm);
            },
            "open": (vsize, vscalesize) => {
                this.gripperDeltaAperture(1.0);
            },
            "close": (vsize, vscalesize) => {
                this.gripperDeltaAperture(-1.0);
            },
            "configure_camera": configuration => {

            }
        },
        "head": {
            "up": (vsize, vscalesize) => {
                this.headTilt(HEAD_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "down": (vsize, vscalesize) => {
                this.headTilt(-HEAD_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "left": (vsize, vscalesize) => {
                this.headPan(HEAD_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "right": (vsize, vscalesize) => {
                this.headPan(-HEAD_V[MODIFIERS[vsize]]*V_SCALE_MODIFIERS[vscalesize]);
            },
            "gripper_follow": value => {
                this.setPanTiltFollowGripper(value);
            },
            "configure_overhead_camera": configuration => {

            }
        },
        "full": {
            "pose": pose => {
                this.goToPose(pose);
            }
        }
    }

    constructor({jointStateCallback, tfCallback}) {
        this.jointStateCallback = jointStateCallback
        this.tfCallback = tfCallback

    }

    connect() {
        return new Promise((res, rej) => {
            // connect to rosbridge websocket
            let ros = new ROSLIB.Ros({
                url: 'wss://localhost:9090'
            });
            ros.on('connection', () => {
                let simTime = new ROSLIB.Param({
                    ros: ros,
                    name: '/use_sim_time'
                });

                simTime.get(value => {
                    this.inSim = value
                });
                res(ros)
            });

            ros.on('error', (error) => {
                rej(error)
            });

            ros.on('close', () => {
                rej('Connection to websocket has been closed.')
            });
        }).then(ros => {
            this.ros = ros
            this.jointStateTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/stretch/joint_states/',
                messageType: 'sensor_msgs/JointState'
            });
            this.jointStateTopic.subscribe(message => {
                if (this.jointState === null) {
                    console.log('Received first joint state from ROS topic ' + this.jointStateTopic.name);
                }
                this.jointState = message;
                if (this.jointStateCallback) this.jointStateCallback(message)
            });

            this.tfClient = new ROSLIB.TFClient({
                ros: this.ros,
                fixedFrame: 'base_link',
                angularThres: 0.01,
                transThres: 0.01
            });

            this.tfClient.subscribe('link_gripper_finger_left', transform => {
                this.linkGripperFingerLeftTF = transform;
                if (this.tfCallback) {
                    this.tfCallback('link_gripper_finger_left', transform)
                }
            });

            this.tfClient.subscribe('link_head_tilt', transform => {
                this.linkHeadTiltTF = transform;
                if (this.tfCallback) {
                    this.tfCallback('link_head_tilt', transform)
                }
            });

            this.tfClient.subscribe('camera_color_frame', transform => {
                this.cameraColorFrameTF = transform;
                if (this.tfCallback) {
                    this.tfCallback('camera_color_frame', transform)
                }
            });

            this.tfClient.subscribe('odom', transform => {
                this.baseTF = transform;
            });
            this.trajectoryClient = new ROSLIB.ActionClient({
                ros: this.ros,
                serverName: '/stretch_controller/follow_joint_trajectory',
                actionName: 'control_msgs/FollowJointTrajectoryAction'
            });
            return Promise.resolve()
        })
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
    }

    sendIncrementalMove(jointName, jointValueInc) {
        if (this.jointState === null) {
            console.warn("Couldn't send incremental move without joint states")
            return false
        }
        let newJointValue = getJointValue(this.jointState, jointName)
        newJointValue = newJointValue + jointValueInc
        let pose = {[jointName]: newJointValue}
        let poseGoal = generatePoseGoal(pose, this.trajectoryClient)
        poseGoal.send()
        return true;

    }

    setPanTiltFollowGripper(value) {
        if (this.isWristFollowingActive === value) return;
        this.isWristFollowingActive = value;
        if (value) {
            this.resetOffset();
            this.lookAtGripper()
            this.lookAtGripperInterval = window.setInterval(() => {
                if (this.linkGripperFingerLeftTF && this.linkHeadTiltTF) {
                    this.lookAtGripper();
                }
            }, 500);
        } else {
            clearInterval(this.lookAtGripperInterval)
            this.lookAtGripperInterval = null
        }
        return true;
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
        let panDiff = Math.abs(getJointValue(this.jointState, "joint_head_pan") - pan)
        let tiltDiff = Math.abs(getJointValue(this.jointState, "joint_head_tilt") - tilt)
        // FIXME(nickswalker,2-1-22): Goals really close to current state cause some whiplash
        //   these joints in simulation. Ignoring small goals hacks around this for now
        // console.log(panDiff, tiltDiff)
        if (panDiff < 0.02 && tiltDiff < 0.02) {
            return
        }
        let headFollowPoseGoal = generatePoseGoal({
            'joint_head_pan': pan,
            'joint_head_tilt': tilt
        }, this.trajectoryClient)
        headFollowPoseGoal.send()
    }

    armMove(dist, timeout, vel) {
        var jointValueInc = 0.0
        if (dist > 0.0) {
            jointValueInc = vel;
        } else if (dist < 0.0) {
            jointValueInc = -vel;
        }
        this.sendIncrementalMove('wrist_extension', jointValueInc)
    }

    liftMove(dist, timeout, vel) {
        var jointValueInc = 0.0
        if (dist > 0.0) {
            jointValueInc = vel;
        } else if (dist < 0.0) {
            jointValueInc = -vel;
        }
        this.sendIncrementalMove('joint_lift', jointValueInc)
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
        for (let key in pose) {
            if (ALL_JOINTS.indexOf(key) === -1) {
                console.error(`No such joint '${key}' from pose goal`)
                return
            }
        }
        generatePoseGoal(pose, this.trajectoryClient).send()
    }

    executeCommand(type, name, vmodifier, vscalemodifier) {
        console.info(type, name, vmodifier, vscalemodifier)
        this.commands[type][name](vmodifier, vscalemodifier)
    }

}

function generatePoseGoal(pose, trajectoryClient) {
    let jointNames = []
    let jointPositions = []
    for (let key in pose) {
        jointNames.push(key)
        jointPositions.push(pose[key])
    }

    let newGoal = new ROSLIB.Goal({
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
        console.log('Feedback: ' + feedback);
    });

    newGoal.on('result', function (result) {
        console.log('Final Result: ' + result);
    });

    return newGoal

}

export function getJointEffort(jointStateMessage, jointName) {
    let jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.effort[jointIndex]
}

export function getJointValue(jointStateMessage, jointName) {
    let jointIndex = jointStateMessage.name.indexOf(jointName)
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