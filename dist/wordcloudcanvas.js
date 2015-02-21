!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.WordCloudCanvas=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var TextBitmap = _dereq_('./textbitmap');

function createArray(length) {
	var arr = new Array(length || 0),
		i = length;

	if (arguments.length > 1) {
		var args = Array.prototype.slice.call(arguments, 1);
		while(i--) {
			arr[length-1 - i] = createArray.apply(this, args);
		}
	}

	return arr;
}

var Layout = function(attributes) {
	this._canvas = null;
	this._words = null;
	this._bitmap = null;
	this._textBitmapper = null;

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

	bitmap : function() {
		return this._textBitmapper.toCanvas(this._bitmap);
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


			var minFontSize = 10;
			var maxFontSize = 200;
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

		function debugDrawAll(ctx,w,h) {
			ctx.fillStyle = 'white';
			ctx.fillRect(0,0,w,h);
			Object.keys(renderInfo).forEach(function(word) {
				var wordRenderInfo = renderInfo[word];
				if (wordRenderInfo.x !== undefined && wordRenderInfo.x !== -1 && wordRenderInfo.y !== undefined && wordRenderInfo.y !== -1) {
					ctx.font = wordRenderInfo.fontSize + 'px ' + wordRenderInfo.fontFamily;
					ctx.fillStyle = 'red';
					ctx.strokeStyle = 'green';
					ctx.fillText(word,wordRenderInfo.x,wordRenderInfo.y);
					ctx.strokeRect(wordRenderInfo.x + wordRenderInfo.bb.offsetX, wordRenderInfo.y + wordRenderInfo.bb.offsetY, wordRenderInfo.bb.width, wordRenderInfo.bb.height);
				}
			});
		}

		sortedWordArray.forEach(function(word) {
			var placed = false;
			var attempts = 100;
			debugDrawAll(that._canvas.getContext('2d'),that._canvas.width, that._canvas.height);
			while (!placed && attempts > 0) {
				var x = Math.floor(Math.random() * that._canvas.width);
				var y = Math.floor(Math.random() * that._canvas.height);

				renderInfo[word].x = x;
				renderInfo[word].y = y;

				if (that._textBitmapper.fits(renderInfo[word],that._bitmap)) {
					placed = true;

					var bitmapWidth = renderInfo[word].bitmap.length;
					var bitmapHeight = renderInfo[word].bitmap[0].length;

					for (var i = 0; i < bitmapWidth; i++) {
						for (var j = 0; j < bitmapHeight; j++) {
							var u = renderInfo[word].x + renderInfo[word].bb.offsetX + i;
							var v = renderInfo[word].y + renderInfo[word].bb.offsetY + j;

							that._bitmap[u][v] |= renderInfo[word].bitmap[i][j];
						}
					}

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

	this._canvas = null;
	this._width = null;
	this._height = null;
	this._backgroundFill = null;

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
				ctx.strokeStyle = 'green';
				ctx.fillText(word,wordRenderInfo.x,wordRenderInfo.y);
//				ctx.strokeRect(wordRenderInfo.x + wordRenderInfo.bb.offsetX, wordRenderInfo.y + wordRenderInfo.bb.offsetY, wordRenderInfo.bb.width, wordRenderInfo.bb.height);
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
		while(i--) {
			arr[length - 1 - i] = createArray.apply(this, args);
		}
	}


	return arr;
}

var TextBitmap = function(attributes) {
	this._canvas = null;
	this._context = null;
	_.extend(this,attributes);

	this._canvas = document.createElement('canvas');
	this._canvas.width = 640;
	this._canvas.height = 480;
	this._context = this._canvas.getContext('2d');

	document.body.appendChild(this._canvas);

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




		var textRenderX = 5;
		var textRenderY = Math.floor(this._canvas.height/2);

		ctx.fillStyle = 'white';
		ctx.font = fontHeight + 'px ' + fontFamily;
		ctx.fillText(text,textRenderX,textRenderY);

		var width = ctx.measureText(text).width;

		var startX = textRenderX;
		var startY = textRenderY - fontHeight - 2;
		var endX = startX + width + textRenderX;
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
		for (x = 0; x < booleanBitmap.length; x++) {
			for (y = 0; y < booleanBitmap[x].length; y++) {
				if (booleanBitmap[x][y]) {
					minX = Math.min(minX,x);
					minY = Math.min(minY,y);
					maxX = Math.max(maxX,x);
					maxY = Math.max(maxY,y);
				}
			}
		}

		var trimmedBooleanBitmap = createArray(maxX-minX,maxY-minY);
		for (x = 0; x < maxX-minX; x++) {
			for (y = 0; y < maxY-minY; y++) {
				trimmedBooleanBitmap[x][y] = booleanBitmap[minX+x][minY+y];
			}
		}

		ctx.strokeStyle = 'yellow';
		ctx.strokeRect(startX,startY,endX-startX,endY-startY);

		ctx.strokeStyle = 'red';
		ctx.strokeRect(textRenderX,textRenderY,this._canvas.width, this._canvas.height);

		var bbWidth = maxX-minX;
		var bbHeight = maxY-minY;
		var bbOffsetX = -(textRenderX - (startX + minX ));
		var bbOffsetY = -(textRenderY - (startY + minY));

		ctx.strokeStyle = 'green';
		ctx.strokeRect(textRenderX + bbOffsetX, textRenderY + bbOffsetY, bbWidth, bbHeight);

		var renderInfo = {
			bb : {
				offsetX : bbOffsetX,
				offsetY : bbOffsetY,
				width : bbWidth,
				height : bbHeight
			},
			bitmap : trimmedBooleanBitmap,
			fontSize : fontHeight,
			fontFamily : fontFamily
		};

		return renderInfo;
	},
	fits : function(renderInfo,bitmap) {

		var startX = renderInfo.x + renderInfo.bb.offsetX;
		var startY = renderInfo.y + renderInfo.bb.offsetY;

		var bitmapWidth = bitmap.length;
		var bitmapHeight = bitmap[0].length;

		var hitEdge = startX < 0 || startY < 0;
		var hitOther = false;
		var doesntFit = hitEdge || hitOther;

		for (var i = 0; i < renderInfo.bb.width && !doesntFit; i++) {
			var u = startX + i;
			for (var j = 0; j < renderInfo.bb.height && !doesntFit; j++) {
				var v = startY + j;
				if (u >= bitmapWidth || v >= bitmapHeight) {
					hitEdge = true;
				} else if (bitmap[u][v]) {
					hitOther = true;
				}
				doesntFit = hitEdge || hitOther;
			}
		}
		return !doesntFit;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvV29yZENsb3VkQ2FudmFzL3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL1dvcmRDbG91ZENhbnZhcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVGV4dEJpdG1hcCA9IHJlcXVpcmUoJy4vdGV4dGJpdG1hcCcpO1xuXG5mdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpIHtcblx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0aSA9IGxlbmd0aDtcblxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0d2hpbGUoaS0tKSB7XG5cdFx0XHRhcnJbbGVuZ3RoLTEgLSBpXSA9IGNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhcnI7XG59XG5cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX3dvcmRzID0gbnVsbDtcblx0dGhpcy5fYml0bWFwID0gbnVsbDtcblx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cdF9pbml0aWFsaXplIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG5ldyBUZXh0Qml0bWFwKCk7XG5cdFx0dGhpcy5fYml0bWFwID0gY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHRoaXMuX3dvcmRzID0gd29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuXHRiaXRtYXAgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fdGV4dEJpdG1hcHBlci50b0NhbnZhcyh0aGlzLl9iaXRtYXApO1xuXHR9LFxuXG5cdGxheW91dCA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2luaXRpYWxpemUoKTtcblx0XHR2YXIgcmVuZGVySW5mbyA9IHt9O1xuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdFx0dmFyIG1heENvdW50ID0gMDtcblxuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKHRoYXQuX3dvcmRzW3dvcmRdLG1pbkNvdW50KTtcblx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heCh0aGF0Ll93b3Jkc1t3b3JkXSxtYXhDb3VudCk7XG5cdFx0XHR9KTtcblxuXG5cdFx0XHR2YXIgbWluRm9udFNpemUgPSAxMDtcblx0XHRcdHZhciBtYXhGb250U2l6ZSA9IDIwMDtcblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblxuXHRcdFx0XHR2YXIgdCA9ICh0aGF0Ll93b3Jkc1t3b3JkXSAtIG1pbkNvdW50KS8obWF4Q291bnQtbWluQ291bnQpO1xuXHRcdFx0XHR2YXIgZm9udFNpemUgPV8uc3RlcChtaW5Gb250U2l6ZSxtYXhGb250U2l6ZSx0KTtcblxuXHRcdFx0XHR2YXIgYml0bWFwID0gdGhhdC5fdGV4dEJpdG1hcHBlci5jcmVhdGUod29yZCxmb250U2l6ZSwnQ2FsaWJyaScpO1xuXHRcdFx0XHRyZW5kZXJJbmZvW3dvcmRdID0gYml0bWFwO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dmFyIHNvcnRlZFdvcmRBcnJheSA9IE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5zb3J0KGZ1bmN0aW9uKHcxLHcyKSB7XG5cdFx0XHRyZXR1cm4gdGhhdC5fd29yZHNbdzJdLXRoYXQuX3dvcmRzW3cxXTtcblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIGRlYnVnRHJhd0FsbChjdHgsdyxoKSB7XG5cdFx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRcdGN0eC5maWxsUmVjdCgwLDAsdyxoKTtcblx0XHRcdE9iamVjdC5rZXlzKHJlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHR2YXIgd29yZFJlbmRlckluZm8gPSByZW5kZXJJbmZvW3dvcmRdO1xuXHRcdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gdW5kZWZpbmVkICYmIHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuXHRcdFx0XHRcdGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRcdFx0Y3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcblx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRzb3J0ZWRXb3JkQXJyYXkuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHR2YXIgcGxhY2VkID0gZmFsc2U7XG5cdFx0XHR2YXIgYXR0ZW1wdHMgPSAxMDA7XG5cdFx0XHRkZWJ1Z0RyYXdBbGwodGhhdC5fY2FudmFzLmdldENvbnRleHQoJzJkJyksdGhhdC5fY2FudmFzLndpZHRoLCB0aGF0Ll9jYW52YXMuaGVpZ2h0KTtcblx0XHRcdHdoaWxlICghcGxhY2VkICYmIGF0dGVtcHRzID4gMCkge1xuXHRcdFx0XHR2YXIgeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NhbnZhcy53aWR0aCk7XG5cdFx0XHRcdHZhciB5ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY2FudmFzLmhlaWdodCk7XG5cblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS54ID0geDtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS55ID0geTtcblxuXHRcdFx0XHRpZiAodGhhdC5fdGV4dEJpdG1hcHBlci5maXRzKHJlbmRlckluZm9bd29yZF0sdGhhdC5fYml0bWFwKSkge1xuXHRcdFx0XHRcdHBsYWNlZCA9IHRydWU7XG5cblx0XHRcdFx0XHR2YXIgYml0bWFwV2lkdGggPSByZW5kZXJJbmZvW3dvcmRdLmJpdG1hcC5sZW5ndGg7XG5cdFx0XHRcdFx0dmFyIGJpdG1hcEhlaWdodCA9IHJlbmRlckluZm9bd29yZF0uYml0bWFwWzBdLmxlbmd0aDtcblxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYml0bWFwV2lkdGg7IGkrKykge1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBiaXRtYXBIZWlnaHQ7IGorKykge1xuXHRcdFx0XHRcdFx0XHR2YXIgdSA9IHJlbmRlckluZm9bd29yZF0ueCArIHJlbmRlckluZm9bd29yZF0uYmIub2Zmc2V0WCArIGk7XG5cdFx0XHRcdFx0XHRcdHZhciB2ID0gcmVuZGVySW5mb1t3b3JkXS55ICsgcmVuZGVySW5mb1t3b3JkXS5iYi5vZmZzZXRZICsgajtcblxuXHRcdFx0XHRcdFx0XHR0aGF0Ll9iaXRtYXBbdV1bdl0gfD0gcmVuZGVySW5mb1t3b3JkXS5iaXRtYXBbaV1bal07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YXR0ZW1wdHMtLTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFwbGFjZWQpIHtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS54ID0gLTE7XG5cdFx0XHRcdHJlbmRlckluZm9bd29yZF0ueSA9IC0xO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5cbnZhciBXb3JkQ2xvdWRDYW52YXMgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cblx0dGhpcy5fd29yZHMgPSB7fTtcblx0dGhpcy5fc3RvcFdvcmRzID0ge307XG5cblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fd2lkdGggPSBudWxsO1xuXHR0aGlzLl9oZWlnaHQgPSBudWxsO1xuXHR0aGlzLl9iYWNrZ3JvdW5kRmlsbCA9IG51bGw7XG5cblx0dGhpcy5fbGF5b3V0ID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuV29yZENsb3VkQ2FudmFzLnByb3RvdHlwZSA9IF8uZXh0ZW5kKFdvcmRDbG91ZENhbnZhcy5wcm90b3R5cGUsIHtcblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXHRcdFx0dGhpcy5fd2lkdGggPSBjYW52YXMud2lkdGg7XG5cdFx0XHR0aGlzLl9oZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHR9LFxuXHR3aWR0aCA6IGZ1bmN0aW9uKHdpZHRoKSB7XG5cdFx0aWYgKHdpZHRoKSB7XG5cdFx0XHRpZiAodGhpcy5fY2FudmFzKSB7XG5cdFx0XHRcdHRoaXMuX2NhbnZhcy53aWR0aCA9IHdpZHRoO1xuXHRcdFx0XHR0aGlzLl93aWR0aCA9IHdpZHRoO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLndpZHRoO1xuXHRcdH1cblx0fSxcblx0aGVpZ2h0IDogZnVuY3Rpb24oaGVpZ2h0KSB7XG5cdFx0aWYgKGhlaWdodCkge1xuXHRcdFx0aWYgKHRoaXMuX2NhbnZhcykge1xuXHRcdFx0XHR0aGlzLl9jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdFx0XHR0aGlzLl9oZWlnaHQgPSBoZWlnaHQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2hlaWdodDtcblx0XHR9XG5cdH0sXG5cdHRleHQgOiBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0dmFyIGZpbHRlcmVkID0gdGV4dC5yZXBsYWNlKC9bXFwuLC1cXC8jISQlXFxeJlxcKjs6e309XFwtX2B+KCldL2csJycpO1xuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQucmVwbGFjZSgvXFxbWzAtOV0qXFxdL2csJycpO1xuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQucmVwbGFjZSgvW1xcdCtcXFtcXF1dL2csJycpO1xuXHRcdHZhciB3b3JkcyA9IGZpbHRlcmVkLnNwbGl0KCcgJyk7XG5cdFx0dGhpcy53b3Jkcyh3b3Jkcyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0c3RvcCA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uICh3b3JkKSB7XG5cdFx0XHRcdHRoYXQuX3N0b3BXb3Jkc1t3b3JkLnRyaW0oKS50b0xvd2VyQ2FzZSgpXSA9IHRydWU7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fc3RvcFdvcmRzO1xuXHRcdH1cblx0fSxcblxuXHRiYWNrZ3JvdW5kIDogZnVuY3Rpb24oZmlsbFN0eWxlKSB7XG5cdFx0aWYgKGZpbGxTdHlsZSkge1xuXHRcdFx0dGhpcy5fYmFja2dyb3VuZEZpbGwgPSBmaWxsU3R5bGU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2JhY2tncm91bmRGaWxsO1xuXHRcdH1cblx0fSxcblxuXHR3b3JkcyA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyYXcpIHtcblx0XHRcdFx0dmFyIHdvcmQgPSByYXcudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdGlmICh0aGF0Ll9zdG9wV29yZHNbd29yZF0gfHwgd29yZCA9PT0gJycpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0aWYgKCFjb3VudCkge1xuXHRcdFx0XHRcdGNvdW50ID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHR0aGF0Ll93b3Jkc1t3b3JkXSA9IGNvdW50O1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdGdlbmVyYXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGxheW91dCA9IG5ldyBMYXlvdXQoKVxuXHRcdFx0LmNhbnZhcyh0aGlzLl9jYW52YXMpXG5cdFx0XHQud29yZHModGhpcy5fd29yZHMpO1xuXG5cdFx0dmFyIHJlbmRlckluZm8gPSBsYXlvdXQubGF5b3V0KCk7XG5cblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0aWYgKHRoaXMuX2JhY2tncm91bmRGaWxsKSB7XG5cdFx0XHRjdHguZmlsbFN0eWxlID0gdGhpcy5fYmFja2dyb3VuZEZpbGw7XG5cdFx0XHRjdHguZmlsbFJlY3QoMCwgMCwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG5cdFx0fVxuXG5cdFx0T2JqZWN0LmtleXMocmVuZGVySW5mbykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHR2YXIgd29yZFJlbmRlckluZm8gPSByZW5kZXJJbmZvW3dvcmRdO1xuXHRcdFx0aWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IC0xKSB7XG5cdFx0XHRcdGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG5cdFx0XHRcdGN0eC5maWxsU3R5bGUgPSAncmVkJztcblx0XHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdFx0Y3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcbi8vXHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuXG5leHBvcnRzLkV4dGVuZCA9IF8uZXh0ZW5kO1xuZXhwb3J0cy5Xb3JkQ2xvdWQgPSBXb3JkQ2xvdWRDYW52YXM7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZnVuY3Rpb24gY3JlYXRlQXJyYXkobGVuZ3RoKSB7XG5cdHZhciBhcnIgPSBuZXcgQXJyYXkobGVuZ3RoIHx8IDApLFxuXHRcdGkgPSBsZW5ndGg7XG5cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdHdoaWxlKGktLSkge1xuXHRcdFx0YXJyW2xlbmd0aCAtIDEgLSBpXSA9IGNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdH1cblx0fVxuXG5cblx0cmV0dXJuIGFycjtcbn1cblxudmFyIFRleHRCaXRtYXAgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX2NvbnRleHQgPSBudWxsO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xuXG5cdHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHR0aGlzLl9jYW52YXMud2lkdGggPSA2NDA7XG5cdHRoaXMuX2NhbnZhcy5oZWlnaHQgPSA0ODA7XG5cdHRoaXMuX2NvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG5cblx0dGhpcy5fYml0bWFwID0gY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuVGV4dEJpdG1hcC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0Qml0bWFwLnByb3RvdHlwZSwge1xuXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uKHRleHQsZm9udEhlaWdodCxmb250RmFtaWx5KSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NvbnRleHQ7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblxuXG5cblx0XHR2YXIgdGV4dFJlbmRlclggPSA1O1xuXHRcdHZhciB0ZXh0UmVuZGVyWSA9IE1hdGguZmxvb3IodGhpcy5fY2FudmFzLmhlaWdodC8yKTtcblxuXHRcdGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGN0eC5mb250ID0gZm9udEhlaWdodCArICdweCAnICsgZm9udEZhbWlseTtcblx0XHRjdHguZmlsbFRleHQodGV4dCx0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSk7XG5cblx0XHR2YXIgd2lkdGggPSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGg7XG5cblx0XHR2YXIgc3RhcnRYID0gdGV4dFJlbmRlclg7XG5cdFx0dmFyIHN0YXJ0WSA9IHRleHRSZW5kZXJZIC0gZm9udEhlaWdodCAtIDI7XG5cdFx0dmFyIGVuZFggPSBzdGFydFggKyB3aWR0aCArIHRleHRSZW5kZXJYO1xuXHRcdHZhciBlbmRZID0gc3RhcnRZICsgZm9udEhlaWdodCArIGZvbnRIZWlnaHQqMC41O1xuXG5cblxuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKHN0YXJ0WCxzdGFydFksZW5kWCAtIHN0YXJ0WCxlbmRZIC0gc3RhcnRZKTtcblxuXHRcdHZhciBib29sZWFuQml0bWFwID0gY3JlYXRlQXJyYXkoaW1hZ2VEYXRhLndpZHRoLGltYWdlRGF0YS5oZWlnaHQpO1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkrPTQpIHtcblxuXHRcdFx0Ym9vbGVhbkJpdG1hcFt4XVt5XSA9ICBpbWFnZURhdGEuZGF0YVtpXSAhPT0gMDtcblx0XHRcdHgrKztcblx0XHRcdGlmICh4ID09PSBpbWFnZURhdGEud2lkdGgpIHtcblx0XHRcdFx0eCA9IDA7XG5cdFx0XHRcdHkrKztcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWluWSA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFggPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WSA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGZvciAoeCA9IDA7IHggPCBib29sZWFuQml0bWFwLmxlbmd0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgYm9vbGVhbkJpdG1hcFt4XS5sZW5ndGg7IHkrKykge1xuXHRcdFx0XHRpZiAoYm9vbGVhbkJpdG1hcFt4XVt5XSkge1xuXHRcdFx0XHRcdG1pblggPSBNYXRoLm1pbihtaW5YLHgpO1xuXHRcdFx0XHRcdG1pblkgPSBNYXRoLm1pbihtaW5ZLHkpO1xuXHRcdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLHgpO1xuXHRcdFx0XHRcdG1heFkgPSBNYXRoLm1heChtYXhZLHkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIHRyaW1tZWRCb29sZWFuQml0bWFwID0gY3JlYXRlQXJyYXkobWF4WC1taW5YLG1heFktbWluWSk7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IG1heFgtbWluWDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgbWF4WS1taW5ZOyB5KyspIHtcblx0XHRcdFx0dHJpbW1lZEJvb2xlYW5CaXRtYXBbeF1beV0gPSBib29sZWFuQml0bWFwW21pblgreF1bbWluWSt5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjdHguc3Ryb2tlU3R5bGUgPSAneWVsbG93Jztcblx0XHRjdHguc3Ryb2tlUmVjdChzdGFydFgsc3RhcnRZLGVuZFgtc3RhcnRYLGVuZFktc3RhcnRZKTtcblxuXHRcdGN0eC5zdHJva2VTdHlsZSA9ICdyZWQnO1xuXHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYLHRleHRSZW5kZXJZLHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgYmJXaWR0aCA9IG1heFgtbWluWDtcblx0XHR2YXIgYmJIZWlnaHQgPSBtYXhZLW1pblk7XG5cdFx0dmFyIGJiT2Zmc2V0WCA9IC0odGV4dFJlbmRlclggLSAoc3RhcnRYICsgbWluWCApKTtcblx0XHR2YXIgYmJPZmZzZXRZID0gLSh0ZXh0UmVuZGVyWSAtIChzdGFydFkgKyBtaW5ZKSk7XG5cblx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYICsgYmJPZmZzZXRYLCB0ZXh0UmVuZGVyWSArIGJiT2Zmc2V0WSwgYmJXaWR0aCwgYmJIZWlnaHQpO1xuXG5cdFx0dmFyIHJlbmRlckluZm8gPSB7XG5cdFx0XHRiYiA6IHtcblx0XHRcdFx0b2Zmc2V0WCA6IGJiT2Zmc2V0WCxcblx0XHRcdFx0b2Zmc2V0WSA6IGJiT2Zmc2V0WSxcblx0XHRcdFx0d2lkdGggOiBiYldpZHRoLFxuXHRcdFx0XHRoZWlnaHQgOiBiYkhlaWdodFxuXHRcdFx0fSxcblx0XHRcdGJpdG1hcCA6IHRyaW1tZWRCb29sZWFuQml0bWFwLFxuXHRcdFx0Zm9udFNpemUgOiBmb250SGVpZ2h0LFxuXHRcdFx0Zm9udEZhbWlseSA6IGZvbnRGYW1pbHlcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH0sXG5cdGZpdHMgOiBmdW5jdGlvbihyZW5kZXJJbmZvLGJpdG1hcCkge1xuXG5cdFx0dmFyIHN0YXJ0WCA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WDtcblx0XHR2YXIgc3RhcnRZID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZO1xuXG5cdFx0dmFyIGJpdG1hcFdpZHRoID0gYml0bWFwLmxlbmd0aDtcblx0XHR2YXIgYml0bWFwSGVpZ2h0ID0gYml0bWFwWzBdLmxlbmd0aDtcblxuXHRcdHZhciBoaXRFZGdlID0gc3RhcnRYIDwgMCB8fCBzdGFydFkgPCAwO1xuXHRcdHZhciBoaXRPdGhlciA9IGZhbHNlO1xuXHRcdHZhciBkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByZW5kZXJJbmZvLmJiLndpZHRoICYmICFkb2VzbnRGaXQ7IGkrKykge1xuXHRcdFx0dmFyIHUgPSBzdGFydFggKyBpO1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCByZW5kZXJJbmZvLmJiLmhlaWdodCAmJiAhZG9lc250Rml0OyBqKyspIHtcblx0XHRcdFx0dmFyIHYgPSBzdGFydFkgKyBqO1xuXHRcdFx0XHRpZiAodSA+PSBiaXRtYXBXaWR0aCB8fCB2ID49IGJpdG1hcEhlaWdodCkge1xuXHRcdFx0XHRcdGhpdEVkZ2UgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGJpdG1hcFt1XVt2XSkge1xuXHRcdFx0XHRcdGhpdE90aGVyID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gIWRvZXNudEZpdDtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dEJpdG1hcDsiLCJcbnZhciBVdGlsID0ge1xuXG5cdGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuXHRcdHZhciBrZXksIGksIHNvdXJjZTtcblx0XHRmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHQgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblx0XHQgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuXHRcdFx0aWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHQgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuXHRcdFx0fVxuXHRcdCAgfVxuXHRcdH1cblx0XHRyZXR1cm4gZGVzdDtcblx0fSxcblxuXHRsZXJwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIG1pbiArICh0KihtYXgtbWluKSk7XG5cdH0sXG5cblx0c3RlcCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBNYXRoLnJvdW5kKHRoaXMubGVycChtaW4sbWF4LHQpKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(2)
});
