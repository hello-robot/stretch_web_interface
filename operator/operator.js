var peer_name = "OPERATOR";

var velocityControlOn = false;
var noWristOn = true;

function initializeOperatorInterface() {
  var db = new Database(config, runOnOpenDataChannel);
  createModeSwitch();
}

function runOnOpenDataChannel() {
	// When the robot and the operator are first connected, 
	// switch to navigation mode.
	console.log('Starting in navigation mode')
	turnModeOn('nav')
}

function createModeSwitch() {

	let switchDiv = document.getElementById("modeSwitch");
	createAndAddSwitchButton(switchDiv, "nav", "Drive", true);
	createAndAddSwitchButton(switchDiv, "low_arm", "Arm &dArr;");
	createAndAddSwitchButton(switchDiv, "high_arm", "Arm &uArr;");
	createAndAddSwitchButton(switchDiv, "hand", "Hand");
	createAndAddSwitchButton(switchDiv, "look", "Look");

	let span = document.createElement("span");
	span.setAttribute("class", "switch-selection");
	switchDiv.appendChild(span);
}

function createAndAddSwitchButton(parentDiv, id, text, isChecked=false){
	let button = document.createElement("input");
	button.setAttribute("type", "radio");
	button.setAttribute("class", "switch-input");
	button.setAttribute("name", "mode-switch");
	button.setAttribute("value", id);
	button.setAttribute("id", id + "_mode_button");
	if (isChecked)
		button.setAttribute("checked", "true");

	let label = document.createElement("label");
	label.setAttribute("for", id + "_mode_button");
	label.setAttribute("class", "switch-label switch-label-" + id);
	label.setAttribute("onclick", "turnModeOn('" + id + "')");
	label.innerHTML = text;

	parentDiv.appendChild(button);
	parentDiv.appendChild(label);
}




