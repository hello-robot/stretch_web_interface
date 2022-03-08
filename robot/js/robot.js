export const ALL_JOINTS = ['joint_head_tilt', 'joint_head_pan', 'joint_gripper_finger_left', 'wrist_extension', 'joint_lift', 'joint_wrist_yaw', "translate_mobile_base", "rotate_mobile_base"];

const JOINT_LIMITS = {
    "wrist_extension": [0, .52],
    "joint_wrist_yaw": [-1.75, 4],
    "joint_lift": [0, 1.1],
    "translate_mobile_base": [-30.0, 30.0],
    "rotate_mobile_base": [-3.14, 3.14]
}


export class Robot {
    ros
    currentJointTrajectoryGoal
    currentTrajectoryKillInterval
    panOffset = 0;
    tiltOffset = 0;

    robotFrameTfClient
    trajectoryClient
    moveBaseClient
    jointStateTopic
    cmdVel
    velocityGoal 

    linkGripperFingerLeftTF
    linkHeadTiltTF
    cameraColorFrameTF
    baseTF

    videoTopics = []

    isWristFollowingActive = false

    commands = {
        "drive": {
            "forward": size => {
                this.executeIncrementalMove("translate_mobile_base", size)
            },
            "backward": size => {
                this.executeIncrementalMove("translate_mobile_base", -size)
            },
            "turn_right": size => {
                this.executeIncrementalMove("rotate_mobile_base", -size)
            },
            "turn_left": size => {
                this.executeIncrementalMove("rotate_mobile_base", size)
            },
            "turn_ccw": _ => {
                this.baseTurn(Math.PI / 2);
            },
            "turn_cw": _ => {
                this.baseTurn(-Math.PI / 2);
            }
        },
        "lift": {
            "up": size => {
                this.executeIncrementalMove("joint_lift", size)
            },
            "down": size => {
                this.executeIncrementalMove("joint_lift", -size)
            }
        },
        "arm": {
            "extend": size => {
                this.executeIncrementalMove("wrist_extension", size)
            },
            "retract": size => {
                this.executeIncrementalMove("wrist_extension", -size)
            }
        },
        "wrist": {
            "in": size => {
                this.executeIncrementalMove("joint_wrist_yaw", size)
            },
            "out": size => {
                this.executeIncrementalMove("joint_wrist_yaw", -size)
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
                this.gripperDeltaAperture(0.1);
            },
            "close": (vsize, vscalesize) => {
                this.gripperDeltaAperture(-0.1);
            },
            "configure_camera": configuration => {

            }
        },
        "head": {
            "up": size => {
                this.executeIncrementalMove("joint_head_tilt", size)
            },
            "down": size => {
                this.executeIncrementalMove("joint_head_tilt", -size)
            },
            "left": size => {
                this.executeIncrementalMove("joint_head_pan", size)
            },
            "right": size => {
                this.executeIncrementalMove("joint_head_pan", -size)
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

            this.setNavMode = new ROSLIB.Service({
                ros: ros,
                name: '/switch_to_navigation_mode',
                serviceType: '/switch_to_navigation_mode'
            });
            this.setPositionMode = new ROSLIB.Service({
                ros: ros,
                name: '/switch_to_position_mode',
                serviceType: '/switch_to_position_mode'
            });
            this.cmdVel = new ROSLIB.Topic({
                ros : ros,
                name : '/stretch/cmd_vel',
                messageType : 'geometry_msgs/Twist'
              });

            this.robotFrameTfClient = new ROSLIB.TFClient({
                ros: this.ros,
                fixedFrame: 'base_link',
                angularThres: 0.01,
                transThres: 0.01
            });

            this.globalFrameTfClient = new ROSLIB.TFClient({
                ros: this.ros,
                fixedFrame: 'map',
                angularThres: 0.01,
                transThres: 0.01
            });

            this.robotFrameTfClient.subscribe('link_gripper_finger_left', transform => {
                this.linkGripperFingerLeftTF = transform;
                if (this.tfCallback) {
                    this.tfCallback('link_gripper_finger_left', transform)
                }
            });

            this.robotFrameTfClient.subscribe('link_head_tilt', transform => {
                this.linkHeadTiltTF = transform;
                if (this.tfCallback) {
                    this.tfCallback('link_head_tilt', transform)
                }
            });

            this.robotFrameTfClient.subscribe('camera_color_frame', transform => {
                this.cameraColorFrameTF = transform;
                if (this.tfCallback) {
                    this.tfCallback('camera_color_frame', transform)
                }
            });

            this.globalFrameTfClient.subscribe('base_link', transform => {
                this.baseTF = transform;
                if (this.tfCallback) {
                    this.tfCallback('base_frame', transform)
                }
            });
            this.trajectoryClient = new ROSLIB.ActionClient({
                ros: this.ros,
                serverName: '/stretch_controller/follow_joint_trajectory',
                actionName: 'control_msgs/FollowJointTrajectoryAction'
            });

            this.moveBaseClient = new ROSLIB.ActionClient({
                ros: this.ros,
                serverName: '/move_base',
                actionName: 'move_base_msgs/MoveBaseAction'
            })
            return Promise.resolve()
        })
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
        makePoseGoal({'translate_mobile_base': dist}, this.trajectoryClient).send()
    }

    baseTurn(ang_deg, vel) {
        // angle in degrees
        // velocity in centimeter / second (linear wheel velocity - same as BaseTranslate)

        makePoseGoal({'rotate_mobile_base': ang_deg}, this.trajectoryClient).send()

    }

    makeIncrementalMoveGoal(jointName, jointValueInc) {
        if (this.jointState === null) {
            console.warn("Couldn't send incremental move without joint states")
            return false
        }
        let newJointValue = getJointValue(this.jointState, jointName)
        // Paper over Hello's fake joints
        if (jointName === "translate_mobile_base" || jointName === "rotate_mobile_base") {
            // These imaginary joints are floating, always have 0 as their reference
            newJointValue = 0
        } else if (jointName === "gripper_aperture") {
            newJointValue = getJointValue(this.jointState, "joint_gripper_finger_left")
        }
        newJointValue = newJointValue + jointValueInc
        let pose = {[jointName]: newJointValue}
        return makePoseGoal(pose, this.trajectoryClient)
    }

    setPanTiltFollowGripper(value) {
        // Idempotent: setting same value has no effect
        if (this.isWristFollowingActive === value) return;
        this.isWristFollowingActive = value;
        if (value) {
            this.panOffset = 0;
            this.tiltOffset = 0;
            let lookIfReadyAndRepeat = () => {
                if (this.linkGripperFingerLeftTF && this.linkHeadTiltTF) {
                    this.lookAtGripper(this.panOffset, this.tiltOffset);
                }
                this.lookAtGripperInterval = window.setTimeout(lookIfReadyAndRepeat, 500)
            }
            lookIfReadyAndRepeat()
        } else {
            clearTimeout(this.lookAtGripperInterval)
            this.lookAtGripperInterval = null
        }
        return true;
    }

    lookAtGripper(panOffset, tiltOffset) {
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
        let headFollowPoseGoal = makePoseGoal({
            'joint_head_pan': pan + panOffset,
            'joint_head_tilt': tilt + tiltOffset
        }, this.trajectoryClient)
        headFollowPoseGoal.send()
    }

    gripperDeltaAperture(deltaWidthCm) {
        // attempt to change the gripper aperture
        this.makeIncrementalMoveGoal('joint_gripper_finger_left', deltaWidthCm).send()
    }


    headTilt(angRad) {
        if (this.isWristFollowingActive) {
            this.tiltOffset += angRad;
        } else {
            this.makeIncrementalMoveGoal('joint_head_tilt', angRad).send()
        }
    }

    headPan(angRad) {
        if (this.isWristFollowingActive) {
            this.panOffset += angRad;
        } else {
            this.makeIncrementalMoveGoal('joint_head_pan', angRad).send()
        }
    }

    goToPose(pose) {
        for (let key in pose) {
            if (ALL_JOINTS.indexOf(key) === -1) {
                console.error(`No such joint '${key}' from pose goal`)
                return
            }
        }
        makePoseGoal(pose, this.trajectoryClient).send()
    }

    executeCommand(type, name, modifier) {
        console.info(type, name, modifier)
        this.commands[type][name](modifier)
    }

    executeIncrementalMove(jointName, increment) {
        this.makeIncrementalMoveGoal(jointName, increment).send()
    }

    executeVelocityMove(jointName, velocity) {
        this.stopExecution()
        let velocities = [{}, {}]
        velocities[0][jointName] = velocity
        velocities[1][jointName] = velocity
        let positions = [{}, {}]
        positions[0][jointName] = getJointValue(this.jointState, jointName)
        positions[1][jointName] = JOINT_LIMITS[jointName][Math.sign(velocity) === -1 ? 0 : 1]
        this.velocityGoal = makeVelocityGoal(positions, velocities, this.trajectoryClient).send()
        this.affirmExecution()
    }

    setRobotNavMode() {
        var request = new ROSLIB.ServiceRequest({});
        this.setNavMode.callService(request, function(result) {
            console.log("Set stretch to navigation mode");
        })
    }

    setRobotPosMode() {
        var request = new ROSLIB.ServiceRequest({});
        this.setPositionMode.callService(request, function(result) {
            console.log("Set stretch to position mode");
        })
    }

    executeClickMove(lin_vel, ang_vel) {
        var twist = new ROSLIB.Message({
            linear : {
              x : lin_vel,
              y : 0,
              z : 0
            },
            angular : {
              x : 0,
              y : 0,
              z : ang_vel
            }
        });
      this.cmdVel.publish(twist);
    }

    stopClickMove() {
        var twist = new ROSLIB.Message({
            linear : {
              x : 0,
              y : 0,
              z : 0
            },
            angular : {
              x : 0,
              y : 0,
              z : 0
            }
        });
        this.cmdVel.publish(twist);   
    }

    affirmExecution() {
        if (this.currentTrajectoryKillInterval) {
            clearTimeout(this.currentTrajectoryKillInterval)
        }
        this.currentTrajectoryKillInterval = window.setTimeout(() => {
            this.stopExecution()
        }, 200)
    }

    stopExecution() {
        this.trajectoryClient.cancel()
        // TODO (kavidey): it seems like this variable is unused. remove it?
        this.currentJointTrajectoryGoal = null
        if (this.currentTrajectoryKillInterval) {
            clearTimeout(this.currentTrajectoryKillInterval)
            this.currentTrajectoryKillInterval = null
        }
        this.moveBaseClient.cancel()
        if (this.velocityGoal) {
            this.velocityGoal.cancel()
            this.velocityGoal = null
        }
    }

    executeNavGoal(goal) {
        makeNavGoal(goal, this.moveBaseClient).send()
    }
}

function makePoseGoal(pose, trajectoryClient) {
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
        //console.log('Feedback: ' + feedback);
    });

    newGoal.on('result', function (result) {
        console.log('Final Result: ' + result);
    });

    return newGoal

}

function makeVelocityGoal(positions, velocities, trajectoryClient) {

    let points = []
    let jointNames
    for (let i = 0; i < positions.length; i++) {
        let positionsT = positions[i]
        let velocitiesT = velocities[i]
        let positionsOut = []
        let velocitiesOut = []
        let names = []
        for (let key in positionsT) {
            names.push(key)
            positionsOut.push(positionsT[key])
            velocitiesOut.push(velocitiesT[key])
        }
        points.push({
            positions: positionsOut, velocities: velocitiesOut, time_from_start: {
                secs: i * 60,
                nsecs: 1
            }
        })
        jointNames = names
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
                points: points
            }
        }
    });
    newGoal.on('feedback', function (feedback) {
        //console.log('Feedback: ', feedback);
    });

    newGoal.on('result', function (result) {
        console.log('Final Result: ', result);
    });

    return newGoal

}

function makeNavGoal(pos, moveBaseClient) {
    let newGoal = new ROSLIB.Goal({
        actionClient: moveBaseClient,
        goalMessage: {
            target_pose: {
                header: {
                    stamp: {
                        secs: 0,
                        nsecs: 0
                    },
                    frame_id: 'map'
                },
                pose: {
                    position: {
                        x: pos.x,
                        y: pos.y,
                        z: 0
                    },
                    orientation: eulerToQuaternion(0, 0, pos.theta)
                }
            }
        }
    });

    newGoal.on('feedback', function (feedback) {
        // console.log('Feedback:');
        // console.log(feedback)
    });

    newGoal.on('result', function (result) {
        console.log('Final Result:');
        console.log(result);
    });

    return newGoal

}

export function getJointEffort(jointStateMessage, jointName) {
    let jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.effort[jointIndex]
}

export function getJointValue(jointStateMessage, jointName) {
    // Paper over Hello's fake joint implementation
    if (jointName === "wrist_extension") {
        return getJointValue(jointStateMessage, "joint_arm_l0") +
            getJointValue(jointStateMessage, "joint_arm_l1") +
            getJointValue(jointStateMessage, "joint_arm_l2") +
            getJointValue(jointStateMessage, "joint_arm_l3")
    } else if (jointName === "translate_mobile_base" || jointName === "rotate_mobile_base") {
        return 0
    }
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

// Modified from: https://math.stackexchange.com/a/2975462
function eulerToQuaternion(yaw, pitch, roll) {
    const qx = Math.sin(roll/2) * Math.cos(pitch/2) * Math.cos(yaw/2) - Math.cos(roll/2) * Math.sin(pitch/2) * Math.sin(yaw/2)
    const qy = Math.cos(roll/2) * Math.sin(pitch/2) * Math.cos(yaw/2) + Math.sin(roll/2) * Math.cos(pitch/2) * Math.sin(yaw/2)
    const qz = Math.cos(roll/2) * Math.cos(pitch/2) * Math.sin(yaw/2) - Math.sin(roll/2) * Math.sin(pitch/2) * Math.cos(yaw/2)
    const qw = Math.cos(roll/2) * Math.cos(pitch/2) * Math.cos(yaw/2) + Math.sin(roll/2) * Math.sin(pitch/2) * Math.sin(yaw/2)
    return {
        x: qx,
        y: qy,
        z: qz,
        w: qw
    }
}
