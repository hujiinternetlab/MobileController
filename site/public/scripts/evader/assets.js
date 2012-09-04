define(['three'], function(THREE) {
	var exports = {};

	var jsonLoader = new THREE.JSONLoader();
	var readyCb;
	var textureLoader = new THREE.TextureLoader();

	var count = 0;
	var numAssets = 4;
	var assetLoaded = function() {
		++count;

    	if (count === numAssets) {
    		readyCb();
    	}
	};



	exports.init = function(readyCallback) {
		readyCb = readyCallback;

		// materials and geometries
		exports.cubeGeometry = new THREE.CubeGeometry(1, 1, 1, 1, 1, 1);
		exports.flatCubeGeometry = new THREE.CubeGeometry(3, 0.2, 1, 1, 1, 1);
		exports.redMaterial = new THREE.MeshLambertMaterial({
							          color: 0xCC0000
							        });
		exports.grayMaterial = new THREE.MeshLambertMaterial({
							          color: 0x888888
							        });

		// ship model
	    jsonLoader.load("models/halalit2.js", function(geometry) { 
	    	exports.halalitGeometry = geometry;
	    	geometry.computeBoundingBox();

	    	assetLoaded();
	    });

	    // asteroid 1 model
	    jsonLoader.load("models/astroid1.js", function(geometry) {
	    	exports.astroid1Geometry = geometry;
	    	geometry.computeBoundingSphere();	    	
	    	
	    	assetLoaded();
	    });

	    // particle texture
	    textureLoader.addEventListener('load', function(e) {	    	
	    	exports.particleTexture = e.content;

	    	assetLoaded();
	    }, false);
	    textureLoader.load("images/particle0.png");

	    // life image
	    exports.lifeImage = new Image();
	    exports.lifeImage.src = "/images/life.png";
	    exports.lifeImage.addEventListener('load', function() {
	    	assetLoaded();
	    }, false);
	};


    // load binary model

    /*
    var binLoader = new THREE.BinaryLoader();
    binLoader.load( "Model_bin.js", function( geometry ) { createScene( geometry) } );

    function createScene( geometry ) {

        var mesh = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial() );

    }
	*/

	return exports;
});