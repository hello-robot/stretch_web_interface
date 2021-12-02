'use strict';

let allRemoteStreams = [];
let robotToControlSelect = document.querySelector('select#robotToControl');

let socket = io.connect();
setupSocketIO(socket, true);
pc.ontrack = handleRemoteTrackAdded;

socket.on('available robots', function(available_robots) {
    console.log('received response from the server with available robots');
    console.log('available_robots =');
    console.log(available_robots);

    // remove any old options, leaving the "no robot" option at the front
    for (let i = 1; i < robotToControlSelect.options.length; i++) {
        robotToControlSelect.remove(i)
    }
    
    // add all new options
    for (let r of available_robots) {
        let option = document.createElement('option');
        option.value = r;
        option.text = r;
        robotToControlSelect.appendChild(option);
    }
});


function availableRobots() {
    console.log('asking server what robots are available');
    socket.emit('what robots are available');
}

function connectToRobot(robot) {
    console.log('attempting to connect to robot =');
    console.log(robot);
    requestedRobot = robot;
    socket.emit('join', robot);

}
function disconnectFromRobot() {
    hangup()
    allRemoteStreams = []
    overheadVideoControl.removeRemoteStream()
    panTiltVideoControl.removeRemoteStream()
    gripperVideoControl.removeRemoteStream()
    // We have a new peer connection object now...
    pc.ontrack = handleRemoteTrackAdded;
}

function handleRemoteTrackAdded(event) {
    console.log('Remote track added.');
    const track = event.track;
    const stream = event.streams[0];
    console.log('got track id=' + track.id, track);
    if (stream) {
        console.log('stream id=' + stream.id, stream);
    }
    console.log('OPERATOR: adding remote tracks');

    allRemoteStreams.push({'track': track, 'stream': stream});
}
