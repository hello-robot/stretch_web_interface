
var modifiers = {"verysmall":0, "small":1, "medium":2, "large":3, "verylarge":4};
var currentV = "medium";

function setVelocity(newV) {
  if (Object.keys(modifiers).includes(newV)){
    currentV = newV;
    Database.logEvent("SpeedChange", newV);
  }
  else
    console.log("Invalid velocity: " + newV);
}

// Continuous actions

var activeAction = null;

var cameraFollowGripper = false;
function toggleCameraFollowGripper() {
    cameraFollowGripper = !cameraFollowGripper;
}

function startAction(actionName) {
  console.log("Starting action: " + actionName);
  activeAction = actionName;
}

function stopAction() {
  console.log("Stopping action: " + activeAction);
  activeAction = null;
}

var updateFrequency = 200; //milliseconds
function updateInterface() {
  if (activeAction != null) {
    window[activeAction]();
  }
  if (cameraFollowGripper) {
    lookAtGripper();
  }
}
window.setInterval(updateInterface, updateFrequency);

// Discrete (one time) actions

function lookLeft() {
    var cmd = {type:"command",
               subtype:"head",
               name:"left",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("LookLeft", currentV);
}

function lookRight() {
  var cmd = {type:"command",
             subtype:"head",
             name:"right",
             modifier:currentV};
  sendData(cmd);
  Database.logEvent("LookRight", currentV);
}

function lookUp() {
    var cmd = {type:"command",
               subtype:"head",
               name:"up",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("LookUp", currentV);
}

function lookDown() {
    var cmd = {type:"command",
               subtype:"head",
               name:"down",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("LookDown", currentV);
}

function lookAtGripper() {
    var cmd = {type:"command",
               subtype:"head",
               name:"atGripper",
               modifier:"none"};
    sendData(cmd);
    Database.logEvent("lookAtGripper", "none");
}

function moveForward() {
    var cmd = {type:"command",
               subtype:"drive",
               name:"forward",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("MoveForward", currentV);
}

function moveBackward() {
    var cmd = {type:"command",
               subtype:"drive",
               name:"backward",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("MoveBackward", currentV);
}

function turnLeft() {
    var cmd = {type:"command",
               subtype:"drive",
               name:"turn_left",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("TurnLeft", currentV);
}

function turnRight() {
    var cmd = {type:"command",
               subtype:"drive",
               name:"turn_right",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("TurnRight", currentV);
}

function liftUp() {
    var cmd = {type:"command",
               subtype:"lift",
               name:"up",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("LiftUp", currentV);
}

function liftDown() {
    var cmd = {type:"command",
               subtype:"lift",
               name:"down",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("LiftDown", currentV);
}

function armRetract() {
    var cmd = {type:"command",
               subtype:"arm",
               name:"retract",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("ArmRetract", currentV);
}

function armExtend() {
    var cmd = {type:"command",
               subtype:"arm",
               name:"extend",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("ArmExtend", currentV);
}

function gripperClose() {
    var cmd = {type:"command",
               subtype:"gripper",
               name:"close",
               modifier:"medium"};
    sendData(cmd);
    Database.logEvent("GripperClose", "medium");
}

function gripperOpen() {
    var cmd = {type:"command",
               subtype:"gripper",
               name:"open",
               modifier:"medium"};
    sendData(cmd);
    Database.logEvent("GripperOpen", "medium");
}

function wristIn() {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"in",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("WristIn", currentV);
}

function wristOut() {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"out",
               modifier:currentV};
    sendData(cmd);
    Database.logEvent("WristOut", currentV);
}


// Following functions are NOT currently in use

function gripperCloseFull() {
    var cmd = {type:"command",
               subtype:"gripper",
               name:"fully_close",
               modifier:"medium"};
    sendData(cmd);
}

function gripperOpenHalf() {
    var cmd = {type:"command",
               subtype:"gripper",
               name:"half_open",
               modifier:"medium"};
    sendData(cmd);
}

function gripperOpenFull() {
    var cmd = {type:"command",
               subtype:"gripper",
               name:"fully_open",
               modifier:"medium"};
    sendData(cmd);
}

function wristMotionStop() {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"stop_all_motion",
               modifier:"medium"};
    sendData(cmd);
}

function wristVelocityBend(deg_per_sec) {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"bend_velocity",
               modifier:deg_per_sec};
    sendData(cmd);
}

function wristVelocityBend(degPerSec) {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"bend_velocity",
               modifier:degPerSec};
    sendData(cmd);
}

function gripperSetGoal(goalWidthCm) {
    var cmd = {type:"command",
               subtype:"gripper",
               name:"set_goal",
               modifier:goalWidthCm};
    sendData(cmd);
}

function wristBendDown() {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"bend_down",
               modifier:"medium"};
    sendData(cmd);
}

function wristBendUp() {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"bend_up",
               modifier:"medium"};
    sendData(cmd);
}

function wristBendAuto(ang_deg) {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"auto_bend",
               modifier:ang_deg};
    sendData(cmd);
}

function wristRollRight() {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"roll_right",
               modifier:"medium"};
    sendData(cmd);
}

function wristRollLeft() {
    var cmd = {type:"command",
               subtype:"wrist",
               name:"roll_left",
               modifier:"medium"};
    sendData(cmd);
}


//var cameraToVideoMapping = {nav: 'big', arm: 'smallTop', hand: 'smallBot'};
var interfaceMode = 'nav';
var interfaceModifier = 'no_wrist';

/**
* modekey in {'nav', 'low_arm', 'high_arm', 'hand', 'look' }
*/
function turnModeOn(modeKey) {
    console.log('turnModeOn: modeKey = ' + modeKey)

  let autoViewOn = false;
  let onoffButton = document.getElementById("autoViewOn");
  if (onoffButton != undefined)
    autoViewOn = onoffButton.checked;
  console.log("autoViewOn: " + autoViewOn);

  // Send command to back-end to change the camera view based on mode
  if (autoViewOn) {
      setCameraView(modeKey);
  }
  else {
      console.log("Not changing view automatically on control mode change.");
  }

  // Update the front-end for the new mode
  turnModeUiOn(modeKey)
  Database.logEvent("ModeChange", modeKey);
}

/**
* Preset views only available for modeKey in {'nav', 'low_arm', 'high_arm'}
*/

function setCameraView(modeKey) {
    var cmd;
    if(noWristOn === false) {
  cmd = {type:"command",
               subtype:"mode",
               name : modeKey,
               modifier:"none"};
  interfaceModifier = 'none';
    } else {
  cmd = {type:"command",
               subtype:"mode",
               name : modeKey,
               modifier:"no_wrist"};
  interfaceModifier = 'no_wrist';
    }
    interfaceMode = modeKey
    sendData(cmd)
    Database.logEvent("SetCameraView", modeKey);
}

var modeKeys = ['nav', 'low_arm', 'high_arm', 'hand', 'look']

function createModeCommands() {
    modeCommands = {}
    for (var index in modeKeys) {
	var key = modeKeys[index]
	// function inside a function used so that commandKey will not
	// change when key changes. For example, without this, the
	// interface mode and robotModeOn commands use key = 'look'
	// (last mode) whenever a function is executed.
	modeCommands[key] = function(commandKey) {
	    return function(modifier) {
		if(modifier === 'no_wrist') {
		    interfaceModifier = 'no_wrist';
		} else {
		    if(modifier !== 'none') {
		    console.log('ERROR: modeCommands modifier unrecognized = ', modifier);
		    }
		    interfaceModifier = 'none';
		}
		console.log('mode: command received with interfaceModifier = ' + interfaceModifier + ' ...executing');
		interfaceMode = commandKey
		robotModeOn(commandKey)
	    } 
	} (key)
    }
    return modeCommands
} 

var modeCommands = createModeCommands()


function executeCommandBySize(size, command, smallCommandArgs, mediumCommandArgs) {
    switch(size) {
    case "small":
        command(...smallCommandArgs);
        break;
    case "medium":
        command(...mediumCommandArgs);
        break;
    default:
        console.log('executeCommandBySize: size unrecognized, so doing nothing');
        console.log('executeCommandBySize: size = ' + size);
    }
}

/*
* VELOCITY SETTINGS
*/

var headMedDist = 0.1;
var driveTransMedDist = 100.0;
var driveRotMedDist = 10.0;
var liftMedDist = 100.0;
var extendMedDist = 100.0;
var wristMedDist = 0.1;

var headMedV = 0.1;
var driveTransMedV = 0.02;
var driveRotMedV = 0.1;
var liftMedV = 0.02;
var extendMedV = 0.02;
var wristMedV = 0.1;

var vScales = [0.1, 0.5, 1.0, 1.5, 2.0];

var headV = [];
var driveTransV = [];
var driveRotV = [];
var liftV = [];
var extendV = [];
var wristV = [];  

for (let i=0; i<vScales.length; i++){
  let s = vScales[i];
  headV.push(s*headMedV);
  driveTransV.push(s*driveTransMedV);
  driveRotV.push(s*driveRotMedV);
  liftV.push(s*liftMedV);
  extendV.push(s*extendMedV);
  wristV.push(s*wristMedV);
}

var headCommands = {
    "up": function(size) {
      console.log('head: up command received...executing');
      let vel = headV[modifiers[size]];
      headTilt(vel);
      // headTilt(0.1)
    },
    "down": function(size) {
      console.log('head: down command received...executing');
      let vel = -headV[modifiers[size]];
      headTilt(vel);
      // headTilt(-0.1)
    },
    "left": function(size) {
      console.log('head: left command received...executing');
      let vel = headV[modifiers[size]];
      headPan(vel);
      //headPan(0.1)
    },
    "right": function(size) {
      console.log('head: right command received...executing');
      let vel = -headV[modifiers[size]];
      headPan(vel);
      // headPan(-0.1)
    },
    "atGripper": function(size) {
      console.log('head: atGripper command received...executing');
      headLookAtGripper();
    }
}  

var driveCommands = {
    "forward": function(size) {
      console.log('drive: forward command received...executing');
      let vel = -driveTransV[modifiers[size]];
      baseTranslate(driveTransMedDist, vel);
      // executeCommandBySize(size, baseTranslate,
      //                        [-10.0, 200.0], //dist (mm), speed (mm/s)
      //                        [-100.0, 200.0]); //dist (mm), speed (mm/s)
	
    },
    "backward": function(size) {
        console.log('drive: backward command received...executing');

      let vel = driveTransV[modifiers[size]];
      baseTranslate(driveTransMedDist, vel);
        // executeCommandBySize(size, baseTranslate,
        //                      [10.0, 200.0], //dist (mm), speed (mm/s)
        //                      [100.0, 200.0]); //dist (mm), speed (mm/s)
    },
    "turn_right": function(size) {
        console.log('drive: turn_right command received...executing');

      let vel = driveRotV[modifiers[size]];
      baseTurn(driveRotMedDist, vel);
        // executeCommandBySize(size, baseTurn,
        //                      [1.0, 300.0], // angle (deg), angular speed (deg/s)
        //                      [10.0, 300.0]); // angle (deg), angular speed (deg/s)

    },
    "turn_left": function(size) {
        console.log('drive: turn_left command received...executing');

      let vel = -driveRotV[modifiers[size]];
      baseTurn(driveRotMedDist, vel);
      	// executeCommandBySize(size, baseTurn,
       //                       [-1.0, 300.0], // angle (deg), angular speed (deg/s)
       //                       [-10.0, 300.0]); // angle (deg), angular speed (deg/s)
    }
}  

var liftCommands = {
    "up": function(size) {
        console.log('lift: up command received...executing');

      let vel = liftV[modifiers[size]];
      liftMove(liftMedDist, -1, vel);
      	// executeCommandBySize(size, liftMove,
       //                       [10.0, -1], // dist (mm), timeout (s)
       //                       [100.0, -1]); // dist (mm), timeout (s)
   	
    },
    "down": function(size) {
        console.log('lift: down command received...executing');
	
      let vel = -liftV[modifiers[size]];
      liftMove(liftMedDist, -1, vel);
      	// executeCommandBySize(size, liftMove,
       //                       [-10.0, -1], // dist (mm), timeout (s)
       //                       [-100.0, -1]); // dist (mm), timeout (s)

    }
}  

var armCommands = {
    "extend": function(size) {
        console.log('arm: extend command received...executing');

      let vel = extendV[modifiers[size]];
      armMove(extendMedDist, -1, vel);
      	// executeCommandBySize(size, armMove,
       //                       [10.0, -1], // dist (mm), timeout (s)
       //                       [100.0, -1]); // dist (mm), timeout (s)
    },
    "retract": function(size) {
        console.log('arm: retract command received...executing');
      
      let vel = -extendV[modifiers[size]];
      armMove(extendMedDist, -1, vel);
      	// executeCommandBySize(size, armMove,
       //                       [-10.0, -1], // dist (mm), timeout (s)
       //                       [-100.0, -1]); // dist (mm), timeout (s)

    }
}  


var wristCommands = {
    "in": function(size) {
      console.log('wrist: wrist_in command received...executing');
      let vel = wristV[modifiers[size]];
    	wristMove(wristMedDist, vel)
      //wristMove(0.1)
    },
    "out": function(size) {
      console.log('wrist: wrist_out command received...executing');
      let vel = -wristV[modifiers[size]];
      wristMove(wristMedDist, vel)
      //wristMove(-0.1)
    },    
    "stop_all_motion": function(nothing) {
      console.log('wrist: stop all motion command received...executing');
      wristStopMotion();
    },
    "bend_velocity": function(deg_per_sec) {
	console.log('wrist: bend velocity of ' + deg_per_sec + ' command received...executing');
	wristBendVelocity(deg_per_sec);
    },
    "auto_bend": function(ang_deg) {
	console.log('wrist: auto bend to ' + ang_deg + ' command received...executing');
	wristAutoBend(ang_deg);
    },
    "init_fixed_wrist": function(size) {
	console.log('wrist: init_fixed_wrist command received...executing');
	initFixedWrist();
    },
    "bend_up": function(size) {
        console.log('wrist: bend_up command received...executing');
        wristBend(5.0); // attempt to bed the wrist upward by 5 degrees
    },
    "bend_down": function(size) {
        console.log('wrist: bend_down command received...executing');
        wristBend(-5.0); // attempt to bed the wrist downward by 5 degrees
    },
    "roll_left": function(size) {
        console.log('wrist: roll_left command received...executing');
        wristRoll(-5.0); // attempt to roll the wrist to the left (clockwise) by 5 degrees
    },
    "roll_right": function(size) {
        console.log('wrist: roll_right command received...executing');
        wristRoll(5.0); // attempt to roll the wrist to the right (counterclockwise) by 5 degrees
    }
}

var gripperCommands = {
    "set_goal": function(goalWidthCm) {
        console.log('gripper: set_goal command received...executing');
        gripperGoalAperture(goalWidthCm); 
    },
    "open": function(size) {
        console.log('gripper: open command received...executing');
        gripperDeltaAperture(1.0); // attempt to increase the gripper aperature width by one unit
    },
    "close": function(size) {
        console.log('gripper: close command received...executing');
        gripperDeltaAperture(-1.0); // attempt to decrease the gripper aperature width by one unit
    },
    "fully_close": function(size) {
	console.log('gripper: fully close command received...executing');
	gripperFullyClose();
    },
    "half_open": function(size) {
	console.log('gripper: half open command received...executing');
	gripperHalfOpen();
    },
    "fully_open": function(size) {
	console.log('gripper: fully open command received...executing');
	gripperFullyOpen();	
    }
}

var commands = {
    "drive": driveCommands,
    "lift": liftCommands,
    "arm": armCommands,
    "wrist": wristCommands,
    "gripper": gripperCommands,
    "head": headCommands,
    "mode": modeCommands
}

function executeCommand(obj) {
    if ("type" in obj) {
        if (obj.type === "command") {
            commands[obj.subtype][obj.name](obj.modifier);
            return;
        }
    }
    console.log('ERROR: the argument to executeCommand was not a proper command object: ' + obj); 
}
