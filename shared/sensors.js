
var driveSensors = {
}  

var liftSensors = {
}  

var armSensors = {
}  

var wristSensors = {
    "yaw_torque": function(value) {
        //console.log('wrist bend_torque received = ' + value);
	var yawInRegion = document.querySelector('#hand_in_region');
	var yawOutRegion = document.querySelector('#hand_out_region');
	var redRegion;
	var nothingRegion;
	if (value > 0.0) {
	    redRegion = yawOutRegion;
	    nothingRegion = yawInRegion;
	} else {
	    redRegion = yawInRegion;
	    nothingRegion = yawOutRegion;
	}
	redRegion.setAttribute('fill', 'red');
	// make the torque positive and multiply it by a factor to
	// make sure the video will always be visible even with
	// maximum torque var redOpacity = (value*value) * 0.75;
	var redOpacity = Math.abs(value) * 0.015;
	//console.log('redOpacity = ', redOpacity);
	redRegion.setAttribute('fill-opacity', redOpacity);
	nothingRegion.setAttribute('fill-opacity', 0.0);
    },
    "bend_torque": function(value) {
        //console.log('wrist bend_torque received = ' + value);
	var bendUpRegion = document.querySelector('#wrist_bend_up_region');
	var bendDownRegion = document.querySelector('#wrist_bend_down_region');
	var redRegion;
	var nothingRegion;
	if (value > 0.0) {
	    redRegion = bendUpRegion;
	    nothingRegion = bendDownRegion;
	} else {
	    redRegion = bendDownRegion;
	    nothingRegion = bendUpRegion;
	}
	redRegion.setAttribute('fill', 'red');
	// make the torque positive and multiply it by a factor to
	// make sure the video will always be visible even with
	// maximum torque var redOpacity = (value*value) * 0.75;
	var redOpacity = Math.abs(value) * 0.8;
	//console.log('redOpacity = ', redOpacity);
	redRegion.setAttribute('fill-opacity', redOpacity);
	nothingRegion.setAttribute('fill-opacity', 0.0);
    },
    "roll_torque": function(value) {
        // console.log('wrist roll_torque received = ' + value);
	var rollLeftRegion = document.querySelector('#wrist_roll_left_region');
	var rollRightRegion = document.querySelector('#wrist_roll_right_region');
	var redRegion;
	var nothingRegion;
	if (value > 0.0) {
	    redRegion = rollLeftRegion;
	    nothingRegion = rollRightRegion;
	} else {
	    redRegion = rollRightRegion;
	    nothingRegion = rollLeftRegion;
	}
	redRegion.setAttribute('fill', 'red');
	// make the torque positive and multiply it by a factor to
	// make sure the video will always be visible even with
	// maximum torque var redOpacity = (value*value) * 0.75;
	var redOpacity = Math.abs(value) * 0.8;
	//console.log('redOpacity = ', redOpacity);
	redRegion.setAttribute('fill-opacity', redOpacity);
	nothingRegion.setAttribute('fill-opacity', 0.0);
    }
}

var gripperSensors = {
        "gripper_torque": function(value) {
        //console.log('wrist bend_torque received = ' + value);
	var handCloseRegion = document.querySelector('#hand_close_region');
	var handOpenRegion = document.querySelector('#hand_open_region');
	var redRegion;
	var nothingRegion;
	if (value > 0.0) {
	    redRegion = handOpenRegion;
	    nothingRegion = handCloseRegion;
	} else {
	    redRegion = handCloseRegion;
	    nothingRegion = handOpenRegion;
	}
	redRegion.setAttribute('fill', 'red');
	// make the torque positive and multiply it by a factor to
	// make sure the video will always be visible even with
	// maximum torque var redOpacity = (value*value) * 0.75;
	var redOpacity = Math.abs(value) * 0.015;
	//console.log('redOpacity = ', redOpacity);
	redRegion.setAttribute('fill-opacity', redOpacity);
	nothingRegion.setAttribute('fill-opacity', 0.0);
    }
}  

var sensors = {
    "drive": driveSensors,
    "lift": liftSensors,
    "arm": armSensors,
    "wrist": wristSensors,
    "gripper": gripperSensors
}

function receiveSensorReading(obj) {
    if ("type" in obj) {
        if (obj.type === "sensor") {
            sensors[obj.subtype][obj.name](obj.value);
            return;
        }
    }

    console.log('ERROR: the argument to receiveSensorReading was not a proper command object: ' + obj); 
}
