define(['three', 'assets'], function(THREE, assets) {

	var VELOCITY = 1;
	var VELOCITY_RANGE = 0.5;

	// A cone of particles shooting in one direction
	var Thrust = function(direction, length, radius, color) {
		var geometry = new THREE.Geometry();
		geometry.dynamic = true;
		var material = new THREE.ParticleBasicMaterial({
								color: color,
								map: assets.particleTexture,
								blending: THREE.AdditiveBlending,
								transparent: true,
								opacity: 0.7,
								size: 10});
		material.needsUpdate = true;
		this.particleSystem = new THREE.ParticleSystem(geometry, material);


		this.length = length;
		this.radius = radius;

		this.maxParticles = 100;
		this._velocityVectors = [];
		
		// Thrust axes system
		this._normal = direction;

		this._tangent = new THREE.Vector3(0, 1, 0);
		this._tangent.crossSelf(this._normal);
		this._tangent.normalize();

		this._ortho = new THREE.Vector3(this._normal.x, this._normal.y, this._normal.z);
		this._ortho.crossSelf(this._tangent);

		for (var i = 0; i < this.maxParticles; ++i) {		
			var v = this._newParticleDirection();			
			v.multiplyScalar(VELOCITY - VELOCITY_RANGE*0.5 + Math.random()*VELOCITY_RANGE);

			this._velocityVectors.push(v);
			geometry.vertices.push(new THREE.Vector3(0, 0, 0));	
		}
	};
	
	Thrust.prototype.update = function(deltaTime) {
		var geometry = this.particleSystem.geometry;

		var dv = new THREE.Vector3();		
		for (var i = 0; i < this._velocityVectors.length; ++i) {
			var vv = this._velocityVectors[i];
			var v = geometry.vertices[i];
			var c = geometry.colors[i];

			dv.set(vv.x, vv.y, vv.z);
			dv.multiplyScalar(deltaTime*0.1);

			v.addSelf(dv);			

			var vlength = v.length();
			if (vlength > this.length) {
				v.set(0, 0, 0);
				vlength = 0;				
			}
		}

		geometry.verticesNeedUpdate = true;		
	};

	Thrust.prototype._newParticleDirection = function() {
		var a = Math.random()*this.radius;
		var alpha = Math.random()*Math.PI*2;

		var tangentCoeff = a*Math.cos(alpha);
		var orthoCoeff = a*Math.sin(alpha);

		var x = tangentCoeff*this._tangent.x + orthoCoeff*this._ortho.x + this._normal.x;
		var y = tangentCoeff*this._tangent.y + orthoCoeff*this._ortho.y + this._normal.y;
		var z = tangentCoeff*this._tangent.z + orthoCoeff*this._ortho.z + this._normal.z;

		var pdir = new THREE.Vector3(x, y, z);
		pdir.normalize();

		return pdir;
	};


	// A sphere of particles shooting in all directions
	var Explosion = function(position, velocity, time, color, size, disposeCallback) {
		var geometry = new THREE.Geometry();
		geometry.dynamic = true;
		var material = new THREE.ParticleBasicMaterial({
								color: 0xFF0000,
								map: assets.particleTexture,
								blending: THREE.AdditiveBlending,
								transparent: true,
								opacity: 0.5,
								size: size});
		material.needsUpdate = true;
		this.particleSystem = new THREE.ParticleSystem(geometry, material);
		this.particleSystem.sortParticles = true;

		this.position = position;
		this.velocity = velocity;
		this.time = time;
		this.dt = 0;
		this.maxParticles = 500;
		this._velocityVectors = [];

		for (var i = 0; i < this.maxParticles; ++i) {
			var vel = this._newVelocityVector();
			var v = new THREE.Vector3(position.x, position.y, position.z);

			this._velocityVectors.push(vel);
			geometry.vertices.push(v);
		}

		this.disposeCallback = disposeCallback;
	};

	Explosion.prototype.getNew = function(position, velocity, time, color, size, disposeCallback) {
		return new Explosion(position, velocity, time, color, size, disposeCallback);
	};

	Explosion.prototype.reset = function(position, velocity, time, color, size, disposeCallback) {
		var geometry = this.particleSystem.geometry;
		var material = this.particleSystem.material;

		material.color.setHex(color);
		material.size = size;

		this.position = position;
		this.velocity = velocity;
		this.time = time;
		this.dt = 0;
		this.maxParticles = 100;
		this._velocityVectors = [];

		for (var i = 0; i < this.maxParticles; ++i) {
			var vel = this._newVelocityVector();
			var v = new THREE.Vector3(position.x, position.y, position.z);

			this._velocityVectors.push(vel);
			geometry.vertices.push(v);
		}
	};

	Explosion.prototype.update = function(deltaTime) {	
		var material = this.particleSystem.material;
		var geometry = this.particleSystem.geometry;

		var decay = this.dt/this.time;
		if (decay > 1) {
			this.disposeCallback(this);
			return;
		}

		material.opacity = 1 - decay;

		var dv = new THREE.Vector3();		
		for (var i = 0; i < this._velocityVectors.length; ++i) {
			var vel = this._velocityVectors[i];
			var v = geometry.vertices[i];			

			var t = deltaTime*0.005;			
			dv.set(t*vel.x, t*vel.y, t*vel.z);			

			v.addSelf(dv);				
		}

		geometry.verticesNeedUpdate = true;

		this.dt += deltaTime;
	};

	Explosion.prototype._newVelocityVector = function() {
		var a = Math.random()*Math.PI*2;
		var b = Math.random()*Math.PI;
		var cosa = Math.cos(a);
		var sina = Math.sin(a);
		var cosb = Math.cos(b);
		var sinb = Math.sin(b);

		var v = new THREE.Vector3(cosa*sinb, cosb, sina*sinb);
		v.multiplyScalar(this.velocity - 0.5 + Math.random());

		return v;
	};

	return {
		Thrust: Thrust,
		Explosion: Explosion
	};
});