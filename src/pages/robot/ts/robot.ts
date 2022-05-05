import * as ROSLIB from "roslib";
import { NavGoalCommand, PoseGoalCommand } from "shared/commands";
import { Pose, ValidJoints, ROSCompressedImage, ROSJointState, VelocityGoalArray, GoalMessage, PoseGoalMessage, NavGoalMessage, quaternionToEuler } from "shared/util";
export const ALL_JOINTS: ValidJoints[] = ['joint_head_tilt', 'joint_head_pan', 'joint_gripper_finger_left', 'wrist_extension', 'joint_lift', 'joint_wrist_yaw', "translate_mobile_base", "rotate_mobile_base", 'gripper_aperture'];

export const JOINT_LIMITS: { [key in ValidJoints]?: [number, number] } = {
    "wrist_extension": [0, .518],
    "joint_wrist_yaw": [-1.38, 4.58],
    "joint_lift": [0.15, 1.1],
    "translate_mobile_base": [-30.0, 30.0],
    "rotate_mobile_base": [-3.14, 3.14],
    "joint_gripper_finger_left": [-0.375, 0.166]
}

export class Robot {
    ros!: ROSLIB.Ros
    private inSim!: boolean

    robotFrameTfClient?: ROSLIB.TFClient
    globalFrameTfClient?: ROSLIB.TFClient
    trajectoryClient?: ROSLIB.ActionClient
    moveBaseClient?: ROSLIB.ActionClient
    jointStateTopic?: ROSLIB.Topic<ROSJointState>
    cmdVel?: ROSLIB.Topic
    velocityGoal?: ROSLIB.Goal
    poseGoal?: ROSLIB.Goal
    tfCallback: (frame: string, tranform: ROSLIB.Transform) => void
    jointStateCallback: (jointState: ROSJointState) => void
    goalCallback: (goal: GoalMessage) => void

    setNavMode?: ROSLIB.Service
    setPositionMode?: ROSLIB.Service

    // TODO (kavidey): check whether this variable is necessary, we never read from it
    // private currentJointTrajectoryGoal
    private currentTrajectoryKillInterval?: number // same as lookAtGripperInterval, should be `typeof setTimeout`
    private panOffset = 0;
    private tiltOffset = 0;

    private linkGripperFingerLeftTF?: ROSLIB.Transform
    private linkHeadTiltTF?: ROSLIB.Transform
    private cameraColorFrameTF?: ROSLIB.Transform
    baseTF?: ROSLIB.Transform
    jointState?: ROSJointState

    private videoTopics: [ROSLIB.Topic<ROSCompressedImage>?] = []

    private isWristFollowingActive = false
    // TODO (kavidey): this should be `typeof setTimeout`, but TS wants it to be number
    private lookAtGripperInterval?: number

    private commands: { [key: string]: { [key: string]: (...args: any[]) => void } } = {
        "drive": {
            "forward": (size: number) => {
                this.executeIncrementalMove("translate_mobile_base", size)
            },
            "backward": (size: number) => {
                this.executeIncrementalMove("translate_mobile_base", -size)
            },
            "turn_right": (size: number) => {
                this.executeIncrementalMove("rotate_mobile_base", -size)
            },
            "turn_left": (size: number) => {
                this.executeIncrementalMove("rotate_mobile_base", size)
            },
            "turn_ccw": (_: any) => {
                this.baseTurn(Math.PI / 2);
            },
            "turn_cw": (_: any) => {
                this.baseTurn(-Math.PI / 2);
            },
            "velocities": ({ linVel, angVel }) => {
                this.executeBaseVelocity(linVel, angVel)
            },
            "configure_mode": (mode: "position" | "navigation") => {
                this.setBaseMode(mode)
            }
        },
        "lift": {
            "up": (size: number) => {
                this.executeIncrementalMove("joint_lift", size)
            },
            "down": (size: number) => {
                this.executeIncrementalMove("joint_lift", -size)
            }
        },
        "arm": {
            "extend": (size: number) => {
                this.executeIncrementalMove("wrist_extension", size)
            },
            "retract": (size: number) => {
                this.executeIncrementalMove("wrist_extension", -size)
            }
        },
        "wrist": {
            "in": (size: number) => {
                this.executeIncrementalMove("joint_wrist_yaw", size)
            },
            "out": (size: number) => {
                this.executeIncrementalMove("joint_wrist_yaw", -size)
            },
            "stop_all_motion": () => {
                this.wristStopMotion();
            },
            "bend_velocity": (deg_per_sec: number) => {
                this.wristBendVelocity(deg_per_sec);
            },
            "auto_bend": (ang_deg: number) => {
                this.wristAutoBend(ang_deg);
            },
            "init_fixed_wrist": (vsize: number, vscalesize: number) => {
                this.initFixedWrist();
            },
            "bend_up": (vsize: number, vscalesize: number) => {
                this.wristBend(5.0); // attempt to bed the wrist upward by 5 degrees
            },
            "bend_down": (vsize: number, vscalesize: number) => {
                this.wristBend(-5.0); // attempt to bed the wrist downward by 5 degrees
            },
            "roll_left": (vsize: number, vscalesize: number) => {
                this.wristRoll(-5.0); // attempt to roll the wrist to the left (clockwise) by 5 degrees
            },
            "roll_right": (vsize: number, vscalesize: number) => {
                this.wristRoll(5.0); // attempt to roll the wrist to the right (counterclockwise) by 5 degrees
            }
        },
        "gripper": {
            "set_goal": (goalWidthCm: number) => {
                this.gripperGoalAperture(goalWidthCm);
            },
            "open": (vsize: number, vscalesize: number) => {
                this.gripperDeltaAperture(0.1);
            },
            "close": (vsize: number, vscalesize: number) => {
                this.gripperDeltaAperture(-0.1);
            },
            "configure_camera": (configuration: any) => {
                // TODO (kavidey): Implement or remove this
            }
        },
        "head": {
            "up": (size: number) => {
                this.executeIncrementalMove("joint_head_tilt", size)
            },
            "down": (size: number) => {
                this.executeIncrementalMove("joint_head_tilt", -size)
            },
            "left": (size: number) => {
                this.executeIncrementalMove("joint_head_pan", size)
            },
            "right": (size: number) => {
                this.executeIncrementalMove("joint_head_pan", -size)
            },
            "gripper_follow": (value: boolean) => {
                this.setPanTiltFollowGripper(value);
            },
            "set_pan_tilt": (values: Map) => {
                this.setPanTilt(values["pan"], values["tilt"])
            },
            "look_at_base": () => {
                this.lookAtBase();
            },
            "look_at_arm": () => {
                this.lookAtArm();
            },
            "configure_overhead_camera": (configuration: any) => {
                // TODO (kavidey): Implement or remove this
            }
        }
    }

    constructor(jointStateCallback: (jointState: ROSJointState) => void, tfCallback: (frame: string, tranform: ROSLIB.Transform) => void, goalCallback: (goal: GoalMessage) => void) {
        this.jointStateCallback = jointStateCallback
        this.tfCallback = tfCallback
        this.goalCallback = goalCallback
    }

    async connect(): Promise<void> {
        // connect to rosbridge websocket
        let ros = new ROSLIB.Ros({
            url: 'wss://localhost:9090'
        });
        return new Promise<void>((res, rej) => {
            ros.on('connection', async () => {
                let simTime = new ROSLIB.Param({
                    ros: ros,
                    name: '/use_sim_time'
                });

                simTime.get(value => {
                    this.inSim = value
                });
                await this.onConnect(ros);
                res()
            });
            ros.on('error', (error) => {
                rej(error)
            });

            ros.on('close', () => {
                rej('Connection to websocket has been closed.')
            });
        })

    }

    async onConnect(ros: ROSLIB.Ros) {
        this.ros = ros;
        this.jointStateTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: '/stretch/joint_states/',
            messageType: 'sensor_msgs/JointState'
        });
        this.jointStateTopic.subscribe(message => {
            if (this.jointState === null) {
                console.log('Received first joint state from ROS topic ' + this.jointStateTopic?.name);
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
            ros: ros,
            name: '/stretch/cmd_vel',
            messageType: 'geometry_msgs/Twist'
        });

        this.robotFrameTfClient = new ROSLIB.TFClient({
            ros: this.ros,
            fixedFrame: 'base_link',
            angularThres: 0.01,
            transThres: 0.01,
            rate: 10
        });

        this.globalFrameTfClient = new ROSLIB.TFClient({
            ros: this.ros,
            fixedFrame: 'map',
            angularThres: 0.01,
            transThres: 0.01,
            rate: 10
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
            actionName: 'control_msgs/FollowJointTrajectoryAction',
            timeout: 100 // TODO (kavidey): Figure out what unit this is and update
        });

        this.moveBaseClient = new ROSLIB.ActionClient({
            ros: this.ros,
            serverName: '/move_base',
            actionName: 'move_base_msgs/MoveBaseAction',
            timeout: 3000
        })
        return Promise.resolve()
    }

    subscribeToVideo(topicName: string, callback: (message: ROSCompressedImage) => void) {
        let topic: ROSLIB.Topic<ROSCompressedImage> = new ROSLIB.Topic({
            ros: this.ros,
            name: topicName,
            messageType: 'sensor_msgs/CompressedImage'
        });
        this.videoTopics.push(topic)
        topic.subscribe(callback)
    }

    ////////////////////////////////////////////////////////////////////////////////////

    baseTranslate(dist: number) {
        if (!this.trajectoryClient) throw 'trajectoryClient is undefined';
        makePoseGoal({ 'translate_mobile_base': dist }, this.trajectoryClient).send();
    }

    baseTurn(ang_deg: number) {
        // angle in degrees
        // velocity in centimeter / second (linear wheel velocity - same as BaseTranslate)
        if (!this.trajectoryClient) throw 'trajectoryClient is undefined';
        makePoseGoal({ 'rotate_mobile_base': ang_deg }, this.trajectoryClient).send();
    }

    makeIncrementalMoveGoal(jointName: ValidJoints, jointValueInc: number): ROSLIB.Goal {
        if (!this.jointState) throw 'jointState is undefined';
        let newJointValue = getJointValue(this.jointState, jointName)
        // Paper over Hello's fake joints
        if (jointName === "translate_mobile_base" || jointName === "rotate_mobile_base") {
            // These imaginary joints are floating, always have 0 as their reference
            newJointValue = 0
        } 
        newJointValue = newJointValue + jointValueInc

        if (jointName in JOINT_LIMITS) {
            // Make sure new joint value is within limits
            let minJointVal = JOINT_LIMITS[jointName][0]
            let maxJointVal = JOINT_LIMITS[jointName][1]
            if (newJointValue > maxJointVal) {
                newJointValue = maxJointVal;
            } else if (newJointValue < minJointVal) {
                newJointValue = minJointVal;
            }
        }

        let pose = { [jointName]: newJointValue }
        if (!this.trajectoryClient) throw 'trajectoryClient is undefined';
        return makePoseGoal(pose, this.trajectoryClient)

        // let velocities = [{}]
        // velocities[0][jointName] = jointValueInc
        // let positions = [{}]
        // positions[0][jointName] = newJointValue
        // return makeVelocityGoal(positions, velocities, this.trajectoryClient)
    }

    setPanTiltFollowGripper(value: boolean) {
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
            // this.lookAtGripperInterval = null
        }
        return true;
    }

    lookAtGripper(panOffset: number, tiltOffset: number) {
        if (!this.linkGripperFingerLeftTF) throw 'linkGripperFingerLeftTF is undefined';
        if (!this.linkHeadTiltTF) throw 'linkHeadTiltTF is undefined';
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
        if (!this.jointState) throw 'jointState is undefined';
        let panDiff = Math.abs(getJointValue(this.jointState, "joint_head_pan") - pan);
        let tiltDiff = Math.abs(getJointValue(this.jointState, "joint_head_tilt") - tilt);
        // FIXME(nickswalker,2-1-22): Goals really close to current state cause some whiplash
        //   these joints in simulation. Ignoring small goals hacks around this for now
        // console.log(panDiff, tiltDiff)
        if (panDiff < 0.02 && tiltDiff < 0.02) {
            return
        }

        if (!this.trajectoryClient) throw 'trajectoryClient is undefined';
        let headFollowPoseGoal = makePoseGoal({
            'joint_head_pan': pan + panOffset,
            'joint_head_tilt': tilt + tiltOffset
        }, this.trajectoryClient)
        headFollowPoseGoal.send()
    }

    setPanTilt(pan: number, tilt: number) {
        makePoseGoal({
            'joint_head_pan': pan,
            'joint_head_tilt': tilt
        }, this.trajectoryClient).send()
    }

    lookAtBase() {
        this.setPanTilt(0.05, -1.4);
    }

    lookAtArm() {
        this.setPanTilt(-1.5, -1.4);
    }

    gripperDeltaAperture(deltaWidthCm: number) {
        // attempt to change the gripper aperture
        try {
            this.makeIncrementalMoveGoal('joint_gripper_finger_left', deltaWidthCm).send()
        } catch (e) {
            console.warn(e);
        }
    }

    headTilt(angRad: number) {
        if (this.isWristFollowingActive) {
            this.tiltOffset += angRad;
        } else {
            try {
                this.makeIncrementalMoveGoal('joint_head_tilt', angRad).send()
            } catch (e) {
                console.warn(e);
            }
        }
    }

    headPan(angRad: number) {
        if (this.isWristFollowingActive) {
            this.panOffset += angRad;
        } else {
            try {
                this.makeIncrementalMoveGoal('joint_head_pan', angRad).send()
            } catch (e) {
                console.warn(e);
            }
        }
    }

    executeCommand(type: string, name: string, modifier: any[]) {
        console.info(type, name, modifier)
        this.commands[type][name](modifier)
    }

    executeIncrementalMove(jointName: ValidJoints, increment: number) {
        this.stopExecution();
        // this.moveBaseClient?.cancel();
        // this.trajectoryClient?.cancel();
        this.poseGoal = this.makeIncrementalMoveGoal(jointName, increment)
        this.poseGoal.send()
        // this.affirmExecution()
    }

    executeVelocityMove(jointName: ValidJoints, velocity: number) {
        this.stopExecution();

        let velocities: VelocityGoalArray = [{}, {}];
        velocities[0][jointName] = velocity;
        velocities[1][jointName] = velocity;
        let positions: VelocityGoalArray = [{}, {}];
        positions[0][jointName] = getJointValue(this.jointState!, jointName)

        const jointLimit = JOINT_LIMITS[jointName];
        if (!jointLimit) throw `Joint ${jointName} does not have limits`
        positions[1][jointName] = jointLimit[Math.sign(velocity) === -1 ? 0 : 1]

        this.velocityGoal = makeVelocityGoal(positions, velocities, this.trajectoryClient!)
        this.velocityGoal.send()
        this.affirmExecution()
    }

    setBaseMode(mode: "position" | "navigation") {
        let request = new ROSLIB.ServiceRequest({});
        if (mode === "position") {
            this.setPositionMode?.callService(request, () => {
                console.log("Set stretch to position mode");
            })
        } else if (mode === "navigation") {
            this.setNavMode?.callService(request, () => {
                console.log("Set stretch to navigation mode");
            })
        } else {
            throw new Error("Invalid mode", mode)
        }

    }

    executeBaseVelocity(linVel: number, angVel: number) {
        let twist = new ROSLIB.Message({
            linear: {
                x: linVel,
                y: 0,
                z: 0
            },
            angular: {
                x: 0,
                y: 0,
                z: angVel
            }
        });
        this.cmdVel!.publish(twist);
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
        this.trajectoryClient!.cancel()
        // this.currentJointTrajectoryGoal = null

        if (this.currentTrajectoryKillInterval) {
            clearTimeout(this.currentTrajectoryKillInterval)
            // this.currentTrajectoryKillInterval = null
        }
        this.moveBaseClient?.cancel()
        if (this.poseGoal) {
            this.poseGoal.cancel()
            this.poseGoal = undefined
        }
        if (this.velocityGoal) {
            this.velocityGoal.cancel()
            this.velocityGoal = undefined
        }
    }

    executeNavGoal(goal: NavGoalCommand) {
        this.moveBaseClient?.cancel();
        this.trajectoryClient?.cancel();
        makeNavGoal(goal, this.moveBaseClient!, this, this.goalCallback).send()
    }

    executePoseGoal(pose: PoseGoalCommand) {
        this.moveBaseClient?.cancel();
        this.trajectoryClient?.cancel();
        makeNamedPoseGoal(pose, this.trajectoryClient!, this, this.goalCallback).send();
    }
}

function makeNamedPoseGoal(pose: PoseGoalCommand, trajectoryClient: ROSLIB.ActionClient, robot: Robot, goalCallback?: (goal: GoalMessage) => void) {
    const goal = makePoseGoal(pose.goal.jointState, trajectoryClient);

    goal.on('result', (result) => {
        console.log(result);

        if (goalCallback) {
            goalCallback({
                type: "goal",
                name: "pose",
                status: "success",
                value: pose
            })
        }
    });

    let cancelCallbackFired = false;

    goal.on("status", (status) => {
        // Status Message Docs: http://docs.ros.org/en/fuerte/api/actionlib_msgs/html/msg/GoalStatus.html
        // If status.status > 3, it was cancelled or failed
        if (status.status > 3 && !cancelCallbackFired) {
            cancelCallbackFired = true;
            if (goalCallback) {

                let callbackGoal: PoseGoalMessage = {
                    type: "goal",
                    name: "pose",
                    status: "failure",
                    value: { ...pose }
                }

                // Get the current positions of each of the joints that were part of this goal
                const newJointStates: Pose = {};
                Object.keys(pose.goal.jointState).forEach((jointName) => {
                    newJointStates[jointName as ValidJoints] = getJointValue(robot.jointState!, jointName as ValidJoints)
                })

                // Insert the current joint states into the goal while keeping everything else the same (id, name, etc.)
                callbackGoal.value.goal.jointState = newJointStates;

                goalCallback(callbackGoal)
            }
        }
    })

    return goal
}

function makePoseGoal(pose: Pose, trajectoryClient: ROSLIB.ActionClient, goalCallback?: (goal: GoalMessage) => void) {
    let jointNames: ValidJoints[] = []
    let jointPositions: number[] = []
    for (let key in pose) {
        jointNames.push(key as ValidJoints)
        jointPositions.push(pose[key as ValidJoints]!)
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

        // if (goalCallback) {
        //     goalCallback({
        //         type: "pose",
        //         goal: pose
        //     })
        // }
    });

    return newGoal

}

function makeVelocityGoal(positions: VelocityGoalArray, velocities: VelocityGoalArray, trajectoryClient: ROSLIB.ActionClient, goalCallback?: (goal: GoalMessage) => void) {
    let points = [];
    let jointNames;
    for (let i = 0; i < positions.length; i++) {
        let positionsT = positions[i];
        let velocitiesT = velocities[i];
        let positionsOut = [];
        let velocitiesOut = [];
        let names: [ValidJoints?] = [];
        for (let key in positionsT) {
            // Make sure that typescript knows that key will be a valid key
            const typedKey = key as ValidJoints;

            names.push(typedKey);
            positionsOut.push(positionsT[typedKey]);
            velocitiesOut.push(velocitiesT[typedKey]);
        }
        points.push({
            positions: positionsOut, velocities: velocitiesOut, time_from_start: {
                secs: i * 60,
                nsecs: 1
            }
        });
        jointNames = names;
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

        // if (goalCallback) {
        //     goalCallback({
        //         type: "velocity",
        //         goal: {
        //             positions: positions,
        //             velocities: velocities
        //         }
        //     })
        // }
    });

    //this.velocityGoal = newGoal;
    return newGoal;

}

function makeNavGoal(goal: NavGoalCommand, moveBaseClient: ROSLIB.ActionClient, robot: Robot, goalCallback?: (goal: GoalMessage) => void) {
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
                        x: goal.goal.x,
                        y: goal.goal.y,
                        z: 0
                    },
                    orientation: eulerToQuaternion(goal.goal.theta ? goal.goal.theta : 0, 0, 0)
                }
            }
        }
    });

    newGoal.on('feedback', function (feedback) {
        // console.log('Feedback:');
        // console.log(feedback)
    });

    newGoal.on('result', function (result) {
        console.log('Final Result:', result);

        if (goalCallback) {
            goalCallback({
                type: "goal",
                name: "nav",
                status: "success",
                value: goal
            })
        }
    });

    let cancelCallbackFired = false;

    newGoal.on("status", (status) => {
        // Status Message Docs: http://docs.ros.org/en/fuerte/api/actionlib_msgs/html/msg/GoalStatus.html
        // If status.status > 3, it was cancelled or failed
        if (status.status > 3 && !cancelCallbackFired) {
            console.log(goal.id, status.status);
            cancelCallbackFired = true;
            if (goalCallback) {

                let callbackGoal: NavGoalMessage = {
                    type: "goal",
                    name: "nav",
                    status: "failure",
                    value: { ...goal }
                }

                callbackGoal.value.goal = {
                    x: robot.baseTF?.translation.x!,
                    y: robot.baseTF?.translation.y!,
                    theta: quaternionToEuler(robot.baseTF?.rotation!, "YZX").z
                }

                goalCallback(callbackGoal)
            }
        }
    })

    return newGoal

}

export function getJointEffort(jointStateMessage: ROSJointState, jointName: ValidJoints) {
    let jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.effort[jointIndex]
}

export function getJointValue(jointStateMessage: ROSJointState, jointName: ValidJoints): number {
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

export function inJointLimits(jointStateMessage, jointName) {
    let jointValue = getJointValue(jointStateMessage, jointName)
    let jointLimits = JOINT_LIMITS[jointName]
    var eps = 0.05
    let inLimits = []

    jointValue - eps >= jointLimits[0] ? inLimits.push(true) : inLimits.push(false)
    jointValue + eps <= jointLimits[1] ? inLimits.push(true) : inLimits.push(false)
    return inLimits
}

// Modified from: https://math.stackexchange.com/a/2975462
function eulerToQuaternion(yaw: number, pitch: number, roll: number) {
    const qx = Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) - Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2)
    const qy = Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2)
    const qz = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2) - Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2)
    const qw = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2)
    return {
        x: qx,
        y: qy,
        z: qz,
        w: qw
    }
}
