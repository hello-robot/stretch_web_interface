var peer_name = "OPERATOR";

var currentTask = 1;
var isStart = true;

function updateTask() {
	let taskButton = document.getElementById("taskButton");
	let eventName = "Task" + currentTask + (isStart?"Started":"Ended")
	Database.logEvent(eventName);

	if (isStart) {
		isStart = false;
	} 
	else {
		isStart = true;
		currentTask++;
	}

	let buttonText = (isStart?"Start":"End") + " Task" + currentTask;
	taskButton.innerHTML = buttonText;
}

