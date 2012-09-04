define(['three', 'setup', 'assets', 'bv', 'effects'], 
	   function(THREE, setup, assets, bv, effects) {

	var DISTANCE_FROM_EDGE = 400;
	var RIGHT_KEY = 68; // 'D'
	var LEFT_KEY = 65; // 'A'
	var UP_KEY = 87; // 'W'
	var DOWN_KEY = 83; // 'A'
	var RIGHT_KEY_DOWN_BIT = 0x1;
	var LEFT_KEY_DOWN_BIT = 0x2;
	var UP_KEY_DOWN_BIT = 0x4;
	var DOWN_KEY_DOWN_BIT = 0x8;
	var MOUSE_DOWN_BIT = 0x10;
	var JOYSTICK_ACTIVE_BIT = 0x20;	
	var SCALE_GEOMETRY = 4;
	var BLINK_INTERVAL = 100;

	var Player = function(levelAABB) {		
		var material = new THREE.MeshPhongMaterial({
			color: 0xFF0000,
			specular: 0xFFFFFF
		});
		var geometry = assets.halalitGeometry;		

		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.doubleSided = true;
		this.mesh.scale.multiplyScalar(SCALE_GEOMETRY);
		this.mesh.position.z = levelAABB.maxPoint.z - DISTANCE_FROM_EDGE;
		// make player visible
		var materials = this.mesh.geometry.materials;
		for (var i = 0, len = materials.length; i < len; ++i) {
			materials[i].opacity = 1;
			materials[i].transparent = false;
		}			

		this.levelAABB = levelAABB;

		this._dt = 0;
		this._off = false;
		this.blinking = false;
		this.keyState = 0;
		this.roll = 0;
		this.pitch = 0;
		this.slide = 0;
		this.surf = 0;

		// Oriented Box
		var OBMin = new THREE.Vector3(geometry.boundingBox.min.x*SCALE_GEOMETRY,
									  geometry.boundingBox.min.y*SCALE_GEOMETRY,
									  geometry.boundingBox.min.z*SCALE_GEOMETRY);
		var OBMax = new THREE.Vector3(geometry.boundingBox.max.x*SCALE_GEOMETRY,
									  geometry.boundingBox.max.y*SCALE_GEOMETRY,
									  geometry.boundingBox.max.z*SCALE_GEOMETRY);
		this.OB = new bv.OB(OBMin, OBMax);
		this.OB.translate(this.mesh.position);

		// Thrust 1
		this.thrust1 = new effects.Thrust(new THREE.Vector3(0, 0, 1), 50, 0.1, 0xFFAA00);
		this.thrust1.particleSystem.position.z = 4;
		this.thrust1.particleSystem.position.x = -6.5;
		this.mesh.add(this.thrust1.particleSystem);

		// Thrust 2
		this.thrust2 = new effects.Thrust(new THREE.Vector3(0, 0, 1), 50, 0.1, 0xFFAA00);
		this.thrust2.particleSystem.position.z = 4;
		this.thrust2.particleSystem.position.x = 6.5;
		this.mesh.add(this.thrust2.particleSystem);

		this._thrustsOpacity = this.thrust1.particleSystem.material.opacity;
	};
	

	var HALF_PI = Math.PI*0.5;
	var TENTH_PI = Math.PI*0.1;

	Player.prototype.mousemove = function(x, y) {
		 this.roll = -Math.PI*(2*x/setup.PAGE_WIDTH - 1);	
		 this.pitch = Math.PI*(2*y/setup.PAGE_HEIGHT - 1);		 

		 if (this.roll < -HALF_PI + 0.3) {
		 	this.roll = -HALF_PI + 0.3;
		 }
		 if (this.roll > HALF_PI - 0.3) {
		 	this.roll = HALF_PI - 0.3;
		 }

		 if (this.pitch < -TENTH_PI) {
		 	this.pitch = -TENTH_PI;
		 }
		 if (this.pitch > TENTH_PI) {
		 	this.pitch = TENTH_PI;
		 }
	};

	Player.prototype.gyroscope = function(alpha, beta, gamma) {
		this.roll = beta/180*Math.PI;
		if (this.roll < -HALF_PI + 0.3) {
		 	this.roll = -HALF_PI + 0.3;
		}
		if (this.roll > HALF_PI - 0.3) {
		 	this.roll = HALF_PI - 0.3;
		}

	 	this.pitch = gamma/180*Math.PI;
	 	if (this.pitch < -TENTH_PI) {
		 	this.pitch = -TENTH_PI;
		}
		if (this.pitch > TENTH_PI) {
		 	this.pitch = TENTH_PI;
		}
	};

	Player.prototype.mouseout = function() {		
	};

	Player.prototype.keyup = function(keyCode) {
		this.keyState &= ~((keyCode === RIGHT_KEY)*RIGHT_KEY_DOWN_BIT);
		this.keyState &= ~((keyCode === LEFT_KEY)*LEFT_KEY_DOWN_BIT);		
		this.keyState &= ~((keyCode === UP_KEY)*UP_KEY_DOWN_BIT);
		this.keyState &= ~((keyCode === DOWN_KEY)*DOWN_KEY_DOWN_BIT);

		this.keyState &= ~JOYSTICK_ACTIVE_BIT;
	};

	Player.prototype.keydown = function(keyCode) {
		this.keyState |= (keyCode === RIGHT_KEY)*RIGHT_KEY_DOWN_BIT;
		this.keyState |= (keyCode === LEFT_KEY)*LEFT_KEY_DOWN_BIT;
		this.keyState |= (keyCode === UP_KEY)*UP_KEY_DOWN_BIT;
		this.keyState |= (keyCode === DOWN_KEY)*DOWN_KEY_DOWN_BIT;

		this.keyState &= ~JOYSTICK_ACTIVE_BIT;
	};

	Player.prototype.mouseup = function() {
		this.keyState &= ~MOUSE_DOWN_BIT;
	};

	Player.prototype.mousedown = function() {
		this.keyState |= MOUSE_DOWN_BIT;
	};

	Player.prototype.joystick = function(dx, dy) {
		this._dx = dx;
		this._dy = dy;
		
		this.keyState |= JOYSTICK_ACTIVE_BIT;
	}


	// t is used for translation inside update()
	var t = new THREE.Vector3();

	Player.prototype.update = function(deltaTime) {
		var material = this.mesh.material;
		if (this.blinking) {
			this._dt += deltaTime;
			var off = this._off;
			if (this._dt >= BLINK_INTERVAL) {
				off = !this._off;
				this._dt = this._dt % BLINK_INTERVAL;
			}

			if (off !== this._off) {
				var material = this.mesh.material;
				material.opacity = 1 - material.opacity;

				var thrust1Material = this.thrust1.particleSystem.material;
				var thrust2Material = this.thrust2.particleSystem.material;
				thrust1Material.opacity = this._thrustsOpacity - thrust1Material.opacity;
				thrust2Material.opacity = this._thrustsOpacity - thrust2Material.opacity;				
			}
			this._off = off;
		} else if (material.opacity === 0) {
			material.opacity = 1 - material.opacity;

			var thrust1Material = this.thrust1.particleSystem.material;
			var thrust2Material = this.thrust2.particleSystem.material;
			thrust1Material.opacity = this._thrustsOpacity - thrust1Material.opacity;
			thrust2Material.opacity = this._thrustsOpacity - thrust2Material.opacity;
		}

		var slide = 0,
			surf = 0;
		
		if (this.keyState & JOYSTICK_ACTIVE_BIT) {
			slide = this._dx*deltaTime*0.4;
			surf = -this._dy*deltaTime*0.2;
		} else {			
			if (this.keyState & RIGHT_KEY_DOWN_BIT) {
				slide = deltaTime*0.4;
			}

			if (this.keyState & LEFT_KEY_DOWN_BIT) {
				slide = -deltaTime*0.4;
			}

			if (this.keyState & UP_KEY_DOWN_BIT) {
				surf = -deltaTime*0.2;
			}
			if (this.keyState & DOWN_KEY_DOWN_BIT) {
				surf = deltaTime*0.2;
			}			
		};
		

		if (this.levelAABB.maxPoint.x - DISTANCE_FROM_EDGE < this.mesh.position.x + slide ||
			this.levelAABB.minPoint.x + DISTANCE_FROM_EDGE > this.mesh.position.x + slide) {
			slide = 0;			
		} 

		if (this.levelAABB.maxPoint.z - DISTANCE_FROM_EDGE < this.mesh.position.z + surf ||
			this.levelAABB.maxPoint.z - 1.5*DISTANCE_FROM_EDGE > this.mesh.position.z + surf) {
			surf = 0;
		}

		this.mesh.rotation.x += deltaTime*(this.pitch - this.mesh.rotation.x)*0.01;
		this.mesh.rotation.z += deltaTime*(this.roll - this.mesh.rotation.z)*0.01;
		this.mesh.position.x += slide;
		this.mesh.position.z += surf;

		t.x = slide;
		t.y = 0;
		t.z = surf;
		this.OB.translate(t);
		this.OB.rotate(this.mesh.matrixWorld);		

		this.thrust1.update(deltaTime);
		this.thrust2.update(deltaTime);		
		
	};

	Player.prototype.checkRockCollision = function(rock) {
		var center = rock.mesh.position;
		var radius = rock.radius;

		return this.OB.querySphere(center, radius);		
	};

	Player.DISTANCE_FROM_EDGE = DISTANCE_FROM_EDGE;


	var DummyPlayer = function(levelAABB) {
		var material = new THREE.MeshFaceMaterial();
		var geometry = assets.halalitGeometry;		

		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.doubleSided = true;
		this.mesh.scale.multiplyScalar(SCALE_GEOMETRY);
		this.mesh.position.z = levelAABB.maxPoint.z - DISTANCE_FROM_EDGE;

		// make player invisible
		var materials = this.mesh.geometry.materials;
		for (var i = 0, len = materials.length; i < len; ++i) {
			materials[i].opacity = 0;
			materials[i].transparent = true;
		}	
	};

	DummyPlayer.prototype.update = function() {};
	DummyPlayer.prototype.checkRockCollision = function() {};
	DummyPlayer.prototype.keyup = function() {};
	DummyPlayer.prototype.keydown = function() {};
	DummyPlayer.prototype.mousemove = function() {};
	DummyPlayer.prototype.mouseup = function() {};
	DummyPlayer.prototype.mousedown = function() {};
	DummyPlayer.prototype.joystick = function() {};
	DummyPlayer.prototype.gyroscope = function() {};

	return {
		Player: Player,
		DummyPlayer: DummyPlayer
	};
});