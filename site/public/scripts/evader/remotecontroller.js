define(['jquery', '../mc/mc-client'], function($, MCClient) {  
    var _level;
    var _roomID;
    var _userID;
    var _serverName;
    var _serverPort;
    var _joinCallback;  
    var _joined = false;
    var _lastScore;

    MCClient.debug = true;

    var init = function(level, serverName, serverPort, joinCallback) {
        _level = level;
        _serverName = serverName;
        _serverPort = serverPort;
        _joinCallback = joinCallback || function() {};

        MCClient.setServer(serverName, serverPort);
        MCClient.openRoom(connection, join, disconnect, 1);
    };

    var connection = function(roomID) {
        MCClient.handleUserDisconnection(userDisconnect);
        _roomID = roomID;
        console.log("connected and got room id: " + roomID);
        MCClient.getTicket(_roomID, ticket);
    }

    

    var ticket = function(uuid) {
        console.log(window.location.host + "/evader/controller?" + 
                        "ticket=" + uuid +
                        "&serverName=" + _serverName +
                        "&serverPort=" + _serverPort);
        var qrImage = $(MCClient.getQRCode(window.location.origin + "/evader/controller?" + 
                        "ticket=" + uuid +
                        "&serverName=" + _serverName +
                        "&serverPort=" + _serverPort));

        displayOverlay(qrImage);        
    };

    var join = function(userID) {
        _userID = userID;
        console.log("user " + userID + " connected");
        _joinCallback();
        hideOverlay();
        _joined = true;
        MCClient.handleUserInput(button, userID);
    }

    var userDisconnect = function(userID){
        console.log("user " + userID + " disconnected");
        MCClient.BroadcastData(savedroomid, {msg: "A broadcast from client: user " + userID + " disconnected"});
    }

    var disconnect = function() {
        console.log("Could not connected to server.");
    };

    var button = function(inputEvent){
        if (!_joined) {
            return;
        }
        
        if (inputEvent.msgType === "button") {
            if (inputEvent.data.pressed) {
                _level.mousedown();
            } else {
                _level.mouseup();
            }                   
        } else if (inputEvent.msgType === "gyroscope"){     
            _level.gyroscope(inputEvent.data.alpha, inputEvent.data.beta, inputEvent.data.gamma);
        } else if (inputEvent.msgType === "joystick"){
            _level.joystick(inputEvent.data.dx, inputEvent.data.dy);
        }
    };

    var createTitleDiv = function(gameCanvas) {
        var div = $('<div id="title-div"></div>');

        if (_lastScore)
        {
            _lastScore = parseInt(_lastScore/1000);
            var seconds = _lastScore % 60;
            seconds = seconds < 10 ? "0" + seconds : "" + seconds;
            _lastScore /= 60;

            var minutes = parseInt(_lastScore % 60);
            minutes = minutes < 10 ? "0" + minutes : "" + minutes;
            div.text("last score: " + minutes + ":" + seconds);
        }
        else
        {
            div.text("Space Evader");
        }

        div.css('position', 'absolute').
            css('top', gameCanvas.offset().top + 40).
            css('left', gameCanvas.offset().left).
            css('width', gameCanvas.width()).
            css('text-align', 'center').
            css('color', 'white').
            css('font-family', "'Racing Sans One', cursive").
            css('font-size', 80);

        return div;
    };

    var createIntructionDiv = function() {              
        var text = "Tilt your phone and move the joystick to evade the incoming asteroids.<br/>";        
        text += "For best experience lock your phone on landscape mode.<br/>";

        var div = $("<div></div>");        
        div.html(text);
        

        return div;
    };

    var displayOverlay = function(qrImage) {
        var gameViewport = $('#game_viewport');
        var gameCanvas = $('#game_viewport > canvas');
        var instructionDiv = createIntructionDiv();
        var titleDiv = createTitleDiv(gameCanvas);

        var overlayDiv = $('<div></div>');        

        gameViewport.append(overlayDiv).
                     append(titleDiv).
                     append(instructionDiv).
                     append(qrImage);                    

        var canvasTop = gameCanvas.offset().top;
        var canvasLeft = gameCanvas.offset().left;
        var canvasWidth = gameCanvas.width();
        var canvasHeight = gameCanvas.height();

        overlayDiv.css('position', 'absolute').
                   css('top', canvasTop).
                   css('left', canvasLeft).
                   css('width', canvasWidth).
                   css('height', canvasHeight).
                   css('background-color', '#FFFFFF').
                   css('opacity', '0.5').
                   attr('id', 'overlay');

        qrImage.css('position', 'absolute').
                css('top',  canvasTop + (canvasHeight - qrImage.height())*0.5).
                css('left', canvasLeft + (canvasWidth - qrImage.width())*0.5).
                css('opacity', '1').
                css('opacity', '0.5').
                attr('id', 'qr-image');

        instructionDiv.
                css('color', 'white').
                css('font-weight', 'regular').
                css('font-size', '20px').
                css('text-align', 'center').
                css('position', 'absolute').
                css('top', qrImage.offset().top + qrImage.height() + 40).
                css('left', canvasLeft + (canvasWidth - instructionDiv.width())*0.5).
                attr('id', 'instructions');
    };

    var hideOverlay = function() {
        $('#overlay').remove();
        $('#qr-image').remove();
        $('#instructions').remove();
        $('#title-div').remove();
    };

    return {
        init: init,
        displayOverlay: function() {
            MCClient.disconnectUser(_roomID, _userID);
            MCClient.getTicket(_roomID, ticket);
        },
        hideOverlay: hideOverlay,
        setLastScore: function(lastScore) {
            _lastScore = lastScore;
        }
    };
});