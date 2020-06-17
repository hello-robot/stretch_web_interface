
// Some of this code may have been derived from code featured in the following article: 
// https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/

function createSignalingSocket(io) {

    var numClients = 0;
    var connected_robots = new Set();
    var available_robots = new Set();
    var namespace = '/';

    function getRoomCount(room) {

        var clients = io.nsps[namespace].adapter.rooms[room];
        
        if (clients === undefined) {
            return 0;
        } else {
            return clients.length;
        }
    };


    function sendAvailableRobotsUpdate(socket) {
        // let operators know about available robots
        console.log('letting operators know about available robots');
        console.log('available_robots =');
        console.log(available_robots);
        var robots = Array.from(available_robots.values());
        socket.to('operators').emit('available robots', robots);
    }
    
    io.on('connection', function(socket){
        ////////////////
        // see
        // https://www.codementor.io/tips/0217388244/sharing-passport-js-sessions-with-both-express-and-socket-io
        // for more information about socket.io using passport middleware
        console.log('new socket.io connection');
        console.log('socket.handshake = ');
        console.log(socket.handshake);
        //console.log(socket.request.user);

        // function log() {
        //     var array = ['Message from server:'];
        //     array.push.apply(array, arguments);
        //     console.log(array);
        //     //socket.emit('log', array);
        // }

        var user = socket.request.user;
        var role = user.role;
        var robot_operator_room = 'none';
        
        if(role === 'robot') {
            
            var robot_name = user.username;
            var room = robot_name; // use the robot's name as the robot's room identifier

            console.log('A ROBOT HAS CONNECTED');
            console.log('intended room name =');
            console.log(room);
            
            io.of(namespace).in(room).clients((error, clients) => {
                if (error) throw error;
                console.log('clients already in the room name "' + room + '"');
                console.log(clients);

                // if the room already exists and has clients
                // disconnect the clients
                for (let c of clients) {

                    // "Disconnects this client. If value of close is
                    // true, closes the underlying
                    // connection. Otherwise, it just disconnects the
                    // namespace."
                    console.log('disconnecting client in old robot room');
                    console.log('client =');
                    console.log(c);
                    //io.of('/namespace').connected[socket.id]
                    io.of(namespace).connected[c].disconnect(true);

                    //c.conn.disconnect(true);
                }

                // create the robot operator pairing room and add to the "robots" room
                socket.join([room, 'robots'], () => {
                    robot_operator_room = room;
                    console.log('adding robot to the "robots" room');
                    console.log('creating room for the robot and having it join the room');
                    connected_robots.add(robot_name);
                    available_robots.add(robot_name);
                    
                    // let operators know about the new robot
                    sendAvailableRobotsUpdate(socket);
                    // io.to(room).emit('a room for the robot has been created, and the robot is in it'); // broadcast to everyone in the room
                    
                });
                
            });
        } else {
            if(role === 'operator') {
                console.log('AN OPERATOR HAS CONNECTED');
                // create the robot operator pairing room and add to the robots room
                socket.join('operators', () => {
                    console.log('adding operator to the "operators" room');
                });

                // let operator know about available robots
                
                var robots = Array.from(connected_robots.values());
                console.log('available_robots =');
                console.log(available_robots);
                var robots = Array.from(available_robots.values());
                socket.emit('available robots', robots);
            }
        }

        // https://github.com/socketio/socket.io/blob/master/docs/API.md
        // "A client always connects to / (the main namespace), then
        // potentially connect to other namespaces (while using the
        // same underlying connection)."

        // convenience function to log server messages on the client

        
        socket.on('what robots are available', function() {
            if(role === 'operator') {
                console.log('operator has requested the available robots');
                console.log('available_robots =');
                console.log(available_robots);
                log('Received request for the available robots');
                var robots = Array.from(available_robots.values());
                socket.emit('available robots', robots);
            } else {
                console.log('NO REPLY SENT: non-operator requested the available robots');
            }
        });

        
        socket.on('webrtc message', function(message) {
            console.log('Client sent WebRTC message: ', message);
            if(robot_operator_room !== 'none') {
                console.log('sending WebRTC message to any other clients in the room named "' +
                            robot_operator_room + '".');
                socket.to(robot_operator_room).emit('webrtc message', message);
                
                if(message === 'bye') {
                    if(role === 'operator') {
                        console.log('Attempting to have the operator leave the robot room.');
                        console.log('');
                        socket.leave(robot_operator_room);
                        available_robots.add(robot_operator_room);
                        robot_operator_room = 'none';
                        sendAvailableRobotsUpdate(socket);
                    }
                }
            } else {
                console.log('robot_operator_room is none, so there is nobody to send the WebRTC message to');
            }
        });

        
        socket.on('join', function(room) {
            console.log('Received request to join room ' + room);
            
            numClients = getRoomCount(room);
            console.log('Requested room ' + room + ' currently has ' + numClients + ' client(s)');
            
            if (numClients < 1) {
                //socket.join(room);
                console.log('*********************************************');
                console.log('RECEIVED REQUEST TO JOIN A NON-EXISTENT ROOM');
                console.log('THIS IS UNUSUAL AND SHOULD BE AVOIDED');
                console.log('Client ID ' + socket.id + ' created room ' + room);
                console.log('DOING NOTHING...');
                console.log('Apparently, no robot exists with the requested name');
                console.log('Since no room exists with the requested name');
                console.log('*********************************************');
                //socket.emit('created', room, socket.id);
            } else if (numClients < 2) {
                console.log('Client ID ' + socket.id + ' joined room ' + room);
                io.sockets.in(room).emit('join', room);
                socket.join(room);
                available_robots.delete(room);
                robot_operator_room = room;
                sendAvailableRobotsUpdate(socket);
                socket.emit('joined', room, socket.id);
                io.sockets.in(room).emit('ready');
            } else { // max two clients
                socket.emit('full', room);
            }
        });

        socket.on('disconnect', function(){
            console.log('socket disconnected');
            if(user.role === 'robot') {
                var robot_name = user.username;
                console.log('ROBOT "' + robot_name + '" DISCONNECTED');
                console.log('attempting to delete it from the set');
                robot_operator_room = 'none';
                // could this result in deleting an element of the set
                // that should be there because of asynchronous
                // execution?
                connected_robots.delete(robot_name);
                available_robots.delete(robot_name);
                sendAvailableRobotsUpdate(socket); // might be good to include this in an object that tracks the robots
            }
            console.log('user disconnected');
        });
        
    });
    
    // "Disconnects this client. If value of close is true, closes the underlying connection."
    // - https://socket.io/docs/server-api/
    // console.log('disconnecting...');
    // socket.disconnect(true)
};       

////////////////////////////////////////////////////////

module.exports = createSignalingSocket;

