'use strict';

var socket = io.connect();
setupSocketIO(socket);

socket.on('available robots', function(available_robots) {
    console.log('received response from the server with available robots');
    console.log('available_robots =');
    console.log(available_robots);

    // remove any old options
    while (robotToControlSelect.firstChild) {
        robotToControlSelect.removeChild(robotToControlSelect.firstChild);
    }
    
    var option = document.createElement('option');
    option.value = 'no robot connected';
    option.text = 'no robot connected';
    robotToControlSelect.appendChild(option);

    // add all new options
    for (let r of available_robots) {
        option = document.createElement('option');
        option.value = r;
        option.text = r;
        robotToControlSelect.appendChild(option);
    }
});

var robotToControlSelect = document.querySelector('select#robotToControl');
robotToControlSelect.onchange = connectToRobot;

function availableRobots() {
    console.log('asking server what robots are available');
    socket.emit('what robots are available');
}

function connectToRobot() {
    var robot = robotToControlSelect.value;
    if(robot === 'no robot connected') {
        console.log('no robot selected');
        console.log('attempt to hangup');
        hangup();
    } else {
        console.log('attempting to connect to robot =');
        console.log(robot);
	requestedRobot = robot;
        socket.emit('join', robot);
    }
}

var allRemoteStreams = [];
function handleRemoteTrackAdded(event) {
    console.log('Remote track added.');
    const track = event.track;
    const stream = event.streams[0];
    console.log('got track id=' + track.id, track);
    console.log('stream id=' + stream.id, stream);

    if (peer_name === 'OPERATOR') {
        console.log('OPERATOR: adding remote tracks');
        
        allRemoteStreams.push({'track': track, 'stream': stream});
        /*
        if (cameraInfo) {
            displayRemoteStream(track, stream);
        }
        else{
            console.error("No camera info yet.");
        }
        */
    }
}

function displayRemoteStream(stream) {
    let thisTrackContent = cameraInfo[stream.id];

    //console.log('displayRemoteStream: ', stream.id, thisTrackContent);
    //console.trace();
    
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
}