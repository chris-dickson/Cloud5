var _ = require('./util');
var Layout = require('./layout');

var WordCloudCanvas = function(attributes) {

	this._words = {};
	this._stopWords = {};

	this._canvas = null;
	this._width = null;
	this._height = null;
	this._backgroundFill = null;
	this._onWordOver = null;
	this._layout = null;

	_.extend(this,attributes);
};

WordCloudCanvas.prototype = _.extend(WordCloudCanvas.prototype, {
	canvas : function(canvas) {
		if (canvas) {
			this._canvas = canvas;
			this._width = canvas.width;
			this._height = canvas.height;
			return this;
		} else {
			return this._canvas;
		}
	},
	width : function(width) {
		if (width) {
			if (this._canvas) {
				this._canvas.width = width;
				this._width = width;
			}
			return this;
		} else {
			return this.width;
		}
	},
	height : function(height) {
		if (height) {
			if (this._canvas) {
				this._canvas.height = height;
				this._height = height;
			}
			return this;
		} else {
			return this._height;
		}
	},
	text : function(text) {
		var filtered = text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,'');
		filtered = filtered.replace(/\[[0-9]*\]/g,'');
		filtered = filtered.replace(/[\t+\[\]]/g,'');
		var words = filtered.split(' ');
		this.words(words);
		return this;
	},

	stop : function(words) {
		if (words) {
			var that = this;
			words.forEach(function (word) {
				that._stopWords[word.trim().toLowerCase()] = true;
			});
			return this;
		} else {
			return this._stopWords;
		}
	},

	background : function(fillStyle) {
		if (fillStyle) {
			this._backgroundFill = fillStyle;
			return this;
		} else {
			return this._backgroundFill;
		}
	},

	words : function(words) {
		if (words) {
			var that = this;
			words.forEach(function (raw) {
				var word = raw.trim().toLowerCase();
				if (that._stopWords[word] || word === '') {
					return;
				}

				var count = that._words[word];
				if (!count) {
					count = 0;
				}
				count++;
				that._words[word] = count;
			});

			return this;
		} else {
			return this._words;
		}
	},

	onWordOver : function(handler) {
		this._onWordOver = handler;
		return this;
	},

	font : function(font) {
		if (font) {
			this._font = font;
			return this;
		} else {
			return this._font;
		}
	},

	minFontSize : function(minFontSize) {
		if (minFontSize) {
			this._minFontSize = minFontSize;
			return this;
		} else {
			return this._minFontSize;
		}
	},

	maxFontSize : function(maxFontSize) {
		if (maxFontSize) {
			this._maxFontSize = maxFontSize;
			return this;
		} else {
			return this._maxFontSize;
		}
	},

	colors : function(colors) {
		if (colors) {
			this._colors = colors;
			return this;
		} else {
			return this._colors;
		}
	},

	generate : function() {
		var layoutAttributes = {};
		if (this.debug) {
			layoutAttributes.debug = true;
		}
		if (this._font) {
			layoutAttributes.font = this._font;
		}
		if (this._minFontSize) {
			layoutAttributes.minFontSize = this._minFontSize;
		}
		if (this._maxFontSize) {
			layoutAttributes.maxFontSize = this._maxFontSize;
		}
		if (this._colors) {
			layoutAttributes.colors = this._colors;
		}

		this._layout = new Layout(layoutAttributes)
			.canvas(this._canvas)
			.words(this._words)
			.onWordOver(this._onWordOver);

		var renderInfo = this._layout.layout();

		var ctx = this._canvas.getContext('2d');
		ctx.fillStyle = this._backgroundFill || 'white';
		ctx.fillRect(0, 0, this._width, this._height);


		var that = this;
		Object.keys(renderInfo).forEach(function(word) {
			var wordRenderInfo = renderInfo[word];
			if (wordRenderInfo.x !== -1 && wordRenderInfo.y !== -1) {
				ctx.font = wordRenderInfo.fontSize + 'px ' + wordRenderInfo.fontFamily;

				ctx.fillStyle = 'red';
				ctx.fillText(word,wordRenderInfo.x,wordRenderInfo.y);

				if (that.debug) {
					ctx.strokeStyle = 'green';
					ctx.strokeRect(wordRenderInfo.x + wordRenderInfo.bb.offsetX, wordRenderInfo.y + wordRenderInfo.bb.offsetY, wordRenderInfo.bb.width, wordRenderInfo.bb.height);
				}
			}
		});
		return this;
	}
});


module.exports = WordCloudCanvas;