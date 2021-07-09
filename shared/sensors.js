
var driveSensors = {
}  

var liftSensors = {
    "lift_effort": function(value) {
		// adjust for the effort needed to hold the arm in place
		// against gravity
		var adjusted_value = value - 53.88;
		var armUpRegion1 = document.getElementById('manip_up_region');		
		var armDownRegion1 = document.getElementById('manip_down_region');
		var redRegion1;
		var nothingRegion1;
		
		if (adjusted_value > 0.0) {
		    redRegion1 = armUpRegion1;
		    nothingRegion1 = armDownRegion1;
		} else {
		    redRegion1 = armDownRegion1;
		    nothingRegion1 = armUpRegion1;
		}
		// make the torque positive and multiply it by a factor to
		// make sure the video will always be visible even with
		var redOpacity = Math.abs(adjusted_value) * 0.005;

		if (redRegion1) {
			redRegion1.setAttribute('fill', 'red');
			redRegion1.setAttribute('fill-opacity', redOpacity);		
		}
		
		if (nothingRegion1)
			nothingRegion1.setAttribute('fill-opacity', 0.0);

    }
}  


var armSensors = {
    "arm_effort": function(value) {
	var armExtendRegion1 = document.getElementById('manip_extend_region');	
	var armRetractRegion1 = document.getElementById('manip_retract_region');
	var redRegion1;
	var nothingRegion1;
	
	if (value > 0.0) {
	    redRegion1 = armExtendRegion1;
	    nothingRegion1 = armRetractRegion1;
	} else {
	    redRegion1 = armRetractRegion1;
	    nothingRegion1 = armExtendRegion1;
	}

	// make the torque positive and multiply it by a factor to
	// make sure the video will always be visible even with

	var redOpacity = Math.abs(value) * 0.005;

	if (redRegion1) {		
		redRegion1.setAttribute('fill', 'red');
		redRegion1.setAttribute('fill-opacity', redOpacity);
	}
	
	if (nothingRegion1)
		nothingRegion1.setAttribute('fill-opacity', 0.0);

    }
}  

var wristSensors = {
    "yaw_torque": function(value) {
		var yawInRegion = document.getElementById('manip_in_region');
		var yawOutRegion = document.getElementById('manip_out_region');
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
		var redOpacity = Math.abs(value) * 0.015;
		redRegion.setAttribute('fill-opacity', redOpacity);
		nothingRegion.setAttribute('fill-opacity', 0.0);
    },
    // The following seems to be relevant for th new wrist
    "bend_torque": function(value) {
		var bendUpRegion = document.getElementById('wrist_bend_up_region');
		var bendDownRegion = document.getElementById('wrist_bend_down_region');
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
		var rollLeftRegion = document.getElementById('wrist_roll_left_region');
		var rollRightRegion = document.getElementById('wrist_roll_right_region');
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
		var handCloseRegion = document.getElementById('gripperCloseButton');
		var handOpenRegion = document.getElementById('gripperOpenButton');
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
		// make sure the video will 	always be visible even with
		var redOpacity = Math.abs(value) * 0.015;
		redRegion.setAttribute('fill-opacity', redOpacity);
		nothingRegion.setAttribute('fill-opacity', 0.0);

		redRegion.setAttribute("background-color", "rgba(1, 0, 0, " + redOpacity + ")");
		nothingRegion.setAttribute("background-color", "rgba(0.2, 0.2, 0.2, 1.0)");
    },
	"transform": function (value) {
		//navModeObjects.cube.position.copy(rosPostoTHREE(value.translation).add(positionOffset));
	}
}  

// Camera Position Information
const global_rotation_point = new THREE.Vector3(
    -0.001328,
    0,
    -0.053331
);


const global_reference_point = new THREE.Vector3(
	-0.001328,
    0.027765,
    -0.053331
);

const global_target_point = new THREE.Vector3(
    0.037582,
    -0.002706,
    0.019540000000000113
).add(global_reference_point);

var reference_to_rotation_offset = global_rotation_point.clone().sub(global_reference_point);
var rotation_to_target_offset = global_target_point.clone().sub(global_rotation_point);

var headSensors = {
	"transform": function (value) {
		// Update the rotation and translation of the THREE.js camera to match the physical one

		var q_ros_space = new THREE.Quaternion(value.rotation.x, value.rotation.y, value.rotation.z, value.rotation.w);

		var order = 'XYZ'
		var e = new THREE.Euler(0, 0, 0, order);
		e.setFromQuaternion(q_ros_space, order);

		var q_inverse = q_ros_space.clone().invert();
		
		var reference_point = new THREE.Vector3(value.translation.x, value.translation.y, value.translation.z);
		// z in global space is y in ros space
		var rotated_reference_to_rotation_offset = reference_to_rotation_offset.clone().applyEuler(new THREE.Euler(0, -e.z, e.y, 'XZY'));

		// TODO: Shouldn't this always be static, meaning that the previous math is unnecessary?
		var rotation_point = reference_point.clone().add(rotated_reference_to_rotation_offset);

		var rotated_rotation_offset_to_target_offset = rotation_to_target_offset.clone().applyEuler(new THREE.Euler(0, -e.z, e.y, 'XZY'));

		var target_point = rotation_point.clone().add(rotated_rotation_offset_to_target_offset);

		//threeManager.camera.position.copy(target_point);
		threeManager.camera.position.copy(rosPostoTHREE(value.translation));

		var e_three_space = rosEulerToTHREE(e, 'YZX');
		threeManager.camera.rotation.copy(e_three_space);

		/*
		console.log("e_ros_space", e);
		console.log("q_ros_space", q_ros_space);
		console.log("q_inverse", q_inverse);
		console.log("rotated_reference_to_rotation_offset", rotated_reference_to_rotation_offset);
		console.log("reference_point", reference_point);
		console.log("rotation_point", rotation_point.clone().multiplyScalar(100));
		console.log("target_point", target_point);
		console.log("e_three_space", e_three_space);
		*/
	}
}

function rosPostoTHREE(p) {
	return new THREE.Vector3(p.x, -p.y, p.z);
}

function rosEulerToTHREE(e, order) {
	return new THREE.Euler(
		e.z+(Math.PI/2),
		0,
		e.y+(Math.PI/2),
		order
	)
}

function limitAngle(rad, lower = -Math.PI/2, upper = Math.PI/2) {
    while (rad > upper) {
        rad -= 2*Math.PI;
    }
    while (rad < lower) {
        rad += 2*Math.PI;
    }

    return rad;
}

var sensors = {
    "drive": driveSensors,
    "lift": liftSensors,
    "arm": armSensors,
    "wrist": wristSensors,
    "gripper": gripperSensors,
	"head": headSensors
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
