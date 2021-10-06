var peer_name = "ROBOT";
var recordOn = false;

function runOnOpenDataChannel() {
	// When the robot and the operator are first connected, switch to navigation mode.
	//console.log('starting in navigation mode')
	//turnModeOn('nav')
	// if (cameraInfo)
	// 	sendData(cameraInfo);
	sendTfs();
}
