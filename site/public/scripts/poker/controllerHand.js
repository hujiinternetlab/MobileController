var ticketUUID = getParameter("id");
var playerName = "", playerImage = 1, lastRaise = 0, lastBet = 0, yourBet = 0, yourTitle = "";
var lastFontSize = 10;
var playerMoney = 0;
var coinSound = new Audio("/Resources/coins.ogg");
var foldSound = new Audio("/Resources/fold.ogg");
var checkSound = new Audio("/Resources/check.ogg");
var serverIP = window.location.hostname;
var serverPort = 8081;

// --------------------------------------------------------------------------------------------------------
// ---------------------------------- Mobile Controller Setting -------------------------------------------
// --------------------------------------------------------------------------------------------------------

// handlers that are needed by the controller to handle events and interactions between 
// the client, the server and other controllers
var connectHandlers = function() {
	var joinFunc, dataReceive;

	// builds the first screen of the controller after a connection has
	// been established with the server
	joinFunc = function (errMsg){
		if (!errMsg){
			MCController.handleData(dataReceive);
			$('#startBtn').on('touchend', enterTheGame);
		} else {
			$("#errorMsg").html("There was an error connection to the game: " + errMsg);
		}
	}
	
	// receive data from the game client
	dataReceive = function (dataEvent){
		if (dataEvent.action === "deal") {
			$("#card1").attr("src", "/Resources/deck/" + dataEvent.cards[0] + ".gif");
			$("#card2").attr("src", "/Resources/deck/" + dataEvent.cards[1] + ".gif");
		} else if (dataEvent.action === "turn") {
			turnEvent(dataEvent);
		} else if (dataEvent.action === "out") { 
			$("#caption").html(playerName + ", you are out of money!");
		} else if (dataEvent.action === "winner") {
			playerMoney = playerMoney + parseInt(dataEvent.money);
			$("#caption").html(playerName + ", you are the winner!<br />You won $" + dataEvent.money);
		} else if (dataEvent.action === "loser") {
			$("#caption").html(playerName + ", you lost this round...");
		} else if (dataEvent.action === "buyIn") {
			playerMoney = parseInt(dataEvent.money);
			$("#caption").html(playerName + ", you have $" + playerMoney);
		} else if (dataEvent.action === "small") {
			playerMoney = playerMoney - parseInt(dataEvent.smallBlind);
			yourTitle = " (Small blind)";
			$("#caption").html(playerName + ", you have $" + playerMoney + yourTitle);
		} else if (dataEvent.action === "big") {
			playerMoney = playerMoney - parseInt(dataEvent.bigBlind);
			yourTitle = " (Big blind)";
			$("#caption").html(playerName + ", you have $" + playerMoney + yourTitle);
		} else if (dataEvent.action === "dealer") {
			yourTitle = " (Dealer)";
			$("#caption").html(playerName + ", you have $" + playerMoney + yourTitle);
		}
	}
	
	return {joinFunc: joinFunc};
}();

// connect to the server when the document is ready
 $(document).ready(function() {
	MCController.setServer(serverIP, serverPort);
	MCController.startController(connectHandlers.joinFunc, ticketUUID);
	$('#pImage1')[0].style.borderColor = "yellow";
	$('#pImage1')[0].style.borderWidth = "5px";
 });

// --------------------------------------------------------------------------------------------------------
// ---------------------------------- Other game display functions ----------------------------------------
// -------------------------------------------------------------------------------------------------------- 
 
// this function is used to keep the font size of the text correct after
// screen resize (aka flipping the phone)
$(function() {
	$(window).bind('resize', function() {
		var preferredHeight = 50;
		var displayHeight;
		if ($(window).height() < $(window).width()) {
			displayHeight = $(window).height();
		} else {
			displayHeight = $(window).width();
		}
		var percentage = displayHeight / preferredHeight;
		var newFontSize = Math.floor(5 * percentage) - 1;
		$("#nameInputDiv").css("font-size", newFontSize);
		$("#nameInput").css("font-size", newFontSize);
		$("#startBtn").css("font-size", newFontSize);
		$("#errorMsg").css("font-size", Math.floor(newFontSize/2));
		$("#caption").css("font-size", newFontSize);
		$(".gameButton").css("font-size", Math.floor(newFontSize/1.3));
		$("#raiseInput").css("font-size", Math.floor(newFontSize/1.3));
		lastFontSize = newFontSize;
		
	}).trigger('resize');
});

// loads the game screen after the player chooses his name and profile picture
function enterTheGame(event) {
	playerName = $('#nameInput').val();
	if (playerName === "") { // make sure the user has chosed a name
		$("#errorMsg").html("You still need a name!");
		return;
	} else {
		// build the game screen
		$("#errorMsg").html("");
		MCController.sendCustomData({action: "joiningGame", name : playerName, playerPic: playerImage, uuid : ticketUUID});
		$("#chooserDiv").remove();
		$("#caption").html(playerName);
		$("#cardsArea").html("<img src='/Resources/deck/back.gif' class='card' id='card1' /><img src='/Resources/deck/back.gif' class='card' id='card2'>");
		$("#buttonsArea").html("<button class='gameButton' id='checkBtn'>Check</button>");
		$("#buttonsArea").append("<button class='gameButton' id='callBtn'>Call</button>");
		$("#buttonsArea").append("<button class='gameButton' id='foldBtn'>Fold</button><br />");
		$("#buttonsArea").append("<button class='gameButton' id='raiseBtn'>Raise</button>");
		$("#buttonsArea").append("<input type='number' id='raiseInput' value='0' />");
		$("#buttonsArea").append("<button class='gameButton' id='allinBtn'>All in</button>");
		$(".gameButton").css("font-size", Math.floor(lastFontSize/1.3));
		$("#raiseInput").css("font-size", Math.floor(lastFontSize/1.3));
		$("#raiseInput").change(function() {
			var raiseAmount = parseInt($("#raiseInput").val());
			if (raiseAmount > (playerMoney - (lastBet - yourBet))) {
				$("#raiseInput").val(playerMoney - (lastBet - yourBet));
			} else if (raiseAmount < lastRaise) {
				$("#raiseInput").val(lastRaise);
			} else {
				$("#raiseInput").val(Math.floor(raiseAmount));	
			}
		});
		$("#raiseInput").on('touchstart', raiseInputTouch);
		$("#allinBtn").on('touchend', allinBtnTouch);
		$("#checkBtn").on('touchend', checkBtnTouch);
		$("#foldBtn").on('touchend', foldBtnTouch);
		$("#callBtn").on('touchend', callBtnTouch);
		$("#raiseBtn").on('touchend', raiseBtnTouch);
		disableButtons();
	}	
}

// The All-in button touch handler
function allinBtnTouch(event) {
	$("#raiseInput").val(playerMoney - lastBet);
	playerMoney = 0;
	disableButtons();
	MCController.sendCustomData({action: "allIn"});
	coinSound.play();
}

// The Check button touch handler
function checkBtnTouch(event) {
	disableButtons();
	MCController.sendCustomData({action: "check"});
	checkSound.play();
}

// The Fold button touch handler
function foldBtnTouch(event) {
	disableButtons();
	$("#caption").html("FOLD");
	MCController.sendCustomData({action: "fold"});
	foldSound.play();
}

// The Call button touch handler
function callBtnTouch(event) {
	playerMoney = playerMoney - (lastBet - yourBet);
	disableButtons();
	MCController.sendCustomData({action: "call"});
	coinSound.play();
}

// The Raise input touch handler
function raiseInputTouch(event) {
	$("#raiseInput").val("");	
}

// The Raise button touch handler
function raiseBtnTouch(event) {
	var raiseAmount = parseInt($("#raiseInput").val()); 
	if (raiseAmount > 0 && raiseAmount >= lastRaise && raiseAmount <= (playerMoney - (lastBet - yourBet))){
		playerMoney = playerMoney - (lastBet - yourBet) - raiseAmount;
		disableButtons();
		MCController.sendCustomData({action: "raise", raise: raiseAmount});
		coinSound.play();
	} else {
		$("#raiseInput").css("border-color", "#FF0000");
	}
}

// this function is used to select the one of the images for the player
// imageId - which picture is selected
function imgChoose(imageId) {
	playerImage = imageId;
	$('#pImage' + imageId)[0].style.borderColor = "yellow";
	$('#pImage' + imageId)[0].style.borderWidth = "5px";
	for (var i = 1; i <= 3; i++) {
		if (i !== imageId) {
			$('#pImage' + i)[0].style.borderColor = "black";
			$('#pImage' + i)[0].style.borderWidth = "2px";
		}
	}
}

// disables all buttons for the player
function disableButtons() {
	$("#checkBtn").attr("disabled", true);
	$("#callBtn").attr("disabled", true);
	$("#foldBtn").attr("disabled", true);
	$("#raiseBtn").attr("disabled", true);
	$("#allinBtn").attr("disabled", true);
	$("#raiseInput").attr("disabled", true);
	$("#checkBtn").unbind('touchend', checkBtnTouch);
	$("#callBtn").unbind('touchend', callBtnTouch);
	$("#foldBtn").unbind('touchend', foldBtnTouch);
	$("#raiseBtn").unbind('touchend', raiseBtnTouch);
	$("#allinBtn").unbind('touchend', allinBtnTouch);
	$("#raiseInput").unbind('touchstart', raiseInputTouch);
	$("#raiseInput").css("border-color", "#000000");
	$("#caption").html(playerName + ", you have $" + playerMoney + yourTitle);
}

// this function, upon a new turn, decides which buttons to enable for the player
function turnEvent(dataEvent) {
	lastRaise = dataEvent.lastRaise;
	lastBet = dataEvent.lastBet; 
	yourBet = dataEvent.yourBet;
	if (playerMoney === 0) {
		MCController.sendCustomData({action: "check"});
	} else if (lastBet === yourBet) {
		$("#checkBtn").attr("disabled", false);
		$("#checkBtn").on('touchend', checkBtnTouch);
		$("#foldBtn").attr("disabled", false);
		$("#foldBtn").on('touchend', foldBtnTouch);
		$("#raiseBtn").attr("disabled", false);
		$("#raiseBtn").on('touchend', raiseBtnTouch);
		$("#allinBtn").attr("disabled", false);
		$("#allinBtn").on('touchend', allinBtnTouch);
		$("#raiseInput").val(lastRaise);
		$("#raiseInput").attr("disabled", false);
		$("#raiseInput").on('touchstart', raiseInputTouch);
	} else if ((lastBet - yourBet) >= playerMoney) {
		$("#callBtn").attr("disabled", false);
		$("#callBtn").on('touchend', callBtnTouch);
		$("#foldBtn").attr("disabled", false);
		$("#foldBtn").on('touchend', foldBtnTouch);
		$("#allinBtn").attr("disabled", false);
		$("#allinBtn").on('touchend', allinBtnTouch);
		$("#raiseInput").val(playerMoney);
		$("#raiseInput").on('touchstart', raiseInputTouch);
	} else {
		$("#callBtn").attr("disabled", false);
		$("#callBtn").on('touchend', callBtnTouch);
		$("#foldBtn").attr("disabled", false);
		$("#foldBtn").on('touchend', foldBtnTouch);
		$("#raiseBtn").attr("disabled", false);
		$("#raiseBtn").on('touchend', raiseBtnTouch);
		$("#allinBtn").attr("disabled", false);
		$("#allinBtn").on('touchend', allinBtnTouch);
		$("#raiseInput").val(lastRaise);
		$("#raiseInput").attr("disabled", false);
		$("#raiseInput").on('touchstart', raiseInputTouch);
	}
}

// this function is used to get the uuid from the url line 
function getParameter(name) {
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	if (results === null) {
		return "";
	} else {
		return results[1];
	}
}