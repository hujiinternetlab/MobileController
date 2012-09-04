requirejs.config({    
    baseUrl: 'scripts/evader',
    shim: {
        'three': {
            exports: 'THREE'
        },
        '../mc/mc-client': {
            exports: 'MCClient'
        }
    }    
});

// Start the main app logic.
require(['setup', 'assets', 'level'], 
        function(setup, assets, level) {
    
    assets.init(function() {
        // start the game!
        setup.startGame(level);        
    });    
});