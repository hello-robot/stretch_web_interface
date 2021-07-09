'use strict';

var messages_received_body = [];
var commands_sent_body = [];
var messages_received_wrist = [];
var commands_sent_wrist = [];
var rosImageReceived = false;
var img = document.createElement("IMG");
img.style.visibility = 'hidden';
var rosJointStateReceived = false;
var jointState = null;
var isWristFollowingActive = false;

var session_body = {ws:null, ready:false, port_details:{}, port_name:"", version:"", commands:[], hostname:"", serial_ports:[]};
var session_wrist = {ws:null, ready:false, port_details:{}, port_name:"", version:"", commands:[], hostname:"", serial_ports:[]};

// initialize images for camera video

var navigationImageReceived = false
var navigationImg = document.createElement("IMG")
navigationImg.style.visibility = 'hidden'

var gripperImageReceived = false
var gripperImg = document.createElement("IMG")
gripperImg.style.visibility = 'hidden'


// connect to rosbridge websocket
var ros = new ROSLIB.Ros({
    url : 'ws://localhost:9090'
});

ros.on('connection', function() {
    console.log('Connected to websocket.');
});

ros.on('error', function(error) {
    console.log('Error connecting to websocket: ', error);
});

ros.on('close', function() {
    console.log('Connection to websocket has been closed.');
});

var imageTopic = new ROSLIB.Topic({
    ros : ros,
    name : inSim ? '/realsense/color/image_raw/compressed' : '/camera/color/image_raw/compressed', // ROS paths change depending on whether we're in a gazebo sim or running on stretch
    messageType : 'sensor_msgs/CompressedImage'
});

imageTopic.subscribe(function(message) {
    //console.log('Received compressed image on ' + imageTopic.name);
    //console.log('message.header =', message.header)
    //console.log('message.format =', message.format)
    img.src = 'data:image/jpg;base64,' + message.data
    if (rosImageReceived === false) {
	console.log('Received first compressed image from ROS topic ' + imageTopic.name);
	rosImageReceived = true
    }
    //console.log('img.width =', img.width)
    //console.log('img.height =', img.height)
    //console.log('img.naturalWidth =', img.naturalWidth)
    //console.log('img.naturalHeight =', img.naturalHeight)
    //console.log('attempted to draw image to the canvas')
    //imageTopic.unsubscribe()
});

var navigationImageTopic = new ROSLIB.Topic({
    ros : ros,
    name : '/navigation_camera/image_raw/compressed',
    messageType : 'sensor_msgs/CompressedImage'
});

navigationImageTopic.subscribe(function(message) {
    navigationImg.src = 'data:image/jpg;base64,' + message.data

    if (navigationImageReceived === false) {
    console.log('Received first compressed image from ROS topic ' + navigationImageTopic.name);
    navigationImageReceived = true
    }
});

var gripperImageTopic = new ROSLIB.Topic({
    ros : ros,
    name : '/gripper_camera/image_raw/compressed',
    messageType : 'sensor_msgs/CompressedImage'
});


gripperImageTopic.subscribe(function(message) {
    gripperImg.src = 'data:image/jpg;base64,' + message.data
    if (gripperImageReceived === false) {
        console.log('Received first compressed image from ROS topic ' + gripperImageTopic.name);
        gripperImageReceived = true
    }
});


var jointStateTopic = new ROSLIB.Topic({
    ros : ros,
    name : inSim ? '/joint_states/' : '/stretch/joint_states/',
    messageType : 'sensor_msgs/JointState'
});


jointStateTopic.subscribe(function(message) {

    jointState = message;
    
    if (rosJointStateReceived === false) {
	   console.log('Received first joint state from ROS topic ' + jointStateTopic.name);
	   rosJointStateReceived = true;
    }

    // send wrist joint effort
    var JointEffort = getJointEffort(jointState, 'joint_wrist_yaw');
    var message = {'type': 'sensor', 'subtype':'wrist', 'name':'yaw_torque', 'value': JointEffort};
    sendData(message);

    // send gripper effort
    JointEffort = getJointEffort(jointState, 'joint_gripper_finger_left');
    var message = {'type': 'sensor', 'subtype':'gripper', 'name':'gripper_torque', 'value': JointEffort};
    sendData(message);

    // send lift effort
    JointEffort = getJointEffort(jointState, 'joint_lift');
    var message = {'type': 'sensor', 'subtype':'lift', 'name':'lift_effort', 'value': JointEffort};
    sendData(message);

    // send telescoping arm effort
    JointEffort = getJointEffort(jointState, 'joint_arm_l0');
    var message = {'type': 'sensor', 'subtype':'arm', 'name':'arm_effort', 'value': JointEffort};
    sendData(message);

});

var tfClient = new ROSLIB.TFClient({
    ros : ros,
    fixedFrame : 'base_link',
    angularThres : 0.01,
    transThres : 0.01
});

var link_gripper_finger_left_tf;
tfClient.subscribe('link_gripper_finger_left', function(tf) {
    link_gripper_finger_left_tf = tf;
    sendData({
        type: 'sensor',
        subtype: 'gripper',
        name: 'transform',
        value: tf
    });
});

var camera_color_frame_tf;
tfClient.subscribe('camera_color_frame', function(tf) {
    camera_color_frame_tf = tf;
    sendData({
        type: 'sensor',
        subtype: 'head',
        name: 'transform',
        value: tf
    });
});

var base_tf;
tfClient.subscribe('odom', function(tf) {
    base_tf = tf;
});

function sendTfs() {
    if (link_gripper_finger_left_tf) {
        sendData({
            type: 'sensor',
            subtype: 'gripper',
            name: 'transform',
            value: link_gripper_finger_left_tf
        });
    }

    if (camera_color_frame_tf) {
        sendData({
            type: 'sensor',
            subtype: 'head',
            name: 'transform',
            value: camera_color_frame_tf
        });
    }
}

var trajectoryClients = {}
trajectoryClients.main = new ROSLIB.ActionClient({
    ros : ros,
    serverName : inSim ? '/stretch_joint_state_controller/follow_joint_trajectory' : '/stretch_controller/follow_joint_trajectory',
    actionName : 'control_msgs/FollowJointTrajectoryAction'
});
if (inSim) {
    trajectoryClients.head = new ROSLIB.ActionClient({
        ros : ros,
        serverName : '/stretch_head_controller/follow_joint_trajectory',
        actionName : 'control_msgs/FollowJointTrajectoryAction'
    });

    trajectoryClients.arm = new ROSLIB.ActionClient({
        ros : ros,
        serverName : '/stretch_arm_controller/follow_joint_trajectory',
        actionName : 'control_msgs/FollowJointTrajectoryAction'
    });

    trajectoryClients.gripper = new ROSLIB.ActionClient({
        ros : ros,
        serverName : '/stretch_gripper_controller/follow_joint_trajectory',
        actionName : 'control_msgs/FollowJointTrajectoryAction'
    });

    trajectoryClients.base = new ROSLIB.Topic({
        ros: ros,
        name: '/stretch_diff_drive_controller/cmd_vel',
        messageType: 'geometry_msgs/Twist'
    })
}

function generatePoseGoal(pose){

    var outStr = '{'
    for (var key in pose) {
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

    if (!inSim) {
        var t = trajectoryClients.main;
    } else {
        switch (jointNames[0]) {
            case 'joint_head_tilt':
            case 'joint_head_pan':
                var t = trajectoryClients.head;
                break;
            case 'joint_gripper_finger_left':
                var t = trajectoryClients.gripper;
                jointNames.push('joint_gripper_finger_right')
                jointPositions.push(jointPositions[0])
                break;
            case 'wrist_extension':
                console.log(jointNames, jointPositions)
                jointNames = ['joint_arm_l0', 'joint_arm_l1', 'joint_arm_l2', 'joint_arm_l3']
                jointPositions = [jointPositions[0]/4, jointPositions[0]/4, jointPositions[0]/4, jointPositions[0]/4]
            case 'joint_lift':
            case 'joint_wrist_yaw':
                var t = trajectoryClients.arm;
                break;
            case 'translate_mobile_base':
                var translate = new ROSLIB.Message({
                    linear : {
                      x : jointPositions[0]*10,
                      y : 0.0,
                      z : 0.0
                    },
                    angular : {
                      x : 0.0,
                      y : 0.0,
                      z : 0.0
                    }
                  });
                  trajectoryClients.base.publish(translate)
                  return {"send": function(){}};
            case 'rotate_mobile_base':
                var rotate = new ROSLIB.Message({
                    linear : {
                      x : 0.0,
                      y : 0.0,
                      z : 0.0
                    },
                    angular : {
                      x : 0.0,
                      y : 0.0,
                      z : jointPositions[0]*10
                    }
                  });
                  trajectoryClients.base.publish(rotate)
                return {"send": function(){}};
        }
    }

    var newGoal = new ROSLIB.Goal({
        actionClient : t,
        goalMessage : {
            trajectory : {
            joint_names : jointNames,
            points : [
                {
                positions : jointPositions,
                time_from_start: {
                    secs: 0,
                    nsecs: 1
                }
                }
            ]
            }
        }
    });


    console.log('newGoal created =' + newGoal)
    
    newGoal.on('feedback', function(feedback) {
    	console.log('Feedback: ' + feedback.sequence);
    });
    
    newGoal.on('result', function(result) {
    	console.log('Final Result: ' + result.sequence);
    });
    
    return newGoal
}

////////////////////////////////////////////////////////////////////////////////////

function loggedWebSocketSendWrist(cmd) {
    session_wrist.ws.send(cmd);
    commands_sent_wrist.push(cmd);
}


function sendCommandWrist(cmd) {
    if(session_wrist.ready) {
	
        command = JSON.stringify(cmd);
        loggedWebSocketSendWrist(command);
    }
}    

function loggedWebSocketSendBody(cmd) {
    session_body.ws.send(cmd);
    commands_sent_body.push(cmd);
}


function sendCommandBody(cmd) {
    if(session_body.ready) {
        command = JSON.stringify(cmd);
        loggedWebSocketSendBody(command);
    }
}

////////////////////////////////////////////////////////////////////////////////////

//Called from mode switch

function robotModeOn(modeKey) {
    console.log('robotModeOn called with modeKey = ' + modeKey)
    
    // This is where the head pose gets set when mode is switched.

    if (modeKey === 'nav') {
        var headNavPoseGoal = generatePoseGoal({'joint_head_pan': 0.0, 'joint_head_tilt': -1.2});
        headNavPoseGoal.send();
        console.log('sending navigation pose to head');
    }

    if (modeKey === 'manip') {
        resetOffset();
        lookAtGripper();
        console.log('sending end-effector pose to head');
    }

    if (modeKey === 'low_arm') {
        var headManPoseGoal = generatePoseGoal({'joint_head_pan': -1.57, 'joint_head_tilt': -0.9});
        headManPoseGoal.send();
        console.log('sending manipulation pose to head');
    }

    if (modeKey === 'high_arm') {
        var headManPoseGoal = generatePoseGoal({'joint_head_pan': -1.57, 'joint_head_tilt': -0.45});
        headManPoseGoal.send();
        console.log('sending manipulation pose to head');
    } 

    // We can add other presets here 
}

// TODO: Figure out the goal pose for arm ready to manipulate
var stowArmPose = {
    'joint_lift': 0.25,
    'wrist_extension': 0.05,
    'joint_wrist_yaw': 3.0};

var prepArmPose = {
    'joint_lift': 0.6,
    'wrist_extension': 0.1,
    'joint_wrist_yaw': 0.0};


function stowRobotArm() {
    let prepPoseGoal = generatePoseGoal(stowArmPose);
    prepPoseGoal.send();
    console.log('Sending stow pose to robot');    
}

function prepRobotArm() {
    let prepPoseGoal = generatePoseGoal(prepArmPose);
    prepPoseGoal.send();
    console.log('Sending prep pose to robot');    
}


////////////////////////////////////////////////////////////////////////////////////

//Called from button click
function baseTranslate(dist, vel) {
    // distance in centimeters
    // velocity in centimeters / second
    console.log('sending baseTranslate command')

    if (dist > 0.0){
	var baseForwardPoseGoal = generatePoseGoal({'translate_mobile_base': -vel})
	baseForwardPoseGoal.send()
    } else if (dist < 0.0) {
	var baseBackwardPoseGoal = generatePoseGoal({'translate_mobile_base': vel})
	baseBackwardPoseGoal.send()
    }
    //sendCommandBody({type: "base",action:"translate", dist:dist, vel:vel});

}

function baseTurn(ang_deg, vel) {
    // angle in degrees
    // velocity in centimeter / second (linear wheel velocity - same as BaseTranslate)
    console.log('sending baseTurn command')
    
    if (ang_deg > 0.0){
	var baseTurnLeftPoseGoal = generatePoseGoal({'rotate_mobile_base': -vel})
	baseTurnLeftPoseGoal.send()
    } else if (ang_deg < 0.0) {
	var baseTurnRightPoseGoal = generatePoseGoal({'rotate_mobile_base': vel})
	baseTurnRightPoseGoal.send()
    }
    //sendCommandBody({type: "base",action:"turn", ang:ang_deg, vel:vel});
}

function getJointEffort(jointStateMessage, jointName) {
    // TODO: Make this work in simulation also
    var jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.effort[jointIndex]
}

function getJointValue(jointStateMessage, jointName) {
    if (inSim && jointName == 'wrist_extension') {
        var value = 0;
        for (var i = 0; i < 4; i++) {
            var jName = ['joint_arm_l0', 'joint_arm_l1', 'joint_arm_l2', 'joint_arm_l3'][i]
            value += jointStateMessage.position[jointStateMessage.name.indexOf(jName)];
        }
        return value
    }
    var jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.position[jointIndex]
}

function sendIncrementalMove(jointName, jointValueInc) {
    console.log('sendIncrementalMove start: jointName =' + jointName)
    if (jointState !== null) {
	var newJointValue = getJointValue(jointState, jointName)
	newJointValue = newJointValue + jointValueInc
	console.log('poseGoal call: jointName =' + jointName)
	var pose = {[jointName]: newJointValue}
	var poseGoal = generatePoseGoal(pose)
	poseGoal.send()
	return true
    }
    return false
}

function headLookAtGripper(isStarting) {
    isWristFollowingActive = isStarting;
    if (isStarting)
        resetOffset();
    return true;
}

function updateHead() {
    if (isWristFollowingActive) {
        if (link_gripper_finger_left_tf && link_head_tilt_tf) {
            lookAtGripper();
        }
    }
}

var panOffset = 0;
var tiltOffset = 0;

function resetOffset() {
    panOffset = 0;
    tiltOffset = 0;
}

function lookAtGripper() {
    let posDifference = {
        x: link_gripper_finger_left_tf.translation.x - link_head_tilt_tf.translation.x,
        y: link_gripper_finger_left_tf.translation.y - link_head_tilt_tf.translation.y,
        z: link_gripper_finger_left_tf.translation.z - link_head_tilt_tf.translation.z
    };
    
    // Normalize posDifference
    const scalar = Math.sqrt(posDifference.x**2 + posDifference.y**2 + posDifference.z**2);
    posDifference.x /= scalar;
    posDifference.y /= scalar;
    posDifference.z /= scalar;

    const pan = Math.atan2(posDifference.y, posDifference.x) + panOffset;
    const tilt = Math.atan2(posDifference.z, -posDifference.y) + tiltOffset;

    let headFollowPoseGoal = generatePoseGoal({'joint_head_pan': pan, 'joint_head_tilt': tilt})
    headFollowPoseGoal.send()
    console.log('Sending arm look at pose to head.')     
}

var backendUpdateFrequency = 200; //milliseconds
function updateBackend() {
    updateHead();
}
window.setInterval(updateBackend, backendUpdateFrequency);


function armMove(dist, timeout, vel) {
    console.log('attempting to sendarmMove command')
    var jointValueInc = 0.0
    if (dist > 0.0) {
	jointValueInc = vel;
    } else if (dist < 0.0) {
	jointValueInc = -vel;
    }
    sendIncrementalMove('wrist_extension', jointValueInc)
   //sendCommandBody({type: "arm", action:"move", dist:dist, timeout:timeout});
}
 
function liftMove(dist, timeout, vel) {
    console.log('attempting to sendliftMove command')
    var jointValueInc = 0.0
    if (dist > 0.0) {
	jointValueInc = vel;
    } else if (dist < 0.0) {
	jointValueInc = -vel;
    }
    sendIncrementalMove('joint_lift', jointValueInc)
    //sendCommandBody({type: "lift", action:"move", dist:dist, timeout:timeout});
}

function gripperDeltaAperture(deltaWidthCm) {
    // attempt to change the gripper aperture
    console.log('attempting to sendgripper delta command');
    var jointValueInc = 0.0
    if (deltaWidthCm > 0.0) {
	jointValueInc = 0.05
    } else if (deltaWidthCm < 0.0) {
	jointValueInc = -0.05
    }
    sendIncrementalMove('joint_gripper_finger_left', jointValueInc)
    //sendCommandWrist({type:'gripper', action:'delta', delta_aperture_cm:deltaWidthCm});
}

function wristMove(angRad, vel) {
    console.log('attempting to send wristMove command')
    var jointValueInc = 0.0
    if (angRad > 0.0) {
	jointValueInc = vel;
    } else if (angRad < 0.0) {
	jointValueInc = -vel;
    }
    sendIncrementalMove('joint_wrist_yaw', jointValueInc)
}

function headTilt(angRad) {
    if (isWristFollowingActive) {
        console.log('Adding headTilt offset to gripper following');
        tiltOffset += angRad;
    }
    else {
        console.log('Attempting to send headTilt command');
        sendIncrementalMove('joint_head_tilt', angRad);     
    }
}

function headPan(angRad) {
    if (isWristFollowingActive) {
        console.log('Adding headTilt offset to gripper following');
        panOffset += angRad;
    }
    else {
        console.log('attempting to send headPan command');
        sendIncrementalMove('joint_head_pan', angRad);
    }
}


////////////////////////////////////////////////////////////////////////////////////

function armHome() {
    console.log('sending armHome command')
    sendCommandBody({type: "arm", action:"home"});
}

function liftHome() {
    console.log('sending liftHome command')
    sendCommandBody({type: "lift", action:"home"});
}

function wristStopMotion() {
    console.log('sending wrist stop motion command');
    sendCommandWrist({type:'wrist', action:'stop_motion'});
}

function wristBendVelocity(deg_per_sec) {
    console.log('sending wrist bend velocity of ' + deg_per_sec + ' command');
    sendCommandWrist({type:'wrist', action:'bend_velocity', angle:deg_per_sec});
}

function wristAutoBend(angleDeg) {
    // attempt to bend the wrist by deltaAngle degrees
    //console.log('*** no wrist bend control exists yet ***');
    console.log('sending auto wrist bend to ' + angleDeg + ' command');
    sendCommandWrist({type:'wrist', action:'auto_bend', angle:angleDeg});
}

function initFixedWrist() {
    // try to emulate a fixed wrist with gripper flat and bent down 45 degrees from horizontal
    console.log('sending init_fixed_wrist command');
    sendCommandWrist({type:'wrist', action:'init_fixed_wrist'});
}

function wristBend(deltaAngle) {
    // attempt to bend the wrist by deltaAngle degrees
    //console.log('*** no wrist bend control exists yet ***');
    console.log('sending wrist bend command');
    sendCommandWrist({type:'wrist', action:'bend', angle:deltaAngle});
}

function wristRoll(deltaAngle) {
    // attempt to roll the wrist by deltaAngle degrees
    //console.log('*** no wrist roll control exists yet ***');
    console.log('sending wrist roll command');
    sendCommandWrist({type:'wrist', action:'roll', angle:deltaAngle});
}

function gripperGoalAperture(goalWidthCm) {
    // attempt to change the gripper aperture
    console.log('sending gripper command');
    sendCommandWrist({type:'gripper', action:'width', goal_aperture_cm:goalWidthCm});
}

function gripperGoalAperture(goalWidthCm) {
    // attempt to change the gripper aperture
    console.log('sending gripper command');
    sendCommandWrist({type:'gripper', action:'width', goal_aperture_cm:goalWidthCm});
}

function gripperFullyClose() {
    console.log('sending fully close gripper command');
    sendCommandWrist({type:'gripper', action:'fully_close'});
}

function gripperHalfOpen() {
    console.log('sending half open gripper command');
    sendCommandWrist({type:'gripper', action:'half_open'});
}

function gripperFullyOpen() {
    console.log('sending fully open gripper command');
    sendCommandWrist({type:'gripper', action:'fully_open'});
}

////////////////////////////////////////////////////////////////////////////////////

// Modified from https://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
function quaternionToEuler(q, order){
    order = order || "YZX";
 
    var heading, attitude, bank;
    var x = q.x, y = q.y, z = q.z, w = q.w;
 
    switch(order){
    case "YZX":
        var test = x*y + z*w;
        if (test > 0.499) { // singularity at north pole
            heading = 2 * Math.atan2(x,w);
            attitude = Math.PI/2;
            bank = 0;
        }
        if (test < -0.499) { // singularity at south pole
            heading = -2 * Math.atan2(x,w);
            attitude = - Math.PI/2;
            bank = 0;
        }
        if(isNaN(heading)){
            var sqx = x*x;
            var sqy = y*y;
            var sqz = z*z;
            heading = Math.atan2(2*y*w - 2*x*z , 1 - 2*sqy - 2*sqz); // Heading
            attitude = Math.asin(2*test); // attitude
            bank = Math.atan2(2*x*w - 2*y*z , 1 - 2*sqx - 2*sqz); // bank
        }
        break;
    default:
        throw new Error("Euler order "+order+" not supported yet.");
    }
    
    return {
        y: heading,
        z: attitude,
        x: bank
    }
}