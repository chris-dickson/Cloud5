!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.WordCloudCanvas=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var TextBitmap = _dereq_('./textbitmap');

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
},{"./textbitmap":3,"./util":4}],2:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Layout = _dereq_('./layout');

var WordCloudCanvas = function(attributes) {

	this._words = {};
	this._stopWords = {};

	this._canvas;
	this._width;
	this._height;
	this._backgroundFill;

	this._layout;

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
		var filtered = text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
		filtered = filtered.replace(/\[[0-9]*\]/g,"");
		filtered = filtered.replace(/[\t+\[\]]/g,"");
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

	generate : function() {
		var layout = new Layout()
			.canvas(this._canvas)
			.words(this._words);

		var renderInfo = layout.layout();

		var ctx = this._canvas.getContext('2d');
		if (this._backgroundFill) {
			ctx.fillStyle = this._backgroundFill;
			ctx.fillRect(0, 0, this._width, this._height);
		}

		Object.keys(renderInfo).forEach(function(word) {
			var wordRenderInfo = renderInfo[word];
			if (wordRenderInfo.x !== -1 && wordRenderInfo.y !== -1) {
				ctx.font = wordRenderInfo.fontSize + 'px ' + wordRenderInfo.fontFamily;
				ctx.fillStyle = 'red';
				ctx.fillText(word,wordRenderInfo.x,wordRenderInfo.y);
			}
		});
		return this;
	}
});


exports.Extend = _.extend;
exports.WordCloud = WordCloudCanvas;
},{"./layout":1,"./util":4}],3:[function(_dereq_,module,exports){
var _ = _dereq_('./util');

function createArray(length) {
	var arr = new Array(length || 0),
		i = length;

	if (arguments.length > 1) {
		var args = Array.prototype.slice.call(arguments, 1);
		while(i--) arr[length-1 - i] = createArray.apply(this, args);
	}

	return arr;
}

var TextBitmap = function(attributes) {
	this._canvas;
	this._context;
	_.extend(this,attributes);

	this._canvas = document.createElement('canvas');
	this._canvas.width = 640;
	this._canvas.height = 480;
	this._context = this._canvas.getContext('2d');

	//document.body.appendChild(this._canvas);

	this._bitmap = createArray(this._canvas.width,this._canvas.height);
	for (var i = 0; i < this._canvas.width; i++) {
		for (var j = 0; j < this._canvas.height; j++) {
			this._bitmap[i][j] = false;
		}
	}
};

TextBitmap.prototype = _.extend(TextBitmap.prototype, {

	create : function(text,fontHeight,fontFamily) {
		var ctx = this._context;
		ctx.fillStyle = 'black';
		ctx.fillRect(0,0,this._canvas.width,this._canvas.height);

		var offsetX = 5;

		ctx.fillStyle = 'white';
		ctx.font = fontHeight + 'px ' + fontFamily;
		ctx.fillText(text,offsetX,this._canvas.height/2);

		var width = ctx.measureText(text).width;

		var startX = offsetX;
		var startY = this._canvas.height/2 - fontHeight - 2;
		var endX = startX + width + offsetX;
		var endY = startY + fontHeight + fontHeight*0.5;



		var imageData = ctx.getImageData(startX,startY,endX - startX,endY - startY);

		var booleanBitmap = createArray(imageData.width,imageData.height);
		var x = 0;
		var y = 0;
		for (var i = 0; i < imageData.data.length; i+=4) {
			booleanBitmap[x][y] =  imageData.data[i] !== 0;
			x++;
			if (x === imageData.width) {
				x = 0;
				y++;
			}
		}


		var minX = Number.MAX_VALUE;
		var minY = Number.MAX_VALUE;
		var maxX = -Number.MAX_VALUE;
		var maxY = -Number.MAX_VALUE;
		for (var x = 0; x < booleanBitmap.length; x++) {
			for (var y = 0; y < booleanBitmap[x].length; y++) {
				if (booleanBitmap[x][y]) {
					minX = Math.min(minX,x);
					minY = Math.min(minY,y);
					maxX = Math.max(maxX,x);
					maxY = Math.max(maxY,y);
				}
			}
		}

		var trimmedBooleanBitmap = createArray(maxX-minX,maxY-minY);
		for (var x = 0; x < maxX-minX; x++) {
			for (var y = 0; y < maxY-minY; y++) {
				trimmedBooleanBitmap[x][y] = booleanBitmap[minX+x][minY+y];
			}
		}

		var renderInfo = {
			width : maxX-minX,
			height : maxY-minY,
			bitmap : trimmedBooleanBitmap,
			fontSize : fontHeight,
			fontFamily : fontFamily
		};

		return renderInfo;
	},
	intersects : function(renderInfo,bitmap) {

		if (renderInfo.x + renderInfo.width > bitmap.length) {
			return true;
		}

		if (renderInfo.y + renderInfo.height > bitmap[0].length) {
			return true;
		}


		var doesItFit = true;

		for (var u = 0; u < renderInfo.bitmap.length && doesItFit; u++) {
			for (var v = 0; v < renderInfo.bitmap[u].length && doesItFit; v++) {
				var x = renderInfo.x + u;
				var y = renderInfo.y + v;

				var a = renderInfo.bitmap[u][v];
				var b = bitmap[x][y];

				doesItFit &= !(a && b);
			}
		}

		return !doesItFit;
	}
});

module.exports = TextBitmap;
},{"./util":4}],4:[function(_dereq_,module,exports){

var Util = {

	extend: function(dest, sources) {
		var key, i, source;
		for (i=1; i<arguments.length; i++) {
		  source = arguments[i];
		  for (key in source) {
			if (source.hasOwnProperty(key)) {
			  dest[key] = source[key];
			}
		  }
		}
		return dest;
	},

	lerp : function(min,max,t) {
		return min + (t*(max-min));
	},

	step : function(min,max,t) {
		return Math.round(this.lerp(min,max,t));
	}
};

module.exports = Util;
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvV29yZENsb3VkQ2FudmFzL3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL1dvcmRDbG91ZENhbnZhcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFRleHRCaXRtYXAgPSByZXF1aXJlKCcuL3RleHRiaXRtYXAnKTtcblxuZnVuY3Rpb24gY3JlYXRlQXJyYXkobGVuZ3RoKSB7XG5cdHZhciBhcnIgPSBuZXcgQXJyYXkobGVuZ3RoIHx8IDApLFxuXHRcdGkgPSBsZW5ndGg7XG5cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdHdoaWxlKGktLSkgYXJyW2xlbmd0aC0xIC0gaV0gPSBjcmVhdGVBcnJheS5hcHBseSh0aGlzLCBhcmdzKTtcblx0fVxuXG5cdHJldHVybiBhcnI7XG59XG5cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcztcblx0dGhpcy5fd29yZHM7XG5cdHRoaXMuX3RleHRCaXRtYXBwZXI7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cdF9pbml0aWFsaXplIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG5ldyBUZXh0Qml0bWFwKCk7XG5cdFx0dGhpcy5fYml0bWFwID0gY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHRoaXMuX3dvcmRzID0gd29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuXG5cdGxheW91dCA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2luaXRpYWxpemUoKTtcblx0XHR2YXIgcmVuZGVySW5mbyA9IHt9O1xuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdFx0dmFyIG1heENvdW50ID0gMDtcblxuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKHRoYXQuX3dvcmRzW3dvcmRdLG1pbkNvdW50KTtcblx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heCh0aGF0Ll93b3Jkc1t3b3JkXSxtYXhDb3VudCk7XG5cdFx0XHR9KTtcblxuXG5cdFx0XHR2YXIgbWluRm9udFNpemUgPSAyMDtcblx0XHRcdHZhciBtYXhGb250U2l6ZSA9IDEwMDtcblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblxuXHRcdFx0XHR2YXIgdCA9ICh0aGF0Ll93b3Jkc1t3b3JkXSAtIG1pbkNvdW50KS8obWF4Q291bnQtbWluQ291bnQpO1xuXHRcdFx0XHR2YXIgZm9udFNpemUgPV8uc3RlcChtaW5Gb250U2l6ZSxtYXhGb250U2l6ZSx0KTtcblxuXHRcdFx0XHR2YXIgYml0bWFwID0gdGhhdC5fdGV4dEJpdG1hcHBlci5jcmVhdGUod29yZCxmb250U2l6ZSwnQ2FsaWJyaScpO1xuXHRcdFx0XHRyZW5kZXJJbmZvW3dvcmRdID0gYml0bWFwO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dmFyIHNvcnRlZFdvcmRBcnJheSA9IE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5zb3J0KGZ1bmN0aW9uKHcxLHcyKSB7XG5cdFx0XHRyZXR1cm4gdGhhdC5fd29yZHNbdzJdLXRoYXQuX3dvcmRzW3cxXTtcblx0XHR9KTtcblxuXHRcdHNvcnRlZFdvcmRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciBwbGFjZWQgPSBmYWxzZTtcblx0XHRcdHZhciBhdHRlbXB0cyA9IDMwO1xuXHRcdFx0d2hpbGUgKCFwbGFjZWQgJiYgYXR0ZW1wdHMgPiAwKSB7XG5cdFx0XHRcdHZhciB4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY2FudmFzLndpZHRoKVxuXHRcdFx0XHR2YXIgeSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0XHRcdHJlbmRlckluZm9bd29yZF0ueCA9IHg7XG5cdFx0XHRcdHJlbmRlckluZm9bd29yZF0ueSA9IHk7XG5cblx0XHRcdFx0dmFyIGN0eCA9IHRoYXQuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFx0XHRjdHguZm9udCA9IHJlbmRlckluZm9bd29yZF0uZm9udFNpemUgKyAncHggJyArIHJlbmRlckluZm9bd29yZF0uZm9udEZhbWlseTtcblx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuXHRcdFx0XHRjdHguZmlsbFRleHQod29yZCxyZW5kZXJJbmZvW3dvcmRdLngscmVuZGVySW5mb1t3b3JkXS55KTtcblxuXHRcdFx0XHRpZiAoIXRoYXQuX3RleHRCaXRtYXBwZXIuaW50ZXJzZWN0cyhyZW5kZXJJbmZvW3dvcmRdLHRoYXQuX2JpdG1hcCkpIHtcblx0XHRcdFx0XHRwbGFjZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0Zm9yICh2YXIgeCA9IHJlbmRlckluZm9bd29yZF0ueDsgeCA8IHJlbmRlckluZm9bd29yZF0ueCArIHJlbmRlckluZm9bd29yZF0ud2lkdGg7IHgrKykge1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgeSA9IHJlbmRlckluZm9bd29yZF0ueTsgeSA8IHJlbmRlckluZm9bd29yZF0ueSArIHJlbmRlckluZm9bd29yZF0uaGVpZ2h0OyB5KyspIHtcblx0XHRcdFx0XHRcdFx0dGhhdC5fYml0bWFwW3hdW3ldID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblxuXHRcdFx0XHRcdHZhciBpYnJlYWsgPSAwO1xuXHRcdFx0XHRcdGlicmVhaysrO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YXR0ZW1wdHMtLTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFwbGFjZWQpIHtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS54ID0gLTE7XG5cdFx0XHRcdHJlbmRlckluZm9bd29yZF0ueSA9IC0xO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5cbnZhciBXb3JkQ2xvdWRDYW52YXMgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cblx0dGhpcy5fd29yZHMgPSB7fTtcblx0dGhpcy5fc3RvcFdvcmRzID0ge307XG5cblx0dGhpcy5fY2FudmFzO1xuXHR0aGlzLl93aWR0aDtcblx0dGhpcy5faGVpZ2h0O1xuXHR0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblxuXHR0aGlzLl9sYXlvdXQ7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbldvcmRDbG91ZENhbnZhcy5wcm90b3R5cGUgPSBfLmV4dGVuZChXb3JkQ2xvdWRDYW52YXMucHJvdG90eXBlLCB7XG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblx0d2lkdGggOiBmdW5jdGlvbih3aWR0aCkge1xuXHRcdGlmICh3aWR0aCkge1xuXHRcdFx0aWYgKHRoaXMuX2NhbnZhcykge1xuXHRcdFx0XHR0aGlzLl9jYW52YXMud2lkdGggPSB3aWR0aDtcblx0XHRcdFx0dGhpcy5fd2lkdGggPSB3aWR0aDtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy53aWR0aDtcblx0XHR9XG5cdH0sXG5cdGhlaWdodCA6IGZ1bmN0aW9uKGhlaWdodCkge1xuXHRcdGlmIChoZWlnaHQpIHtcblx0XHRcdGlmICh0aGlzLl9jYW52YXMpIHtcblx0XHRcdFx0dGhpcy5fY2FudmFzLmhlaWdodCA9IGhlaWdodDtcblx0XHRcdFx0dGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9oZWlnaHQ7XG5cdFx0fVxuXHR9LFxuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyEkJVxcXiZcXCo7Ont9PVxcLV9gfigpXS9nLFwiXCIpO1xuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQucmVwbGFjZSgvXFxbWzAtOV0qXFxdL2csXCJcIik7XG5cdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5yZXBsYWNlKC9bXFx0K1xcW1xcXV0vZyxcIlwiKTtcblx0XHR2YXIgd29yZHMgPSBmaWx0ZXJlZC5zcGxpdCgnICcpO1xuXHRcdHRoaXMud29yZHMod29yZHMpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmF3KSB7XG5cdFx0XHRcdHZhciB3b3JkID0gcmF3LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRpZiAodGhhdC5fc3RvcFdvcmRzW3dvcmRdIHx8IHdvcmQgPT09ICcnKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGNvdW50ID0gdGhhdC5fd29yZHNbd29yZF07XG5cdFx0XHRcdGlmICghY291bnQpIHtcblx0XHRcdFx0XHRjb3VudCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0dGhhdC5fd29yZHNbd29yZF0gPSBjb3VudDtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuXHRnZW5lcmF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYXlvdXQgPSBuZXcgTGF5b3V0KClcblx0XHRcdC5jYW52YXModGhpcy5fY2FudmFzKVxuXHRcdFx0LndvcmRzKHRoaXMuX3dvcmRzKTtcblxuXHRcdHZhciByZW5kZXJJbmZvID0gbGF5b3V0LmxheW91dCgpO1xuXG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGlmICh0aGlzLl9iYWNrZ3JvdW5kRmlsbCkge1xuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuX2JhY2tncm91bmRGaWxsO1xuXHRcdFx0Y3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuX3dpZHRoLCB0aGlzLl9oZWlnaHQpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5rZXlzKHJlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0dmFyIHdvcmRSZW5kZXJJbmZvID0gcmVuZGVySW5mb1t3b3JkXTtcblx0XHRcdGlmICh3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuXHRcdFx0XHRjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuXHRcdFx0XHRjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG5cdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5cbmV4cG9ydHMuRXh0ZW5kID0gXy5leHRlbmQ7XG5leHBvcnRzLldvcmRDbG91ZCA9IFdvcmRDbG91ZENhbnZhczsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpIHtcblx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0aSA9IGxlbmd0aDtcblxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0d2hpbGUoaS0tKSBhcnJbbGVuZ3RoLTEgLSBpXSA9IGNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHR9XG5cblx0cmV0dXJuIGFycjtcbn1cblxudmFyIFRleHRCaXRtYXAgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcztcblx0dGhpcy5fY29udGV4dDtcblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcblxuXHR0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0dGhpcy5fY2FudmFzLndpZHRoID0gNjQwO1xuXHR0aGlzLl9jYW52YXMuaGVpZ2h0ID0gNDgwO1xuXHR0aGlzLl9jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0Ly9kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG5cblx0dGhpcy5fYml0bWFwID0gY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuVGV4dEJpdG1hcC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0Qml0bWFwLnByb3RvdHlwZSwge1xuXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uKHRleHQsZm9udEhlaWdodCxmb250RmFtaWx5KSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NvbnRleHQ7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgb2Zmc2V0WCA9IDU7XG5cblx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRjdHguZm9udCA9IGZvbnRIZWlnaHQgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cdFx0Y3R4LmZpbGxUZXh0KHRleHQsb2Zmc2V0WCx0aGlzLl9jYW52YXMuaGVpZ2h0LzIpO1xuXG5cdFx0dmFyIHdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuXG5cdFx0dmFyIHN0YXJ0WCA9IG9mZnNldFg7XG5cdFx0dmFyIHN0YXJ0WSA9IHRoaXMuX2NhbnZhcy5oZWlnaHQvMiAtIGZvbnRIZWlnaHQgLSAyO1xuXHRcdHZhciBlbmRYID0gc3RhcnRYICsgd2lkdGggKyBvZmZzZXRYO1xuXHRcdHZhciBlbmRZID0gc3RhcnRZICsgZm9udEhlaWdodCArIGZvbnRIZWlnaHQqMC41O1xuXG5cblxuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKHN0YXJ0WCxzdGFydFksZW5kWCAtIHN0YXJ0WCxlbmRZIC0gc3RhcnRZKTtcblxuXHRcdHZhciBib29sZWFuQml0bWFwID0gY3JlYXRlQXJyYXkoaW1hZ2VEYXRhLndpZHRoLGltYWdlRGF0YS5oZWlnaHQpO1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkrPTQpIHtcblx0XHRcdGJvb2xlYW5CaXRtYXBbeF1beV0gPSAgaW1hZ2VEYXRhLmRhdGFbaV0gIT09IDA7XG5cdFx0XHR4Kys7XG5cdFx0XHRpZiAoeCA9PT0gaW1hZ2VEYXRhLndpZHRoKSB7XG5cdFx0XHRcdHggPSAwO1xuXHRcdFx0XHR5Kys7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHR2YXIgbWluWCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1pblkgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhYID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFkgPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRmb3IgKHZhciB4ID0gMDsgeCA8IGJvb2xlYW5CaXRtYXAubGVuZ3RoOyB4KyspIHtcblx0XHRcdGZvciAodmFyIHkgPSAwOyB5IDwgYm9vbGVhbkJpdG1hcFt4XS5sZW5ndGg7IHkrKykge1xuXHRcdFx0XHRpZiAoYm9vbGVhbkJpdG1hcFt4XVt5XSkge1xuXHRcdFx0XHRcdG1pblggPSBNYXRoLm1pbihtaW5YLHgpO1xuXHRcdFx0XHRcdG1pblkgPSBNYXRoLm1pbihtaW5ZLHkpO1xuXHRcdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLHgpO1xuXHRcdFx0XHRcdG1heFkgPSBNYXRoLm1heChtYXhZLHkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIHRyaW1tZWRCb29sZWFuQml0bWFwID0gY3JlYXRlQXJyYXkobWF4WC1taW5YLG1heFktbWluWSk7XG5cdFx0Zm9yICh2YXIgeCA9IDA7IHggPCBtYXhYLW1pblg7IHgrKykge1xuXHRcdFx0Zm9yICh2YXIgeSA9IDA7IHkgPCBtYXhZLW1pblk7IHkrKykge1xuXHRcdFx0XHR0cmltbWVkQm9vbGVhbkJpdG1hcFt4XVt5XSA9IGJvb2xlYW5CaXRtYXBbbWluWCt4XVttaW5ZK3ldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciByZW5kZXJJbmZvID0ge1xuXHRcdFx0d2lkdGggOiBtYXhYLW1pblgsXG5cdFx0XHRoZWlnaHQgOiBtYXhZLW1pblksXG5cdFx0XHRiaXRtYXAgOiB0cmltbWVkQm9vbGVhbkJpdG1hcCxcblx0XHRcdGZvbnRTaXplIDogZm9udEhlaWdodCxcblx0XHRcdGZvbnRGYW1pbHkgOiBmb250RmFtaWx5XG5cdFx0fTtcblxuXHRcdHJldHVybiByZW5kZXJJbmZvO1xuXHR9LFxuXHRpbnRlcnNlY3RzIDogZnVuY3Rpb24ocmVuZGVySW5mbyxiaXRtYXApIHtcblxuXHRcdGlmIChyZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLndpZHRoID4gYml0bWFwLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0aWYgKHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uaGVpZ2h0ID4gYml0bWFwWzBdLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cblx0XHR2YXIgZG9lc0l0Rml0ID0gdHJ1ZTtcblxuXHRcdGZvciAodmFyIHUgPSAwOyB1IDwgcmVuZGVySW5mby5iaXRtYXAubGVuZ3RoICYmIGRvZXNJdEZpdDsgdSsrKSB7XG5cdFx0XHRmb3IgKHZhciB2ID0gMDsgdiA8IHJlbmRlckluZm8uYml0bWFwW3VdLmxlbmd0aCAmJiBkb2VzSXRGaXQ7IHYrKykge1xuXHRcdFx0XHR2YXIgeCA9IHJlbmRlckluZm8ueCArIHU7XG5cdFx0XHRcdHZhciB5ID0gcmVuZGVySW5mby55ICsgdjtcblxuXHRcdFx0XHR2YXIgYSA9IHJlbmRlckluZm8uYml0bWFwW3VdW3ZdO1xuXHRcdFx0XHR2YXIgYiA9IGJpdG1hcFt4XVt5XTtcblxuXHRcdFx0XHRkb2VzSXRGaXQgJj0gIShhICYmIGIpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiAhZG9lc0l0Rml0O1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0Qml0bWFwOyIsIlxudmFyIFV0aWwgPSB7XG5cblx0ZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG5cdFx0dmFyIGtleSwgaSwgc291cmNlO1xuXHRcdGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdCAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuXHRcdCAgZm9yIChrZXkgaW4gc291cmNlKSB7XG5cdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdCAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG5cdFx0XHR9XG5cdFx0ICB9XG5cdFx0fVxuXHRcdHJldHVybiBkZXN0O1xuXHR9LFxuXG5cdGxlcnAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gbWluICsgKHQqKG1heC1taW4pKTtcblx0fSxcblxuXHRzdGVwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIE1hdGgucm91bmQodGhpcy5sZXJwKG1pbixtYXgsdCkpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(2)
});
