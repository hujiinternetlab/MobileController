var WebSocketServer = require('websocket').server;
var uuid = require("node-uuid");
var http = require('http');
var openRooms = {};
var joiningUsers = {};
var roomIDsCounter = 0;
var clearUUIDsTimer;

/*
openRooms:
	usersMaxNum
	(password)
	uuid
	users:
		connection
	userIDCount
	connection:
		roomID
		(userID)
*/

exports.debug = false;

// This function starts the server
function startServer(port, listen) {
	// checks that the arguments are legal
	if ((port === undefined) || (listen !== undefined && typeof(listen) !== "function")) {
		return false;
	}
	port = parseInt(port);
	
	// creats server and handles url requests by sending error 404
	var server = http.createServer(function(request, response) {
		if (exports.debug) {
			console.log((new Date()) + ' Received request for ' + request.url);
		}
		response.writeHead(500);
		response.end();
	});

	// on server close handler
	server.on('close', function() {
		clearInterval(clearUUIDsTimer);
		if (exports.debug) {
			console.log((new Date()) + ' Server is closed');
		}
	});

	// creates a WebSocketServer
	wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	// WebSocketServer on request handler
	wsServer.on('request', function(request) {
		var connection = request.accept('echo-protocol', request.origin);
		if (exports.debug) {
			console.log((new Date()) + ' Connection accepted - ip: ' + request.remoteAddress);
		}
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				handleData(message.utf8Data, connection);
			}
		});
		
		connection.on('close', function() {
			if (exports.debug) {
				console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
			}
			// closes all controllers' connections and deletes the room from the DB
			if (connection.connectionType === "client") {
				if (openRooms[connection.roomID] !== undefined) {
					for (var user in openRooms[connection.roomID].users) {
						openRooms[connection.roomID].users[user].close();
					}
				}
				delete openRooms[connection.roomID];
				for (var uuidCode in joiningUsers) {
					if (joiningUsers[uuidCode].roomID === connection.roomID) {
						delete joiningUsers[uuidCode];
					}
				}
			} 
			// deletes the controller from the DB and notifies the client about it
			else if (connection.connectionType === "controller") {
				if (openRooms[connection.roomID] !== undefined) {
					delete openRooms[connection.roomID].users[connection.userID];
					var responseObj = {};
					responseObj.type = "userLeft";
					responseObj.userID = connection.userID;
					for (var con in openRooms[connection.roomID].connections) {
						openRooms[connection.roomID].connections[con].send(JSON.stringify(responseObj));
					}
				}
			}
		});
	});

	// This function handles all the incoming data from the websocket
	function handleData(data, connection) {
		var jsonData = JSON.parse(data);
		if (connection.roomID === undefined && !(jsonData.type === "openRoom" || jsonData.type === "joinRoom")) {
			connection.close();
			return;
		}
		// client - opens a new room
		if (jsonData.type === "openRoom") {
			// checks if reqesting to open a new room or an existing one
			if (jsonData.roomCode === undefined) {
				if (exports.debug) {
					console.log("Opening room with id: " + roomIDsCounter);
				}
				var newRoom = {};
				if (jsonData.userLimit === undefined) {
					newRoom.usersMaxNum = 0;
				} else if (jsonData.userLimit < 0) {
					connection.close();
					return;
				} else {
					newRoom.usersMaxNum = jsonData.userLimit;
				}
				if (jsonData.password !== undefined) {
					newRoom.password = jsonData.password;
				}
				var uuidCode = uuid.v1();
				newRoom.uuid = uuidCode;
				newRoom.connections = new Array();
				newRoom.connections.push(connection);
				newRoom.users = {};
				newRoom.userIDCount = 0;
				openRooms[roomIDsCounter] = newRoom;
				
				var responseObj = {};
				responseObj.type = "openRoom";
				responseObj.roomCode = uuidCode;
				
				connection.connectionType = "client";
				connection.roomID = roomIDsCounter;
				
				roomIDsCounter++;
				connection.sendUTF(JSON.stringify(responseObj));
			} else {
				for (var room in openRooms) {
					// checks if room exists
					if (openRooms[room].uuid === jsonData.roomCode) {
						if (exports.debug) {
							console.log("Opening an existing room with id: " + openRooms[room].connections[0].roomID);
						}
						openRooms[room].connections.push(connection);
						connection.connectionType = "client";
						connection.roomID = openRooms[room].connections[0].roomID;
						var responseObj = {};
						responseObj.type = "openRoom";
						connection.sendUTF(JSON.stringify(responseObj));
						return;
					}
				}
				connection.close();
			}
		} 
		// client - sends data from the client to some controller
		else if (jsonData.type === "sendData") {
			if (exports.debug) {
				console.log("Sending data from client " + connection.roomID + " to controller " + jsonData.userID);
			}
			var responseObj = {};
			responseObj.type = "sendData";
			responseObj.data = jsonData.data;
			if (openRooms[connection.roomID].users[jsonData.userID] !== undefined) {
				openRooms[connection.roomID].users[jsonData.userID].send(JSON.stringify(responseObj));
			}
		}
		// client - sends data from client to all the controllers
		else if (jsonData.type === "sendBroadcast") {
			if (exports.debug) {
				console.log("Broadcasting data from client " + connection.roomID + " to all the controllers");
			}
			var responseObj = {};
			responseObj.type = "sendData";
			responseObj.data = jsonData.data;
			for (var user in openRooms[connection.roomID].users) {
				openRooms[connection.roomID].users[user].send(JSON.stringify(responseObj));
			}
		}
		// client - closes the room
		else if (jsonData.type === "closeRoom") {
			if (exports.debug) {
				console.log("Closing room " + connection.roomID);
			}
			// closes all the controllers connections
			for (user in openRooms[connection.roomID].users) {
				openRooms[connection.roomID].users[user].close();
			}
			for (var con in openRooms[connection.roomID].connections) {
				openRooms[connection.roomID].connections[con].close();
			}
			delete openRooms[connection.roomID];
		} 
		// client - generating a new uuid for joining user
		else if (jsonData.type === "getTicket") {
			if (exports.debug) {
				console.log("Generating uuid for room " + connection.roomID);
			}
			var uuidCode = uuid.v1();
			joiningUsers[uuidCode] = {};
			joiningUsers[uuidCode].time = new Date().getTime();
			joiningUsers[uuidCode].roomID = connection.roomID;
			var responseObj = {};
			responseObj.type = "getTicket";
			responseObj.uuid = uuidCode;
			responseObj.ticketReqCode = jsonData.ticketReqCode;
			connection.send(JSON.stringify(responseObj));		
		} 
		// client - disconnects player with given userID
		else if (jsonData.type === "disconnectUser") {
			if (exports.debug) {
				console.log("disconnect user " + jsonData.userID);
			}
			if (openRooms[connection.roomID].users[jsonData.userID] !== undefined) {
				openRooms[connection.roomID].users[jsonData.userID].close();
			}
		}
		// controller - joins the controller to the client's room
		else if (jsonData.type === "joinRoom") {
			if (exports.debug) {
				console.log("joining a new controller to the room");
			}
			var room = undefined;
			var roomID = undefined;
			if (joiningUsers[jsonData.ticket] !== undefined) {
				roomID = joiningUsers[jsonData.ticket].roomID;
			}
			if (roomID !== undefined) {
				room = openRooms[roomID];
				delete joiningUsers[jsonData.ticket];
			}
			
			var responseObj = {};
			responseObj.type = "joinRoom";
			var passProtected = false;
			
			// checks if the room 
			if (room !== undefined) {
				// checks if the room is password protected
				if (room.password !== undefined) {
					passProtected = true;
					// checks if the password matches 
					if (room.password === jsonData.password) {
						passProtected = false;
					} else {
						responseObj.errMsg = "Wrong password";
					}
				}
				// if room isn't password protected or password matches
				if (!passProtected) {
					// checks if room is full
					if (room.usersMaxNum !== 0 && dictSize(room.users) === room.usersMaxNum) {
						responseObj.errMsg = "Room is full";
					} else {
						if (exports.debug) {
							console.log("Controller " + room.userIDCount + " joined room " + roomID);
						}
						responseObj.userID = room.userIDCount;
						responseObj.roomID = roomID;
						openRooms[roomID].users[room.userIDCount] = connection;
						connection.send(JSON.stringify(responseObj));
						responseObj = {};
						responseObj.type = "controllerJoined";
						responseObj.userID = openRooms[roomID].userIDCount;
						responseObj.roomID = roomID;
						connection.connectionType = "controller";
						connection.roomID = roomID;
						connection.userID = openRooms[roomID].userIDCount;
						openRooms[roomID].userIDCount++;
						for (var con in openRooms[connection.roomID].connections) {
							openRooms[roomID].connections[con].send(JSON.stringify(responseObj));
						}
						return;
					}
				}
			} else {
				responseObj.errMsg = "Wrong ticket";
			}
			connection.send(JSON.stringify(responseObj));
			connection.close();
		} 
		// controller - sends controller button data to the client
		else if (jsonData.type === "sendControllerInput") {
			if (exports.debug) {
				console.log("Controller " + connection.userID + " from room " + connection.roomID + " sends input to client");
			}
			var responseObj = {};
			responseObj.type = "button";
			responseObj.msgType = jsonData.msgType;
			responseObj.data = jsonData.data;
			responseObj.id = jsonData.id;
			responseObj.userID = connection.userID;
			for (var con in openRooms[connection.roomID].connections) {
				openRooms[connection.roomID].connections[con].send(JSON.stringify(responseObj));
			}
		} 
		// controller - sends data from the controller to some other controller
		else if (jsonData.type === "sendPrivateData") {
			if (openRooms[connection.roomID].users[jsonData.otherUserID] !== undefined) {
				if (exports.debug) {
					console.log("Controller " + connection.userID + " from room " + connection.roomID + " sends input to controller " + jsonData.otherUserID);
				}
				var responseObj = {};
				responseObj.type = "sendPrivateData";
				responseObj.data = jsonData.data;
				responseObj.otherUserID = jsonData.userID;
				openRooms[connection.roomID].users[jsonData.otherUserID].send(JSON.stringify(responseObj));
			}
		} else {
			connection.close();
		}
	}

	// This function counts the number of elements in a given dictionary
	function dictSize(dict) {
		var i = 0; 
		for (var obj in dict) {
			++i; 
		}  
		return i;
	}
	

	// server listener
	server.listen(port, function() {
		if (exports.debug) {
			console.log((new Date()) + ' Server is listening on port ' + port);
		}
		clearUUIDsTimer = setInterval(function() {
			var time = new Date().getTime();
			for (var uuidCode in joiningUsers) {
				if (time - joiningUsers[uuidCode].time > 3600000) {
					delete joiningUsers[uuidCode];
				}
			}
		}, 3600000);
	});

	if (listen !== undefined) {
		listen();
	}
}

exports.startServer = startServer;
