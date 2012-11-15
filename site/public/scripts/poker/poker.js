var savedRoomID;
var table;
var tickets = {};
var numOfPlayers = 8;
var smallBlind = 10;
var bigBlind = 20;
var buyIn = 200;
var setupTickets = 0;
var dChipPositions = {};
var controllerHandURL = window.location.host + "/poker/hand";
var serverIP = window.location.hostname;
var serverPort = 8081;
var startRoundSnd = new Audio("/Resources/startCoins.ogg");
var flipCardSnd = new Audio("/Resources/flipcard.ogg");

// --------------------------------------------------------------------------------------------------------
// ---------------------------------- Mobile Controller Setting -------------------------------------------
// --------------------------------------------------------------------------------------------------------

// handlers that are needed by the client to handle events and interactions between 
// the client, the server and the controllers
var connectHandlers = function() {
	var connect, 
		join, 
		disconnect, 
		disconnectEvent,
		recvTicketEventFunc,		
		msgEventFunc;
	
	// Connection handler which sets up the table for the players to connect with QR codes.
	// roomID - the room ID chosed for the new created room on the server
	connect = function (roomID) {
		// set a handler for when a controller disconnects from the game
		MCClient.handleUserDisconnection(disconnectEvent);
		savedRoomID = roomID;
		console.log("connected and got room id: " + roomID);
		table = new Table(numOfPlayers, smallBlind, bigBlind, buyIn);
		for (var i = 0; i < numOfPlayers; ++i) {
			MCClient.getTicket(savedRoomID, recvTicketEventFunc);
		}
	}

	// A join handler that accepts new users into the game and assigns them with a handler.
	// userID - the ID of the user that joined the game room
	join = function (userID) {
		// set a handler for inputs received by controllers
		MCClient.handleUserInput(msgEventFunc);
		console.log("user " + userID + " connected");
	}

	// Disconnection handler that reloads the page when a disconnection from the server occurs.
	disconnect = function (roomID) {
		window.location.reload();
	}
	
	// A disconnection handler for users who disconnect from the game.
	disconnectEvent = function (userID) {
		console.log("user " + userID + " disconnected");
		table.removePlayer(userID);
	}
	
	// Ticket handler which upon receiving a new uuid from the server, creates a QR code
	// on the screen which the a controller user can use to connect to the game.
	// uuid - a unique ID to give to a user so he could join the game room
	recvTicketEventFunc = function (uuid) {
		if (setupTickets !== -1) {
			tickets[uuid] = setupTickets;
			$("#qr" + setupTickets).html(MCClient.getQRCode(controllerHandURL + "?id=" + uuid, 2));
			++setupTickets;
		}
		if(setupTickets === numOfPlayers) {
			setupTickets = -1;
		}
	}

	// A handler for inputs received by user controllers.
	// inputEvent - data received by a controller
	msgEventFunc = function (inputEvent) {
		var action = inputEvent.data.action;
		var userID = inputEvent.userID;
		if (action === "joiningGame") {
			var data = inputEvent.data;
			if (data.uuid !== undefined && tickets[data.uuid] !== undefined) {
				table.addPlayer(tickets[data.uuid], userID, data.name, data.playerPic);
				if (tickets[data.uuid] >= 3 && tickets[data.uuid] <= 5) {
					$("#qr" + tickets[data.uuid]).html("<div class='statsDiv'><div class='lowerStats'><h4>" + data.name + "</h4><div id='money" + tickets[data.uuid] + "'>Money: $" + buyIn + "</div></div></div>");
				} else {
					$("#qr" + tickets[data.uuid]).html("<div class='statsDiv'><div class='upperStats'><h4>" + data.name + "</h4><div id='money" + tickets[data.uuid] + "'>Money: $" + buyIn + "</div></div></div>");
				}
				$("#qr" + tickets[data.uuid]).append("<img class='playerImage' id='playerImage" + tickets[data.uuid]  + "' src='Resources/" + data.playerPic + ".png' />");
				$("#qr" + tickets[data.uuid]).append("<div class='playerBetSum' id='playerBetSum" + tickets[data.uuid] + "'></div>");
				$("#qr" + tickets[data.uuid]).append("<div class='playerActionDiv' id='playerAction" + tickets[data.uuid] + "'></div>");
				$("#qr" + tickets[data.uuid]).append("<div class='playerCardCombination' id='cardCombination" + tickets[data.uuid] + "'></div>");
				$("#qr" + tickets[data.uuid]).append("<div class='playerCardsDiv' id='playerCards" + tickets[data.uuid] + "'></div>");
				delete tickets[data.uuid];
			}
		} else if (action === "check") {
			table.progress(userID, "check");
		}  else if (action === "fold") {
			table.progress(userID, "fold");
		} else if (action === "call") {
			table.progress(userID, "call");
		} else if (action === "allIn") {
			table.progress(userID, "allIn");
		} else if (action === "raise") {
			table.progress(userID, "raise", inputEvent.data.raise);
		}
	}
	
	return {
		connect: connect, 
		join: join, 
		disconnect: disconnect
	};
}();

// This function is called upon a click on the startPokerBtn button.
// It is used to set the settings of the game.
function startPoker() {
	$("#playersNumberSetting").removeClass('settingError');
	$("#smallBlindSetting").removeClass('settingError');
	$("#bigBlindSetting").removeClass('settingError');
	$("#buyInSetting").removeClass('settingError');
	numOfPlayers = parseInt($("#playersNumberSetting").val());
	if (numOfPlayers < 2 || numOfPlayers > 8) {
		$("#playersNumberSetting").addClass('settingError');
		return;
	}
	smallBlind = parseInt($("#smallBlindSetting").val());
	if (smallBlind < 0) {
		$("#smallBlindSetting").addClass('settingError');
		return;
	}
	bigBlind = parseInt($("#bigBlindSetting").val());
	if (bigBlind < 0 || bigBlind < smallBlind) {
		$("#bigBlindSetting").addClass('settingError');
		return;
	}
	buyIn = parseInt($("#buyInSetting").val());
	if (buyIn < 0) {
		$("#buyInSetting").addClass('settingError');
		return;
	}
	
	// set the server IP and port
	MCClient.setServer(serverIP, serverPort);
	// open a new room on the server for our Poker game
	MCClient.openRoom(connectHandlers.connect, connectHandlers.join, connectHandlers.disconnect, numOfPlayers);
	
	$("#settingDiv").hide();
	$("#settingCenterDiv").hide();
}

// --------------------------------------------------------------------------------------------------------
// ---------------------------------- Other game display functions ----------------------------------------
// --------------------------------------------------------------------------------------------------------

// Starts the game when the document is ready
 $(document).ready(function() {
	$("#startGameBtn").hide();
	MCClient.debug = true;
});

// Starts a new round of the poker game.
function startGameButton() {
	if(table != undefined) {
		table.startGame();
	}
}

// Sets the stage for the game:
// adds div tags of the QR codes and the cards on the table
function addDivs() {
	for (var i = 0; i < numOfPlayers; i++) {
		$("#pokerArea").append("<div id='qr" + i + "' class='qr'></div>");
	}
	for (var i = 0; i < 5; i++) {
		$("#pokerArea").append("<div id='cardDiv" + i + "' class='cardDiv'><img class='cardImg' id='cardImg" + i + "' src='/Resources/deck/back.gif' /></div>");
		var delta = 283 + i*82;
		$("#cardDiv" + i).css("left", delta + "px");
	}
	dChipPositions[0] = {right: 460, top: 300};
	dChipPositions[1] = {right: 260, top: 315};
	dChipPositions[2] = {right: 170, top: 410};
	dChipPositions[3] = {right: 250, top: 480};
	dChipPositions[4] = {right: 450, top: 500};
	dChipPositions[5] = {right: 650, top: 490};
	dChipPositions[6] = {right: 750, top: 420};
	dChipPositions[7] = {right: 670, top: 325};
	$("#dealerChip").hide();
}

// Shows one of the cards on the poker table
// cardNum - which card to flip
// cardName - the card image to show on the flipped card
function showCard(cardNum, cardName) {
	flipCardSnd.play();
	$("#cardImg" + cardNum).attr("src", "/Resources/deck/" + cardName + ".gif");
}

// Remove a player for the game and put a new QR code for a new player to join
// playerNum - the player to remove from the game
function removePlayerImage(playerNum) {
	MCClient.getTicket(savedRoomID, function(uuid) {
		tickets[uuid] = playerNum;
		$("#qr" + playerNum).html(MCClient.getQRCode(controllerHandURL + "?id=" + uuid, 2));
	});
}

// Highlight the player that it's his turn to play
// playerNum - the player to highlight
function chooseTurn(playerNum) {
	$("#playerImage" + playerNum).addClass('selectedPlayer');
	for(var i = 0; i < 8; i++) {
		if($("#playerImage" + i) !== undefined && i !== playerNum){
			$("#playerImage" + i).removeClass('selectedPlayer');
		}
	}
}

// Change the number next to the player indicating how much he bet on this round
// playerNum - the player to change his bet
function changePlayerBet(playerNum, bet) {
	if (parseInt(bet) === 0) {
		$("#playerBetSum" + playerNum).html("");
	}
	$("#playerBetSum" + playerNum).html("Bet: $" + bet);
}

// Chage the sum that appears on the pot
// newSum - the new sum to show
function changePot(newSum) {
	$("#potMoney").html("$" + newSum);
}

// Update the amount of money displayed that the player has
// playerNum - which player to update
// amount - the new amount of money for the player
function updateMoney(playerNum, amount) {
	$("#money" + playerNum).html("Money: $" + amount);
}

// Move the dealer chip to the next player around the table
// playerNum - the player to pass the dealer chip to
function moveDealerChip(playerNum) {
	if (!$("#dealerChip").is(":visible")) {
		$("#dealerChip").show();
	}
	$("#dealerChip").css("top", dChipPositions[playerNum].top + "px");
	$("#dealerChip").css("right", dChipPositions[playerNum].right + "px");
}

// Change the text of what action the player took this round
// playerNum - the player to change his text
// playerAction - the action text to display
function chooseAction(playerNum, playerAction) {
	$("#playerAction" + playerNum).html(playerAction);
	$("#playerAction" + playerNum).css("zIndex", 9999);
}

// Shows two cards on the player's image -
// used to show the cards at the end of a round
function showPlayerCards(playerNum, card1, card2) {
	$("#playerCards" + playerNum).html("<img class='playerCardImg' src='/Resources/deck/" + card1 + ".gif' /><img class='playerCardImg' src='/Resources/deck/" + card2 + ".gif' />");	
}

// Hide the cards that were displayed using the showPlayerCards function
function hidePlayerCards(playerNum) {
	$("#playerCards" + playerNum).html("");
}

// Changes the text above the player's cards
// (this is used to describe what combination the player got with his cards)
function changeCardsText (playerNum, cText) {
	if (cText === "") {
		$("#cardCombination" + playerNum).css("border", "0px solid #FFFFFF");
	} else {
		$("#cardCombination" + playerNum).css("border", "2px solid #FFFFFF");
	}
	$("#cardCombination" + playerNum).html(cText);
}

// Place the items in the center of the window upon resize
$(function() {
	$(window).bind('resize', function() {
		$('#pokerArea').css('position', 'absolute');
		$("#pokerArea").css("left", $('#content').offset().left);
		$("#pokerArea").css("top", $('#content').offset().top);

		$("#settingDiv").width(Math.max($('#content').width(), 960));
		$("#settingDiv").height(Math.max($('#content').height(), 830));
		$("#settingDiv").css('left', $('#pokerArea').offset().left);
		$("#settingDiv").css('top', $('#pokerArea').offset().top);

		$("#settingCenterDiv").css("left", Math.floor($('#pokerArea').width()/2) - Math.floor($("#settingCenterDiv").width()/2));
		$("#settingCenterDiv").css("top", Math.floor($('#pokerArea').height()/2) - Math.floor($("#settingCenterDiv").height()/2));
	}).trigger('resize');
});

// Places the items in the center of the window
window.onload = function() {
	$('#pokerArea').css('position', 'absolute');
	$("#pokerArea").css("left", $('#content').offset().left);
	$("#pokerArea").css("top", $('#content').offset().top);
	$('#content').css('height', $('#pokerArea').height());

	//$("#pokerArea").css("left", Math.floor($('#content').width()/2) - Math.floor($("#pokerArea").width()/2));
	$("#settingCenterDiv").css("left", Math.floor($('#content').width()/2) - Math.floor($("#settingCenterDiv").width()/2));
	$("#settingCenterDiv").css("top", Math.floor($('#content').height()/2) - Math.floor($("#settingCenterDiv").height()/2));
}
