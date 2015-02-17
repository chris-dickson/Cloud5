var _ = require('./util');

function createArray(length) {
	var arr = new Array(length || 0),
		i = length;

	if (arguments.length > 1) {
		var args = Array.prototype.slice.call(arguments, 1);
		while(i--) arr[length-1 - i] = createArray.apply(this, args);
	}

	return arr;
}

var Layout = function(attributes) {
	this._canvas;
	this._words;

	this._initialize();

	_.extend(this,attributes);
};

Layout.prototype = _.extend(Layout.prototype, {
	_initialize : function() {
		this._bitmap = createArray(this._canvas.width,this._canvas.height);
		for (var i = 0; i < this._canvas.width; i++) {
			for (var j = 0; j < this._canvas.height; j++) {
				this._bitmap[i][j] = false;
			}
		}
	},

	canvas : function(canvas) {
		if (canvas) {
			this._canvas = canvas;
			return this;
		} else {
			return this._canvas;
		}
	},
	words : function(words) {
		if (words) {
			this._words = words;
			return this;
		} else {
			return this._words;
		}
	},
	layout : function() {
		this._initialize();
		var renderInfo = {};
		this._words.forEach(function(word) {
			
		});
	}
});

module.exports = Layout;