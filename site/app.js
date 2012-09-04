/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , mcserver = require('mc-server');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  //app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


// home page
app.get('/', routes.index);

// evader
app.get('/evader', routes.evader);
app.get('/evader/controller', routes.evader.controller);

// documentation
app.get('/api', routes.api);
app.get('/gettingstarted', routes.gettingStarted);

// poker
app.get('/poker', routes.poker);
app.get('/poker/hand', routes.poker.hand);


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

mcserver.debug = true;

// Burgers server
mcserver.startServer(8081, function() {
  console.log("Burgers started on 8081");
});
