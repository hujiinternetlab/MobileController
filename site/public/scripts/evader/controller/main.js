var initController = function(serverName, serverPort, ticket) {
	window.scrollTo(0, 1);

	document.getElementById("debug").innerHTML = serverName + ":" + serverPort;
	
	console.log(ticket);

	MCController.setServer(serverName, serverPort);
	MCController.startController(function(error) {
		if (!error) {
			console.log("Connected");
			MCController.activateGyroscope(5);

			var j = new MCController.Joystick(0);
			var b = new MCController.Button(1);

			document.body.appendChild(j.domElement);		
			j.init();


			document.body.appendChild(b.domElement);
			b.onup(function() {
				b.domElement.style.backgroundColor = '#0000FF';
			});
			b.ondown(function () {
				b.domElement.style.backgroundColor = '#FF0000';
			});
			b.domElement.style.left = '400px';
			b.init();
		} else {
			console.log(error);
		}
	}, ticket);


	

	//window.addEventListener('orientationchange', function(e) {
	//	document.getElementById('debug').innerHTML += "changed ";
	//}, false);
};		