define(['three'], function(THREE) {

	var VELOCITY = 2;

	var Laser = function(levelAABB, startPosition, directionVector, length, color, disposeCallback) {
		var geometry = new THREE.Geometry();
		var material = new THREE.LineBasicMaterial({
			color: color,
			linewidth: 1
		});
		
		this.line = new THREE.Line(geometry, material);
		this.directionVector = directionVector;

		this.line.position.x = startPosition.x;
		this.line.position.y = startPosition.y;
		this.line.position.z = startPosition.z;

		var v0 = new THREE.Vector3(0, 0, 0);
		var v1 = new THREE.Vector3(length*directionVector.x, 
								   length*directionVector.y, 
								   length*directionVector.z);
		geometry.vertices.push(v0);
		geometry.vertices.push(v1);

		this._disposeCallback = disposeCallback;
		this._levelAABB = levelAABB;
	};

	Laser.getNew = function(levelAABB, startPosition, directionVector, length, color, disposeCallback) {
		return new Laser(levelAABB, startPosition, directionVector, length, color, disposeCallback);
	};

	Laser.prototype.reset = function(levelAABB, startPosition, directionVector, length, color, disposeCallback) {
		var geometry = this.line.geometry;
		var material = this.line.material;

		material.color = new THREE.Color(color);
		material.needsUpdate = true;
		
		this.line.position.x = startPosition.x;
		this.line.position.y = startPosition.y;
		this.line.position.z = startPosition.z;

		var v1 = geometry.vertices[1];		
		v1.set(length*directionVector.x, 
			   length*directionVector.y, 
			   length*directionVector.z);

		geometry.verticesNeedUpdate = true;

		this.directionVector = directionVector;
	};

	Laser.prototype.update = function(deltaTime) {
		var dx = deltaTime*VELOCITY*this.directionVector.x;
		var dy = deltaTime*VELOCITY*this.directionVector.y;
		var dz = deltaTime*VELOCITY*this.directionVector.z;

		this.line.position.x += dx;
		this.line.position.y += dy;
		this.line.position.z += dz;

		if (this._levelAABB.queryPoint(this.line.position) === false) {
			this._disposeCallback(this);
		}
	};


	return {
		Laser: Laser
	};


});