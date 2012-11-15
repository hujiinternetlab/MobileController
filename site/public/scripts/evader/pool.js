define(function() {

	// A generic pool for objects.
	// The object should have a "getNew" and a "reset" methods that 
	// take the exact same arguments as the constructor
	var Pool = function(ctor) {
		this._pool = [];
		this._ctor = ctor;		
	};

	Pool.prototype.getNew = function(/* var_args */) {
		var len = this._pool.length;
		var obj;

		if (len == 0) {			
			return this._ctor.getNew.apply(this, arguments);
		} else {
			obj = this._pool.pop();
			obj.reset.apply(obj, arguments);
			return obj;
		}
	};

	Pool.prototype.dispose = function(obj) {
		this._pool.push(obj);
	};

	return {
		Pool: Pool
	};
});