import { Ros, Param, Topic, TFClient, ActionClient, Goal, Transform, Message } from "roslib"
import { Pose, ValidJoints, JointState, ROSCompressedImage, ROSJointState } from "../../shared/util";
export const ALL_JOINTS = ['joint_head_tilt', 'joint_head_pan', 'joint_gripper_finger_left', 'wrist_extension', 'joint_lift', 'joint_wrist_yaw', "translate_mobile_base", "rotate_mobile_base"];

const JOINT_LIMITS: {[key: ValidJoints]: [number, number]} = {
    "wrist_extension": [0, .52],
    "joint_wrist_yaw": [-1.75, 4],
    "joint_lift": [0, 1.1],
    "translate_mobile_base": [-30.0, 30.0],
    "rotate_mobile_base": [-3.14, 3.14]
}

export class Robot {
    private ros: Ros
    private inSim: boolean

    tfCallback: (frame: string, tranform: Transform) => void
    jointStateCallback: (jointState: ROSJointState) => void
    
    private currentJointTrajectoryGoal
    private currentTrajectoryKillInterval
    private panOffset = 0;
    private tiltOffset = 0;

    private tfClient: TFClient
    private trajectoryClient: ActionClient
    private jointStateTopic: Topic<ROSJointState>

    private linkGripperFingerLeftTF
    private linkHeadTiltTF
    private cameraColorFrameTF
    private baseTF
    private jointState

    private videoTopics: [Topic<ROSCompressedImage>]

    private isWristFollowingActive = false
    // TODO (kavidey): this should be `typeof setTimeout`, but TS wants it to be number
    private lookAtGripperInterval: number

    private commands: {[key: string]: {[key: string]: (...args: any[]) => void}} = {
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
                this.gripperDeltaAperture(1.0);
            },
            "close": (vsize: number, vscalesize: number) => {
                this.gripperDeltaAperture(-1.0);
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
            "gripper_follow": (value: number) => {
                this.setPanTiltFollowGripper(value);
            },
            "configure_overhead_camera": (configuration: any) => {
                // TODO (kavidey): Implement or remove this
            }
        },
        "full": {
            "pose": (pose: Pose) => {
                this.goToPose(pose);
            }
        }
    }

    constructor(jointStateCallback: (jointState: ROSJointState) => void, tfCallback: (frame: string, tranform: Transform) => void) {
        this.jointStateCallback = jointStateCallback
        this.tfCallback = tfCallback

    }

    async connect(): Promise<void> {
        // connect to rosbridge websocket
        let ros = new Ros({
            url: 'wss://localhost:9090'
        });
        ros.on('connection', () => {
            let simTime = new Param({
                ros: ros,
                name: '/use_sim_time'
            });

            simTime.get(value => {
                this.inSim = value
            });
            this.onConnect(ros);
        });

        ros.on('error', (error) => {
            throw error
        });

        ros.on('close', () => {
            throw 'Connection to websocket has been closed.'
        });
    }

    async onConnect(ros: Ros) {
        this.ros = ros;
        this.jointStateTopic = new Topic({
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

        this.tfClient = new TFClient({
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
        this.trajectoryClient = new ActionClient({
            ros: this.ros,
            serverName: '/stretch_controller/follow_joint_trajectory',
            actionName: 'control_msgs/FollowJointTrajectoryAction',
            timeout: 100 // TODO (kavidey): Figure out what unit this is and update
        });

    }

    subscribeToVideo(topicName: string, callback: (message: ROSCompressedImage) => void) {
        let topic: Topic<ROSCompressedImage> = new Topic({
            ros: this.ros,
            name: topicName,
            messageType: 'sensor_msgs/CompressedImage'
        });
        this.videoTopics.push(topic)
        topic.subscribe(callback)
    }

    ////////////////////////////////////////////////////////////////////////////////////

    baseTranslate(dist: number) {
        makePoseGoal({'translate_mobile_base': dist}, this.trajectoryClient).send()
    }

    baseTurn(ang_deg: number) {
        // angle in degrees
        // velocity in centimeter / second (linear wheel velocity - same as BaseTranslate)

        makePoseGoal({'rotate_mobile_base': ang_deg}, this.trajectoryClient).send()

    }

    makeIncrementalMoveGoal(jointName: ValidJoints, jointValueInc: number): Goal {
        if (this.jointState === null) {
            throw "Couldn't send incremental move without joint states" 
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

    gripperDeltaAperture(deltaWidthCm: number) {
        // attempt to change the gripper aperture
        try {
            this.makeIncrementalMoveGoal('joint_gripper_finger_left', deltaWidthCm).send()
        }
    }

    headTilt(angRad: number) {
        if (this.isWristFollowingActive) {
            this.tiltOffset += angRad;
        } else {
            try {
                this.makeIncrementalMoveGoal('joint_head_tilt', angRad).send()
            }
        }
    }

    headPan(angRad: number) {
        if (this.isWristFollowingActive) {
            this.panOffset += angRad;
        } else {
            try {
                this.makeIncrementalMoveGoal('joint_head_pan', angRad).send()
            }
        }
    }

    goToPose(pose: Pose) {
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

    executeIncrementalMove(jointName: ValidJoints, increment: number) {
        this.makeIncrementalMoveGoal(jointName, increment).send()
    }

    executeVelocityMove(jointName: ValidJoints, velocity: number) {
        this.stopExecution()
        let velocities = [{}, {}]
        velocities[0][jointName] = velocity
        velocities[1][jointName] = velocity
        let positions = [{}, {}]
        positions[0][jointName] = getJointValue(this.jointState, jointName)
        positions[1][jointName] = JOINT_LIMITS[jointName][Math.sign(velocity) === -1 ? 0 : 1]
        makeVelocityGoal(positions, velocities, this.trajectoryClient).send()
        this.affirmExecution()
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
        this.currentJointTrajectoryGoal = null
        if (this.currentTrajectoryKillInterval) {
            clearTimeout(this.currentTrajectoryKillInterval)
            this.currentTrajectoryKillInterval = null
        }
    }
}

function makePoseGoal(pose: Pose, trajectoryClient: ActionClient) {
    let jointNames = []
    let jointPositions = []
    for (let key in pose) {
        jointNames.push(key)
        jointPositions.push(pose[key])
    }

    let newGoal = new Goal({
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

function makeVelocityGoal(positions, velocities, trajectoryClient: ActionClient) {

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
    let newGoal = new Goal({
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

export function getJointEffort(jointStateMessage, jointName: validJoints) {
    let jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.effort[jointIndex]
}

export function getJointValue(jointStateMessage, jointName: validJoints) {
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
