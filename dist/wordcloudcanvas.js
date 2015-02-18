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
			Object.keys(this._words).forEach(function(word) {
				var bitmap = that._textBitmapper.create(word,20,'Calibri');
				renderInfo[word] = bitmap;
			});
		}
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
		for (var x = minX; x < maxX; x++) {
			for (var y = minY; y < minY; y++) {
				trimmedBooleanBitmap[x][y] = booleanBitmap[x][y];
			}
		}

		var renderInfo = {
			width : maxX-minX,
			height : maxY-minY,
			bitmap : trimmedBooleanBitmap
		};

		return renderInfo;
	},
	intersects : function(b1,b2) {
		// TODO:

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
  }
};

module.exports = Util;
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvV29yZENsb3VkQ2FudmFzL3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL1dvcmRDbG91ZENhbnZhcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBUZXh0Qml0bWFwID0gcmVxdWlyZSgnLi90ZXh0Yml0bWFwJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCkge1xuXHR2YXIgYXJyID0gbmV3IEFycmF5KGxlbmd0aCB8fCAwKSxcblx0XHRpID0gbGVuZ3RoO1xuXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHR3aGlsZShpLS0pIGFycltsZW5ndGgtMSAtIGldID0gY3JlYXRlQXJyYXkuYXBwbHkodGhpcywgYXJncyk7XG5cdH1cblxuXHRyZXR1cm4gYXJyO1xufVxuXG52YXIgTGF5b3V0ID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9jYW52YXM7XG5cdHRoaXMuX3dvcmRzO1xuXHR0aGlzLl90ZXh0Qml0bWFwcGVyO1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoTGF5b3V0LnByb3RvdHlwZSwge1xuXHRfaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3RleHRCaXRtYXBwZXIgPSBuZXcgVGV4dEJpdG1hcCgpO1xuXHRcdHRoaXMuX2JpdG1hcCA9IGNyZWF0ZUFycmF5KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuX2NhbnZhcy5oZWlnaHQ7IGorKykge1xuXHRcdFx0XHR0aGlzLl9iaXRtYXBbaV1bal0gPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHR9LFxuXHR3b3JkcyA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR0aGlzLl93b3JkcyA9IHdvcmRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cdGxheW91dCA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2luaXRpYWxpemUoKTtcblx0XHR2YXIgcmVuZGVySW5mbyA9IHt9O1xuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHR2YXIgYml0bWFwID0gdGhhdC5fdGV4dEJpdG1hcHBlci5jcmVhdGUod29yZCwyMCwnQ2FsaWJyaScpO1xuXHRcdFx0XHRyZW5kZXJJbmZvW3dvcmRdID0gYml0bWFwO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiByZW5kZXJJbmZvO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgV29yZENsb3VkQ2FudmFzID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXG5cdHRoaXMuX3dvcmRzID0ge307XG5cdHRoaXMuX3N0b3BXb3JkcyA9IHt9O1xuXG5cdHRoaXMuX2NhbnZhcztcblx0dGhpcy5fd2lkdGg7XG5cdHRoaXMuX2hlaWdodDtcblx0dGhpcy5fYmFja2dyb3VuZEZpbGw7XG5cblx0dGhpcy5fbGF5b3V0O1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5Xb3JkQ2xvdWRDYW52YXMucHJvdG90eXBlID0gXy5leHRlbmQoV29yZENsb3VkQ2FudmFzLnByb3RvdHlwZSwge1xuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cdFx0XHR0aGlzLl93aWR0aCA9IGNhbnZhcy53aWR0aDtcblx0XHRcdHRoaXMuX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cdHdpZHRoIDogZnVuY3Rpb24od2lkdGgpIHtcblx0XHRpZiAod2lkdGgpIHtcblx0XHRcdGlmICh0aGlzLl9jYW52YXMpIHtcblx0XHRcdFx0dGhpcy5fY2FudmFzLndpZHRoID0gd2lkdGg7XG5cdFx0XHRcdHRoaXMuX3dpZHRoID0gd2lkdGg7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMud2lkdGg7XG5cdFx0fVxuXHR9LFxuXHRoZWlnaHQgOiBmdW5jdGlvbihoZWlnaHQpIHtcblx0XHRpZiAoaGVpZ2h0KSB7XG5cdFx0XHRpZiAodGhpcy5fY2FudmFzKSB7XG5cdFx0XHRcdHRoaXMuX2NhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG5cdFx0XHRcdHRoaXMuX2hlaWdodCA9IGhlaWdodDtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5faGVpZ2h0O1xuXHRcdH1cblx0fSxcblx0dGV4dCA6IGZ1bmN0aW9uKHRleHQpIHtcblx0XHR2YXIgZmlsdGVyZWQgPSB0ZXh0LnJlcGxhY2UoL1tcXC4sLVxcLyMhJCVcXF4mXFwqOzp7fT1cXC1fYH4oKV0vZyxcIlwiKTtcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLnJlcGxhY2UoL1xcW1swLTldKlxcXS9nLFwiXCIpO1xuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQucmVwbGFjZSgvW1xcdCtcXFtcXF1dL2csXCJcIik7XG5cdFx0dmFyIHdvcmRzID0gZmlsdGVyZWQuc3BsaXQoJyAnKTtcblx0XHR0aGlzLndvcmRzKHdvcmRzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRzdG9wIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHdvcmQpIHtcblx0XHRcdFx0dGhhdC5fc3RvcFdvcmRzW3dvcmQudHJpbSgpLnRvTG93ZXJDYXNlKCldID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9zdG9wV29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdGJhY2tncm91bmQgOiBmdW5jdGlvbihmaWxsU3R5bGUpIHtcblx0XHRpZiAoZmlsbFN0eWxlKSB7XG5cdFx0XHR0aGlzLl9iYWNrZ3JvdW5kRmlsbCA9IGZpbGxTdHlsZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYmFja2dyb3VuZEZpbGw7XG5cdFx0fVxuXHR9LFxuXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJhdykge1xuXHRcdFx0XHR2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKHRoYXQuX3N0b3BXb3Jkc1t3b3JkXSB8fCB3b3JkID09PSAnJykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBjb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHRpZiAoIWNvdW50KSB7XG5cdFx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cblx0Z2VuZXJhdGUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGF5b3V0ID0gbmV3IExheW91dCgpXG5cdFx0XHQuY2FudmFzKHRoaXMuX2NhbnZhcylcblx0XHRcdC53b3Jkcyh0aGlzLl93b3Jkcyk7XG5cblx0XHR2YXIgcmVuZGVySW5mbyA9IGxheW91dC5sYXlvdXQoKTtcblxuXHRcdHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRpZiAodGhpcy5fYmFja2dyb3VuZEZpbGwpIHtcblx0XHRcdGN0eC5maWxsU3R5bGUgPSB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHRcdGN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5cbmV4cG9ydHMuRXh0ZW5kID0gXy5leHRlbmQ7XG5leHBvcnRzLldvcmRDbG91ZCA9IFdvcmRDbG91ZENhbnZhczsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpIHtcblx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0aSA9IGxlbmd0aDtcblxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0d2hpbGUoaS0tKSBhcnJbbGVuZ3RoLTEgLSBpXSA9IGNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHR9XG5cblx0cmV0dXJuIGFycjtcbn1cblxudmFyIFRleHRCaXRtYXAgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcztcblx0dGhpcy5fY29udGV4dDtcblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcblxuXHR0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0dGhpcy5fY2FudmFzLndpZHRoID0gNjQwO1xuXHR0aGlzLl9jYW52YXMuaGVpZ2h0ID0gNDgwO1xuXHR0aGlzLl9jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuXG5cdHRoaXMuX2JpdG1hcCA9IGNyZWF0ZUFycmF5KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jYW52YXMud2lkdGg7IGkrKykge1xuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHR0aGlzLl9iaXRtYXBbaV1bal0gPSBmYWxzZTtcblx0XHR9XG5cdH1cbn07XG5cblRleHRCaXRtYXAucHJvdG90eXBlID0gXy5leHRlbmQoVGV4dEJpdG1hcC5wcm90b3R5cGUsIHtcblxuXHRjcmVhdGUgOiBmdW5jdGlvbih0ZXh0LGZvbnRIZWlnaHQsZm9udEZhbWlseSkge1xuXHRcdHZhciBjdHggPSB0aGlzLl9jb250ZXh0O1xuXHRcdGN0eC5maWxsU3R5bGUgPSAnYmxhY2snO1xuXHRcdGN0eC5maWxsUmVjdCgwLDAsdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIG9mZnNldFggPSA1O1xuXG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0Y3R4LmZvbnQgPSBmb250SGVpZ2h0ICsgJ3B4ICcgKyBmb250RmFtaWx5O1xuXHRcdGN0eC5maWxsVGV4dCh0ZXh0LG9mZnNldFgsdGhpcy5fY2FudmFzLmhlaWdodC8yKTtcblxuXHRcdHZhciB3aWR0aCA9IGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcblxuXHRcdHZhciBzdGFydFggPSBvZmZzZXRYO1xuXHRcdHZhciBzdGFydFkgPSB0aGlzLl9jYW52YXMuaGVpZ2h0LzIgLSBmb250SGVpZ2h0IC0gMjtcblx0XHR2YXIgZW5kWCA9IHN0YXJ0WCArIHdpZHRoICsgb2Zmc2V0WDtcblx0XHR2YXIgZW5kWSA9IHN0YXJ0WSArIGZvbnRIZWlnaHQgKyBmb250SGVpZ2h0KjAuNTtcblxuXG5cblx0XHR2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YShzdGFydFgsc3RhcnRZLGVuZFggLSBzdGFydFgsZW5kWSAtIHN0YXJ0WSk7XG5cblx0XHR2YXIgYm9vbGVhbkJpdG1hcCA9IGNyZWF0ZUFycmF5KGltYWdlRGF0YS53aWR0aCxpbWFnZURhdGEuaGVpZ2h0KTtcblx0XHR2YXIgeCA9IDA7XG5cdFx0dmFyIHkgPSAwO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VEYXRhLmRhdGEubGVuZ3RoOyBpKz00KSB7XG5cdFx0XHRib29sZWFuQml0bWFwW3hdW3ldID0gIGltYWdlRGF0YS5kYXRhW2ldICE9PSAwO1xuXHRcdFx0eCsrO1xuXHRcdFx0aWYgKHggPT09IGltYWdlRGF0YS53aWR0aCkge1xuXHRcdFx0XHR4ID0gMDtcblx0XHRcdFx0eSsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0dmFyIG1pblggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtaW5ZID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WCA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhZID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0Zm9yICh2YXIgeCA9IDA7IHggPCBib29sZWFuQml0bWFwLmxlbmd0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKHZhciB5ID0gMDsgeSA8IGJvb2xlYW5CaXRtYXBbeF0ubGVuZ3RoOyB5KyspIHtcblx0XHRcdFx0aWYgKGJvb2xlYW5CaXRtYXBbeF1beV0pIHtcblx0XHRcdFx0XHRtaW5YID0gTWF0aC5taW4obWluWCx4KTtcblx0XHRcdFx0XHRtaW5ZID0gTWF0aC5taW4obWluWSx5KTtcblx0XHRcdFx0XHRtYXhYID0gTWF0aC5tYXgobWF4WCx4KTtcblx0XHRcdFx0XHRtYXhZID0gTWF0aC5tYXgobWF4WSx5KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciB0cmltbWVkQm9vbGVhbkJpdG1hcCA9IGNyZWF0ZUFycmF5KG1heFgtbWluWCxtYXhZLW1pblkpO1xuXHRcdGZvciAodmFyIHggPSBtaW5YOyB4IDwgbWF4WDsgeCsrKSB7XG5cdFx0XHRmb3IgKHZhciB5ID0gbWluWTsgeSA8IG1pblk7IHkrKykge1xuXHRcdFx0XHR0cmltbWVkQm9vbGVhbkJpdG1hcFt4XVt5XSA9IGJvb2xlYW5CaXRtYXBbeF1beV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIHJlbmRlckluZm8gPSB7XG5cdFx0XHR3aWR0aCA6IG1heFgtbWluWCxcblx0XHRcdGhlaWdodCA6IG1heFktbWluWSxcblx0XHRcdGJpdG1hcCA6IHRyaW1tZWRCb29sZWFuQml0bWFwXG5cdFx0fTtcblxuXHRcdHJldHVybiByZW5kZXJJbmZvO1xuXHR9LFxuXHRpbnRlcnNlY3RzIDogZnVuY3Rpb24oYjEsYjIpIHtcblx0XHQvLyBUT0RPOlxuXG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHRCaXRtYXA7IiwiXG52YXIgVXRpbCA9IHtcblxuICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcbiAgICB2YXIga2V5LCBpLCBzb3VyY2U7XG4gICAgZm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlc3Q7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(2)
});
