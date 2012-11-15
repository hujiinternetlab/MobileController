define(['three'], function(THREE) {
	// Bounding Volumes module


	// Axis Aligned Bounding Box
	var AABB = function(minPoint, maxPoint) {
		this.minPoint = minPoint;
		this.maxPoint = maxPoint;
	};

	AABB.prototype.translate = function(t) {
		this.minPoint.x += t.x;
		this.minPoint.y += t.y;
		this.minPoint.z += t.z;

		this.maxPoint.x += t.x;
		this.maxPoint.y += t.y;
		this.maxPoint.z += t.z;
	};

	AABB.prototype.queryPoint = function(point) {
		if (point.x < this.minPoint.x || point.x > this.maxPoint.x ||
			point.y < this.minPoint.y || point.y > this.maxPoint.y ||
			point.z < this.minPoint.z || point.z > this.maxPoint.z) {
			return false;
		} else {
			return true;
		}
	};

	AABB.prototype.querySphere = function(center, radius) {
		if (center.x + radius < this.minPoint.x || center.x - radius > this.maxPoint.x ||
			center.y + radius < this.minPoint.y || center.y - radius > this.maxPoint.y ||
			center.z + radius < this.minPoint.z || center.z - radius > this.maxPoint.z) {
			return false;
		} else {
			return true;
		}
	};

	var translatePlane = function(plane, t) {
		// new point on plane
		var x = plane.x*(-plane.w) + t.x;
		var y = plane.y*(-plane.w) + t.y;
		var z = plane.z*(-plane.w) + t.z;

		// update plane w coord
		plane.w = -(x*plane.x + y*plane.y + z*plane.z);
	};


	var isSphereInPlane = function(plane, center, radius) {
		var a = plane.x*center.x + plane.y*center.y + plane.z*center.z + plane.w;
		return a + radius > 0;
	};

	var isPointInPlane = function(plane, point) {
		var a = plane.x*point.x + plane.y*point.y + plane.z*point.z + plane.w;
		return a > 0;
	};



	// Oriented Box. Initialized like an AABB, later you can rotate it.
	var OB = function(minPoint, maxPoint) {
		this.bottom = new THREE.Vector4(0, 1, 0, -minPoint.y);
		this.top = new THREE.Vector4(0, -1, 0, maxPoint.y);		
		this.left = new THREE.Vector4(1, 0, 0, -minPoint.x);
		this.right = new THREE.Vector4(-1, 0, 0, maxPoint.x);
		this.back = new THREE.Vector4(0, 0, 1, -minPoint.z);
		this.front = new THREE.Vector4(0, 0, -1, minPoint.z);	

		this.center = new THREE.Vector3();
		this.center.add(minPoint, maxPoint);
		this.center.multiplyScalar(0.5);
	};

	OB.prototype.translate = function(t) {
		translatePlane(this.bottom, t);
		translatePlane(this.top, t);
		translatePlane(this.left, t);
		translatePlane(this.right, t);
		translatePlane(this.back, t);
		translatePlane(this.front, t);

		this.center.addSelf(t);		
	};

	OB.prototype.rotate = function(m4) {		
		this._rotatePlane(this.bottom, m4);
		this._rotatePlane(this.top, m4);
		this._rotatePlane(this.left, m4);
		this._rotatePlane(this.right, m4);
		this._rotatePlane(this.back, m4);
		this._rotatePlane(this.front, m4);

		//console.log(this.front.x, this.front.y, this.front.z, this.front.w);
	};

	OB.prototype.queryPoint = function(point) {
		return isPointInPlane(this.bottom, point) &&
			   isPointInPlane(this.top, point) &&
			   isPointInPlane(this.left, point) &&
			   isPointInPlane(this.right, point) &&
			   isPointInPlane(this.back, point) &&
			   isPointInPlane(this.front, point);
	};

	OB.prototype.querySphere = function(center, radius) {
		return isSphereInPlane(this.bottom, center, radius) &&
			   isSphereInPlane(this.top, center, radius) &&
			   isSphereInPlane(this.left, center, radius) &&
			   isSphereInPlane(this.right, center, radius) &&
			   isSphereInPlane(this.back, center, radius) &&
			   isSphereInPlane(this.front, center, radius);
	};

	OB.prototype._rotatePlane = function(plane, m4) {		
		var dx = plane.x*(-plane.w) - this.center.x;
		var dy = plane.y*(-plane.w) - this.center.y;
		var dz = plane.z*(-plane.w) - this.center.z;

		// a is the signed distance between the plane and the center
		var a = dx*plane.x + dy*plane.y + dz*plane.z;

		// rotate plane normal
		var te = m4.elements;
		var nx = plane.x, ny = plane.y, nz = plane.z;

		plane.x = nx * te[0] + ny * te[4] + nz * te[8];
		plane.y = nx * te[1] + ny * te[5] + nz * te[9];
		plane.z = nx * te[2] + ny * te[6] + nz * te[10];

		var foo = 1/Math.sqrt(plane.x*plane.x + plane.y*plane.y + plane.z*plane.z);
		plane.x *= foo;
		plane.y *= foo;
		plane.z *= foo;		

		// make d a point on the new plane
		dx = this.center.x + a*plane.x;
		dy = this.center.y + a*plane.y;
		dz = this.center.z + a*plane.z;

		// update w coord		
		plane.w = -(dx*plane.x + dy*plane.y + dz*plane.z);
	};


	return {
		AABB: AABB,
		OB: OB
	};

});