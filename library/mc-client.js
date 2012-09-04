var MCClient = (function() {
	var debug = false;
	var serverIPAddr;
	var serverPort;
	var allRooms = {};
	var roomCount = 0;
	var buttonsCallbacks = {rooms: {}};
	var ticketReqCode = 0;
	var ticketRequests = {};
	var closeRoomCallbacks = {};

	// a room object to be used by the Client for every room opened on the server side
	// by using the openRoom function.
	function Room(websocket) {
		this.id = 0;
		this.webSocket = websocket;
		this.disconnectFunc;
	}

	// Gets the address of the server that communicate between the client and the controllers.
	// address - the IP address of the server we connect to
	// port - the port of the server
	// controllerPage - the web page that the controller will enter when it joins the clients room
	function setServer(address, port) {
		if (typeof(address) !== "string") {
			return false;
		}
		port = parseInt(port);
		serverIPAddr = address;
		serverPort = port;
		return true;
	}

	// Opens a new room at the server and then calls the given callback function.
	// userLimit - (optional) limit on number of users (zero means unlimited number of users)
	// existingRoomCode - (optional) add a code to join an existing room on the server. (this code is given in the connection callback)
	// password - (optional) secret password required for joining the room
	// connection(roomID, roomCode) callback: connection callback function that OpenRoom function calls after opening a new room
	// roomID - the room ID hash number that controllers will join or undefined if connection failed.
	// roomCode - the unique code for this room on this server that can be used for other clients to join the same room
	// join(userID, roomID) callback: join callback function that OpenRoom function calls after a new controller connection
	// userID - user unique ID
	// roomID - the room ID that the user joined
	// disconnection(roomID) callback: this function is called when connection between the client and the server fails
	// roomID - the room that was closed
	function openRoom(connection, join, disconnection, userLimit, existingRoomCode, password) {
		userLimit = userLimit || 0;
		existingRoomCode = existingRoomCode || "";
		// check if the parameters are legal
		if (typeof(userLimit) !== "number") {
			if (debug) {
				console.log("userLimit parameter must be a number");
			}
			return false;
		}
		if (userLimit < 0) {
			if (debug) {
				console.log("userLimit parameter must a non negative number");
			}
			return false;
		}
		
		if (typeof(existingRoomCode) !== "string") {
			if (debug) {
				console.log("existingRoomCode parameter must a string");
			}
			return false;
		}
		
		if (typeof(connection) !== "function" || typeof(join) !== "function" || typeof(disconnection) !== "function") {
			return false
		}
		if (password !== undefined) {
			if (typeof(password) !== "string") {
				return false;
			}
		}
	
		// check if websocket is available on the browser
		if ("WebSocket" in window) {
			var newRoom = new Room(new WebSocket("ws://"+ serverIPAddr + ":" + serverPort, "echo-protocol"));
			
			newRoom.webSocket.onopen = function() {
				var openRoomObj = {};
				openRoomObj.type = "openRoom";
				openRoomObj.userLimit = userLimit;
				if (existingRoomCode !== "") {
					openRoomObj.roomCode = existingRoomCode;
				}
				if (password !== undefined) {
					openRoomObj.password = password;	
				}
				newRoom.webSocket.send(JSON.stringify(openRoomObj));
			};
			
			newRoom.webSocket.onmessage = function(evt) {
				var received_msg = evt.data;
				var msgObj = JSON.parse(received_msg);
				if (msgObj.type === "openRoom") {
					allRooms[roomCount] = newRoom;
					allRooms[roomCount].id = roomCount;
					roomCount++;
					if (existingRoomCode !== "") {
						connection(allRooms[roomCount-1].id, existingRoomCode);
					} else {
						connection(allRooms[roomCount-1].id, msgObj.roomCode);
					}
				}else if (msgObj.type === "controllerJoined") {
					join(msgObj.userID, newRoom.id);
				}else if (msgObj.type === "button") {
					inputEvent = {userID: msgObj.userID, id: msgObj.id, msgType: msgObj.msgType, data: msgObj.data};
					if (buttonsCallbacks[msgObj.userID] !== undefined) {
						buttonsCallbacks[msgObj.userID](inputEvent);
					} else if (buttonsCallbacks['rooms'][newRoom.id] !== undefined) { 
						buttonsCallbacks['rooms'][newRoom.id](inputEvent);
					}else if (buttonsCallbacks['all'] !== undefined) {
						buttonsCallbacks['all'](inputEvent);
					}
				}else if (msgObj.type === "userLeft") {
					if (newRoom.disconnectFunc !== undefined) {
						newRoom.disconnectFunc(msgObj.userID);
					} else if (allRooms['all'] !== undefined) {
						allRooms['all'].disconnectFunc(msgObj.userID);
					}
				}else if (msgObj.type === "getTicket") {
					ticketRequests[msgObj.ticketReqCode](msgObj.uuid);
					delete ticketRequests[msgObj.ticketReqCode];
				}
			};
			
			newRoom.webSocket.onclose = function() {
				// websocket is closed.
				if (debug) {
					console.log("Connection is closed...");
				}
				disconnection(newRoom.id);
			};
		} else {
			// The browser doesn't support WebSocket
			if (debug) {
				console.log("WebSocket NOT supported by your Browser!");
			}
			return false;
		}
		return true;
	}

	// Sets a callback function for when data is received from a user.
	// buttonEventFunc(inputEvent) callback function that occurs when a button is triggered
	// inputEvent:
	// id - the button/message ID
	// msgType - the type of the input
	// data - the input data
	// userID - register this callback for this specific user number
	// When no userID is given, the event is called for all users
	function handleUserInput(buttonEventFunc, userID) {
		if (typeof(buttonEventFunc) !== "function" || 
			(userID !== undefined && typeof(userID) !== "number")) {
			return false;
		}
		if (userID !== undefined) {
			buttonsCallbacks[userID] = buttonEventFunc;
		} else {
			buttonsCallbacks['all'] = buttonEventFunc;
		}
		return true;
	}
	
	// Sets a callback function for when data is received from a user from a specific room.
	// When no roomID is given, the event is called for all rooms.
	// buttonEventFunc(inputEvent) callback function that occurs when a button is triggered
	// inputEvent:
	// id - the button/message ID
	// msgType - the type of the input
	// data - the input data
	// roomID - register this callback for this specific room
	function handleRoomInput(buttonEventFunc, roomID) {
		if (typeof(buttonEventFunc) !== "function" || typeof(roomID) !== "number") {
			return false;
		}
		if (roomID !== undefined) {
			buttonsCallbacks['rooms'][roomID] = buttonEventFunc;
		} else {
			buttonsCallbacks['all'] = buttonEventFunc;
		}
		return true;
	}

	// Gets a function (disconnectEvent) to handle disconnections of controllers from the server
	// roomID - the ID of the room disconnected from
	// disconnectEvent(userID) - the event that fires upon disconnection
	function handleUserDisconnection(disconnectEventFunc, roomID) {
		if (typeof(disconnectEventFunc) !== "function" || 
			(roomID !== undefined && typeof(roomID) !== "number")) {
			return false;
		}
		if (roomID !== undefined) {
			allRooms[roomID].disconnectFunc = disconnectEventFunc;
		} else {
			allRooms['all'] = {};
			allRooms['all'].disconnectFunc = disconnectEventFunc;
		}
		return true;
	}

	// Sends data to the userID's conroller
	// roomID - the room where the user is
	// userID - send the data to the user with this user id
	// data - JSON object to send to the user
	function sendData(roomID, userID, data) {
		if (typeof(roomID) !== "number" || typeof(userID) !== "number" || typeof(data) !== "object") {
			return false;
		}
		if (allRooms[roomID] === undefined) {
			return false;
		}
		var sendDataObj = {};
		sendDataObj.type = "sendData";
		sendDataObj.userID = userID;
		sendDataObj.data = data;
		allRooms[roomID].webSocket.send(JSON.stringify(sendDataObj));
		return true;
		
	}

	// sends data to all the users in the room
	// roomID - the room where to broadcast the data
	// data - JSON object to send to all the users
	function broadcastData(roomID, data) {
		if (typeof(roomID) !== "number" || typeof(data) !== "object") {
			return false;
		}
		if (allRooms[roomID] === undefined) {
			return false;
		}
		var sendDataObj = {};
		sendDataObj.type = "sendBroadcast";
		sendDataObj.data = data;
		allRooms[roomID].webSocket.send(JSON.stringify(sendDataObj));
		return true;
	}
	
	// disconnects a user from a room
	// roomID - the id of the room where the user is
	// userID - the user to disconnect from the server
	function disconnectUser(roomID, userID) {
		if (typeof(roomID) !== "number" || typeof(userID) !== "number") {
			return false;
		}
		if (allRooms[roomID] === undefined) {
			return false;
		}
		var sendDataObj = {};
		sendDataObj.type = "disconnectUser";
		sendDataObj.userID = userID;
		allRooms[roomID].webSocket.send(JSON.stringify(sendDataObj));
		return true;
	}

	// get an entry code that a controller should use in order to join a room.
	// roomID - the room to join
	// recvTicketEventFunc(joinCode) - a callback function that fires when the server
	// sends a join code for the room as requested.
	function getTicket(roomID, recvTicketEventFunc) {
		if (typeof(roomID) !== "number" || typeof(recvTicketEventFunc) !== "function") {
			return false;
		}
		if (allRooms[roomID] === undefined) {
			return false;
		}
		var codeReqObj = {};
		codeReqObj.type = "getTicket";
		codeReqObj.ticketReqCode = ticketReqCode;
		ticketRequests[ticketReqCode] = recvTicketEventFunc;
		ticketReqCode++;
		allRooms[roomID].webSocket.send(JSON.stringify(codeReqObj));
		return true;
	}
	
	// returns an image tag (string) with a QR code of the given url
	function getQRCode(url, size) {
		return create_qrcode(url, size || 2);
	}

	var create_qrcode = function(text, size, typeNumber, errorCorrectLevel, table) {
		var qr = qrcode(typeNumber || 10, errorCorrectLevel || 'M');
		qr.addData(text);
		qr.make();
		return qr.createImgTag(size);
	};

	// closes the room
	function closeRoom(roomID) {
		if (typeof(roomID) !== "number") {
			return false;
		}
		if (allRooms[roomID] === undefined) {
			return false;
		}
		var sendDataObj = {};
		sendDataObj.type = "closeRoom";
		sendDataObj.roomID = roomID;
		allRooms[roomID].webSocket.send(JSON.stringify(sendDataObj));
		return true;
	}
	
	var exports = {
		setServer: setServer,
		openRoom: openRoom,
		handleUserInput: handleUserInput,
		handleRoomInput: handleRoomInput,
		handleUserDisconnection: handleUserDisconnection,
		sendData: sendData,
		broadcastData: broadcastData,
		disconnectUser: disconnectUser,
		getTicket: getTicket,
		getQRCode: getQRCode,
		closeRoom: closeRoom
	};
	
	return(exports);
})();
