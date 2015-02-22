!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Cloud5=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var TextBitmap = _dereq_('./textbitmap');

/**
 * Helper for creating an array
 * @param length
 * @returns {Array}
 */
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

/**
 * Layout constructor
 * @param attributes
 * @constructor
 */
var Layout = function(attributes) {
	this._canvas = null;
	this._words = null;
	this._bitmap = null;
	this._textBitmapper = null;

	_.extend(this,attributes);
};

Layout.prototype = _.extend(Layout.prototype, {

	/**
	 * Initialize the text bitmapper and create our boolean bitmap of the scene
	 * @private
	 */
	_initialize : function() {
		var textBitmapperAttributes = {};
		if (this.debug) {
			textBitmapperAttributes.debug = true;
		}

		this._textBitmapper = new TextBitmap(textBitmapperAttributes);
		this._bitmap = createArray(this._canvas.width,this._canvas.height);
		for (var i = 0; i < this._canvas.width; i++) {
			for (var j = 0; j < this._canvas.height; j++) {
				this._bitmap[i][j] = false;
			}
		}
	},

	/**
	 * Gets/sets the canvas for the layout
	 * @param canvas
	 * @returns {*}
	 */
	canvas : function(canvas) {
		if (canvas) {
			this._canvas = canvas;
			return this;
		} else {
			return this._canvas;
		}
	},

	/**
	 * Gets/sets the words to layout
	 * @param words
	 * @returns {*}
	 */
	words : function(words) {
		if (words) {
			this._words = words;
			return this;
		} else {
			return this._words;
		}
	},

	/**
	 * Set wordOver handler
	 * @param handler
	 * @returns {Layout}
	 */
	onWordOver : function(handler) {
		this._onWordOver = handler;
		return this;
	},

	/**
	 * Set wordOut handler
	 * @param handler
	 * @returns {Layout}
	 */
	onWordOut : function(handler) {
		this._onWordOut = handler;
		return this;
	},

	/**
	 * Perform the layout
	 * @returns {{}}
	 */
	layout : function() {
		this._initialize();
		var renderInfo = {};

		// Get counts for each word, then figure out the font size for each word.   Create a boolean bitmap and
		// bounding box for each word
		if (this._words) {
			var that = this;

			var minCount = Number.MAX_VALUE;
			var maxCount = 0;

			Object.keys(this._words).forEach(function(word) {
				minCount = Math.min(that._words[word],minCount);
				maxCount = Math.max(that._words[word],maxCount);
			});


			var minFontSize = this.minFontSize || 10;
			var maxFontSize = this.maxFontSize || 200;
			Object.keys(this._words).forEach(function(word) {

				var t = (that._words[word] - minCount)/(maxCount-minCount);
				var fontSize =_.step(minFontSize,maxFontSize,t);

				var bitmap = that._textBitmapper.create(word,fontSize,that.font || 'Calibri');
				renderInfo[word] = bitmap;
				renderInfo[word].count = that._words[word];
				renderInfo[word].minCount = minCount;
				renderInfo[word].maxCount = maxCount;
			});
		}

		// Sort the words by frequency
		var sortedWordArray = Object.keys(this._words).sort(function(w1,w2) {
			return that._words[w2]-that._words[w1];
		});

		/**
		 * Debug routine to draw our words as we lay them out
		 * @param ctx - canvas context
		 * @param w - width
		 * @param h - height
		 */
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

		// Layout each word
		sortedWordArray.forEach(function(word) {
			var placed = false;
			var attempts = 100;

			if (this.debug) {
				debugDrawAll(that._canvas.getContext('2d'),that._canvas.width, that._canvas.height);
			}

			// Try placing the word and see if it fits/hits anything else already placed
			while (!placed && attempts > 0) {
				var x = Math.floor(Math.random() * that._canvas.width);
				var y = Math.floor(Math.random() * that._canvas.height);

				renderInfo[word].x = x;
				renderInfo[word].y = y;

				// If it fits, update the bitmap for the entire scene to say those pixels are occupied
				if (that._textBitmapper.fits(renderInfo[word],that._bitmap)) {
					placed = true;

					var bitmapWidth = renderInfo[word].bitmap.length;
					var bitmapHeight = renderInfo[word].bitmap[0].length;

					for (var i = 0; i < bitmapWidth; i++) {
						for (var j = 0; j < bitmapHeight; j++) {
							var u = renderInfo[word].x + renderInfo[word].bb.offsetX + i;
							var v = renderInfo[word].y + renderInfo[word].bb.offsetY + j;

							if (renderInfo[word].bitmap[i][j]) {
								that._bitmap[u][v] = word;
							}
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


		// Bind handlers
		var overWord = null;
		function onMouseMove(e) {
			var x = e.offsetX;
			var y = e.offsetY;

			var word = that._bitmap[x][y];
			if (word) {
				if (that._onWordOver) {
					that._onWordOver(word);
				}
				overWord = word;
			} else if (overWord) {
				if (that._onWordOut) {
					that._onWordOut(overWord);
				}
				overWord = null;
			}
		}

		this._canvas.onmousemove = onMouseMove;


		return renderInfo;
	}
});

module.exports = Layout;
},{"./textbitmap":4,"./util":5}],2:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Layout = _dereq_('./layout');
var Stopwords = _dereq_('./stopwords');

/**
 * Cloud5 constructor
 * @param attributes
 * @constructor
 */
var Cloud5 = function(attributes) {

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

Cloud5.prototype = _.extend(Cloud5.prototype, {

	/**
	 * Gets/sets the canvas
	 * @param canvas - HTML5 Canvas element
	 * @returns {*}
	 */
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

	/**
	 * Gets/sets the width of the canvas.   If not set, uses the inherited width from canvas
	 * @param width - width in pixels
	 * @returns {*}
	 */
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

	/**
	 * Gets/sets the height of the canvas.  If not set, uses the inherited width from canvas
	 * @param height - height in pixels
	 * @returns {*}
	 */
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

	/**
	 * Sets the text for word cloud generation from a large string
	 * @param text - a string.   By default, we remove all punctuation.   Additional rules can be added by
	 * calling textFilters(...)
	 * @returns {Cloud5}
	 */
	text : function(text) {
		var filtered = text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,'');
		if (this._filters) {
			this._filters.forEach(function(filter) {
				filtered = text.replace(filter,'');
			});
		}
		var words = filtered.split(' ');
		this.words(words);
		return this;
	},

	/**
	 * Gets/sets a list of text filters (regular expressions) to be applied.   Rules that match will be deleted
	 * from the original text string.  They're applied in the order given to this function
	 * @param filters - an array of regular expressions
	 * @returns {*}
	 */
	textFilters : function(filters) {
		if (filters) {
			this._filters = filters
			return this;
		} else {
			return this._filters;
		}
	},

	/**
	 * Sets the stop words (words to ignore)
	 * @param words - an array of strings to ignore
	 * @returns {*}
	 */
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

	/**
	 * Gets/sets the background fill style
	 * @param fillStyle - a valid fillStyle string
	 * @returns {*}
	 */
	background : function(fillStyle) {
		if (fillStyle) {
			this._backgroundFill = fillStyle;
			return this;
		} else {
			return this._backgroundFill;
		}
	},

	/**
	 * Gets/sets the words for the word cloud
	 * @param words - an array of words.
	 * @returns {*}
	 */
	words : function(words) {
		if (words) {
			var that = this;

			if (Object.keys(this._stopWords).length === 0) {
				this.stop(Stopwords.English);
			}

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

	/**
	 * Set a handler for mousing over a word
	 * @param handler
	 * @returns {Cloud5}
	 */
	onWordOver : function(handler) {
		this._onWordOver = handler;
		return this;
	},

	/**
	 * Set a handler for mousing out of a word
	 * @param handler
	 * @returns {Cloud5}
	 */
	onWordOut : function(handler) {
		this._onWordOut = handler;
		return this;
	},

	/**
	 * Gets/sets the font family for words
	 * @param font - font family (ie/ 'Helvetica')
	 * @returns {*}
	 */
	font : function(font) {
		if (font) {
			this._font = font;
			return this;
		} else {
			return this._font;
		}
	},

	/**
	 * Gets/sets the minimum font size for words
	 * @param minFontSize - in pixels
	 * @returns {*}
	 */
	minFontSize : function(minFontSize) {
		if (minFontSize) {
			this._minFontSize = minFontSize;
			return this;
		} else {
			return this._minFontSize;
		}
	},

	/**
	 * Gets/sets the maximum font size for words
	 * @param maxFontSize - in pixels
	 * @returns {*}
	 */
	maxFontSize : function(maxFontSize) {
		if (maxFontSize) {
			this._maxFontSize = maxFontSize;
			return this;
		} else {
			return this._maxFontSize;
		}
	},

	/**
	 * Gets/sets colors
	 * @param color - can be one of the following:
	 * 		1)  A fillStyle string (ie/ 'red','rgb(255,255,0)', etc)
	 * 	    2)  An array of fillStyle strings
	 * 	    3)  A function that returns a fillStyle string given the renderInfo for the word.  ie/
	 * 	             function(renderInfo) {
	 * 	                 var word = renderInfo.word;
	 * 	                 var count = renderInfo.count;
	 * 	                 var xPos = renderInfo.x;
	 * 	                 var yPost = renderInfo.y;
	 * 	                 return // a fillStyle derived from above properties
	 * 	              }
	 * @returns {*}
	 */
	color : function(color) {
		if (color) {
			this._color = color;
			return this;
		} else {
			return this._color;
		}
	},

	/**
	 * Layout and render the word cloud to the canvas provided
	 * @returns {Cloud5}
	 */
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

		this._layout = new Layout(layoutAttributes)
			.canvas(this._canvas)
			.words(this._words)
			.onWordOver(this._onWordOver)
			.onWordOut(this._onWordOut);

		var renderInfo = this._layout.layout();

		var ctx = this._canvas.getContext('2d');
		ctx.fillStyle = this._backgroundFill || 'white';
		ctx.fillRect(0, 0, this._width, this._height);


		var that = this;
		Object.keys(renderInfo).forEach(function(word) {
			var wordRenderInfo = renderInfo[word];
			if (wordRenderInfo.x !== -1 && wordRenderInfo.y !== -1) {
				ctx.font = wordRenderInfo.fontSize + 'px ' + wordRenderInfo.fontFamily;


				var clr = 'black';
				if (that._color) {
					if (that._color instanceof Array) {
						var idx = Math.floor(Math.random() * that._color.length);
						clr = that._color[idx];
					} else if (that._color instanceof Function) {
						clr = that._color(renderInfo[word]);
					} else {
						clr = that._color;
					}
				}
				ctx.fillStyle = clr;
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


module.exports = Cloud5;
},{"./layout":1,"./stopwords":3,"./util":5}],3:[function(_dereq_,module,exports){
var english = "a, about, above, across, after, again, against, all, almost, alone, along, already, also, although, always, am, among, an, and, another, any, anybody, anyone, anything, anywhere, are, area, areas, aren't, around, as, ask, asked, asking, asks, at, away, b, back, backed, backing, backs, be, became, because, become, becomes, been, before, began, behind, being, beings, below, best, better, between, big, both, but, by, c, came, can, cannot, can't, case, cases, certain, certainly, clear, clearly, come, could, couldn't, d, did, didn't, differ, different, differently, do, does, doesn't, doing, done, don't, down, downed, downing, downs, during, e, each, early, either, end, ended, ending, ends, enough, even, evenly, ever, every, everybody, everyone, everything, everywhere, f, face, faces, fact, facts, far, felt, few, find, finds, first, for, four, from, full, fully, further, furthered, furthering, furthers, g, gave, general, generally, get, gets, give, given, gives, go, going, good, goods, got, great, greater, greatest, group, grouped, grouping, groups, h, had, hadn't, has, hasn't, have, haven't, having, he, he'd, he'll, her, here, here's, hers, herself, he's, high, higher, highest, him, himself, his, how, however, how's, i, i'd, if, i'll, i'm, important, in, interest, interested, interesting, interests, into, is, isn't, it, its, it's, itself, i've, j, just, k, keep, keeps, kind, knew, know, known, knows, l, large, largely, last, later, latest, least, less, let, lets, let's, like, likely, long, longer, longest, m, made, make, making, man, many, may, me, member, members, men, might, more, most, mostly, mr, mrs, much, must, mustn't, my, myself, n, necessary, need, needed, needing, needs, never, new, newer, newest, next, no, nobody, non, noone, nor, not, nothing, now, nowhere, number, numbers, o, of, off, often, old, older, oldest, on, once, one, only, open, opened, opening, opens, or, order, ordered, ordering, orders, other, others, ought, our, ours, ourselves, out, over, own, p, part, parted, parting, parts, per, perhaps, place, places, point, pointed, pointing, points, possible, present, presented, presenting, presents, problem, problems, put, puts, q, quite, r, rather, really, right, room, rooms, s, said, same, saw, say, says, second, seconds, see, seem, seemed, seeming, seems, sees, several, shall, shan't, she, she'd, she'll, she's, should, shouldn't, show, showed, showing, shows, side, sides, since, small, smaller, smallest, so, some, somebody, someone, something, somewhere, state, states, still, such, sure, t, take, taken, than, that, that's, the, their, theirs, them, themselves, then, there, therefore, there's, these, they, they'd, they'll, they're, they've, thing, things, think, thinks, this, those, though, thought, thoughts, three, through, thus, to, today, together, too, took, toward, turn, turned, turning, turns, two, u, under, until, up, upon, us, use, used, uses, v, very, w, want, wanted, wanting, wants, was, wasn't, way, ways, we, we'd, well, we'll, wells, went, were, we're, weren't, we've, what, what's, when, when's, where, where's, whether, which, while, who, whole, whom, who's, whose, why, why's, will, with, within, without, won't, work, worked, working, works, would, wouldn't, x, y, year, years, yes, yet, you, you'd, you'll, young, younger, youngest, your, you're, yours, yourself, yourselves, you've, z";
var englishWords = english.split(',');

exports.English = englishWords;
},{}],4:[function(_dereq_,module,exports){
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
	this._canvas.width = 640;							// TODO:  this can fail.   Fix it!
	this._canvas.height = 480;
	this._context = this._canvas.getContext('2d');

	if (this.debug) {
		document.body.appendChild(this._canvas);
	}

	this._bitmap = createArray(this._canvas.width,this._canvas.height);
	for (var i = 0; i < this._canvas.width; i++) {
		for (var j = 0; j < this._canvas.height; j++) {
			this._bitmap[i][j] = false;
		}
	}
};

TextBitmap.prototype = _.extend(TextBitmap.prototype, {

	/**
	 * Create a bitmap for the given word/font pair.   Return a renderInfo object for this
	 * @param text - a string that we want to bitmap (ie/ a word)
	 * @param fontHeight - the height of the font
	 * @param fontFamily - the font family
	 * @returns {{bb: {offsetX: number, offsetY: number, width: number, height: number}, bitmap: *, fontSize: *, fontFamily: *}}
	 */
	create : function(text,fontHeight,fontFamily) {
		var ctx = this._context;
		ctx.fillStyle = 'black';
		ctx.fillRect(0,0,this._canvas.width,this._canvas.height);

		var textRenderX = 5;
		var textRenderY = Math.floor(this._canvas.height/2);

		// Fill the font
		ctx.fillStyle = 'white';
		ctx.font = fontHeight + 'px ' + fontFamily;
		ctx.fillText(text,textRenderX,textRenderY);

		var width = ctx.measureText(text).width;

		// Get a relaxed bounding box to grab from the canvas
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

		// Trim the bounding box to just pixels that are filled
		var trimmedBooleanBitmap = createArray(maxX-minX,maxY-minY);
		for (x = 0; x < maxX-minX; x++) {
			for (y = 0; y < maxY-minY; y++) {
				trimmedBooleanBitmap[x][y] = booleanBitmap[minX+x][minY+y];
			}
		}

		if (this.debug) {
			ctx.strokeStyle = 'yellow';
			ctx.strokeRect(startX,startY,endX-startX,endY-startY);
		}

		ctx.strokeStyle = 'red';
		ctx.strokeRect(textRenderX,textRenderY,this._canvas.width, this._canvas.height);

		var bbWidth = maxX-minX;
		var bbHeight = maxY-minY;
		var bbOffsetX = -(textRenderX - (startX + minX ));
		var bbOffsetY = -(textRenderY - (startY + minY));

		if (this.debug) {
			ctx.strokeStyle = 'green';
			ctx.strokeRect(textRenderX + bbOffsetX, textRenderY + bbOffsetY, bbWidth, bbHeight);
		}

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

	/**
	 * tests whether a renderInfo object fits into a global boolean bitmap
	 * @param renderInfo - renderInfo for a word (returned from create)
	 * @param bitmap - scene bitmap
	 * @returns {boolean} - true if word fits, false otherwise
	 */
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
},{"./util":5}],5:[function(_dereq_,module,exports){

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9zdG9wd29yZHMuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBUZXh0Qml0bWFwID0gcmVxdWlyZSgnLi90ZXh0Yml0bWFwJyk7XG5cbi8qKlxuICogSGVscGVyIGZvciBjcmVhdGluZyBhbiBhcnJheVxuICogQHBhcmFtIGxlbmd0aFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpIHtcblx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0aSA9IGxlbmd0aDtcblxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0d2hpbGUoaS0tKSB7XG5cdFx0XHRhcnJbbGVuZ3RoLTEgLSBpXSA9IGNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhcnI7XG59XG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX3dvcmRzID0gbnVsbDtcblx0dGhpcy5fYml0bWFwID0gbnVsbDtcblx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHRleHQgYml0bWFwcGVyIGFuZCBjcmVhdGUgb3VyIGJvb2xlYW4gYml0bWFwIG9mIHRoZSBzY2VuZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2luaXRpYWxpemUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMgPSB7fTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0dGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHRoaXMuX3RleHRCaXRtYXBwZXIgPSBuZXcgVGV4dEJpdG1hcCh0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcyk7XG5cdFx0dGhpcy5fYml0bWFwID0gY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3b3JkcyB0byBsYXlvdXRcblx0ICogQHBhcmFtIHdvcmRzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dGhpcy5fd29yZHMgPSB3b3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgd29yZE92ZXIgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdXQgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gdGhlIGxheW91dFxuXHQgKiBAcmV0dXJucyB7e319XG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9pbml0aWFsaXplKCk7XG5cdFx0dmFyIHJlbmRlckluZm8gPSB7fTtcblxuXHRcdC8vIEdldCBjb3VudHMgZm9yIGVhY2ggd29yZCwgdGhlbiBmaWd1cmUgb3V0IHRoZSBmb250IHNpemUgZm9yIGVhY2ggd29yZC4gICBDcmVhdGUgYSBib29sZWFuIGJpdG1hcCBhbmRcblx0XHQvLyBib3VuZGluZyBib3ggZm9yIGVhY2ggd29yZFxuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdFx0dmFyIG1heENvdW50ID0gMDtcblxuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKHRoYXQuX3dvcmRzW3dvcmRdLG1pbkNvdW50KTtcblx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heCh0aGF0Ll93b3Jkc1t3b3JkXSxtYXhDb3VudCk7XG5cdFx0XHR9KTtcblxuXG5cdFx0XHR2YXIgbWluRm9udFNpemUgPSB0aGlzLm1pbkZvbnRTaXplIHx8IDEwO1xuXHRcdFx0dmFyIG1heEZvbnRTaXplID0gdGhpcy5tYXhGb250U2l6ZSB8fCAyMDA7XG5cdFx0XHRPYmplY3Qua2V5cyh0aGlzLl93b3JkcykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cblx0XHRcdFx0dmFyIHQgPSAodGhhdC5fd29yZHNbd29yZF0gLSBtaW5Db3VudCkvKG1heENvdW50LW1pbkNvdW50KTtcblx0XHRcdFx0dmFyIGZvbnRTaXplID1fLnN0ZXAobWluRm9udFNpemUsbWF4Rm9udFNpemUsdCk7XG5cblx0XHRcdFx0dmFyIGJpdG1hcCA9IHRoYXQuX3RleHRCaXRtYXBwZXIuY3JlYXRlKHdvcmQsZm9udFNpemUsdGhhdC5mb250IHx8ICdDYWxpYnJpJyk7XG5cdFx0XHRcdHJlbmRlckluZm9bd29yZF0gPSBiaXRtYXA7XG5cdFx0XHRcdHJlbmRlckluZm9bd29yZF0uY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS5taW5Db3VudCA9IG1pbkNvdW50O1xuXHRcdFx0XHRyZW5kZXJJbmZvW3dvcmRdLm1heENvdW50ID0gbWF4Q291bnQ7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBTb3J0IHRoZSB3b3JkcyBieSBmcmVxdWVuY3lcblx0XHR2YXIgc29ydGVkV29yZEFycmF5ID0gT2JqZWN0LmtleXModGhpcy5fd29yZHMpLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcblx0XHRcdHJldHVybiB0aGF0Ll93b3Jkc1t3Ml0tdGhhdC5fd29yZHNbdzFdO1xuXHRcdH0pO1xuXG5cdFx0LyoqXG5cdFx0ICogRGVidWcgcm91dGluZSB0byBkcmF3IG91ciB3b3JkcyBhcyB3ZSBsYXkgdGhlbSBvdXRcblx0XHQgKiBAcGFyYW0gY3R4IC0gY2FudmFzIGNvbnRleHRcblx0XHQgKiBAcGFyYW0gdyAtIHdpZHRoXG5cdFx0ICogQHBhcmFtIGggLSBoZWlnaHRcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkZWJ1Z0RyYXdBbGwoY3R4LHcsaCkge1xuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0XHRjdHguZmlsbFJlY3QoMCwwLHcsaCk7XG5cdFx0XHRPYmplY3Qua2V5cyhyZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdFx0dmFyIHdvcmRSZW5kZXJJbmZvID0gcmVuZGVySW5mb1t3b3JkXTtcblx0XHRcdFx0aWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0XHRjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuXHRcdFx0XHRcdGN0eC5maWxsU3R5bGUgPSAncmVkJztcblx0XHRcdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gTGF5b3V0IGVhY2ggd29yZFxuXHRcdHNvcnRlZFdvcmRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciBwbGFjZWQgPSBmYWxzZTtcblx0XHRcdHZhciBhdHRlbXB0cyA9IDEwMDtcblxuXHRcdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdFx0ZGVidWdEcmF3QWxsKHRoYXQuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpLHRoYXQuX2NhbnZhcy53aWR0aCwgdGhhdC5fY2FudmFzLmhlaWdodCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRyeSBwbGFjaW5nIHRoZSB3b3JkIGFuZCBzZWUgaWYgaXQgZml0cy9oaXRzIGFueXRoaW5nIGVsc2UgYWxyZWFkeSBwbGFjZWRcblx0XHRcdHdoaWxlICghcGxhY2VkICYmIGF0dGVtcHRzID4gMCkge1xuXHRcdFx0XHR2YXIgeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NhbnZhcy53aWR0aCk7XG5cdFx0XHRcdHZhciB5ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY2FudmFzLmhlaWdodCk7XG5cblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS54ID0geDtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS55ID0geTtcblxuXHRcdFx0XHQvLyBJZiBpdCBmaXRzLCB1cGRhdGUgdGhlIGJpdG1hcCBmb3IgdGhlIGVudGlyZSBzY2VuZSB0byBzYXkgdGhvc2UgcGl4ZWxzIGFyZSBvY2N1cGllZFxuXHRcdFx0XHRpZiAodGhhdC5fdGV4dEJpdG1hcHBlci5maXRzKHJlbmRlckluZm9bd29yZF0sdGhhdC5fYml0bWFwKSkge1xuXHRcdFx0XHRcdHBsYWNlZCA9IHRydWU7XG5cblx0XHRcdFx0XHR2YXIgYml0bWFwV2lkdGggPSByZW5kZXJJbmZvW3dvcmRdLmJpdG1hcC5sZW5ndGg7XG5cdFx0XHRcdFx0dmFyIGJpdG1hcEhlaWdodCA9IHJlbmRlckluZm9bd29yZF0uYml0bWFwWzBdLmxlbmd0aDtcblxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYml0bWFwV2lkdGg7IGkrKykge1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBiaXRtYXBIZWlnaHQ7IGorKykge1xuXHRcdFx0XHRcdFx0XHR2YXIgdSA9IHJlbmRlckluZm9bd29yZF0ueCArIHJlbmRlckluZm9bd29yZF0uYmIub2Zmc2V0WCArIGk7XG5cdFx0XHRcdFx0XHRcdHZhciB2ID0gcmVuZGVySW5mb1t3b3JkXS55ICsgcmVuZGVySW5mb1t3b3JkXS5iYi5vZmZzZXRZICsgajtcblxuXHRcdFx0XHRcdFx0XHRpZiAocmVuZGVySW5mb1t3b3JkXS5iaXRtYXBbaV1bal0pIHtcblx0XHRcdFx0XHRcdFx0XHR0aGF0Ll9iaXRtYXBbdV1bdl0gPSB3b3JkO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YXR0ZW1wdHMtLTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFwbGFjZWQpIHtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS54ID0gLTE7XG5cdFx0XHRcdHJlbmRlckluZm9bd29yZF0ueSA9IC0xO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cblx0XHQvLyBCaW5kIGhhbmRsZXJzXG5cdFx0dmFyIG92ZXJXb3JkID0gbnVsbDtcblx0XHRmdW5jdGlvbiBvbk1vdXNlTW92ZShlKSB7XG5cdFx0XHR2YXIgeCA9IGUub2Zmc2V0WDtcblx0XHRcdHZhciB5ID0gZS5vZmZzZXRZO1xuXG5cdFx0XHR2YXIgd29yZCA9IHRoYXQuX2JpdG1hcFt4XVt5XTtcblx0XHRcdGlmICh3b3JkKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvdmVyV29yZCA9IHdvcmQ7XG5cdFx0XHR9IGVsc2UgaWYgKG92ZXJXb3JkKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcblx0XHRcdFx0XHR0aGF0Ll9vbldvcmRPdXQob3ZlcldvcmQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG92ZXJXb3JkID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9jYW52YXMub25tb3VzZW1vdmUgPSBvbk1vdXNlTW92ZTtcblxuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG52YXIgU3RvcHdvcmRzID0gcmVxdWlyZSgnLi9zdG9wd29yZHMnKTtcblxuLyoqXG4gKiBDbG91ZDUgY29uc3RydWN0b3JcbiAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENsb3VkNSA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblxuXHR0aGlzLl93b3JkcyA9IHt9O1xuXHR0aGlzLl9zdG9wV29yZHMgPSB7fTtcblxuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl93aWR0aCA9IG51bGw7XG5cdHRoaXMuX2hlaWdodCA9IG51bGw7XG5cdHRoaXMuX2JhY2tncm91bmRGaWxsID0gbnVsbDtcblx0dGhpcy5fb25Xb3JkT3ZlciA9IG51bGw7XG5cdHRoaXMuX2xheW91dCA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkNsb3VkNS5wcm90b3R5cGUgPSBfLmV4dGVuZChDbG91ZDUucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBIVE1MNSBDYW52YXMgZWxlbWVudFxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzLiAgIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gd2lkdGggLSB3aWR0aCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKHdpZHRoKSB7XG5cdFx0aWYgKHdpZHRoKSB7XG5cdFx0XHRpZiAodGhpcy5fY2FudmFzKSB7XG5cdFx0XHRcdHRoaXMuX2NhbnZhcy53aWR0aCA9IHdpZHRoO1xuXHRcdFx0XHR0aGlzLl93aWR0aCA9IHdpZHRoO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLndpZHRoO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcy4gIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gaGVpZ2h0IC0gaGVpZ2h0IGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGhlaWdodCA6IGZ1bmN0aW9uKGhlaWdodCkge1xuXHRcdGlmIChoZWlnaHQpIHtcblx0XHRcdGlmICh0aGlzLl9jYW52YXMpIHtcblx0XHRcdFx0dGhpcy5fY2FudmFzLmhlaWdodCA9IGhlaWdodDtcblx0XHRcdFx0dGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9oZWlnaHQ7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSB0ZXh0IGZvciB3b3JkIGNsb3VkIGdlbmVyYXRpb24gZnJvbSBhIGxhcmdlIHN0cmluZ1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nLiAgIEJ5IGRlZmF1bHQsIHdlIHJlbW92ZSBhbGwgcHVuY3R1YXRpb24uICAgQWRkaXRpb25hbCBydWxlcyBjYW4gYmUgYWRkZWQgYnlcblx0ICogY2FsbGluZyB0ZXh0RmlsdGVycyguLi4pXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyEkJVxcXiZcXCo7Ont9PVxcLV9gfigpXS9nLCcnKTtcblx0XHRpZiAodGhpcy5fZmlsdGVycykge1xuXHRcdFx0dGhpcy5fZmlsdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlcikge1xuXHRcdFx0XHRmaWx0ZXJlZCA9IHRleHQucmVwbGFjZShmaWx0ZXIsJycpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHZhciB3b3JkcyA9IGZpbHRlcmVkLnNwbGl0KCcgJyk7XG5cdFx0dGhpcy53b3Jkcyh3b3Jkcyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyBhIGxpc3Qgb2YgdGV4dCBmaWx0ZXJzIChyZWd1bGFyIGV4cHJlc3Npb25zKSB0byBiZSBhcHBsaWVkLiAgIFJ1bGVzIHRoYXQgbWF0Y2ggd2lsbCBiZSBkZWxldGVkXG5cdCAqIGZyb20gdGhlIG9yaWdpbmFsIHRleHQgc3RyaW5nLiAgVGhleSdyZSBhcHBsaWVkIGluIHRoZSBvcmRlciBnaXZlbiB0byB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBmaWx0ZXJzIC0gYW4gYXJyYXkgb2YgcmVndWxhciBleHByZXNzaW9uc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHRleHRGaWx0ZXJzIDogZnVuY3Rpb24oZmlsdGVycykge1xuXHRcdGlmIChmaWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzID0gZmlsdGVyc1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9maWx0ZXJzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgc3RvcCB3b3JkcyAod29yZHMgdG8gaWdub3JlKVxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiBzdHJpbmdzIHRvIGlnbm9yZVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgYmFja2dyb3VuZCBmaWxsIHN0eWxlXG5cdCAqIEBwYXJhbSBmaWxsU3R5bGUgLSBhIHZhbGlkIGZpbGxTdHlsZSBzdHJpbmdcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRiYWNrZ3JvdW5kIDogZnVuY3Rpb24oZmlsbFN0eWxlKSB7XG5cdFx0aWYgKGZpbGxTdHlsZSkge1xuXHRcdFx0dGhpcy5fYmFja2dyb3VuZEZpbGwgPSBmaWxsU3R5bGU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2JhY2tncm91bmRGaWxsO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3b3JkcyBmb3IgdGhlIHdvcmQgY2xvdWRcblx0ICogQHBhcmFtIHdvcmRzIC0gYW4gYXJyYXkgb2Ygd29yZHMuXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXModGhpcy5fc3RvcFdvcmRzKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0dGhpcy5zdG9wKFN0b3B3b3Jkcy5FbmdsaXNoKTtcblx0XHRcdH1cblxuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmF3KSB7XG5cdFx0XHRcdHZhciB3b3JkID0gcmF3LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRpZiAodGhhdC5fc3RvcFdvcmRzW3dvcmRdIHx8IHdvcmQgPT09ICcnKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGNvdW50ID0gdGhhdC5fd29yZHNbd29yZF07XG5cdFx0XHRcdGlmICghY291bnQpIHtcblx0XHRcdFx0XHRjb3VudCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0dGhhdC5fd29yZHNbd29yZF0gPSBjb3VudDtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0IGEgaGFuZGxlciBmb3IgbW91c2luZyBvdmVyIGEgd29yZFxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IGEgaGFuZGxlciBmb3IgbW91c2luZyBvdXQgb2YgYSB3b3JkXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRvbldvcmRPdXQgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3V0ID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGZhbWlseSBmb3Igd29yZHNcblx0ICogQHBhcmFtIGZvbnQgLSBmb250IGZhbWlseSAoaWUvICdIZWx2ZXRpY2EnKVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGZvbnQgOiBmdW5jdGlvbihmb250KSB7XG5cdFx0aWYgKGZvbnQpIHtcblx0XHRcdHRoaXMuX2ZvbnQgPSBmb250O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250O1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtaW5pbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1pbkZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWluRm9udFNpemUgOiBmdW5jdGlvbihtaW5Gb250U2l6ZSkge1xuXHRcdGlmIChtaW5Gb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWluRm9udFNpemUgPSBtaW5Gb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gZm9udCBzaXplIGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gbWF4Rm9udFNpemUgLSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhGb250U2l6ZSA6IGZ1bmN0aW9uKG1heEZvbnRTaXplKSB7XG5cdFx0aWYgKG1heEZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9tYXhGb250U2l6ZSA9IG1heEZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyBjb2xvcnNcblx0ICogQHBhcmFtIGNvbG9yIC0gY2FuIGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nOlxuXHQgKiBcdFx0MSkgIEEgZmlsbFN0eWxlIHN0cmluZyAoaWUvICdyZWQnLCdyZ2IoMjU1LDI1NSwwKScsIGV0Yylcblx0ICogXHQgICAgMikgIEFuIGFycmF5IG9mIGZpbGxTdHlsZSBzdHJpbmdzXG5cdCAqIFx0ICAgIDMpICBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIGZpbGxTdHlsZSBzdHJpbmcgZ2l2ZW4gdGhlIHJlbmRlckluZm8gZm9yIHRoZSB3b3JkLiAgaWUvXG5cdCAqIFx0ICAgICAgICAgICAgIGZ1bmN0aW9uKHJlbmRlckluZm8pIHtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB3b3JkID0gcmVuZGVySW5mby53b3JkO1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gcmVuZGVySW5mby5jb3VudDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB4UG9zID0gcmVuZGVySW5mby54O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHlQb3N0ID0gcmVuZGVySW5mby55O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgcmV0dXJuIC8vIGEgZmlsbFN0eWxlIGRlcml2ZWQgZnJvbSBhYm92ZSBwcm9wZXJ0aWVzXG5cdCAqIFx0ICAgICAgICAgICAgICB9XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y29sb3IgOiBmdW5jdGlvbihjb2xvcikge1xuXHRcdGlmIChjb2xvcikge1xuXHRcdFx0dGhpcy5fY29sb3IgPSBjb2xvcjtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29sb3I7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBMYXlvdXQgYW5kIHJlbmRlciB0aGUgd29yZCBjbG91ZCB0byB0aGUgY2FudmFzIHByb3ZpZGVkXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRnZW5lcmF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYXlvdXRBdHRyaWJ1dGVzID0ge307XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fZm9udCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5mb250ID0gdGhpcy5fZm9udDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21pbkZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1pbkZvbnRTaXplID0gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhGb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhGb250U2l6ZSA9IHRoaXMuX21heEZvbnRTaXplO1xuXHRcdH1cblxuXHRcdHRoaXMuX2xheW91dCA9IG5ldyBMYXlvdXQobGF5b3V0QXR0cmlidXRlcylcblx0XHRcdC5jYW52YXModGhpcy5fY2FudmFzKVxuXHRcdFx0LndvcmRzKHRoaXMuX3dvcmRzKVxuXHRcdFx0Lm9uV29yZE92ZXIodGhpcy5fb25Xb3JkT3Zlcilcblx0XHRcdC5vbldvcmRPdXQodGhpcy5fb25Xb3JkT3V0KTtcblxuXHRcdHZhciByZW5kZXJJbmZvID0gdGhpcy5fbGF5b3V0LmxheW91dCgpO1xuXG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGN0eC5maWxsU3R5bGUgPSB0aGlzLl9iYWNrZ3JvdW5kRmlsbCB8fCAnd2hpdGUnO1xuXHRcdGN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHJlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0dmFyIHdvcmRSZW5kZXJJbmZvID0gcmVuZGVySW5mb1t3b3JkXTtcblx0XHRcdGlmICh3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuXHRcdFx0XHRjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuXG5cblx0XHRcdFx0dmFyIGNsciA9ICdibGFjayc7XG5cdFx0XHRcdGlmICh0aGF0Ll9jb2xvcikge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9jb2xvciBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHR2YXIgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY29sb3IubGVuZ3RoKTtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yW2lkeF07XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGF0Ll9jb2xvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcihyZW5kZXJJbmZvW3dvcmRdKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3I7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5maWxsU3R5bGUgPSBjbHI7XG5cdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cblx0XHRcdFx0aWYgKHRoYXQuZGVidWcpIHtcblx0XHRcdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VSZWN0KHdvcmRSZW5kZXJJbmZvLnggKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRYLCB3b3JkUmVuZGVySW5mby55ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WSwgd29yZFJlbmRlckluZm8uYmIud2lkdGgsIHdvcmRSZW5kZXJJbmZvLmJiLmhlaWdodCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDbG91ZDU7IiwidmFyIGVuZ2xpc2ggPSBcImEsIGFib3V0LCBhYm92ZSwgYWNyb3NzLCBhZnRlciwgYWdhaW4sIGFnYWluc3QsIGFsbCwgYWxtb3N0LCBhbG9uZSwgYWxvbmcsIGFscmVhZHksIGFsc28sIGFsdGhvdWdoLCBhbHdheXMsIGFtLCBhbW9uZywgYW4sIGFuZCwgYW5vdGhlciwgYW55LCBhbnlib2R5LCBhbnlvbmUsIGFueXRoaW5nLCBhbnl3aGVyZSwgYXJlLCBhcmVhLCBhcmVhcywgYXJlbid0LCBhcm91bmQsIGFzLCBhc2ssIGFza2VkLCBhc2tpbmcsIGFza3MsIGF0LCBhd2F5LCBiLCBiYWNrLCBiYWNrZWQsIGJhY2tpbmcsIGJhY2tzLCBiZSwgYmVjYW1lLCBiZWNhdXNlLCBiZWNvbWUsIGJlY29tZXMsIGJlZW4sIGJlZm9yZSwgYmVnYW4sIGJlaGluZCwgYmVpbmcsIGJlaW5ncywgYmVsb3csIGJlc3QsIGJldHRlciwgYmV0d2VlbiwgYmlnLCBib3RoLCBidXQsIGJ5LCBjLCBjYW1lLCBjYW4sIGNhbm5vdCwgY2FuJ3QsIGNhc2UsIGNhc2VzLCBjZXJ0YWluLCBjZXJ0YWlubHksIGNsZWFyLCBjbGVhcmx5LCBjb21lLCBjb3VsZCwgY291bGRuJ3QsIGQsIGRpZCwgZGlkbid0LCBkaWZmZXIsIGRpZmZlcmVudCwgZGlmZmVyZW50bHksIGRvLCBkb2VzLCBkb2Vzbid0LCBkb2luZywgZG9uZSwgZG9uJ3QsIGRvd24sIGRvd25lZCwgZG93bmluZywgZG93bnMsIGR1cmluZywgZSwgZWFjaCwgZWFybHksIGVpdGhlciwgZW5kLCBlbmRlZCwgZW5kaW5nLCBlbmRzLCBlbm91Z2gsIGV2ZW4sIGV2ZW5seSwgZXZlciwgZXZlcnksIGV2ZXJ5Ym9keSwgZXZlcnlvbmUsIGV2ZXJ5dGhpbmcsIGV2ZXJ5d2hlcmUsIGYsIGZhY2UsIGZhY2VzLCBmYWN0LCBmYWN0cywgZmFyLCBmZWx0LCBmZXcsIGZpbmQsIGZpbmRzLCBmaXJzdCwgZm9yLCBmb3VyLCBmcm9tLCBmdWxsLCBmdWxseSwgZnVydGhlciwgZnVydGhlcmVkLCBmdXJ0aGVyaW5nLCBmdXJ0aGVycywgZywgZ2F2ZSwgZ2VuZXJhbCwgZ2VuZXJhbGx5LCBnZXQsIGdldHMsIGdpdmUsIGdpdmVuLCBnaXZlcywgZ28sIGdvaW5nLCBnb29kLCBnb29kcywgZ290LCBncmVhdCwgZ3JlYXRlciwgZ3JlYXRlc3QsIGdyb3VwLCBncm91cGVkLCBncm91cGluZywgZ3JvdXBzLCBoLCBoYWQsIGhhZG4ndCwgaGFzLCBoYXNuJ3QsIGhhdmUsIGhhdmVuJ3QsIGhhdmluZywgaGUsIGhlJ2QsIGhlJ2xsLCBoZXIsIGhlcmUsIGhlcmUncywgaGVycywgaGVyc2VsZiwgaGUncywgaGlnaCwgaGlnaGVyLCBoaWdoZXN0LCBoaW0sIGhpbXNlbGYsIGhpcywgaG93LCBob3dldmVyLCBob3cncywgaSwgaSdkLCBpZiwgaSdsbCwgaSdtLCBpbXBvcnRhbnQsIGluLCBpbnRlcmVzdCwgaW50ZXJlc3RlZCwgaW50ZXJlc3RpbmcsIGludGVyZXN0cywgaW50bywgaXMsIGlzbid0LCBpdCwgaXRzLCBpdCdzLCBpdHNlbGYsIGkndmUsIGosIGp1c3QsIGssIGtlZXAsIGtlZXBzLCBraW5kLCBrbmV3LCBrbm93LCBrbm93biwga25vd3MsIGwsIGxhcmdlLCBsYXJnZWx5LCBsYXN0LCBsYXRlciwgbGF0ZXN0LCBsZWFzdCwgbGVzcywgbGV0LCBsZXRzLCBsZXQncywgbGlrZSwgbGlrZWx5LCBsb25nLCBsb25nZXIsIGxvbmdlc3QsIG0sIG1hZGUsIG1ha2UsIG1ha2luZywgbWFuLCBtYW55LCBtYXksIG1lLCBtZW1iZXIsIG1lbWJlcnMsIG1lbiwgbWlnaHQsIG1vcmUsIG1vc3QsIG1vc3RseSwgbXIsIG1ycywgbXVjaCwgbXVzdCwgbXVzdG4ndCwgbXksIG15c2VsZiwgbiwgbmVjZXNzYXJ5LCBuZWVkLCBuZWVkZWQsIG5lZWRpbmcsIG5lZWRzLCBuZXZlciwgbmV3LCBuZXdlciwgbmV3ZXN0LCBuZXh0LCBubywgbm9ib2R5LCBub24sIG5vb25lLCBub3IsIG5vdCwgbm90aGluZywgbm93LCBub3doZXJlLCBudW1iZXIsIG51bWJlcnMsIG8sIG9mLCBvZmYsIG9mdGVuLCBvbGQsIG9sZGVyLCBvbGRlc3QsIG9uLCBvbmNlLCBvbmUsIG9ubHksIG9wZW4sIG9wZW5lZCwgb3BlbmluZywgb3BlbnMsIG9yLCBvcmRlciwgb3JkZXJlZCwgb3JkZXJpbmcsIG9yZGVycywgb3RoZXIsIG90aGVycywgb3VnaHQsIG91ciwgb3Vycywgb3Vyc2VsdmVzLCBvdXQsIG92ZXIsIG93biwgcCwgcGFydCwgcGFydGVkLCBwYXJ0aW5nLCBwYXJ0cywgcGVyLCBwZXJoYXBzLCBwbGFjZSwgcGxhY2VzLCBwb2ludCwgcG9pbnRlZCwgcG9pbnRpbmcsIHBvaW50cywgcG9zc2libGUsIHByZXNlbnQsIHByZXNlbnRlZCwgcHJlc2VudGluZywgcHJlc2VudHMsIHByb2JsZW0sIHByb2JsZW1zLCBwdXQsIHB1dHMsIHEsIHF1aXRlLCByLCByYXRoZXIsIHJlYWxseSwgcmlnaHQsIHJvb20sIHJvb21zLCBzLCBzYWlkLCBzYW1lLCBzYXcsIHNheSwgc2F5cywgc2Vjb25kLCBzZWNvbmRzLCBzZWUsIHNlZW0sIHNlZW1lZCwgc2VlbWluZywgc2VlbXMsIHNlZXMsIHNldmVyYWwsIHNoYWxsLCBzaGFuJ3QsIHNoZSwgc2hlJ2QsIHNoZSdsbCwgc2hlJ3MsIHNob3VsZCwgc2hvdWxkbid0LCBzaG93LCBzaG93ZWQsIHNob3dpbmcsIHNob3dzLCBzaWRlLCBzaWRlcywgc2luY2UsIHNtYWxsLCBzbWFsbGVyLCBzbWFsbGVzdCwgc28sIHNvbWUsIHNvbWVib2R5LCBzb21lb25lLCBzb21ldGhpbmcsIHNvbWV3aGVyZSwgc3RhdGUsIHN0YXRlcywgc3RpbGwsIHN1Y2gsIHN1cmUsIHQsIHRha2UsIHRha2VuLCB0aGFuLCB0aGF0LCB0aGF0J3MsIHRoZSwgdGhlaXIsIHRoZWlycywgdGhlbSwgdGhlbXNlbHZlcywgdGhlbiwgdGhlcmUsIHRoZXJlZm9yZSwgdGhlcmUncywgdGhlc2UsIHRoZXksIHRoZXknZCwgdGhleSdsbCwgdGhleSdyZSwgdGhleSd2ZSwgdGhpbmcsIHRoaW5ncywgdGhpbmssIHRoaW5rcywgdGhpcywgdGhvc2UsIHRob3VnaCwgdGhvdWdodCwgdGhvdWdodHMsIHRocmVlLCB0aHJvdWdoLCB0aHVzLCB0bywgdG9kYXksIHRvZ2V0aGVyLCB0b28sIHRvb2ssIHRvd2FyZCwgdHVybiwgdHVybmVkLCB0dXJuaW5nLCB0dXJucywgdHdvLCB1LCB1bmRlciwgdW50aWwsIHVwLCB1cG9uLCB1cywgdXNlLCB1c2VkLCB1c2VzLCB2LCB2ZXJ5LCB3LCB3YW50LCB3YW50ZWQsIHdhbnRpbmcsIHdhbnRzLCB3YXMsIHdhc24ndCwgd2F5LCB3YXlzLCB3ZSwgd2UnZCwgd2VsbCwgd2UnbGwsIHdlbGxzLCB3ZW50LCB3ZXJlLCB3ZSdyZSwgd2VyZW4ndCwgd2UndmUsIHdoYXQsIHdoYXQncywgd2hlbiwgd2hlbidzLCB3aGVyZSwgd2hlcmUncywgd2hldGhlciwgd2hpY2gsIHdoaWxlLCB3aG8sIHdob2xlLCB3aG9tLCB3aG8ncywgd2hvc2UsIHdoeSwgd2h5J3MsIHdpbGwsIHdpdGgsIHdpdGhpbiwgd2l0aG91dCwgd29uJ3QsIHdvcmssIHdvcmtlZCwgd29ya2luZywgd29ya3MsIHdvdWxkLCB3b3VsZG4ndCwgeCwgeSwgeWVhciwgeWVhcnMsIHllcywgeWV0LCB5b3UsIHlvdSdkLCB5b3UnbGwsIHlvdW5nLCB5b3VuZ2VyLCB5b3VuZ2VzdCwgeW91ciwgeW91J3JlLCB5b3VycywgeW91cnNlbGYsIHlvdXJzZWx2ZXMsIHlvdSd2ZSwgelwiO1xudmFyIGVuZ2xpc2hXb3JkcyA9IGVuZ2xpc2guc3BsaXQoJywnKTtcblxuZXhwb3J0cy5FbmdsaXNoID0gZW5nbGlzaFdvcmRzOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCkge1xuXHR2YXIgYXJyID0gbmV3IEFycmF5KGxlbmd0aCB8fCAwKSxcblx0XHRpID0gbGVuZ3RoO1xuXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHR3aGlsZShpLS0pIHtcblx0XHRcdGFycltsZW5ndGggLSAxIC0gaV0gPSBjcmVhdGVBcnJheS5hcHBseSh0aGlzLCBhcmdzKTtcblx0XHR9XG5cdH1cblxuXG5cdHJldHVybiBhcnI7XG59XG5cbnZhciBUZXh0Qml0bWFwID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl9jb250ZXh0ID0gbnVsbDtcblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcblxuXHR0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0dGhpcy5fY2FudmFzLndpZHRoID0gNjQwO1x0XHRcdFx0XHRcdFx0Ly8gVE9ETzogIHRoaXMgY2FuIGZhaWwuICAgRml4IGl0IVxuXHR0aGlzLl9jYW52YXMuaGVpZ2h0ID0gNDgwO1xuXHR0aGlzLl9jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG5cdH1cblxuXHR0aGlzLl9iaXRtYXAgPSBjcmVhdGVBcnJheSh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuX2NhbnZhcy5oZWlnaHQ7IGorKykge1xuXHRcdFx0dGhpcy5fYml0bWFwW2ldW2pdID0gZmFsc2U7XG5cdFx0fVxuXHR9XG59O1xuXG5UZXh0Qml0bWFwLnByb3RvdHlwZSA9IF8uZXh0ZW5kKFRleHRCaXRtYXAucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhIGJpdG1hcCBmb3IgdGhlIGdpdmVuIHdvcmQvZm9udCBwYWlyLiAgIFJldHVybiBhIHJlbmRlckluZm8gb2JqZWN0IGZvciB0aGlzXG5cdCAqIEBwYXJhbSB0ZXh0IC0gYSBzdHJpbmcgdGhhdCB3ZSB3YW50IHRvIGJpdG1hcCAoaWUvIGEgd29yZClcblx0ICogQHBhcmFtIGZvbnRIZWlnaHQgLSB0aGUgaGVpZ2h0IG9mIHRoZSBmb250XG5cdCAqIEBwYXJhbSBmb250RmFtaWx5IC0gdGhlIGZvbnQgZmFtaWx5XG5cdCAqIEByZXR1cm5zIHt7YmI6IHtvZmZzZXRYOiBudW1iZXIsIG9mZnNldFk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9LCBiaXRtYXA6ICosIGZvbnRTaXplOiAqLCBmb250RmFtaWx5OiAqfX1cblx0ICovXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uKHRleHQsZm9udEhlaWdodCxmb250RmFtaWx5KSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NvbnRleHQ7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgdGV4dFJlbmRlclggPSA1O1xuXHRcdHZhciB0ZXh0UmVuZGVyWSA9IE1hdGguZmxvb3IodGhpcy5fY2FudmFzLmhlaWdodC8yKTtcblxuXHRcdC8vIEZpbGwgdGhlIGZvbnRcblx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRjdHguZm9udCA9IGZvbnRIZWlnaHQgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cdFx0Y3R4LmZpbGxUZXh0KHRleHQsdGV4dFJlbmRlclgsdGV4dFJlbmRlclkpO1xuXG5cdFx0dmFyIHdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuXG5cdFx0Ly8gR2V0IGEgcmVsYXhlZCBib3VuZGluZyBib3ggdG8gZ3JhYiBmcm9tIHRoZSBjYW52YXNcblx0XHR2YXIgc3RhcnRYID0gdGV4dFJlbmRlclg7XG5cdFx0dmFyIHN0YXJ0WSA9IHRleHRSZW5kZXJZIC0gZm9udEhlaWdodCAtIDI7XG5cdFx0dmFyIGVuZFggPSBzdGFydFggKyB3aWR0aCArIHRleHRSZW5kZXJYO1xuXHRcdHZhciBlbmRZID0gc3RhcnRZICsgZm9udEhlaWdodCArIGZvbnRIZWlnaHQqMC41O1xuXG5cblxuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKHN0YXJ0WCxzdGFydFksZW5kWCAtIHN0YXJ0WCxlbmRZIC0gc3RhcnRZKTtcblxuXHRcdHZhciBib29sZWFuQml0bWFwID0gY3JlYXRlQXJyYXkoaW1hZ2VEYXRhLndpZHRoLGltYWdlRGF0YS5oZWlnaHQpO1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkrPTQpIHtcblxuXHRcdFx0Ym9vbGVhbkJpdG1hcFt4XVt5XSA9ICBpbWFnZURhdGEuZGF0YVtpXSAhPT0gMDtcblx0XHRcdHgrKztcblx0XHRcdGlmICh4ID09PSBpbWFnZURhdGEud2lkdGgpIHtcblx0XHRcdFx0eCA9IDA7XG5cdFx0XHRcdHkrKztcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWluWSA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFggPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WSA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGZvciAoeCA9IDA7IHggPCBib29sZWFuQml0bWFwLmxlbmd0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgYm9vbGVhbkJpdG1hcFt4XS5sZW5ndGg7IHkrKykge1xuXHRcdFx0XHRpZiAoYm9vbGVhbkJpdG1hcFt4XVt5XSkge1xuXHRcdFx0XHRcdG1pblggPSBNYXRoLm1pbihtaW5YLHgpO1xuXHRcdFx0XHRcdG1pblkgPSBNYXRoLm1pbihtaW5ZLHkpO1xuXHRcdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLHgpO1xuXHRcdFx0XHRcdG1heFkgPSBNYXRoLm1heChtYXhZLHkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gVHJpbSB0aGUgYm91bmRpbmcgYm94IHRvIGp1c3QgcGl4ZWxzIHRoYXQgYXJlIGZpbGxlZFxuXHRcdHZhciB0cmltbWVkQm9vbGVhbkJpdG1hcCA9IGNyZWF0ZUFycmF5KG1heFgtbWluWCxtYXhZLW1pblkpO1xuXHRcdGZvciAoeCA9IDA7IHggPCBtYXhYLW1pblg7IHgrKykge1xuXHRcdFx0Zm9yICh5ID0gMDsgeSA8IG1heFktbWluWTsgeSsrKSB7XG5cdFx0XHRcdHRyaW1tZWRCb29sZWFuQml0bWFwW3hdW3ldID0gYm9vbGVhbkJpdG1hcFttaW5YK3hdW21pblkreV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICd5ZWxsb3cnO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3Qoc3RhcnRYLHN0YXJ0WSxlbmRYLXN0YXJ0WCxlbmRZLXN0YXJ0WSk7XG5cdFx0fVxuXG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3JlZCc7XG5cdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclgsdGV4dFJlbmRlclksdGhpcy5fY2FudmFzLndpZHRoLCB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdHZhciBiYldpZHRoID0gbWF4WC1taW5YO1xuXHRcdHZhciBiYkhlaWdodCA9IG1heFktbWluWTtcblx0XHR2YXIgYmJPZmZzZXRYID0gLSh0ZXh0UmVuZGVyWCAtIChzdGFydFggKyBtaW5YICkpO1xuXHRcdHZhciBiYk9mZnNldFkgPSAtKHRleHRSZW5kZXJZIC0gKHN0YXJ0WSArIG1pblkpKTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclggKyBiYk9mZnNldFgsIHRleHRSZW5kZXJZICsgYmJPZmZzZXRZLCBiYldpZHRoLCBiYkhlaWdodCk7XG5cdFx0fVxuXG5cdFx0dmFyIHJlbmRlckluZm8gPSB7XG5cdFx0XHRiYiA6IHtcblx0XHRcdFx0b2Zmc2V0WCA6IGJiT2Zmc2V0WCxcblx0XHRcdFx0b2Zmc2V0WSA6IGJiT2Zmc2V0WSxcblx0XHRcdFx0d2lkdGggOiBiYldpZHRoLFxuXHRcdFx0XHRoZWlnaHQgOiBiYkhlaWdodFxuXHRcdFx0fSxcblx0XHRcdGJpdG1hcCA6IHRyaW1tZWRCb29sZWFuQml0bWFwLFxuXHRcdFx0Zm9udFNpemUgOiBmb250SGVpZ2h0LFxuXHRcdFx0Zm9udEZhbWlseSA6IGZvbnRGYW1pbHlcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH0sXG5cblx0LyoqXG5cdCAqIHRlc3RzIHdoZXRoZXIgYSByZW5kZXJJbmZvIG9iamVjdCBmaXRzIGludG8gYSBnbG9iYWwgYm9vbGVhbiBiaXRtYXBcblx0ICogQHBhcmFtIHJlbmRlckluZm8gLSByZW5kZXJJbmZvIGZvciBhIHdvcmQgKHJldHVybmVkIGZyb20gY3JlYXRlKVxuXHQgKiBAcGFyYW0gYml0bWFwIC0gc2NlbmUgYml0bWFwXG5cdCAqIEByZXR1cm5zIHtib29sZWFufSAtIHRydWUgaWYgd29yZCBmaXRzLCBmYWxzZSBvdGhlcndpc2Vcblx0ICovXG5cdGZpdHMgOiBmdW5jdGlvbihyZW5kZXJJbmZvLGJpdG1hcCkge1xuXG5cdFx0dmFyIHN0YXJ0WCA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WDtcblx0XHR2YXIgc3RhcnRZID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZO1xuXG5cdFx0dmFyIGJpdG1hcFdpZHRoID0gYml0bWFwLmxlbmd0aDtcblx0XHR2YXIgYml0bWFwSGVpZ2h0ID0gYml0bWFwWzBdLmxlbmd0aDtcblxuXHRcdHZhciBoaXRFZGdlID0gc3RhcnRYIDwgMCB8fCBzdGFydFkgPCAwO1xuXHRcdHZhciBoaXRPdGhlciA9IGZhbHNlO1xuXHRcdHZhciBkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByZW5kZXJJbmZvLmJiLndpZHRoICYmICFkb2VzbnRGaXQ7IGkrKykge1xuXHRcdFx0dmFyIHUgPSBzdGFydFggKyBpO1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCByZW5kZXJJbmZvLmJiLmhlaWdodCAmJiAhZG9lc250Rml0OyBqKyspIHtcblx0XHRcdFx0dmFyIHYgPSBzdGFydFkgKyBqO1xuXHRcdFx0XHRpZiAodSA+PSBiaXRtYXBXaWR0aCB8fCB2ID49IGJpdG1hcEhlaWdodCkge1xuXHRcdFx0XHRcdGhpdEVkZ2UgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGJpdG1hcFt1XVt2XSkge1xuXHRcdFx0XHRcdGhpdE90aGVyID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gIWRvZXNudEZpdDtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dEJpdG1hcDsiLCJcbnZhciBVdGlsID0ge1xuXG5cdGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuXHRcdHZhciBrZXksIGksIHNvdXJjZTtcblx0XHRmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHQgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblx0XHQgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuXHRcdFx0aWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHQgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuXHRcdFx0fVxuXHRcdCAgfVxuXHRcdH1cblx0XHRyZXR1cm4gZGVzdDtcblx0fSxcblxuXHRsZXJwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIG1pbiArICh0KihtYXgtbWluKSk7XG5cdH0sXG5cblx0c3RlcCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBNYXRoLnJvdW5kKHRoaXMubGVycChtaW4sbWF4LHQpKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(2)
});
