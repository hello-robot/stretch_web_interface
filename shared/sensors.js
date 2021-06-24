
var driveSensors = {
}  

var liftSensors = {
    "lift_effort": function(value) {
	// adjust for the effort needed to hold the arm in place
	// against gravity
	var adjusted_value = value - 53.88;
	var armUpRegion1 = document.querySelector('#low_arm_up_region');
	var armUpRegion2 = document.querySelector('#high_arm_up_region');
	
	var armDownRegion1 = document.querySelector('#low_arm_down_region');
	var armDownRegion2 = document.querySelector('#high_arm_down_region');

	var redRegion1;
	var redRegion2;
	
	var nothingRegion1;
	var nothingRegion2;
	
	if (adjusted_value > 0.0) {
	    redRegion1 = armUpRegion1;
	    redRegion2 = armUpRegion2;
	    nothingRegion1 = armDownRegion1;
	    nothingRegion2 = armDownRegion2;
	} else {
	    redRegion1 = armDownRegion1;
	    redRegion2 = armDownRegion2;
	    nothingRegion1 = armUpRegion1;
	    nothingRegion2 = armUpRegion2;
	}
	redRegion1.setAttribute('fill', 'red');
	redRegion2.setAttribute('fill', 'red');

	// make the torque positive and multiply it by a factor to
	// make sure the video will always be visible even with
	var redOpacity = Math.abs(adjusted_value) * 0.005;

	redRegion1.setAttribute('fill-opacity', redOpacity);
	redRegion2.setAttribute('fill-opacity', redOpacity);
	
	nothingRegion1.setAttribute('fill-opacity', 0.0);
	nothingRegion2.setAttribute('fill-opacity', 0.0);
    }
}  


var armSensors = {
    "arm_effort": function(value) {
	var armExtendRegion1 = document.querySelector('#low_arm_extend_region');
	var armExtendRegion2 = document.querySelector('#high_arm_extend_region');
	
	var armRetractRegion1 = document.querySelector('#low_arm_retract_region');
	var armRetractRegion2 = document.querySelector('#high_arm_retract_region');

	var redRegion1;
	var redRegion2;
	
	var nothingRegion1;
	var nothingRegion2;
	
	if (value > 0.0) {
	    redRegion1 = armExtendRegion1;
	    redRegion2 = armExtendRegion2;
	    nothingRegion1 = armRetractRegion1;
	    nothingRegion2 = armRetractRegion2;
	} else {
	    redRegion1 = armRetractRegion1;
	    redRegion2 = armRetractRegion2;
	    nothingRegion1 = armExtendRegion1;
	    nothingRegion2 = armExtendRegion2;
	}
	redRegion1.setAttribute('fill', 'red');
	redRegion2.setAttribute('fill', 'red');

	// make the torque positive and multiply it by a factor to
	// make sure the video will always be visible even with
	var redOpacity = Math.abs(value) * 0.005;

	redRegion1.setAttribute('fill-opacity', redOpacity);
	redRegion2.setAttribute('fill-opacity', redOpacity);
	
	nothingRegion1.setAttribute('fill-opacity', 0.0);
	nothingRegion2.setAttribute('fill-opacity', 0.0);
    }
}  

var wristSensors = {
    "yaw_torque": function(value) {
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
	var redOpacity = Math.abs(value) * 0.005;
	redRegion.setAttribute('fill-opacity', redOpacity);
	nothingRegion.setAttribute('fill-opacity', 0.0);
    },
    "bend_torque": function(value) {
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
	var redOpacity = Math.abs(value) * 0.8;
	redRegion.setAttribute('fill-opacity', redOpacity);
	nothingRegion.setAttribute('fill-opacity', 0.0);
    },
    "roll_torque": function(value) {
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
	var redOpacity = Math.abs(value) * 0.8;
	redRegion.setAttribute('fill-opacity', redOpacity);
	nothingRegion.setAttribute('fill-opacity', 0.0);
    }
}

var gripperSensors = {
        "gripper_torque": function(value) {
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
	var redOpacity = Math.abs(value) * 0.005;
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
