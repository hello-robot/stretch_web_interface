var peer_name = "OPERATOR";

var velocityControlOn = false;
var noWristOn = true;

function initializeOperatorInterface() {
  var db = new Database(config, runOnOpenDataChannel);
}

function runOnOpenDataChannel() {
	// When the robot and the operator are first connected, 
	// switch to navigation mode.
	console.log('Starting in navigation mode')
	turnModeOn('nav')
}

