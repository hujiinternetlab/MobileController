define(['jquery', 'assets'], function($, assets) {
	var initialized = false;
	var hudDiv;
	var timeDiv;
	var livesDiv;



	var init = function(gameCanvas) {
		hudDiv = $("<div></div>");

		hudDiv.css('position', 'absolute').
			css('left', gameCanvas.offset().left).
			css('top', gameCanvas.offset().top).
			css('width', gameCanvas.width()).
			css('height', gameCanvas.height());

		timeDiv = $('<div></div>');
		timeDiv.css('position', 'absolute').
				css('right', 20).
				css('font-family', "'Racing Sans One', cursive").
				css('font-size', '80px').
				css('color', 'white').
				css('opacity', '0.5');
		hudDiv.append(timeDiv);

		livesDiv = $('<div></div>');
		livesDiv.css('position', 'absolute').
				 css('left', 20).
				 css('top', 28).
				 css('opacity', '0.5');
		hudDiv.append(livesDiv);

		$('#game_viewport').append(hudDiv);


		initialized = true;
	};


	var displayTime = function(timeMs) {
		if (!initialized) {
			return;
		}

		var miliSeconds = timeMs % 1000;
		timeMs = parseInt(timeMs*0.001);

		var seconds = timeMs % 60;
		seconds = seconds < 10 ? "0" + seconds : "" + seconds;
		timeMs = parseInt(timeMs/60);

		var minutes = timeMs % 60;
		minutes = minutes < 10 ? "0" + minutes : "" + minutes;
		timeMs = parseInt(timeMs/60);

		var hours = timeMs > 0 ? timeMs : "";

		timeDiv.text("" + minutes + ":" + seconds);
	};

	var displayLives = function(amount) {
		livesDiv.html('');

		var width = assets.lifeImage.width*0.75;
		var height = assets.lifeImage.height*0.75;		
		var src = assets.lifeImage.src;

		var spacing = 5;
		for (var i = 0; i < amount; ++i)
		{

			var lifeImage = new Image();
			lifeImage.src = src;
			var jLifeImage = $(lifeImage);

			jLifeImage.css('position', 'absolute').
					   css('width', width).
					   css('height', height).
					   css('left', i*(width + spacing));

			livesDiv.append(jLifeImage);
		}
		
	};


	return {
		init: init,
		hide: function() {
			if (initialized) {
				timeDiv.hide();
				livesDiv.hide();
			}
		},
		show: function() {
			if (initialized) {
				timeDiv.show();
				livesDiv.show();
			}
		},
		displayTime: displayTime,		
		displayLives: displayLives
	};
});