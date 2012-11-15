define(['three', 'setup', 'hud', 'player', 'bv', 'rock', 'starfield', 'effects', 'laser', 'pool', 'remotecontroller'], 
       function(THREE, setup, hud, player, bv, rock, starfield, effects, laser, pool, rc) {

    var exports = {};

    // Level setup
    var LEVEL_HEIGHT = 1000,
        LEVEL_WIDTH = 2000,
        LEVEL_DEPTH = 3000,
        ROCK_RELEASE_INTERVAL = 500,
        MAX_ROCKS = 50,
        BLINK_DURATION = 3000,
        MAX_LIVES = 3;

    // State enumeration
    var STATE_STANDBY = 3,
        STATE_PLAY = 0,
        STATE_HIT = 1,
        STATE_BLINK = 2;

    var state = STATE_STANDBY;


    var blinkTime = 0;
    var lastScoreTime;
    var scoreTime = 0;
    var lives = MAX_LIVES;

    var levelMaxPoint = new THREE.Vector3(LEVEL_WIDTH/2, LEVEL_HEIGHT/2, LEVEL_DEPTH/2);
    var levelMinPoint = new THREE.Vector3(-LEVEL_WIDTH/2, -LEVEL_HEIGHT/2, -LEVEL_DEPTH/2);
    var levelAABB = new bv.AABB(levelMinPoint, levelMaxPoint);
    
    var rockReleaseTime = 0;    

    // Camera light
    var pointLight;

    // Scene
    var scene;

    // Star Field   
    var starField1;
    var starField2;

    // Camera   
    var camera;

    // Player
    var playerObject;
    
    // Lasers
    var laserPool = new pool.Pool(laser.Laser);
    var lasers = [];

    var addLaser = (function() {
        var start = new THREE.Vector3();
        var dir = new THREE.Vector3();

        return function() {
            var playerPos = playerObject.mesh.position;
            var playerRotation = playerObject.mesh.matrixWorld;

            start.set(playerPos.x, playerPos.y, playerPos.z);
            dir.set(0, 0, -1);
            playerRotation.rotateAxis(dir);

            var newLaser = laserPool.getNew(levelAABB, start, dir, 50, 0x00FF00, removeLaser);
            lasers.push(newLaser);
            scene.add(newLaser.line);
        };        
    })();

    var removeLaser = function(laser) {                
        for (var i = 0; i < lasers.length; ++i) {
            if (lasers[i] === laser) {
                lasers.splice(i, 1);
                laserPool.dispose(laser);
                scene.remove(laser.line);
                return;
            }
        }        
    };

    // Player explosion
    var playerExplosion;
    var addPlayerExplosion = function() {
        state = STATE_HIT;
        var pos = playerObject.mesh.position;
        playerExplosion = new effects.Explosion(new THREE.Vector3(pos.x, pos.y, pos.z), 30, 3000, 0xFF0000, 20, 
                                                removePlayerExplosion);
        scene.add(playerExplosion.particleSystem);
        scene.remove(playerObject.mesh);
    };

    var removePlayerExplosion = function() {        
        playerObject.blinking = true;
        scene.remove(playerExplosion.particleSystem);
        scene.add(playerObject.mesh);
        playerExplosion = undefined;
        state = STATE_BLINK;
    };

    // Rocks
    var rockPool = new pool.Pool(rock.Rock);    
    var rocks = [];

    var addRockFromSpace = (function() {
        var startPosition = new THREE.Vector3();
        var directionVector = new THREE.Vector3();

        var randomDirectionVector = function() {
            var startX = levelMinPoint.x + Math.random()*(levelMaxPoint.x - levelMinPoint.x);
            var startY = levelMinPoint.y + Math.random()*(levelMaxPoint.y - levelMinPoint.y);

            var endX = playerObject.mesh.position.x - LEVEL_WIDTH/2 + Math.random()*(levelMaxPoint.x - levelMinPoint.x);
            var endY = 0;

            var startZ = levelMinPoint.z;
            var endZ = levelMaxPoint.z - player.Player.DISTANCE_FROM_EDGE;

            directionVector.set(endX - startX, endY - startY, endZ - startZ);       
            directionVector.normalize();

            startPosition.set(startX, startY, startZ);
        };

        return function() {
            var size = 10 + Math.random() * 9;
            var speed = 4 + Math.random() * 2;

            randomDirectionVector();

            var newRock = rockPool.getNew(startPosition, directionVector, size, speed, levelAABB, removeRock);
            rocks.push(newRock);        
            scene.add(newRock.mesh);
        };        
    })();

    var addRockFromCollision = (function() {
        var startPosition = new THREE.Vector3();
        var directionVector1 = new THREE.Vector3();
        var directionVector2 = new THREE.Vector3();
        var up = new THREE.Vector3(0, 1, 0);

        var randomDirectionVector = function() {
            var a = Math.random()*Math.PI;
            var b = Math.PI*0.25 + (Math.random()*Math.PI*0.5);
            var cosa = Math.cos(a);
            var sina = Math.sin(a);
            var cosb = Math.cos(b);
            var sinb = Math.sin(b);

            directionVector1.set(cosa*sinb, cosb, sina*sinb);
            directionVector2.cross(up, directionVector1);
        };

        return function(rock) {
            if (rocks.size < 10) {
                return;
            }

            var size = rock.size * 0.5;
            var speed = rock.velocityVector.length();
            var sx = rock.mesh.position.x, sy = rock.mesh.position.y, sz = rock.mesh.position.z;

            randomDirectionVector();

            startPosition.set(sx + rock.radius*directionVector1.x, 
                              sy + rock.radius*directionVector1.y, 
                              sz + rock.radius*directionVector1.z);
            var newRock0 = rockPool.getNew(startPosition, directionVector1, size, speed, levelAABB, removeRock);
            rocks.push(newRock0);        
            scene.add(newRock0.mesh);


            directionVector1.negate();
            startPosition.set(sx + rock.radius*directionVector1.x, 
                              sy + rock.radius*directionVector1.y, 
                              sz + rock.radius*directionVector1.z);              
            var newRock1 = rockPool.getNew(startPosition, directionVector1, size, speed, levelAABB, removeRock);
            rocks.push(newRock1);        
            scene.add(newRock1.mesh);

            startPosition.set(sx + rock.radius*directionVector2.x, 
                              sy + rock.radius*directionVector2.y, 
                              sz + rock.radius*directionVector2.z);              
            var newRock2 = rockPool.getNew(startPosition, directionVector2, size, speed, levelAABB, removeRock);
            rocks.push(newRock2);        
            scene.add(newRock2.mesh);

            directionVector2.negate();
            startPosition.set(sx + rock.radius*directionVector2.x, 
                              sy + rock.radius*directionVector2.y, 
                              sz + rock.radius*directionVector2.z);              
            var newRock3 = rockPool.getNew(startPosition, directionVector2, size, speed, levelAABB, removeRock);
            rocks.push(newRock3);        
            scene.add(newRock3.mesh);
        };        
    })();

    var removeRock = function(rock) {
        var i;
        for (i = 0; i < rocks.length; ++i) {
            if (rocks[i] === rock) {
                rocks.splice(i, 1);
                rockPool.dispose(rock);
                scene.remove(rock.mesh);
                return;
            }
        }
    };

   

    var updateCamera = function(deltaTime) {
        var dfe = player.Player.DISTANCE_FROM_EDGE;
        var diffX = playerObject.mesh.position.x - camera.position.x;
        diffX *= deltaTime/500;

        var cameraPos = camera.position;        
        if (cameraPos.x + diffX > levelMinPoint.x + 2*dfe && camera.position.x  + diffX < levelMaxPoint.x - 2*dfe) {
            camera.position.x += diffX;
        }
        var playerPos = playerObject.mesh.position;
        var lookAtPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z - 350);
        camera.lookAt(lookAtPos); 
    };

    
    // Event callbacks
    exports.keyup = function(keyCode) {
        playerObject.keyup(keyCode);
    };

    exports.keydown = function(keyCode) {
        playerObject.keydown(keyCode);
    };

    exports.mouseout = function() {
        playerObject.mouseout();
    };

    exports.mousemove = function(x, y) {
        playerObject.mousemove(x, y);
    };

    exports.mouseup = function() {
    };

    exports.mouseout = function() {

    };

    exports.mousedown = function() {
        if (state === STATE_PLAY || state === STATE_BLINK) {
            addLaser();            
        }
    };

    exports.gyroscope = function(alpha, beta, gamma) {
        playerObject.gyroscope(alpha, beta, gamma);
    };

    exports.joystick = function(dx, dy) {
        playerObject.joystick(dx, dy);
    };

    exports.update = function(deltaTime) {
        var i, j, len;    

        if (state === STATE_BLINK) {            
            if (blinkTime >= BLINK_DURATION) {                
                playerObject.blinking = false;
                blinkTime = 0;
                state = STATE_PLAY;
            } else {
                blinkTime += deltaTime;                
            }
        }

        if (state !== STATE_HIT && state !== STATE_STANDBY) {
            hud.displayTime(scoreTime);
            playerObject.update(deltaTime);   
            scoreTime += deltaTime; 
        }       

        rockReleaseTime += deltaTime;
        if (rocks.length < MAX_ROCKS && rockReleaseTime >= ROCK_RELEASE_INTERVAL) {
            rockReleaseTime = 0;
            addRockFromSpace();
        }

        // check rock collision        
        for (i = 0; i < rocks.length; ++i) {
            for (j = i + 1; j < rocks.length; ++j) {
                rocks[i].checkRockCollision(rocks[j]);
            }

            for (j = 0; j < lasers.length; ++j) {
                if (rocks[i].checkLaserCollision(lasers[j])) {                    
                    addRockFromCollision(rocks[i]);                                        
                    scene.remove(rocks[i].mesh);
                    rocks.splice(i, 1);
                }
            }

            if (state === STATE_PLAY) {
                if (playerObject.checkRockCollision(rocks[i])) {                                      
                    addPlayerExplosion();
                    lives -= 1;
                    hud.displayLives(lives);
                    if (lives === 0)
                    {
                        deactivatePlayer();
                    }
                }
            } 
        } 

        // update rocks
        for (i = 0; i < rocks.length; ++i) {
            rocks[i].update(deltaTime);             
        }

        // update lasers
        for (i = 0; i < lasers.length; ++i) {
            lasers[i].update(deltaTime);
        }

        updateCamera(deltaTime);

        starField1.update(deltaTime);
        starField2.update(deltaTime);

        if (state === STATE_HIT) {
             playerExplosion.update(deltaTime);
        }               
    };

    var deactivatePlayer = function() {
        scene.remove(playerObject.mesh);
        playerObject = new player.DummyPlayer(levelAABB);
        scene.add(playerObject.mesh);

        if (addPlayerExplosion) {
            removePlayerExplosion();    
        }
        

        state = STATE_STANDBY;

        rc.displayOverlay();
        hud.hide();

        rc.setLastScore(scoreTime);
        scoreTime = 0;
        lives = MAX_LIVES;
    };

    exports.activatePlayer = function() {
        scene.remove(playerObject.mesh);
        playerObject = new player.Player(levelAABB);
        scene.add(playerObject.mesh);

        state = STATE_BLINK;
        playerObject.blinking = true;

        hud.show();
        hud.displayLives(lives);
    };

    exports.init = function() {
        // Player
        playerObject = new player.DummyPlayer(levelAABB);

        // Starfield
        starField1 = new starfield.StarField(levelAABB, 500, levelMinPoint.y, 0xAAAAAA, 0.05);
        starField2 = new starfield.StarField(levelAABB, 500, levelMinPoint.y, 0xFFFFFF, 0.1);

        // Camera   
        camera = new THREE.PerspectiveCamera(45, setup.WIDTH/setup.HEIGHT, 0.1, 10000);
        camera.position.y = 300;
        camera.position.z = levelMaxPoint.z;

         // Camera light
        pointLight = new THREE.PointLight(0xFFFFFF);
        camera.add(pointLight);

        // Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x000000, 0.1, 2500);

        //scene.add(pointLight);    
        scene.add(camera);
        scene.add(starField1.particleSystem);
        scene.add(starField2.particleSystem);
        scene.add(playerObject.mesh);    

        exports.scene = scene;
        exports.camera = camera;
    };

    return exports;
});