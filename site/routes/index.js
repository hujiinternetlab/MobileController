	
/*
 * GET home page.
 */

var api = require("./api");

var titlePrefix = 'Mobile Controller';

exports.index = function(req, res) {
  	res.render('index', { layout: false, title: titlePrefix });
};

exports.api = function(req, res) {
	res.render('api', { 
		layout: false, 
		title: titlePrefix + ' - API'
	});
};

exports.gettingStarted = function(req, res) {
	res.render('getting_started', {
		layout: false,
		title: titlePrefix + ' - Getting Started Guide'
	});
};


// evader
exports.evader = function(req, res) {
	res.render('evader/evader', { layout: false, title: titlePrefix + ' - Space Evader'});
};

exports.evader.controller = function(req, res) {
	res.render('evader/controller', { 
		layout: false, 
		title: titlePrefix + ' - Evader Controller', 
		ticket: req.query['ticket'],
		serverName: req.query['serverName'],
		serverPort: req.query['serverPort']
	});
};


// poker
exports.poker = function(req, res) {
	res.render('poker/poker', {layout: false, title: titlePrefix + ' - Poker'});
};

exports.poker.hand = function(req, res) {
	res.render('poker/hand', {layout: false, title: titlePrefix + ' - Poker Controller'});
};


