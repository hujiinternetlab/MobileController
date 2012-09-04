define(['three', 'assets'], function(THREE, assets) {
	
	var StarField = function(levelAABB, numParticls, height, color, velocity) {
		this.levelAABB = levelAABB;
		this.height = height;
		this.numParticles = numParticls;
		this.velocity = velocity;
		var geometry = new THREE.Geometry();
		geometry.dynamic = true;
		var material = new THREE.ParticleBasicMaterial({
				color: color,
				map: assets.particleTexture,
				blending: THREE.AdditiveBlending,
				transparent: true,
				size: 25 });

		var levelWidth = levelAABB.maxPoint.x - levelAABB.minPoint.x + 1000;
		var levelDepth = levelAABB.maxPoint.z - levelAABB.minPoint.z;

		
		for (var i = 0; i < this.numParticles; ++i) {

			var x = levelAABB.minPoint.x - 500 + Math.random() * levelWidth,
			    y = height,
			    z = levelAABB.minPoint.z + Math.random() * levelDepth;

			var particle = new THREE.Vector3(x, y, z);
			    

			geometry.vertices.push(particle);
		}
		
		this.particleSystem = new THREE.ParticleSystem(geometry, material);
	};

	StarField.prototype.update = function(deltaTime) {
		var geo = this.particleSystem.geometry;
		for (var i = 0; i < this.numParticles; ++i) {

			var vertices = geo.vertices;

			var z = vertices[i].z + this.velocity*deltaTime;	
			if (z > this.levelAABB.maxPoint.z) {
				z = this.levelAABB.minPoint.z;
			}
			vertices[i].z = z;
		}

		geo.verticesNeedUpdate = true;
	};


	return {
		StarField: StarField
	};
});