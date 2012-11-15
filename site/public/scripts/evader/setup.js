define(['jquery', 'three', 'remotecontroller', 'hud'], 
	   function($, THREE, remotecontroller, hud) {
	var WIDTH = parseInt($(window).width()*0.8),
        HEIGHT = WIDTH/1.5,
        PAGE_WIDTH = $(document).width(),
        PAGE_HEIGHT = $(document).height();

    var BURGERS_SERVER = window.location.hostname,
    	BURGERS_PORT = 8081;

    // A renderer
    var renderer = new THREE.WebGLRenderer();
    
    renderer.setClearColorHex(0x000000, 0xff);
    renderer.setSize(WIDTH, HEIGHT);

    var container = $('#game_viewport');
    container.append(renderer.domElement);

    var startGame = function(level) {
    	level.init();

    	// Init and wait for mobile controller
		remotecontroller.init(level, BURGERS_SERVER, BURGERS_PORT, function() {
			hud.init($(renderer.domElement));
			level.activatePlayer();	
		});

		// also bind mouse and key events
		$(document).
			mousemove(
				function (e) {
					level.mousemove(e.pageX, e.pageY);
				}).
			mouseout(
				function(e) {
					level.mouseout();
				}
			).keyup(
				function(e) {
					level.keyup(e.keyCode);
				}
			).keydown(
				function(e) {
					level.keydown(e.keyCode);
				}
			).mouseup(
				function(e) {
					level.mouseup();
				}
			).mousedown(
				function(e) {
					level.mousedown();
				}
			);

	    var lastFrame = new Date().getTime();

	    // start animation loop
	    (function animloop(){
	        requestAnimationFrame(animloop);
	        var now = new Date().getTime();

	        // Update
	        level.update(now - lastFrame);
	        lastFrame = now;

	        // Draw
	        renderer.render(level.scene, level.camera);
	    })();

    };

    return {
    	WIDTH: WIDTH,
    	HEIGHT: HEIGHT,  
    	PAGE_WIDTH: PAGE_WIDTH,
    	PAGE_HEIGHT: PAGE_HEIGHT,
    	CONTAINER_WIDTH: $(renderer.domElement).width(),
    	CONTAINER_HEIGHT: $(renderer.domElement).height(),    	
    	renderer: renderer,    	
    	startGame: startGame
    };
});	