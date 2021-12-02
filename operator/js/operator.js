var peer_name = "OPERATOR";

var velocityControlOn = false;
var noWristOn = true;
let cameraInfo
let db = "test";
function initializeOperatorInterface() {
	if (typeof firebaseApiKey == 'undefined') {
		console.warn("There is no firebase config, nothing will be logged");
	}
	db = new Database(config);
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
		if (stream === undefined) {
			// The audio track comes without a stream. Leave it aside for now
			return;
		}
		let thisTrackContent = cameraInfo[stream.id];

		// This is where we would change which view displays which camera stream
		if (thisTrackContent=="pantiltStream" && panTiltVideoControl) {
			panTiltVideoControl.addRemoteStream(stream);
		}
		if (thisTrackContent=="overheadStream" && overheadVideoControl) {
			overheadVideoControl.addRemoteStream(stream);
		}
		if (thisTrackContent=="gripperStream" && gripperVideoControl){
			gripperVideoControl.addRemoteStream(stream);
		}
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

function connectEventListeners() {
	document.getElementById("hangup").addEventListener("click", ()=>{
		disconnectFromRobot()
		document.getElementById("robotToControl").selectedIndex = 0
	})

	robotToControlSelect.onchange = () => {
		const robot = robotToControlSelect.value;
		if(robot === 'no robot connected') {
			console.log('no robot selected, hanging up');
			disconnectFromRobot()
		} else {
			connectToRobot(robot)
		}
	};
}
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', connectEventListeners)
} else {
	connectEventListeners()
}


