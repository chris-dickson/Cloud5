var _ = require('./util');
var TextBitmap = require('./textbitmap');

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
	this._textBitmapper;

	_.extend(this,attributes);
};

Layout.prototype = _.extend(Layout.prototype, {
	_initialize : function() {
		this._textBitmapper = new TextBitmap();
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
		if (this._words) {
			var that = this;

			var minCount = Number.MAX_VALUE;
			var maxCount = 0;

			Object.keys(this._words).forEach(function(word) {
				minCount = Math.min(that._words[word],minCount);
				maxCount = Math.max(that._words[word],maxCount);
			});


			var minFontSize = 20;
			var maxFontSize = 100;
			Object.keys(this._words).forEach(function(word) {

				var t = (that._words[word] - minCount)/(maxCount-minCount);
				var fontSize =_.step(minFontSize,maxFontSize,t);

				var bitmap = that._textBitmapper.create(word,fontSize,'Calibri');
				renderInfo[word] = bitmap;
			});
		}

		var sortedWordArray = Object.keys(this._words).sort(function(w1,w2) {
			return that._words[w2]-that._words[w1];
		});

		sortedWordArray.forEach(function(word) {
			var placed = false;
			var attempts = 30;
			while (!placed && attempts > 0) {
				var x = Math.floor(Math.random() * that._canvas.width)
				var y = Math.floor(Math.random() * that._canvas.height);

				renderInfo[word].x = x;
				renderInfo[word].y = y;

				var ctx = that._canvas.getContext('2d');
				ctx.font = renderInfo[word].fontSize + 'px ' + renderInfo[word].fontFamily;
				ctx.fillStyle = 'red';
				ctx.fillText(word,renderInfo[word].x,renderInfo[word].y);

				if (!that._textBitmapper.intersects(renderInfo[word],that._bitmap)) {
					placed = true;

					for (var x = renderInfo[word].x; x < renderInfo[word].x + renderInfo[word].width; x++) {
						for (var y = renderInfo[word].y; y < renderInfo[word].y + renderInfo[word].height; y++) {
							that._bitmap[x][y] = true;
						}
					}


					var ibreak = 0;
					ibreak++;

				} else {
					attempts--;
				}
			}
			if (!placed) {
				renderInfo[word].x = -1;
				renderInfo[word].y = -1;
			}
		});

		return renderInfo;
	}
});

module.exports = Layout;