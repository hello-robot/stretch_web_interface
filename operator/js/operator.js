var peer_name = "OPERATOR";

var velocityControlOn = false;
var noWristOn = true;

let db;
function initializeOperatorInterface() {
	db = new Database(config, runOnOpenDataChannel);
	// createModeSwitch();
	setMode("nav");
}

let poseManager;
let globalRequestResponseHandler = new RequestResponseHandler("global");

async function runOnOpenDataChannel() {
	// When the robot and the operator are first connected, 
	// switch to navigation mode.
	console.log('Starting in navigation mode')
	setMode("nav");

	poseManager = new PoseManager(db, 'robotPoseContainer');
	poseManager.initialize();

	// Request camera information from the robot
	//  This also triggers it to add all of the camera tracks to the webrtc communication
	//	Adding the camera tracks triggers handleRemoteTrackAdded and displayRemoteStream to display the streams locally
	cameraInfo = (await globalRequestResponseHandler.makeRequest("streamCameras")).info;
}

function checkSettingValue(id){
	let element = document.getElementById(id);
	return element.checked;
}

function checkboxSettingChange(element){
	if (element.id == "showPermanentIconsOverhead") {
		if (element.checked == true) {
			overheadVideoControl.addIcons();
		}
		else {
			overheadVideoControl.removeIcons();
		}
	}

	if (element.id == "showPermanentIconsPantilt") {
		if (element.checked == true) {
			panTiltVideoControl.addIcons();
		}
		else {
			panTiltVideoControl.removeIcons();
		}
	}

	if (element.id == "showPermanentIconsGripper") {
		if (element.checked == true) {
			gripperVideoControl.addIcons();
		}
		else {
			gripperVideoControl.removeIcons();
		}
	}


}



