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
	//  stream info is stored in `allRemoteStreams`, both together are used to display the streams locally
	cameraInfo = (await globalRequestResponseHandler.makeRequest("streamCameras")).info;

	allRemoteStreams.forEach(({track, stream}) => {
		displayRemoteStream(track, stream);
	});
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



