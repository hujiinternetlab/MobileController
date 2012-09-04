define(['three', 'setup', 'assets'], 
	   function(THREE, setup, assets) {
   
	var Rock = function(startPosition, directionVector, size, velocity, levelAABB, disposeCallback) {
		var material = assets.grayMaterial;
		//var geometry = assets.cubeGeometry;
		var geometry = assets.astroid1Geometry;
		

		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.useQuaternion = true;
		this.mesh.scale.multiplyScalar(size);	

		this.size = size;	
		this.radius = this.mesh.geometry.boundingSphere.radius*size*0.5;

		this.mesh.position.x = startPosition.x;
		this.mesh.position.y = startPosition.y;
		this.mesh.position.z = startPosition.z;

		this.velocityVector = new THREE.Vector3(directionVector.x,
												directionVector.y,
												directionVector.z);
		this.velocityVector.multiplyScalar(velocity);

		this.levelAABB = levelAABB;

		// set rotation
		this._rotationSpeed = size*0.05;
		this._primeRotationAxis = new THREE.Vector3(0, 1, 0);
		this._secondaryRotationAxis = new THREE.Vector3(directionVector.x,
														directionVector.y,
														directionVector.z);
		this._rotationQuaternion = new THREE.Quaternion();		

		this._disposeCallback = disposeCallback;		
	};

	Rock.getNew = function(startPosition, directionVector, size, velocity, levelAABB, disposeCallback) {
		return new Rock(startPosition, directionVector, size, velocity, levelAABB, disposeCallback);
	};

	Rock.prototype.reset = function(startPosition, directionVector, size, velocity, levelAABB, disposeCallback) {
		this.mesh.position.x = startPosition.x;
		this.mesh.position.y = startPosition.y;
		this.mesh.position.z = startPosition.z;

		this.mesh.scale.x = size;
		this.mesh.scale.y = size;
		this.mesh.scale.z = size;

		this.mesh.quaternion = new THREE.Quaternion();

		this.size = size;
		this.radius = this.mesh.geometry.boundingSphere.radius*size*0.5;

		this.velocityVector.set(directionVector.x, directionVector.y, directionVector.z);
		this.velocityVector.multiplyScalar(velocity);		

		this._rotationSpeed = size*0.05;		
		this._secondaryRotationAxis.set(directionVector.x,
										directionVector.y,
										directionVector.z);
	};

	Rock.prototype.update = function(deltaTime) {
		var dVector = new THREE.Vector3(this.velocityVector.x, this.velocityVector.y, this.velocityVector.z);		
		dVector.multiplyScalar(deltaTime/10);
		this.mesh.position.addSelf(dVector);

		// rotation
		var rotationSpeedDelta = this._rotationSpeed*deltaTime/2000;
		this._rotationQuaternion.setFromAxisAngle(this._primeRotationAxis, rotationSpeedDelta);
		this.mesh.quaternion.multiplySelf(this._rotationQuaternion);

		this._rotationQuaternion.setFromAxisAngle(this._secondaryRotationAxis, rotationSpeedDelta);
		this.mesh.quaternion.multiplySelf(this._rotationQuaternion);
		this.mesh.quaternion.normalize();

		if (this.levelAABB.querySphere(this.mesh.position, this.radius) === false) {
			this._disposeCallback(this);
		}		
	};

	// project vec onto axis (normalized), and put result in result
	var projectVector = function(vec, axis, result) {
		var a = vec.dot(axis);
		result.x = a*axis.x;
		result.y = a*axis.y;
		result.z = a*axis.z;
	};

	// calculates new 'velocityVector' from the given masses and projected vectors
	// 'mN' is the object mass, and 'normalN' is the velocity vector in the collision's normal axis.
	var calculateEllasticCollision = function(velocityVector, m1, m2, normal1, normal2, tangent, ortho) {
		var t = m1 + m2;
		var a = (m1 - m2)/t;
		var b = 2*m2/t;

		velocityVector.x = a*normal1.x + b*normal2.x + tangent.x + ortho.x;
		velocityVector.y = a*normal1.y + b*normal2.y + tangent.y + ortho.y;
		velocityVector.z = a*normal1.z + b*normal2.z + tangent.z + ortho.z;
	};


	Rock.prototype.checkRockCollision = (function() {	
		var v1n = new THREE.Vector3();
		var v1t = new THREE.Vector3();
		var v1o = new THREE.Vector3();

		var v2n = new THREE.Vector3();
		var v2t = new THREE.Vector3();
		var v2o = new THREE.Vector3();

		var normal = new THREE.Vector3();
		var tangent = new THREE.Vector3();
		var ortho = new THREE.Vector3();	

		var currentlyColliding = {};	

		return function(otherRock) {
			var sumRadiuses =  this.radius + otherRock.radius;

			// collision normal		
			normal.sub(otherRock.mesh.position, this.mesh.position);

			var collDepth = sumRadiuses - normal.length();		
			if (collDepth >= 0) {
				if (otherRock in currentlyColliding) {
					return;
				}	
				currentlyColliding[otherRock] = otherRock;

				// find 3 axis vectors			
				normal.normalize();
				if (normal.x === 0 && normal.y === 1 && normal.z === 0) {
					tangent.set(1, 0, 0);	
				}
				else {
					tangent.set(0, 1, 0);	
				}

				tangent.crossSelf(normal);
				tangent.normalize();

				ortho.set(tangent.x, tangent.y, tangent.z);
				ortho.crossSelf(normal);

				// project velocity vectors
				projectVector(this.velocityVector, normal, v1n);
				projectVector(this.velocityVector, tangent, v1t);
				projectVector(this.velocityVector, ortho, v1o);

				projectVector(otherRock.velocityVector, normal, v2n);
				projectVector(otherRock.velocityVector, tangent, v2t);
				projectVector(otherRock.velocityVector, ortho, v2o);

				// new velocity vectors
				calculateEllasticCollision(this.velocityVector, this.size, otherRock.size, v1n, v2n, v1t, v1o);
				calculateEllasticCollision(otherRock.velocityVector, otherRock.size, this.size, v2n, v1n, v2t, v2o);
			} else if (otherRock in currentlyColliding) {
				delete currentlyColliding[otherRock];
			}
		};
	})();

	Rock.prototype.checkLaserCollision = function(laser) {
		var laserPos = laser.line.position;
		var center = this.mesh.position;
		var radiusSquared = this.radius*this.radius;

		var dx = laserPos.x - center.x;
		var dy = laserPos.y - center.y;
		var dz = laserPos.z - center.z;

		var d = dx*dx + dy*dy + dz*dz;

		return d < radiusSquared;
	};
	

	return {
		Rock: Rock
	};
});