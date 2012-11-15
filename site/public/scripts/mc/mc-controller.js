var MCController = (function() {
	var debug = false;
	var serverIPAddr;
	var serverPort;
	var websocket;
	var isSocketConnected = false;
	var userID, connectedRoomID;
	var customDataHandler = function(data) {};
	var privateDataHandler;
	var gyroSensitivity = 10;
	var accSensitivity = 1;
	var myjoysticks = {};
	var joystickIntervals = {};
	var lastAlpha = 0, lastBeta = 0, lastGamma = 0;
	var lastAccAlpha = 0, lastAccBeta = 0, lastAccGamma = 0;
	joystickTickFreq = 300;
	var Button;

	// Gets the address of the server that communicate between the client and the controllers.
	// address - the IP address of the server we connect to
	// port - the port of the server
	function setServer(address, port) {
		if (typeof(address) !== "string") {
			return false;
		}
		port = parseInt(port);
		serverIPAddr = address;
		serverPort = port;
		return true;
	}
	
	// establishes a connection with the server and calls the join callback function with the status of the connection
	// ticket - the code to connect to a game room
	// join(errMsg) callback: errMsg - reason for not connecting.
	// password (optional) - a password of the room you are trying to join
	function startController(join, ticket, password) {
		
		if (typeof(join) !== "function" || typeof(ticket) !== "string") {
			return false
		}
		
		if (password !== undefined) {
			if (typeof(password) !== "string") {
				return false;
			}
		}
		
		if (window.MozWebSocket) {
		  window.WebSocket = window.MozWebSocket;
		}
		
		if ("WebSocket" in window) {
			websocket = new WebSocket("ws://"+ serverIPAddr + ":" + serverPort, "echo-protocol");
			
			websocket.onopen = function() {
				var joinRoomObj = {};
				joinRoomObj.type = "joinRoom";
				joinRoomObj.ticket = ticket;
				if (password !== undefined) {
					joinRoomObj.password = password;
				}
				// Web Socket is connected, send data using send()
				websocket.send(JSON.stringify(joinRoomObj));
				isSocketConnected = true;
			};
			
			websocket.onmessage = function(evt) {
				var received_msg = evt.data;
				var msgObj = JSON.parse(received_msg);
				if (msgObj.type === "joinRoom") {
					if (!msgObj.errMsg) {
						userID = msgObj.userID;
						connectedRoomID = msgObj.roomID;
						join();
					}else{
						join(msgObj.errMsg);
					}
				} else if (msgObj.type === "sendData") {
					customDataHandler(msgObj.data);
				} else if (msgObj.type === "sendPrivateData") {
					if (privateDataHandler !== undefined) {
						privateDataHandler[msgObj.otherUserID](msgObj.data, msgObj.otherUserID);
					}
				}
			};
			
			websocket.onclose = function() {
				isSocketConnected = false;
				// websocket is closed.
				if (debug) {
					console.log("Connection is closed...");
				}
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
	
	// disconnects the current connection to the server
	function disconnect() {
		websocket.close();
	}
	
	// sends some data to the client.
	// id - the button id
	// type - the button type
	// data - the button data
	function sendControllerInput(id, type, data) {
		if (typeof(id) !== "number" || typeof(type) !== "string" || typeof(data) !== "object") {
			return false;
		}
		if (!isSocketConnected) {
			return false;
		}
		var sendDataObj = {};
		sendDataObj.type = "sendControllerInput";
		sendDataObj.msgType = type;
		sendDataObj.id = id;
		sendDataObj.data = data;
		websocket.send(JSON.stringify(sendDataObj));
		return true;
	}
	
	// sends some custom/button data to the client. This can be used in order to create new custom buttons to be used in the controller.
	function sendCustomData(data, id) {
		id = id || 0;
		if (typeof(id) !== "number" || typeof(data) !== "object") {
			return false;
		}
		sendControllerInput(id, "custom", data);	
		return true;
	}

	// used to handle custom data that is received by the client
	// dataEventFunc(data) - an event that fires when custom data is sent from the client
	function handleData(dataEventFunc) {
		if (typeof(dataEventFunc) !== "function") {
			return false;
		}
		customDataHandler = dataEventFunc;
		return true;
	}

	// send custom data to another controller without going through the client
	// otherUserID - the id of the controller that will get the data
	// data - the data to send to the controller
	function sendPrivateData(otherUserID, data) {
		if (typeof(otherUserID) !== "number" || typeof(data) !== "object") {
			return false;
		}
		if (!isSocketConnected) {
			return false;
		}
		var sendDataObj = {};
		sendDataObj.type = "sendPrivateData";
		sendDataObj.data = data;
		sendDataObj.otherUserID = otherUserID;
		sendDataObj.roomID = connectedRoomID;
		websocket.send(JSON.stringify(sendDataObj));
		return true;	
	}

	// handle private data that was sent from another controller using the SendPrivateData function
	// getDataEventFunc(senderUserID, data) callback: data - the data received from the controller
	function handlePrivateData(getDataEventFunc) {
		if (typeof(getDataEventFunc) !== "function") {
			return false;
		}
		privateDataHandler = getDataEventFunc;
		return true;
	}
	
	// adds a listener to the gyroscope if it is supported
	function activateGyroscope(sensitivity) {
		var arAlpha, arBeta, arGamma;
		
		if (typeof(sensitivity) !== "number") {
			return false;
		}
		if (sensitivity < 1 || sensitivity > 359) {
			if (debug) {
				console.log("sensitivity must be between 1 to 359");
			}
			return false;;
		}
		gyroSensitivity = sensitivity;
		if (!isSocketConnected) {
			return false;
		}
		if (window.DeviceOrientationEvent) {
			window.addEventListener('deviceorientation', gyroListener1, false);
		} else if (window.OrientationEvent) {
			window.addEventListener('MozOrientation', gyroListener2, false);
		}else{
			if (debug) {
				console.log("no gyro support!");
			}
			return false;
		}
		return true;
	}
	
	function gyroListener1(eventData) {
		arGamma = eventData.gamma;
		arBeta = eventData.beta;
		arAlpha = eventData.alpha;
		sendGyroUpdate(arAlpha, arBeta, arGamma);
	}
	
	function gyroListener2(eventData) {
		arGamma = eventData.x * 90; 
		arBeta = eventData.y * -90;
		arAlpha = eventData.z;
		sendGyroUpdate(arAlpha, arBeta, arGamma, sensitivity);	
	}
	
	function sendGyroUpdate(alpha, beta, gamma) {
		if (!isSocketConnected) {
			if (debug) {
				console.log("connection lost: gyroscope disabled");
			}
			DisableGyroscope();
			return;
		}
		if (lastAlpha+gyroSensitivity < alpha || lastAlpha-gyroSensitivity > alpha ||
				lastBeta+gyroSensitivity < beta || lastBeta-gyroSensitivity > beta ||
				lastGamma+gyroSensitivity < gamma || lastGamma-gyroSensitivity > gamma) {
					lastAlpha = alpha;
					lastBeta = beta;
					lastGamma = gamma;
					sendControllerInput(0, "gyroscope", {alpha: alpha, beta: beta, gamma: gamma});
			}
	}
	
	
	// disables the listener on the gyroscope
	function disableGyroscope() {
		if (window.DeviceOrientationEvent) {
			window.removeEventListener('deviceorientation', gyroListener1);
		} else if (window.OrientationEvent) {
			window.removeEventListener('MozOrientation', gyroListener2);
		} else {
			return false;
		}
		return true;
	}
	
	function activateAccelerometer(sensitivity) {
		if (typeof(sensitivity) !== "number") {
			return false;
		}
		if (window.DeviceMotionEvent === undefined) {
			if (debug) {
				console.log("You're device is not supported");
			}
			return false;
		}
		if (sensitivity < 1) {
			if (debug) {
				console.log("sensitivity must be bigger than 1");
			}
			return false;
		}
		accSensitivity = sensitivity;
		window.addEventListener('devicemotion', accListener, false);
		return true;
	}
		
	function accListener(event) {
		var rotation = event.rotationRate;
		var arAlpha, arBeta, arGamma;
		if (rotation != null) {
			arAlpha = Math.round(rotation.alpha);
			arBeta = Math.round(rotation.beta);
			arGamma = Math.round(rotation.gamma);
		}
		if(lastAccAlpha+accSensitivity < arAlpha || lastAccAlpha-accSensitivity > arAlpha ||
			lastAccBeta+accSensitivity < arBeta || lastAccBeta-accSensitivity > arBeta ||
			lastAccGamma+accSensitivity < arGamma || lastAccGamma-accSensitivity > arGamma){
				lastAccAlpha = arAlpha;
				lastAccBeta = arBeta;
				lastAccGamma = arGamma;
				sendControllerInput(0, "accelerometer", {alpha: arAlpha, beta: arBeta, gamma: arGamma});
		}
	}
	
	function disableAccelerometer() {
		if (window.DeviceMotionEvent !== undefined) {
			window.removeEventListener('devicemotion', accListener);
		} else {
			return false;
		}
		return true;
	}
	
	//--------------------------------------------------------------------------------------------------------
	//---------------------------------------------Button Code------------------------------------------------
	//--------------------------------------------------------------------------------------------------------
	
	/*
	   Button is made out of two nested div elements. A 'base' element, and
	   a 'stick' element.
	   After creating a new Joystick object 'j', add and position j.domElement 
	   into the document call j.init(), and you're ready to go.

	   Button(number id, HTMLDivElement div):
			id is the button's identifier.
			div is the button's div element.
		Button(number id):
			id is the button's identifier.
			Creates default squared div element.
		Button(id, size):
			id is the button's identifier.
			Creates default squared div element with provided size.
	 */
	Button = function(/*...*/) {
		var size, buttonDiv;
		if (arguments.length === 2 && typeof(arguments[0]) === 'number' && 
									  arguments[1] instanceof HTMLDivElement) {
			this.id = arguments[0];
			buttonDiv = arguments[1];
		} else {
			if (arguments.length === 1 && typeof(arguments[0]) === 'number') {
				size = 100;
				this.id = arguments[0];
			} else if (arguments.length === 2 && typeof(arguments[0]) === 'number' && 
												 typeof(arguments[1]) === 'number') {
				size = arguments[1];
				this.id = arguments[0];
			} else {
				return;
			}

			buttonDiv = document.createElement('div');
			buttonDiv.style.width = size + 'px';
			buttonDiv.style.height = size + 'px';
			buttonDiv.style.backgroundColor = '#0000FF';			
		}
		
		buttonDiv.style.position = 'absolute';

		this.domElement = buttonDiv;
		this.state = Button.STATE_UP;
		this.down_callback = function() {};
		this.up_callback = function() {};
	};

	Button.prototype.init = function() {
		if (this.domElement === undefined) {
			return false;
		}
		var self = this;

		// mouse events
		this.domElement.addEventListener('mousedown', function() {
			self._down();
		}, false);

		this.domElement.addEventListener('mouseup', function() {
			self._up();
		}, false);


		// touch events
		this.domElement.addEventListener("touchstart", function(e) {        
			self._activeTouch = e.changedTouches[0].identifier;
			self._down(e.changedTouches[0]);
			e.preventDefault();
		}, false);

		var handleTouch = function(self, cb) {
			return function(e) {            
				for (var i = 0; i < e.changedTouches.length; ++i) {
					if (e.changedTouches[i].identifier === self._activeTouch) {
						cb.call(self, e.changedTouches[i]);                                    
						e.preventDefault();
						return;
					}
				}
			};
		}; 

		window.addEventListener("touchend", handleTouch(self, self._up), false);
		window.addEventListener("touchcancel", handleTouch(self, self._up), false);
		
		return true;
	};

	Button.prototype.ondown = function(callback) {
		this.down_callback = callback;
	};

	Button.prototype.onup = function(callback) {
		this.up_callback = callback;
	};

	Button.prototype._down = function() {
		if (this.state === Button.STATE_UP) {
			this.state = Button.STATE_DOWN;	
			this._reportData();
			this.down_callback();
		}
		
	};

	Button.prototype._up = function() {
		if (this.state === Button.STATE_DOWN) {
			this.state = Button.STATE_UP;	
			this._reportData();
			this.up_callback();		
		}
	};

	Button.prototype._reportData = function() {
		sendControllerInput(this.id, "button", {pressed: (this.state === 1)});
		if (debug) {
			console.log(this.state);
		}
	};

	Button.STATE_UP = 0;
	Button.STATE_DOWN = 1;	
	
	//--------------------------------------------------------------------------------------------------------
	
	//--------------------------------------------------------------------------------------------------------
	//---------------------------------------------Joystick Code----------------------------------------------
	//--------------------------------------------------------------------------------------------------------
	
	/*
	   Joystick is made out of two nested div elements. A 'base' element, and
	   a 'stick' element.
	   After creating a new Joystick object 'j', add and position j.domElement 
	   into the document call j.init(), and you're ready to go.

	   Joystick(number id, HTMLDivElement base, HTMLDivElement stick):
			id is the joystick identifier. 
			base is the base element, and stick is the stick element.
			You give them colors or background images.
		Joystick(number id):
			id is the joystick identifier.
			Creates default squared base and stick div elements sizes of 200 and 100.
		Joystick(number id, baseSize [, stickSize]):
			id is the joystick identifier.
			Creates default squared base and stick div elements with provided sizes.
	 */
	var Joystick = function(/*...*/) {
		var baseSize, stickSize;
		var baseDiv, stickDiv;

		if (arguments.length === 3 && 
			typeof(arguments[0]) === 'number' &&
			arguments[1] instanceof HTMLDivElement &&
			arguments[2] instanceof HTMLDivElement) {
			
			this.id = arguments[0];
			baseDiv = arguments[1];
			stickDiv = arguments[2];

			if (!Joystick._isChildOf(baseDiv, stickDiv)) {
				baseDiv.appendChild(stickDiv);
			}
		} else {
			if (arguments.length === 1 && typeof(arguments[0]) === 'number') {
				this.id = arguments[0];
				
				baseSize = 200;
				stickSize = 100;
			} else if (arguments.length === 2 && typeof(argument[0]) === 'number' && 
												 typeof(arguments[1]) === 'number') {
				this.id = arguments[0];
				
				baseSize = arguments[1];
				stickSize = arguments[1]*0.5;
			} else if (arguments.length === 3 &&  typeof(arguments[0]) === 'number' &&
												  typeof(arguments[1]) === 'number' &&
											      typeof(arguments[2]) === 'number') {
				this.id = arguments[0];
				
				baseSize = arguments[1];
				stickSize = arguments[2];
			} else {
				return;
			}

			baseDiv = document.createElement('div');
			stickDiv = document.createElement('div');

			baseDiv.style.width = baseSize + 'px';
			baseDiv.style.height = baseSize + 'px';
			baseDiv.style.backgroundColor = '#FF0000';

			stickDiv.style.width = stickSize + 'px';
			stickDiv.style.height = stickSize + 'px';   
			stickDiv.style.backgroundColor = '#0000FF'; 
			
			baseDiv.appendChild(stickDiv);
		}    

		baseDiv.style.position = 'absolute';
		stickDiv.style.position = 'absolute'; 
		
		this.domElement = baseDiv;
		this._baseDiv = baseDiv;
		this._stickDiv = stickDiv;
		this._activeTouch = undefined;
	};

	Joystick.prototype.init = function() {
		if (this.domElement === undefined) {
			return false;
		}

		var self =  this;

		// mouse events
		this._baseDiv.addEventListener("mousedown", function(e) {
				self._down(e);
			}, false);

		window.addEventListener("mouseup", function(e) {
				self._up(e);
			}, false);

		window.addEventListener("mousemove", function(e) {
			self._move(e);
		}, false);


		// touch events
		this._baseDiv.addEventListener("touchstart", function(e) {        
			self._activeTouch = e.changedTouches[0].identifier;
			self._down(e.changedTouches[0]);
			e.preventDefault();
		}, false);

		var handleTouch = function(self, cb) {
			return function(e) {            
				for (var i = 0; i < e.changedTouches.length; ++i) {
					if (e.changedTouches[i].identifier === self._activeTouch) {
						cb.call(self, e.changedTouches[i]);                                    
						e.preventDefault();
						return;
					}
				}
			};
		}; 

		window.addEventListener("touchmove", handleTouch(self, self._move), false);
		window.addEventListener("touchend", handleTouch(self, self._up), false);
		window.addEventListener("touchcancel", handleTouch(self, self._up), false);

		this._baseWidth = this._baseDiv.clientWidth;
		this._baseHeight = this._baseDiv.clientHeight;
		this._halfBaseWidth = this._baseWidth*0.5;
		this._halfBaseHeight = this._baseHeight*0.5;
		var stickWidth = this._stickDiv.clientWidth;
		var stickHeight = this._stickDiv.clientHeight;

		this.stickCenterX = (this._baseWidth*0.5 - stickWidth*0.5);
		this.stickCenterY = (this._baseHeight*0.5 - stickHeight*0.5);

		this._stickDiv.style.top = '' + this.stickCenterX + 'px';
		this._stickDiv.style.left = '' + this.stickCenterY + 'px';

		this.state = Joystick.STATE_OFF;  
		this.hitX = 0;
		this.hitY = 0;  

		this.up_callback = function() {};
		this.down_callback = function() {};
		this.move_callback = function() {};
		
		return true;
	};

	Joystick.prototype._down = function(e) {
		if (this.state === Joystick.STATE_OFF) {
			this.state = Joystick.STATE_ON;
			this.hitX = e.pageX;
			this.hitY = e.pageY;

			this.down_callback();
		}
	};

	Joystick.prototype._up = function(e) {
		if (this.state === Joystick.STATE_ON) {
			this.state = Joystick.STATE_OFF;

			var stickStyle = this._stickDiv.style;
			stickStyle.left = '' + (this.stickCenterX) + 'px';
			stickStyle.top = '' + (this.stickCenterY) + 'px';
			this._reportData(0, 0);
			this.up_callback();
		}
	};

	Joystick.prototype._move = function(e) {
		if (this.state === Joystick.STATE_ON) {
			var dx = e.pageX - this.hitX;
			var dy = e.pageY - this.hitY;


			if (dx > this._halfBaseWidth) {
				dx = this._halfBaseWidth;
			} else if (dx < -this._halfBaseWidth) {
				dx = -this._halfBaseWidth;
			}

			if (dy > this._halfBaseHeight) {
				dy = this._halfBaseHeight;
			} else if (dy < -this._halfBaseHeight) {
				dy = -this._halfBaseHeight;
			}

			var stickStyle = this._stickDiv.style;
			stickStyle.left = (this.stickCenterX + dx) + 'px';
			stickStyle.top = (this.stickCenterY + dy) + 'px';

			dx /= this._halfBaseWidth;
			dy /= -this._halfBaseHeight;

			this._reportData(dx, dy);
			this.move_callback(dx, dy);
		  
		}
	};

	Joystick.prototype.ondown = function(callback) {
		this.down_callback = callback;
	};

	Joystick.prototype.onup = function(callback) {
		this.up_callback = callback;
	};

	Joystick.prototype.onmove = function(callback) {
		this.move_callback = callback;
	};

	Joystick._isChildOf = function(parent, child) {
		for (var i = 0; i < parent.children.length; ++i) {
			if (parent.children[i] === child) {
				return true;
			}
		}

		return false;
	};

	Joystick.prototype._reportData = function(dx, dy) {
		sendControllerInput(this.id, "joystick", {dx: dx, dy: dy});
		if (debug) {
			console.log(dx, dy);
		}
	};

	Joystick.STATE_OFF = 0;
	Joystick.STATE_ON = 1;
	
	//--------------------------------------------------------------------------------------------------------
	
	var exports = {
		userID: userID,
		setServer: setServer,
		startController: startController,
		disconnect: disconnect,
		sendCustomData: sendCustomData,
		handleData: handleData,
		sendPrivateData: sendPrivateData,
		handlePrivateData: handlePrivateData,
		Button: Button,
		Joystick: Joystick,
		activateGyroscope: activateGyroscope,
		disableGyroscope: disableGyroscope,
		activateAccelerometer: activateAccelerometer,
		disableAccelerometer: disableAccelerometer
	};
	
	return(exports);
})();
