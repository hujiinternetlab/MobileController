var loadImages = function(imagesLoaded) {
	var count = 0;
	var NUM_IMAGES = 3;
	var images = {};

	var dispatch = function() {
		count += 1;
    	if (count === NUM_IMAGES) {
    		imagesLoaded(images);    		
    	}
	};

	// button set
    images.buttonSet = new Image();
    images.buttonSet.src = "/images/button_set.png";
    images.buttonSet.addEventListener('load', dispatch, false);

    // joystick base
    images.joyBase = new Image();
    images.joyBase.src = "/images/joy_base.png";
    images.joyBase.addEventListener('load', dispatch, false);

    // joystick head
    images.joyHead = new Image();
    images.joyHead.src = "/images/joy_head.png";
    images.joyHead.addEventListener('load', dispatch, false);
};


var initController = function(serverName, serverPort, ticket) {
	window.scrollTo(0, 1);

	//document.getElementById("debug").innerHTML = serverName + ":" + serverPort;

	var images;

	console.log(ticket);

	MCController.setServer(serverName, serverPort);

	var startControllerCb = function(error) {
		if (!error) {
			console.log("Connected");
			MCController.activateGyroscope(5);

			// button div
			var buttonDiv = document.createElement('div');
			buttonDiv.style.width = 100 + 'px';
			buttonDiv.style.height = 100 + 'px';
			buttonDiv.style.backgroundImage = 'url("' + images.buttonSet.src + '")';
			buttonDiv.style.backgroundRepeat = 'no-repeat';
			buttonDiv.style.backgroundPosition = '-100px 0';

			// joystick base div
			var joyBaseDiv = document.createElement('div');
			joyBaseDiv.style.width = 200 + 'px';
			joyBaseDiv.style.height = 200 + 'px';
			joyBaseDiv.style.zIndex = '0';
			joyBaseDiv.style.backgroundImage = 'url("' + images.joyBase.src + '")';
			joyBaseDiv.style.backgroundRepeat = 'no-repeat';			

			// joystick head div
			var joyHeadDiv = document.createElement('div');
			joyHeadDiv.style.width = 100 + 'px';
			joyHeadDiv.style.height = 100 + 'px';
			joyHeadDiv.style.zIndex = '10';
			joyHeadDiv.style.backgroundImage = 'url("' + images.joyHead.src + '")';
			joyHeadDiv.style.backgroundRepeat = 'no-repeat';

			var j = new MCController.Joystick(0, joyBaseDiv, joyHeadDiv);
			var b = new MCController.Button(1, buttonDiv);

			document.body.appendChild(j.domElement);		
			j.init();


			document.body.appendChild(b.domElement);
			b.onup(function() {
				b.domElement.style.backgroundPosition = '-100px 0';
			});
			b.ondown(function () {
				b.domElement.style.backgroundPosition = '0 0';
			});
			b.domElement.style.left = '400px';
			b.init();
		} else {
			console.log(error);
		}
	};


	loadImages(function(loadedImages) {
		images = loadedImages;
		MCController.startController(startControllerCb, ticket);
	});


	

	//window.addEventListener('orientationchange', function(e) {
	//	document.getElementById('debug').innerHTML += "changed ";
	//}, false);
};