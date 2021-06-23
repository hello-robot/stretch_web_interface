'use strict';

var messages_received_body = [];
var commands_sent_body = [];
var messages_received_wrist = [];
var commands_sent_wrist = [];
var rosImageReceived = false
var img = document.createElement("IMG")
img.style.visibility = 'hidden'
var rosJointStateReceived = false
var jointState = null
var rosRobotStateReceived = false
var robotState = null

var session_body = {ws:null, ready:false, port_details:{}, port_name:"", version:"", commands:[], hostname:"", serial_ports:[]};

var session_wrist = {ws:null, ready:false, port_details:{}, port_name:"", version:"", commands:[], hostname:"", serial_ports:[]};

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
    name : '/camera/color/image_raw/compressed',
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


function getJointEffort(jointStateMessage, jointName) {
    var jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.effort[jointIndex]
}

function getJointValue(jointStateMessage, jointName) {
    var jointIndex = jointStateMessage.name.indexOf(jointName)
    return jointStateMessage.position[jointIndex]
}

var jointStateTopic = new ROSLIB.Topic({
    ros : ros,
    name : '/stretch/joint_states/',
    messageType : 'sensor_msgs/JointState'
});

jointStateTopic.subscribe(function(message) {

    jointState = message
    
    if (rosJointStateReceived === false) {
	console.log('Received first joint state from ROS topic ' + jointStateTopic.name);
	rosJointStateReceived = true
    }

    // send wrist joint effort
    var yawJointEffort = getJointEffort(jointState, 'joint_wrist_yaw')
    var message = {'type': 'sensor', 'subtype':'wrist', 'name':'yaw_torque', 'value': yawJointEffort}
    sendData(message)

    // send gripper effort
    var gripperJointEffort = getJointEffort(jointState, 'joint_gripper_finger_left')
    var message = {'type': 'sensor', 'subtype':'gripper', 'name':'gripper_torque', 'value': gripperJointEffort}
    sendData(message)
    
    // Header header
    // string[] name
    // float64[] position
    // float64[] velocity
    // float64[] effort
    //imageTopic.unsubscribe()
});

var robotStateTopic = new ROSLIB.Topic({
    ros : ros,
    name : '/tf',
    messageType : 'tf/tfMessage'
});

robotStateTopic.subscribe(function(message) {

    if (message.length == 12) {
        robotState = message
    }
    
    if (rosRobotStateReceived === false) {
	console.log('Received first robot state from ROS topic ' + robotStateTopic.name);
	rosRobotStateReceived = true
    }

    console.log(robotState)
});

var trajectoryClient = new ROSLIB.ActionClient({
    ros : ros,
    serverName : '/stretch_controller/follow_joint_trajectory',
    actionName : 'control_msgs/FollowJointTrajectoryAction'
});


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
    var newGoal = new ROSLIB.Goal({
	actionClient : trajectoryClient,
	goalMessage : {
	    trajectory : {
		joint_names : jointNames,
		points : [
		    {
			positions : jointPositions
		    }
		]
	    }
	}
    })

    console.log('newGoal created =' + newGoal)
    
    // newGoal.on('feedback', function(feedback) {
    // 	console.log('Feedback: ' + feedback.sequence);
    // });
    
    // newGoal.on('result', function(result) {
    // 	console.log('Final Result: ' + result.sequence);
    // });
    
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
    var headNavPoseGoal = generatePoseGoal({'joint_head_pan': 0.0, 'joint_head_tilt': -1.0})
    headNavPoseGoal.send()
    console.log('sending navigation pose to head')  
    }

    if (modeKey === 'low_arm') {
    var headManPoseGoal = generatePoseGoal({'joint_head_pan': -1.57, 'joint_head_tilt': -0.9})
    headManPoseGoal.send()
    console.log('sending manipulation pose to head')    
    }

    if (modeKey === 'high_arm') {
    var headManPoseGoal = generatePoseGoal({'joint_head_pan': -1.57, 'joint_head_tilt': -0.45})
    headManPoseGoal.send()
    console.log('sending manipulation pose to head')
    } 

    // We can add other presets here 

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

// TODO: figure out actual position of the head
var cameraPosition = {x: 0, y: 0, z:0}
function headLookAtGripper() {
    console.log('attempting to send headLookAtGripper command')
    if (robotState !== null) {
        // transforms[3] is "link_arm_l3"
        var link_arm_l3_tf = robotState.transforms[3];

        console.log(link_arm_l3_tf.child_frame_id, link_arm_l3_tf.transform.translation);

        var posDifference = {x: link_arm_l3_tf.transform.translation.x - cameraPosition.x,
                             y: link_arm_l3_tf.transform.translation.y - cameraPosition.y,
                             z: link_arm_l3_tf.transform.translation.z - cameraPosition.z};
        
        // Normalize posDifference
        var scalar = Math.sqrt(posDifference.x**2 + posDifference.y**2 + posDifference.z**2);
        posDifference.x /= scalar;
        posDifference.y /= scalar;
        posDifference.z /= scalar;

        var pan = Math.atan(posDifference.y/posDifference.x);
        var tilt = Math.atan(posDifference.y/posDifference.z)

        var headFollowPoseGoal = generatePoseGoal({'joint_head_pan': pan, 'joint_head_tilt': tilt})
        headFollowPoseGoal.send()
        console.log('sending arm follow pose to head') 
        return true
    }
    return false
}

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
    console.log('attempting to send headTilt command')
    sendIncrementalMove('joint_head_tilt', angRad)
}

function headPan(angRad) {
    console.log('attempting to send headPan command')
    sendIncrementalMove('joint_head_pan', angRad)
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
