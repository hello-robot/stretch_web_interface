
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
	var redOpacity = Math.abs(value) * 0.005;
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
		var redOpacity = Math.abs(value) * 0.005;
		//console.log('redOpacity = ', redOpacity);
		redRegion.setAttribute('fill-opacity', redOpacity);
		nothingRegion.setAttribute('fill-opacity', 0.0);
    },
	"transform": function (value) {
		navModeObjects.cube.position.copy(rosPostoTHREE(value.translation).add(positionOffset));
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
    0.037699,
    -0.002706,
    -0.033797
);

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
		
		var reference_point = new THREE.Vector3(value.translation.x, value.translation.y,value.translation.z);

		var rotated_reference_to_rotation_offset = reference_to_rotation_offset.clone().applyQuaternion(q_inverse);

		// TODO: Shouldn't this always be static, meaning that the previous math is unnecessary?
		var rotation_point = reference_point.clone().add(rotated_reference_to_rotation_offset);

		var rotated_rotation_offset_to_target_offset = rotation_to_target_offset.clone().applyQuaternion(q_ros_space);

		var target_point = rotation_point.clone().add(rotated_rotation_offset_to_target_offset);

		console.log("e_ros_space", e);
		console.log("q_ros_space", q_ros_space);
		console.log("q_inverse", q_inverse);
		console.log("rotated_reference_to_rotation_offset", rotated_reference_to_rotation_offset);
		console.log("reference_point", reference_point);
		console.log("rotation_point", rotation_point);
		console.log("target_point", target_point);

		THREEcamera.position.copy(rosPostoTHREE(target_point));

		var e_three_space = rosEulerToTHREE(e, order);
		THREEcamera.setRotationFromEuler(e_three_space);
	}
}

function rosPostoTHREE(p) {
	return new THREE.Vector3(p.x, -p.y, p.z);
}

function rosEulerToTHREE(e, order) {
	return new THREE.Euler(
		0, //limitAngle(e.x-(Math.PI/2), 0, Math.PI),
		limitAngle(e.z-(Math.PI/2), 0, Math.PI),
		limitAngle(e.y-(Math.PI/2), 0, Math.PI),
		order
	)
}

function limitAngle(rad, lower = -Math.PI/2, upper = Math.PI/2) {
    while (rad > upper) {
        rad -= Math.PI;
    }
    while (rad < lower) {
        rad += Math.PI;
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
