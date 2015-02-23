!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Cloud5=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var TextBitmap = _dereq_('./textbitmap');


/**
 * Layout constructor
 * @param attributes
 * @constructor
 */
var Layout = function(attributes) {
	this._canvas = null;
	this._words = null;
	this._bitmap = null;
    this._renderInfo = null;
	this._textBitmapper = null;

	_.extend(this,attributes);
};

Layout.prototype = _.extend(Layout.prototype, {

	/**
	 * Initialize the text bitmapper and create our boolean bitmap of the scene
	 * @private
	 */
	_initialize : function() {
		var textBitmapperAttributes = {
			width : this._canvas.width,
			height : this._canvas.height
		};
		if (this.debug) {
			textBitmapperAttributes.debug = true;
		}

		this._textBitmapper = new TextBitmap(textBitmapperAttributes);
        this._renderInfo = {};
		this._bitmap = _.createArray(this._canvas.width,this._canvas.height);
		for (var i = 0; i < this._canvas.width; i++) {
			for (var j = 0; j < this._canvas.height; j++) {
				this._bitmap[i][j] = false;
			}
		}
	},

    /**
     * Hit test a position x,y for a word.  TODO:  make this way faster.   BSP Tree?
     * @param x - x offset into canvas
     * @param y - y offset into canvas
     * @returns {*}
     * @private
     */
    _hit : function(x,y) {
        var word = null;
        var that = this;

        // Get a list of bounding boxes that x,y are in
        var containedWords = Object.keys(this._renderInfo).filter(function(word) {
            var renderInfo = that._renderInfo[word];
            var minX = renderInfo.x + renderInfo.bb.offsetX;
            var minY = renderInfo.y + renderInfo.bb.offsetY;
            var maxX = minX + renderInfo.bb.width;
            var maxY = minY + renderInfo.bb.height;
            if (minX <= x && x <= maxX && minY <= y && y <= maxY) {
                return true;
            } else {
                return false;
            }
        });

        // Sort by size
        containedWords.sort(function(w1,w2) {
            var b1 = that._renderInfo[w1].bb;
            var b2 = that._renderInfo[w2].bb;
            var b1A = b1.width * b1.height;
            var b2A = b2.width * b2.height;
            return b1A - b2A;
        });

        // Return the word with the smallest bounding box
        if (containedWords.length > 0) {
            word = containedWords[0];
        }
        return word;
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
     * Set wordClick handler
     * @param handler
     * @returns {Layout}
     */
    onWordClick : function(handler) {
        this._onWordClick = handler;
        return this;
    },


	/**
	 * Perform the layout
	 * @returns {{}}
	 */
	layout : function() {
		this._initialize();
		this._renderInfo = {};

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

			// Sort the words by frequency
			var sortedWordArray = Object.keys(this._words).sort(function(w1,w2) {
				return that._words[w2]-that._words[w1];
			});

			if (this.maxWords > 0 && sortedWordArray.length > this.maxWords) {
				sortedWordArray = sortedWordArray.splice(0,this.maxWords);
			}


			var minFontSize = this.minFontSize || 10;
			var maxFontSize = this.maxFontSize || 200;
			sortedWordArray.forEach(function(word) {

				var t = (that._words[word] - minCount)/(maxCount-minCount);
				var fontSize =_.step(minFontSize,maxFontSize,t);

				var bitmap = that._textBitmapper.create(word,fontSize,that.font || 'Calibri');
				that._renderInfo[word] = bitmap;
				that._renderInfo[word].count = that._words[word];
				that._renderInfo[word].minCount = minCount;
				that._renderInfo[word].maxCount = maxCount;
			});
		}

		/**
		 * Debug routine to draw our words as we lay them out
		 * @param ctx - canvas context
		 * @param w - width
		 * @param h - height
		 */
		function debugDrawAll(ctx,w,h) {
			ctx.fillStyle = 'white';
			ctx.fillRect(0,0,w,h);
            var that = this;
			Object.keys(this._renderInfo).forEach(function(word) {
				var wordRenderInfo = that._renderInfo[word];
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

            var renderInfo = that._renderInfo[word];

			// Try placing the word and see if it fits/hits anything else already placed
			while (!placed && attempts > 0) {
				var x = Math.floor(Math.random() * that._canvas.width);
				var y = Math.floor(Math.random() * that._canvas.height);

				renderInfo.x = x;
				renderInfo.y = y;

				// If it fits, update the bitmap for the entire scene to say those pixels are occupied
				if (that._textBitmapper.fits(renderInfo,that._bitmap)) {
					placed = true;

					var bitmapWidth = renderInfo.bitmap.length;
					var bitmapHeight = renderInfo.bitmap[0].length;

					for (var i = 0; i < bitmapWidth; i++) {
						for (var j = 0; j < bitmapHeight; j++) {
							var u = renderInfo.x + renderInfo.bb.offsetX + i;
							var v = renderInfo.y + renderInfo.bb.offsetY + j;

							if (renderInfo.bitmap[i][j]) {
								that._bitmap[u][v] = word;
							}
						}
					}

				} else {
					attempts--;
				}
			}
			if (!placed) {
				renderInfo.x = -1;
				renderInfo.y = -1;
			}
		});


		// Bind handlers
		var overWord = null;
		function onMouseMove(e) {
			var x = e.offsetX;
			var y = e.offsetY;

			var word = that._hit(x,y);
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

        function onMouseClick(e) {
            var x = e.offsetX;
            var y = e.offsetY;
            var word = that._hit(x,y);
            if (word) {
                if (that._onWordClick) {
                    that._onWordClick(word);
                }
            }
        }

		this._canvas.onmousemove = onMouseMove;
        this._canvas.onclick = onMouseClick;


		return that._renderInfo;
	}
});

module.exports = Layout;
},{"./textbitmap":5,"./util":6}],2:[function(_dereq_,module,exports){
var _ = _dereq_('./util');

var Logger = function(writeLog) {
	this.writeLog = writeLog;
	this.logs = [];
};

Logger.prototype = _.extend(Logger.prototype, {
	push : function(label) {
		if (!this.writeLog) {
			return;
		}
		this.logs.push({
			label : label,
			time : Date.now()
		});
	},
	pop : function() {
		if (!this.writeLog) {
			return;
		}
		var tabs = this.logs.length;
		var log = this.logs.pop();
		var str = '';
		for (var i = 0; i < tabs.length; i++) {
			str += '\t';
		}
		var end = Date.now();
		var elapsed = end - log.time;
		str += log.label + ':' + elapsed + 'ms';
		console.log(str);
	},

	_millisecondsToString : function(milliseconds) {
		var oneHour = 3600000;
		var oneMinute = 60000;
		var oneSecond = 1000;
		var seconds = 0;
		var minutes = 0;
		var hours = 0;
		var result;

		if (milliseconds >= oneHour) {
			hours = Math.floor(milliseconds / oneHour);
		}

		milliseconds = hours > 0 ? (milliseconds - hours * oneHour) : milliseconds;

		if (milliseconds >= oneMinute) {
			minutes = Math.floor(milliseconds / oneMinute);
		}

		milliseconds = minutes > 0 ? (milliseconds - minutes * oneMinute) : milliseconds;

		if (milliseconds >= oneSecond) {
			seconds = Math.floor(milliseconds / oneSecond);
		}

		milliseconds = seconds > 0 ? (milliseconds - seconds * oneSecond) : milliseconds;

		if (hours > 0) {
			result = (hours > 9 ? hours : '0' + hours) + ':';
		} else {
			result = '00:';
		}

		if (minutes > 0) {
			result += (minutes > 9 ? minutes : '0' + minutes) + ':';
		} else {
			result += '00:';
		}

		if (seconds > 0) {
			result += (seconds > 9 ? seconds : '0' + seconds) + ':';
		} else {
			result += '00:';
		}

		if (milliseconds > 0) {
			result += (milliseconds > 9 ? milliseconds : '0' + milliseconds);
		} else {
			result += '00';
		}

		return result;
	}
});

module.exports = Logger;
},{"./util":6}],3:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Layout = _dereq_('./layout');
var Stopwords = _dereq_('./stopwords');
var Logger = _dereq_('./logger');

var perfLog = true;

/**
 * Cloud5 constructor
 * @param attributes
 * @constructor
 */
var Cloud5 = function(attributes) {

	this._logger = new Logger(perfLog);

	this._words = {};
	this._stopWords = {};

	this._canvas = null;
	this._width = null;
	this._height = null;
	this._backgroundFill = null;
	this._onWordOver = null;
    this._onWordOut = null;
    this._onWordClick = null;
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
			this._filters = filters;
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

	clear : function() {
		var ctx = this._canvas.getContext('2d');
		ctx.fillStyle = this._backgroundFill || 'white';
		ctx.fillRect(0,0,this._canvas.width,this._canvas.height);
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
     * Set a handler for clicking on a word
     * @param handler
     * @returns {Cloud5}
     */
    onWordClick : function(handler) {
        this._onWordClick = handler;
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
	 * Gets/sets the maximum number of words to be rendered in the cloud
	 * @param maxWords
	 * @returns {*}
	 */
	maxWords : function(maxWords) {
		if (maxWords !== undefined) {
			this._maxWords = maxWords;
			return this;
		} else {
			return this._maxWords;
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
		if (this._maxWords !== undefined) {
			layoutAttributes.maxWords = this._maxWords;
		}

		this._logger.push('Layout');
		this._layout = new Layout(layoutAttributes)
			.canvas(this._canvas)
			.words(this._words)
			.onWordOver(this._onWordOver)
			.onWordOut(this._onWordOut)
            .onWordClick(this._onWordClick);
		this._logger.pop();

		var renderInfo = this._layout.layout();

		var ctx = this._canvas.getContext('2d');
		ctx.fillStyle = this._backgroundFill || 'white';
		ctx.fillRect(0, 0, this._width, this._height);


		this._logger.push('Render');
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
		this._logger.pop();
		return this;
	},

    /**
     * Saves image to local filesystem with the format/filename specified
     * @param format (optional) - The mimetype to save as.   Default 'image/png'
     * @param filename (optional) - The filename to save it as.   'download' by default
     */
    save : function(format,filename) {
        var dataURI = this._canvas.toDataURL(format || 'image/png');
        var uriContent = dataURI.indexOf(',');
        dataURI = dataURI.substring(uriContent);
        var link = document.createElement('a');
        link.href = 'data:application/octet-stream;base64' + dataURI;
        if (filename) {
            link.download = filename;
        }
        link.click();
    }
});


module.exports = Cloud5;
},{"./layout":1,"./logger":2,"./stopwords":4,"./util":6}],4:[function(_dereq_,module,exports){
var english = "a, about, above, across, after, again, against, all, almost, alone, along, already, also, although, always, am, among, an, and, another, any, anybody, anyone, anything, anywhere, are, area, areas, aren't, around, as, ask, asked, asking, asks, at, away, b, back, backed, backing, backs, be, became, because, become, becomes, been, before, began, behind, being, beings, below, best, better, between, big, both, but, by, c, came, can, cannot, can't, case, cases, certain, certainly, clear, clearly, come, could, couldn't, d, did, didn't, differ, different, differently, do, does, doesn't, doing, done, don't, down, downed, downing, downs, during, e, each, early, either, end, ended, ending, ends, enough, even, evenly, ever, every, everybody, everyone, everything, everywhere, f, face, faces, fact, facts, far, felt, few, find, finds, first, for, four, from, full, fully, further, furthered, furthering, furthers, g, gave, general, generally, get, gets, give, given, gives, go, going, good, goods, got, great, greater, greatest, group, grouped, grouping, groups, h, had, hadn't, has, hasn't, have, haven't, having, he, he'd, he'll, her, here, here's, hers, herself, he's, high, higher, highest, him, himself, his, how, however, how's, i, i'd, if, i'll, i'm, important, in, interest, interested, interesting, interests, into, is, isn't, it, its, it's, itself, i've, j, just, k, keep, keeps, kind, knew, know, known, knows, l, large, largely, last, later, latest, least, less, let, lets, let's, like, likely, long, longer, longest, m, made, make, making, man, many, may, me, member, members, men, might, more, most, mostly, mr, mrs, much, must, mustn't, my, myself, n, necessary, need, needed, needing, needs, never, new, newer, newest, next, no, nobody, non, noone, nor, not, nothing, now, nowhere, number, numbers, o, of, off, often, old, older, oldest, on, once, one, only, open, opened, opening, opens, or, order, ordered, ordering, orders, other, others, ought, our, ours, ourselves, out, over, own, p, part, parted, parting, parts, per, perhaps, place, places, point, pointed, pointing, points, possible, present, presented, presenting, presents, problem, problems, put, puts, q, quite, r, rather, really, right, room, rooms, s, said, same, saw, say, says, second, seconds, see, seem, seemed, seeming, seems, sees, several, shall, shan't, she, she'd, she'll, she's, should, shouldn't, show, showed, showing, shows, side, sides, since, small, smaller, smallest, so, some, somebody, someone, something, somewhere, state, states, still, such, sure, t, take, taken, than, that, that's, the, their, theirs, them, themselves, then, there, therefore, there's, these, they, they'd, they'll, they're, they've, thing, things, think, thinks, this, those, though, thought, thoughts, three, through, thus, to, today, together, too, took, toward, turn, turned, turning, turns, two, u, under, until, up, upon, us, use, used, uses, v, very, w, want, wanted, wanting, wants, was, wasn't, way, ways, we, we'd, well, we'll, wells, went, were, we're, weren't, we've, what, what's, when, when's, where, where's, whether, which, while, who, whole, whom, who's, whose, why, why's, will, with, within, without, won't, work, worked, working, works, would, wouldn't, x, y, year, years, yes, yet, you, you'd, you'll, young, younger, youngest, your, you're, yours, yourself, yourselves, you've, z";
var englishWords = english.split(',');

exports.English = englishWords;
},{}],5:[function(_dereq_,module,exports){
var _ = _dereq_('./util');


var TextBitmap = function(attributes) {
	this._context = null;
	_.extend(this,attributes);

	this._canvas = document.createElement('canvas');
	this._canvas.width = this.width || 640;
	this._canvas.height = this.height || 480;
	this._context = this._canvas.getContext('2d');

	if (this.debug) {
		document.body.appendChild(this._canvas);
	}

	this._bitmap = _.createArray(this._canvas.width,this._canvas.height);
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

		var booleanBitmap = _.createArray(imageData.width,imageData.height);
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
		var trimmedBooleanBitmap = _.createArray(maxX-minX,maxY-minY);
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
},{"./util":6}],6:[function(_dereq_,module,exports){

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
	},

	/**
	 * Helper for creating an array
	 * @param length
	 * @returns {Array}
	 */
	createArray : function(length) {
		var arr = new Array(length || 0),
			i = length;

		if (arguments.length > 1) {
			var args = Array.prototype.slice.call(arguments, 1);
			while(i--) {
				arr[length-1 - i] = this.createArray.apply(this, args);
			}
		}

		return arr;
	}
};

module.exports = Util;
},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvc3RvcHdvcmRzLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pZQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVGV4dEJpdG1hcCA9IHJlcXVpcmUoJy4vdGV4dGJpdG1hcCcpO1xuXG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX3dvcmRzID0gbnVsbDtcblx0dGhpcy5fYml0bWFwID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHRleHQgYml0bWFwcGVyIGFuZCBjcmVhdGUgb3VyIGJvb2xlYW4gYml0bWFwIG9mIHRoZSBzY2VuZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2luaXRpYWxpemUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMgPSB7XG5cdFx0XHR3aWR0aCA6IHRoaXMuX2NhbnZhcy53aWR0aCxcblx0XHRcdGhlaWdodCA6IHRoaXMuX2NhbnZhcy5oZWlnaHRcblx0XHR9O1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHR0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG5ldyBUZXh0Qml0bWFwKHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXHRcdHRoaXMuX2JpdG1hcCA9IF8uY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuICAgIC8qKlxuICAgICAqIEhpdCB0ZXN0IGEgcG9zaXRpb24geCx5IGZvciBhIHdvcmQuICBUT0RPOiAgbWFrZSB0aGlzIHdheSBmYXN0ZXIuICAgQlNQIFRyZWU/XG4gICAgICogQHBhcmFtIHggLSB4IG9mZnNldCBpbnRvIGNhbnZhc1xuICAgICAqIEBwYXJhbSB5IC0geSBvZmZzZXQgaW50byBjYW52YXNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9oaXQgOiBmdW5jdGlvbih4LHkpIHtcbiAgICAgICAgdmFyIHdvcmQgPSBudWxsO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgLy8gR2V0IGEgbGlzdCBvZiBib3VuZGluZyBib3hlcyB0aGF0IHgseSBhcmUgaW5cbiAgICAgICAgdmFyIGNvbnRhaW5lZFdvcmRzID0gT2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZmlsdGVyKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIHZhciBtaW5YID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIG1pblkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgbWF4WCA9IG1pblggKyByZW5kZXJJbmZvLmJiLndpZHRoO1xuICAgICAgICAgICAgdmFyIG1heFkgPSBtaW5ZICsgcmVuZGVySW5mby5iYi5oZWlnaHQ7XG4gICAgICAgICAgICBpZiAobWluWCA8PSB4ICYmIHggPD0gbWF4WCAmJiBtaW5ZIDw9IHkgJiYgeSA8PSBtYXhZKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydCBieSBzaXplXG4gICAgICAgIGNvbnRhaW5lZFdvcmRzLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcbiAgICAgICAgICAgIHZhciBiMSA9IHRoYXQuX3JlbmRlckluZm9bdzFdLmJiO1xuICAgICAgICAgICAgdmFyIGIyID0gdGhhdC5fcmVuZGVySW5mb1t3Ml0uYmI7XG4gICAgICAgICAgICB2YXIgYjFBID0gYjEud2lkdGggKiBiMS5oZWlnaHQ7XG4gICAgICAgICAgICB2YXIgYjJBID0gYjIud2lkdGggKiBiMi5oZWlnaHQ7XG4gICAgICAgICAgICByZXR1cm4gYjFBIC0gYjJBO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIHdvcmQgd2l0aCB0aGUgc21hbGxlc3QgYm91bmRpbmcgYm94XG4gICAgICAgIGlmIChjb250YWluZWRXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3b3JkID0gY29udGFpbmVkV29yZHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdvcmQ7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3b3JkcyB0byBsYXlvdXRcblx0ICogQHBhcmFtIHdvcmRzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dGhpcy5fd29yZHMgPSB3b3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgd29yZE92ZXIgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdXQgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgd29yZENsaWNrIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtMYXlvdXR9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIHRoZSBsYXlvdXRcblx0ICogQHJldHVybnMge3t9fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW5pdGlhbGl6ZSgpO1xuXHRcdHRoaXMuX3JlbmRlckluZm8gPSB7fTtcblxuXHRcdC8vIEdldCBjb3VudHMgZm9yIGVhY2ggd29yZCwgdGhlbiBmaWd1cmUgb3V0IHRoZSBmb250IHNpemUgZm9yIGVhY2ggd29yZC4gICBDcmVhdGUgYSBib29sZWFuIGJpdG1hcCBhbmRcblx0XHQvLyBib3VuZGluZyBib3ggZm9yIGVhY2ggd29yZFxuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdFx0dmFyIG1heENvdW50ID0gMDtcblxuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKHRoYXQuX3dvcmRzW3dvcmRdLG1pbkNvdW50KTtcblx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heCh0aGF0Ll93b3Jkc1t3b3JkXSxtYXhDb3VudCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gU29ydCB0aGUgd29yZHMgYnkgZnJlcXVlbmN5XG5cdFx0XHR2YXIgc29ydGVkV29yZEFycmF5ID0gT2JqZWN0LmtleXModGhpcy5fd29yZHMpLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcblx0XHRcdFx0cmV0dXJuIHRoYXQuX3dvcmRzW3cyXS10aGF0Ll93b3Jkc1t3MV07XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKHRoaXMubWF4V29yZHMgPiAwICYmIHNvcnRlZFdvcmRBcnJheS5sZW5ndGggPiB0aGlzLm1heFdvcmRzKSB7XG5cdFx0XHRcdHNvcnRlZFdvcmRBcnJheSA9IHNvcnRlZFdvcmRBcnJheS5zcGxpY2UoMCx0aGlzLm1heFdvcmRzKTtcblx0XHRcdH1cblxuXG5cdFx0XHR2YXIgbWluRm9udFNpemUgPSB0aGlzLm1pbkZvbnRTaXplIHx8IDEwO1xuXHRcdFx0dmFyIG1heEZvbnRTaXplID0gdGhpcy5tYXhGb250U2l6ZSB8fCAyMDA7XG5cdFx0XHRzb3J0ZWRXb3JkQXJyYXkuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cblx0XHRcdFx0dmFyIHQgPSAodGhhdC5fd29yZHNbd29yZF0gLSBtaW5Db3VudCkvKG1heENvdW50LW1pbkNvdW50KTtcblx0XHRcdFx0dmFyIGZvbnRTaXplID1fLnN0ZXAobWluRm9udFNpemUsbWF4Rm9udFNpemUsdCk7XG5cblx0XHRcdFx0dmFyIGJpdG1hcCA9IHRoYXQuX3RleHRCaXRtYXBwZXIuY3JlYXRlKHdvcmQsZm9udFNpemUsdGhhdC5mb250IHx8ICdDYWxpYnJpJyk7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0gPSBiaXRtYXA7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0uY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5taW5Db3VudCA9IG1pbkNvdW50O1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLm1heENvdW50ID0gbWF4Q291bnQ7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEZWJ1ZyByb3V0aW5lIHRvIGRyYXcgb3VyIHdvcmRzIGFzIHdlIGxheSB0aGVtIG91dFxuXHRcdCAqIEBwYXJhbSBjdHggLSBjYW52YXMgY29udGV4dFxuXHRcdCAqIEBwYXJhbSB3IC0gd2lkdGhcblx0XHQgKiBAcGFyYW0gaCAtIGhlaWdodFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRlYnVnRHJhd0FsbChjdHgsdyxoKSB7XG5cdFx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRcdGN0eC5maWxsUmVjdCgwLDAsdyxoKTtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHR2YXIgd29yZFJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuXHRcdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gdW5kZWZpbmVkICYmIHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuXHRcdFx0XHRcdGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRcdFx0Y3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcblx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBMYXlvdXQgZWFjaCB3b3JkXG5cdFx0c29ydGVkV29yZEFycmF5LmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0dmFyIHBsYWNlZCA9IGZhbHNlO1xuXHRcdFx0dmFyIGF0dGVtcHRzID0gMTAwO1xuXG5cdFx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0XHRkZWJ1Z0RyYXdBbGwodGhhdC5fY2FudmFzLmdldENvbnRleHQoJzJkJyksdGhhdC5fY2FudmFzLndpZHRoLCB0aGF0Ll9jYW52YXMuaGVpZ2h0KTtcblx0XHRcdH1cblxuICAgICAgICAgICAgdmFyIHJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuXG5cdFx0XHQvLyBUcnkgcGxhY2luZyB0aGUgd29yZCBhbmQgc2VlIGlmIGl0IGZpdHMvaGl0cyBhbnl0aGluZyBlbHNlIGFscmVhZHkgcGxhY2VkXG5cdFx0XHR3aGlsZSAoIXBsYWNlZCAmJiBhdHRlbXB0cyA+IDApIHtcblx0XHRcdFx0dmFyIHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGF0Ll9jYW52YXMud2lkdGgpO1xuXHRcdFx0XHR2YXIgeSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0XHRcdHJlbmRlckluZm8ueCA9IHg7XG5cdFx0XHRcdHJlbmRlckluZm8ueSA9IHk7XG5cblx0XHRcdFx0Ly8gSWYgaXQgZml0cywgdXBkYXRlIHRoZSBiaXRtYXAgZm9yIHRoZSBlbnRpcmUgc2NlbmUgdG8gc2F5IHRob3NlIHBpeGVscyBhcmUgb2NjdXBpZWRcblx0XHRcdFx0aWYgKHRoYXQuX3RleHRCaXRtYXBwZXIuZml0cyhyZW5kZXJJbmZvLHRoYXQuX2JpdG1hcCkpIHtcblx0XHRcdFx0XHRwbGFjZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0dmFyIGJpdG1hcFdpZHRoID0gcmVuZGVySW5mby5iaXRtYXAubGVuZ3RoO1xuXHRcdFx0XHRcdHZhciBiaXRtYXBIZWlnaHQgPSByZW5kZXJJbmZvLmJpdG1hcFswXS5sZW5ndGg7XG5cblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGJpdG1hcFdpZHRoOyBpKyspIHtcblx0XHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYml0bWFwSGVpZ2h0OyBqKyspIHtcblx0XHRcdFx0XHRcdFx0dmFyIHUgPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFggKyBpO1xuXHRcdFx0XHRcdFx0XHR2YXIgdiA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WSArIGo7XG5cblx0XHRcdFx0XHRcdFx0aWYgKHJlbmRlckluZm8uYml0bWFwW2ldW2pdKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhhdC5fYml0bWFwW3VdW3ZdID0gd29yZDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGF0dGVtcHRzLS07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICghcGxhY2VkKSB7XG5cdFx0XHRcdHJlbmRlckluZm8ueCA9IC0xO1xuXHRcdFx0XHRyZW5kZXJJbmZvLnkgPSAtMTtcblx0XHRcdH1cblx0XHR9KTtcblxuXG5cdFx0Ly8gQmluZCBoYW5kbGVyc1xuXHRcdHZhciBvdmVyV29yZCA9IG51bGw7XG5cdFx0ZnVuY3Rpb24gb25Nb3VzZU1vdmUoZSkge1xuXHRcdFx0dmFyIHggPSBlLm9mZnNldFg7XG5cdFx0XHR2YXIgeSA9IGUub2Zmc2V0WTtcblxuXHRcdFx0dmFyIHdvcmQgPSB0aGF0Ll9oaXQoeCx5KTtcblx0XHRcdGlmICh3b3JkKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvdmVyV29yZCA9IHdvcmQ7XG5cdFx0XHR9IGVsc2UgaWYgKG92ZXJXb3JkKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcblx0XHRcdFx0XHR0aGF0Ll9vbldvcmRPdXQob3ZlcldvcmQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG92ZXJXb3JkID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Nb3VzZUNsaWNrKGUpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkQ2xpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkQ2xpY2sod29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblx0XHR0aGlzLl9jYW52YXMub25tb3VzZW1vdmUgPSBvbk1vdXNlTW92ZTtcbiAgICAgICAgdGhpcy5fY2FudmFzLm9uY2xpY2sgPSBvbk1vdXNlQ2xpY2s7XG5cblxuXHRcdHJldHVybiB0aGF0Ll9yZW5kZXJJbmZvO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIExvZ2dlciA9IGZ1bmN0aW9uKHdyaXRlTG9nKSB7XG5cdHRoaXMud3JpdGVMb2cgPSB3cml0ZUxvZztcblx0dGhpcy5sb2dzID0gW107XG59O1xuXG5Mb2dnZXIucHJvdG90eXBlID0gXy5leHRlbmQoTG9nZ2VyLnByb3RvdHlwZSwge1xuXHRwdXNoIDogZnVuY3Rpb24obGFiZWwpIHtcblx0XHRpZiAoIXRoaXMud3JpdGVMb2cpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5sb2dzLnB1c2goe1xuXHRcdFx0bGFiZWwgOiBsYWJlbCxcblx0XHRcdHRpbWUgOiBEYXRlLm5vdygpXG5cdFx0fSk7XG5cdH0sXG5cdHBvcCA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy53cml0ZUxvZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgdGFicyA9IHRoaXMubG9ncy5sZW5ndGg7XG5cdFx0dmFyIGxvZyA9IHRoaXMubG9ncy5wb3AoKTtcblx0XHR2YXIgc3RyID0gJyc7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0YWJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRzdHIgKz0gJ1xcdCc7XG5cdFx0fVxuXHRcdHZhciBlbmQgPSBEYXRlLm5vdygpO1xuXHRcdHZhciBlbGFwc2VkID0gZW5kIC0gbG9nLnRpbWU7XG5cdFx0c3RyICs9IGxvZy5sYWJlbCArICc6JyArIGVsYXBzZWQgKyAnbXMnO1xuXHRcdGNvbnNvbGUubG9nKHN0cik7XG5cdH0sXG5cblx0X21pbGxpc2Vjb25kc1RvU3RyaW5nIDogZnVuY3Rpb24obWlsbGlzZWNvbmRzKSB7XG5cdFx0dmFyIG9uZUhvdXIgPSAzNjAwMDAwO1xuXHRcdHZhciBvbmVNaW51dGUgPSA2MDAwMDtcblx0XHR2YXIgb25lU2Vjb25kID0gMTAwMDtcblx0XHR2YXIgc2Vjb25kcyA9IDA7XG5cdFx0dmFyIG1pbnV0ZXMgPSAwO1xuXHRcdHZhciBob3VycyA9IDA7XG5cdFx0dmFyIHJlc3VsdDtcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lSG91cikge1xuXHRcdFx0aG91cnMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZUhvdXIpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IGhvdXJzID4gMCA/IChtaWxsaXNlY29uZHMgLSBob3VycyAqIG9uZUhvdXIpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVNaW51dGUpIHtcblx0XHRcdG1pbnV0ZXMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZU1pbnV0ZSk7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gbWludXRlcyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gbWludXRlcyAqIG9uZU1pbnV0ZSkgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZVNlY29uZCkge1xuXHRcdFx0c2Vjb25kcyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lU2Vjb25kKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBzZWNvbmRzID4gMCA/IChtaWxsaXNlY29uZHMgLSBzZWNvbmRzICogb25lU2Vjb25kKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChob3VycyA+IDApIHtcblx0XHRcdHJlc3VsdCA9IChob3VycyA+IDkgPyBob3VycyA6ICcwJyArIGhvdXJzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ID0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbnV0ZXMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKG1pbnV0ZXMgPiA5ID8gbWludXRlcyA6ICcwJyArIG1pbnV0ZXMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKHNlY29uZHMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKHNlY29uZHMgPiA5ID8gc2Vjb25kcyA6ICcwJyArIHNlY29uZHMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAobWlsbGlzZWNvbmRzID4gOSA/IG1pbGxpc2Vjb25kcyA6ICcwJyArIG1pbGxpc2Vjb25kcyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDAnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG52YXIgU3RvcHdvcmRzID0gcmVxdWlyZSgnLi9zdG9wd29yZHMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGVyZkxvZyA9IHRydWU7XG5cbi8qKlxuICogQ2xvdWQ1IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBDbG91ZDUgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cblx0dGhpcy5fbG9nZ2VyID0gbmV3IExvZ2dlcihwZXJmTG9nKTtcblxuXHR0aGlzLl93b3JkcyA9IHt9O1xuXHR0aGlzLl9zdG9wV29yZHMgPSB7fTtcblxuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl93aWR0aCA9IG51bGw7XG5cdHRoaXMuX2hlaWdodCA9IG51bGw7XG5cdHRoaXMuX2JhY2tncm91bmRGaWxsID0gbnVsbDtcblx0dGhpcy5fb25Xb3JkT3ZlciA9IG51bGw7XG4gICAgdGhpcy5fb25Xb3JkT3V0ID0gbnVsbDtcbiAgICB0aGlzLl9vbldvcmRDbGljayA9IG51bGw7XG5cdHRoaXMuX2xheW91dCA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkNsb3VkNS5wcm90b3R5cGUgPSBfLmV4dGVuZChDbG91ZDUucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBIVE1MNSBDYW52YXMgZWxlbWVudFxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzLiAgIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gd2lkdGggLSB3aWR0aCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKHdpZHRoKSB7XG5cdFx0aWYgKHdpZHRoKSB7XG5cdFx0XHRpZiAodGhpcy5fY2FudmFzKSB7XG5cdFx0XHRcdHRoaXMuX2NhbnZhcy53aWR0aCA9IHdpZHRoO1xuXHRcdFx0XHR0aGlzLl93aWR0aCA9IHdpZHRoO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLndpZHRoO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcy4gIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gaGVpZ2h0IC0gaGVpZ2h0IGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGhlaWdodCA6IGZ1bmN0aW9uKGhlaWdodCkge1xuXHRcdGlmIChoZWlnaHQpIHtcblx0XHRcdGlmICh0aGlzLl9jYW52YXMpIHtcblx0XHRcdFx0dGhpcy5fY2FudmFzLmhlaWdodCA9IGhlaWdodDtcblx0XHRcdFx0dGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9oZWlnaHQ7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSB0ZXh0IGZvciB3b3JkIGNsb3VkIGdlbmVyYXRpb24gZnJvbSBhIGxhcmdlIHN0cmluZ1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nLiAgIEJ5IGRlZmF1bHQsIHdlIHJlbW92ZSBhbGwgcHVuY3R1YXRpb24uICAgQWRkaXRpb25hbCBydWxlcyBjYW4gYmUgYWRkZWQgYnlcblx0ICogY2FsbGluZyB0ZXh0RmlsdGVycyguLi4pXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyEkJVxcXiZcXCo7Ont9PVxcLV9gfigpXS9nLCcnKTtcblx0XHRpZiAodGhpcy5fZmlsdGVycykge1xuXHRcdFx0dGhpcy5fZmlsdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlcikge1xuXHRcdFx0XHRmaWx0ZXJlZCA9IHRleHQucmVwbGFjZShmaWx0ZXIsJycpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHZhciB3b3JkcyA9IGZpbHRlcmVkLnNwbGl0KCcgJyk7XG5cdFx0dGhpcy53b3Jkcyh3b3Jkcyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyBhIGxpc3Qgb2YgdGV4dCBmaWx0ZXJzIChyZWd1bGFyIGV4cHJlc3Npb25zKSB0byBiZSBhcHBsaWVkLiAgIFJ1bGVzIHRoYXQgbWF0Y2ggd2lsbCBiZSBkZWxldGVkXG5cdCAqIGZyb20gdGhlIG9yaWdpbmFsIHRleHQgc3RyaW5nLiAgVGhleSdyZSBhcHBsaWVkIGluIHRoZSBvcmRlciBnaXZlbiB0byB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBmaWx0ZXJzIC0gYW4gYXJyYXkgb2YgcmVndWxhciBleHByZXNzaW9uc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHRleHRGaWx0ZXJzIDogZnVuY3Rpb24oZmlsdGVycykge1xuXHRcdGlmIChmaWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzID0gZmlsdGVycztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZmlsdGVycztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHN0b3Agd29yZHMgKHdvcmRzIHRvIGlnbm9yZSlcblx0ICogQHBhcmFtIHdvcmRzIC0gYW4gYXJyYXkgb2Ygc3RyaW5ncyB0byBpZ25vcmVcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRzdG9wIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHdvcmQpIHtcblx0XHRcdFx0dGhhdC5fc3RvcFdvcmRzW3dvcmQudHJpbSgpLnRvTG93ZXJDYXNlKCldID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9zdG9wV29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdGNsZWFyIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGN0eC5maWxsU3R5bGUgPSB0aGlzLl9iYWNrZ3JvdW5kRmlsbCB8fCAnd2hpdGUnO1xuXHRcdGN0eC5maWxsUmVjdCgwLDAsdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGJhY2tncm91bmQgZmlsbCBzdHlsZVxuXHQgKiBAcGFyYW0gZmlsbFN0eWxlIC0gYSB2YWxpZCBmaWxsU3R5bGUgc3RyaW5nXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgZm9yIHRoZSB3b3JkIGNsb3VkXG5cdCAqIEBwYXJhbSB3b3JkcyAtIGFuIGFycmF5IG9mIHdvcmRzLlxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMuX3N0b3BXb3JkcykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRoaXMuc3RvcChTdG9wd29yZHMuRW5nbGlzaCk7XG5cdFx0XHR9XG5cblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJhdykge1xuXHRcdFx0XHR2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKHRoYXQuX3N0b3BXb3Jkc1t3b3JkXSB8fCB3b3JkID09PSAnJykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBjb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHRpZiAoIWNvdW50KSB7XG5cdFx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3ZlciBhIHdvcmRcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3V0IG9mIGEgd29yZFxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYSBoYW5kbGVyIGZvciBjbGlja2luZyBvbiBhIHdvcmRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtDbG91ZDV9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGZhbWlseSBmb3Igd29yZHNcblx0ICogQHBhcmFtIGZvbnQgLSBmb250IGZhbWlseSAoaWUvICdIZWx2ZXRpY2EnKVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGZvbnQgOiBmdW5jdGlvbihmb250KSB7XG5cdFx0aWYgKGZvbnQpIHtcblx0XHRcdHRoaXMuX2ZvbnQgPSBmb250O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250O1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtaW5pbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1pbkZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWluRm9udFNpemUgOiBmdW5jdGlvbihtaW5Gb250U2l6ZSkge1xuXHRcdGlmIChtaW5Gb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWluRm9udFNpemUgPSBtaW5Gb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gZm9udCBzaXplIGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gbWF4Rm9udFNpemUgLSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhGb250U2l6ZSA6IGZ1bmN0aW9uKG1heEZvbnRTaXplKSB7XG5cdFx0aWYgKG1heEZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9tYXhGb250U2l6ZSA9IG1heEZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWF4aW11bSBudW1iZXIgb2Ygd29yZHMgdG8gYmUgcmVuZGVyZWQgaW4gdGhlIGNsb3VkXG5cdCAqIEBwYXJhbSBtYXhXb3Jkc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1heFdvcmRzIDogZnVuY3Rpb24obWF4V29yZHMpIHtcblx0XHRpZiAobWF4V29yZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5fbWF4V29yZHMgPSBtYXhXb3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4V29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgY29sb3JzXG5cdCAqIEBwYXJhbSBjb2xvciAtIGNhbiBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcblx0ICogXHRcdDEpICBBIGZpbGxTdHlsZSBzdHJpbmcgKGllLyAncmVkJywncmdiKDI1NSwyNTUsMCknLCBldGMpXG5cdCAqIFx0ICAgIDIpICBBbiBhcnJheSBvZiBmaWxsU3R5bGUgc3RyaW5nc1xuXHQgKiBcdCAgICAzKSAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBmaWxsU3R5bGUgc3RyaW5nIGdpdmVuIHRoZSByZW5kZXJJbmZvIGZvciB0aGUgd29yZC4gIGllL1xuXHQgKiBcdCAgICAgICAgICAgICBmdW5jdGlvbihyZW5kZXJJbmZvKSB7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgd29yZCA9IHJlbmRlckluZm8ud29yZDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IHJlbmRlckluZm8uY291bnQ7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgeFBvcyA9IHJlbmRlckluZm8ueDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB5UG9zdCA9IHJlbmRlckluZm8ueTtcblx0ICogXHQgICAgICAgICAgICAgICAgIHJldHVybiAvLyBhIGZpbGxTdHlsZSBkZXJpdmVkIGZyb20gYWJvdmUgcHJvcGVydGllc1xuXHQgKiBcdCAgICAgICAgICAgICAgfVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNvbG9yIDogZnVuY3Rpb24oY29sb3IpIHtcblx0XHRpZiAoY29sb3IpIHtcblx0XHRcdHRoaXMuX2NvbG9yID0gY29sb3I7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbG9yO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogTGF5b3V0IGFuZCByZW5kZXIgdGhlIHdvcmQgY2xvdWQgdG8gdGhlIGNhbnZhcyBwcm92aWRlZFxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0Z2VuZXJhdGUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGF5b3V0QXR0cmlidXRlcyA9IHt9O1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2ZvbnQpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZm9udCA9IHRoaXMuX2ZvbnQ7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9taW5Gb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5taW5Gb250U2l6ZSA9IHRoaXMuX21pbkZvbnRTaXplO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWF4Rm9udFNpemUpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWF4Rm9udFNpemUgPSB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21heFdvcmRzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWF4V29yZHMgPSB0aGlzLl9tYXhXb3Jkcztcblx0XHR9XG5cblx0XHR0aGlzLl9sb2dnZXIucHVzaCgnTGF5b3V0Jyk7XG5cdFx0dGhpcy5fbGF5b3V0ID0gbmV3IExheW91dChsYXlvdXRBdHRyaWJ1dGVzKVxuXHRcdFx0LmNhbnZhcyh0aGlzLl9jYW52YXMpXG5cdFx0XHQud29yZHModGhpcy5fd29yZHMpXG5cdFx0XHQub25Xb3JkT3Zlcih0aGlzLl9vbldvcmRPdmVyKVxuXHRcdFx0Lm9uV29yZE91dCh0aGlzLl9vbldvcmRPdXQpXG4gICAgICAgICAgICAub25Xb3JkQ2xpY2sodGhpcy5fb25Xb3JkQ2xpY2spO1xuXHRcdHRoaXMuX2xvZ2dlci5wb3AoKTtcblxuXHRcdHZhciByZW5kZXJJbmZvID0gdGhpcy5fbGF5b3V0LmxheW91dCgpO1xuXG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGN0eC5maWxsU3R5bGUgPSB0aGlzLl9iYWNrZ3JvdW5kRmlsbCB8fCAnd2hpdGUnO1xuXHRcdGN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuXG5cdFx0dGhpcy5fbG9nZ2VyLnB1c2goJ1JlbmRlcicpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyhyZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciB3b3JkUmVuZGVySW5mbyA9IHJlbmRlckluZm9bd29yZF07XG5cdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0Y3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcblxuXG5cdFx0XHRcdHZhciBjbHIgPSAnYmxhY2snO1xuXHRcdFx0XHRpZiAodGhhdC5fY29sb3IpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0dmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NvbG9yLmxlbmd0aCk7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcltpZHhdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3IocmVuZGVySW5mb1t3b3JkXSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRjdHguZmlsbFN0eWxlID0gY2xyO1xuXHRcdFx0XHRjdHguZmlsbFRleHQod29yZCx3b3JkUmVuZGVySW5mby54LHdvcmRSZW5kZXJJbmZvLnkpO1xuXG5cdFx0XHRcdGlmICh0aGF0LmRlYnVnKSB7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5fbG9nZ2VyLnBvcCgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgaW1hZ2UgdG8gbG9jYWwgZmlsZXN5c3RlbSB3aXRoIHRoZSBmb3JtYXQvZmlsZW5hbWUgc3BlY2lmaWVkXG4gICAgICogQHBhcmFtIGZvcm1hdCAob3B0aW9uYWwpIC0gVGhlIG1pbWV0eXBlIHRvIHNhdmUgYXMuICAgRGVmYXVsdCAnaW1hZ2UvcG5nJ1xuICAgICAqIEBwYXJhbSBmaWxlbmFtZSAob3B0aW9uYWwpIC0gVGhlIGZpbGVuYW1lIHRvIHNhdmUgaXQgYXMuICAgJ2Rvd25sb2FkJyBieSBkZWZhdWx0XG4gICAgICovXG4gICAgc2F2ZSA6IGZ1bmN0aW9uKGZvcm1hdCxmaWxlbmFtZSkge1xuICAgICAgICB2YXIgZGF0YVVSSSA9IHRoaXMuX2NhbnZhcy50b0RhdGFVUkwoZm9ybWF0IHx8ICdpbWFnZS9wbmcnKTtcbiAgICAgICAgdmFyIHVyaUNvbnRlbnQgPSBkYXRhVVJJLmluZGV4T2YoJywnKTtcbiAgICAgICAgZGF0YVVSSSA9IGRhdGFVUkkuc3Vic3RyaW5nKHVyaUNvbnRlbnQpO1xuICAgICAgICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgbGluay5ocmVmID0gJ2RhdGE6YXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtO2Jhc2U2NCcgKyBkYXRhVVJJO1xuICAgICAgICBpZiAoZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIGxpbmsuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgICAgfVxuICAgICAgICBsaW5rLmNsaWNrKCk7XG4gICAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDbG91ZDU7IiwidmFyIGVuZ2xpc2ggPSBcImEsIGFib3V0LCBhYm92ZSwgYWNyb3NzLCBhZnRlciwgYWdhaW4sIGFnYWluc3QsIGFsbCwgYWxtb3N0LCBhbG9uZSwgYWxvbmcsIGFscmVhZHksIGFsc28sIGFsdGhvdWdoLCBhbHdheXMsIGFtLCBhbW9uZywgYW4sIGFuZCwgYW5vdGhlciwgYW55LCBhbnlib2R5LCBhbnlvbmUsIGFueXRoaW5nLCBhbnl3aGVyZSwgYXJlLCBhcmVhLCBhcmVhcywgYXJlbid0LCBhcm91bmQsIGFzLCBhc2ssIGFza2VkLCBhc2tpbmcsIGFza3MsIGF0LCBhd2F5LCBiLCBiYWNrLCBiYWNrZWQsIGJhY2tpbmcsIGJhY2tzLCBiZSwgYmVjYW1lLCBiZWNhdXNlLCBiZWNvbWUsIGJlY29tZXMsIGJlZW4sIGJlZm9yZSwgYmVnYW4sIGJlaGluZCwgYmVpbmcsIGJlaW5ncywgYmVsb3csIGJlc3QsIGJldHRlciwgYmV0d2VlbiwgYmlnLCBib3RoLCBidXQsIGJ5LCBjLCBjYW1lLCBjYW4sIGNhbm5vdCwgY2FuJ3QsIGNhc2UsIGNhc2VzLCBjZXJ0YWluLCBjZXJ0YWlubHksIGNsZWFyLCBjbGVhcmx5LCBjb21lLCBjb3VsZCwgY291bGRuJ3QsIGQsIGRpZCwgZGlkbid0LCBkaWZmZXIsIGRpZmZlcmVudCwgZGlmZmVyZW50bHksIGRvLCBkb2VzLCBkb2Vzbid0LCBkb2luZywgZG9uZSwgZG9uJ3QsIGRvd24sIGRvd25lZCwgZG93bmluZywgZG93bnMsIGR1cmluZywgZSwgZWFjaCwgZWFybHksIGVpdGhlciwgZW5kLCBlbmRlZCwgZW5kaW5nLCBlbmRzLCBlbm91Z2gsIGV2ZW4sIGV2ZW5seSwgZXZlciwgZXZlcnksIGV2ZXJ5Ym9keSwgZXZlcnlvbmUsIGV2ZXJ5dGhpbmcsIGV2ZXJ5d2hlcmUsIGYsIGZhY2UsIGZhY2VzLCBmYWN0LCBmYWN0cywgZmFyLCBmZWx0LCBmZXcsIGZpbmQsIGZpbmRzLCBmaXJzdCwgZm9yLCBmb3VyLCBmcm9tLCBmdWxsLCBmdWxseSwgZnVydGhlciwgZnVydGhlcmVkLCBmdXJ0aGVyaW5nLCBmdXJ0aGVycywgZywgZ2F2ZSwgZ2VuZXJhbCwgZ2VuZXJhbGx5LCBnZXQsIGdldHMsIGdpdmUsIGdpdmVuLCBnaXZlcywgZ28sIGdvaW5nLCBnb29kLCBnb29kcywgZ290LCBncmVhdCwgZ3JlYXRlciwgZ3JlYXRlc3QsIGdyb3VwLCBncm91cGVkLCBncm91cGluZywgZ3JvdXBzLCBoLCBoYWQsIGhhZG4ndCwgaGFzLCBoYXNuJ3QsIGhhdmUsIGhhdmVuJ3QsIGhhdmluZywgaGUsIGhlJ2QsIGhlJ2xsLCBoZXIsIGhlcmUsIGhlcmUncywgaGVycywgaGVyc2VsZiwgaGUncywgaGlnaCwgaGlnaGVyLCBoaWdoZXN0LCBoaW0sIGhpbXNlbGYsIGhpcywgaG93LCBob3dldmVyLCBob3cncywgaSwgaSdkLCBpZiwgaSdsbCwgaSdtLCBpbXBvcnRhbnQsIGluLCBpbnRlcmVzdCwgaW50ZXJlc3RlZCwgaW50ZXJlc3RpbmcsIGludGVyZXN0cywgaW50bywgaXMsIGlzbid0LCBpdCwgaXRzLCBpdCdzLCBpdHNlbGYsIGkndmUsIGosIGp1c3QsIGssIGtlZXAsIGtlZXBzLCBraW5kLCBrbmV3LCBrbm93LCBrbm93biwga25vd3MsIGwsIGxhcmdlLCBsYXJnZWx5LCBsYXN0LCBsYXRlciwgbGF0ZXN0LCBsZWFzdCwgbGVzcywgbGV0LCBsZXRzLCBsZXQncywgbGlrZSwgbGlrZWx5LCBsb25nLCBsb25nZXIsIGxvbmdlc3QsIG0sIG1hZGUsIG1ha2UsIG1ha2luZywgbWFuLCBtYW55LCBtYXksIG1lLCBtZW1iZXIsIG1lbWJlcnMsIG1lbiwgbWlnaHQsIG1vcmUsIG1vc3QsIG1vc3RseSwgbXIsIG1ycywgbXVjaCwgbXVzdCwgbXVzdG4ndCwgbXksIG15c2VsZiwgbiwgbmVjZXNzYXJ5LCBuZWVkLCBuZWVkZWQsIG5lZWRpbmcsIG5lZWRzLCBuZXZlciwgbmV3LCBuZXdlciwgbmV3ZXN0LCBuZXh0LCBubywgbm9ib2R5LCBub24sIG5vb25lLCBub3IsIG5vdCwgbm90aGluZywgbm93LCBub3doZXJlLCBudW1iZXIsIG51bWJlcnMsIG8sIG9mLCBvZmYsIG9mdGVuLCBvbGQsIG9sZGVyLCBvbGRlc3QsIG9uLCBvbmNlLCBvbmUsIG9ubHksIG9wZW4sIG9wZW5lZCwgb3BlbmluZywgb3BlbnMsIG9yLCBvcmRlciwgb3JkZXJlZCwgb3JkZXJpbmcsIG9yZGVycywgb3RoZXIsIG90aGVycywgb3VnaHQsIG91ciwgb3Vycywgb3Vyc2VsdmVzLCBvdXQsIG92ZXIsIG93biwgcCwgcGFydCwgcGFydGVkLCBwYXJ0aW5nLCBwYXJ0cywgcGVyLCBwZXJoYXBzLCBwbGFjZSwgcGxhY2VzLCBwb2ludCwgcG9pbnRlZCwgcG9pbnRpbmcsIHBvaW50cywgcG9zc2libGUsIHByZXNlbnQsIHByZXNlbnRlZCwgcHJlc2VudGluZywgcHJlc2VudHMsIHByb2JsZW0sIHByb2JsZW1zLCBwdXQsIHB1dHMsIHEsIHF1aXRlLCByLCByYXRoZXIsIHJlYWxseSwgcmlnaHQsIHJvb20sIHJvb21zLCBzLCBzYWlkLCBzYW1lLCBzYXcsIHNheSwgc2F5cywgc2Vjb25kLCBzZWNvbmRzLCBzZWUsIHNlZW0sIHNlZW1lZCwgc2VlbWluZywgc2VlbXMsIHNlZXMsIHNldmVyYWwsIHNoYWxsLCBzaGFuJ3QsIHNoZSwgc2hlJ2QsIHNoZSdsbCwgc2hlJ3MsIHNob3VsZCwgc2hvdWxkbid0LCBzaG93LCBzaG93ZWQsIHNob3dpbmcsIHNob3dzLCBzaWRlLCBzaWRlcywgc2luY2UsIHNtYWxsLCBzbWFsbGVyLCBzbWFsbGVzdCwgc28sIHNvbWUsIHNvbWVib2R5LCBzb21lb25lLCBzb21ldGhpbmcsIHNvbWV3aGVyZSwgc3RhdGUsIHN0YXRlcywgc3RpbGwsIHN1Y2gsIHN1cmUsIHQsIHRha2UsIHRha2VuLCB0aGFuLCB0aGF0LCB0aGF0J3MsIHRoZSwgdGhlaXIsIHRoZWlycywgdGhlbSwgdGhlbXNlbHZlcywgdGhlbiwgdGhlcmUsIHRoZXJlZm9yZSwgdGhlcmUncywgdGhlc2UsIHRoZXksIHRoZXknZCwgdGhleSdsbCwgdGhleSdyZSwgdGhleSd2ZSwgdGhpbmcsIHRoaW5ncywgdGhpbmssIHRoaW5rcywgdGhpcywgdGhvc2UsIHRob3VnaCwgdGhvdWdodCwgdGhvdWdodHMsIHRocmVlLCB0aHJvdWdoLCB0aHVzLCB0bywgdG9kYXksIHRvZ2V0aGVyLCB0b28sIHRvb2ssIHRvd2FyZCwgdHVybiwgdHVybmVkLCB0dXJuaW5nLCB0dXJucywgdHdvLCB1LCB1bmRlciwgdW50aWwsIHVwLCB1cG9uLCB1cywgdXNlLCB1c2VkLCB1c2VzLCB2LCB2ZXJ5LCB3LCB3YW50LCB3YW50ZWQsIHdhbnRpbmcsIHdhbnRzLCB3YXMsIHdhc24ndCwgd2F5LCB3YXlzLCB3ZSwgd2UnZCwgd2VsbCwgd2UnbGwsIHdlbGxzLCB3ZW50LCB3ZXJlLCB3ZSdyZSwgd2VyZW4ndCwgd2UndmUsIHdoYXQsIHdoYXQncywgd2hlbiwgd2hlbidzLCB3aGVyZSwgd2hlcmUncywgd2hldGhlciwgd2hpY2gsIHdoaWxlLCB3aG8sIHdob2xlLCB3aG9tLCB3aG8ncywgd2hvc2UsIHdoeSwgd2h5J3MsIHdpbGwsIHdpdGgsIHdpdGhpbiwgd2l0aG91dCwgd29uJ3QsIHdvcmssIHdvcmtlZCwgd29ya2luZywgd29ya3MsIHdvdWxkLCB3b3VsZG4ndCwgeCwgeSwgeWVhciwgeWVhcnMsIHllcywgeWV0LCB5b3UsIHlvdSdkLCB5b3UnbGwsIHlvdW5nLCB5b3VuZ2VyLCB5b3VuZ2VzdCwgeW91ciwgeW91J3JlLCB5b3VycywgeW91cnNlbGYsIHlvdXJzZWx2ZXMsIHlvdSd2ZSwgelwiO1xudmFyIGVuZ2xpc2hXb3JkcyA9IGVuZ2xpc2guc3BsaXQoJywnKTtcblxuZXhwb3J0cy5FbmdsaXNoID0gZW5nbGlzaFdvcmRzOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxudmFyIFRleHRCaXRtYXAgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NvbnRleHQgPSBudWxsO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xuXG5cdHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHR0aGlzLl9jYW52YXMud2lkdGggPSB0aGlzLndpZHRoIHx8IDY0MDtcblx0dGhpcy5fY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0IHx8IDQ4MDtcblx0dGhpcy5fY29udGV4dCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuXHR9XG5cblx0dGhpcy5fYml0bWFwID0gXy5jcmVhdGVBcnJheSh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuX2NhbnZhcy5oZWlnaHQ7IGorKykge1xuXHRcdFx0dGhpcy5fYml0bWFwW2ldW2pdID0gZmFsc2U7XG5cdFx0fVxuXHR9XG59O1xuXG5UZXh0Qml0bWFwLnByb3RvdHlwZSA9IF8uZXh0ZW5kKFRleHRCaXRtYXAucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhIGJpdG1hcCBmb3IgdGhlIGdpdmVuIHdvcmQvZm9udCBwYWlyLiAgIFJldHVybiBhIHJlbmRlckluZm8gb2JqZWN0IGZvciB0aGlzXG5cdCAqIEBwYXJhbSB0ZXh0IC0gYSBzdHJpbmcgdGhhdCB3ZSB3YW50IHRvIGJpdG1hcCAoaWUvIGEgd29yZClcblx0ICogQHBhcmFtIGZvbnRIZWlnaHQgLSB0aGUgaGVpZ2h0IG9mIHRoZSBmb250XG5cdCAqIEBwYXJhbSBmb250RmFtaWx5IC0gdGhlIGZvbnQgZmFtaWx5XG5cdCAqIEByZXR1cm5zIHt7YmI6IHtvZmZzZXRYOiBudW1iZXIsIG9mZnNldFk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9LCBiaXRtYXA6ICosIGZvbnRTaXplOiAqLCBmb250RmFtaWx5OiAqfX1cblx0ICovXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uKHRleHQsZm9udEhlaWdodCxmb250RmFtaWx5KSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NvbnRleHQ7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgdGV4dFJlbmRlclggPSA1O1xuXHRcdHZhciB0ZXh0UmVuZGVyWSA9IE1hdGguZmxvb3IodGhpcy5fY2FudmFzLmhlaWdodC8yKTtcblxuXHRcdC8vIEZpbGwgdGhlIGZvbnRcblx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRjdHguZm9udCA9IGZvbnRIZWlnaHQgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cdFx0Y3R4LmZpbGxUZXh0KHRleHQsdGV4dFJlbmRlclgsdGV4dFJlbmRlclkpO1xuXG5cdFx0dmFyIHdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuXG5cdFx0Ly8gR2V0IGEgcmVsYXhlZCBib3VuZGluZyBib3ggdG8gZ3JhYiBmcm9tIHRoZSBjYW52YXNcblx0XHR2YXIgc3RhcnRYID0gdGV4dFJlbmRlclg7XG5cdFx0dmFyIHN0YXJ0WSA9IHRleHRSZW5kZXJZIC0gZm9udEhlaWdodCAtIDI7XG5cdFx0dmFyIGVuZFggPSBzdGFydFggKyB3aWR0aCArIHRleHRSZW5kZXJYO1xuXHRcdHZhciBlbmRZID0gc3RhcnRZICsgZm9udEhlaWdodCArIGZvbnRIZWlnaHQqMC41O1xuXG5cblxuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKHN0YXJ0WCxzdGFydFksZW5kWCAtIHN0YXJ0WCxlbmRZIC0gc3RhcnRZKTtcblxuXHRcdHZhciBib29sZWFuQml0bWFwID0gXy5jcmVhdGVBcnJheShpbWFnZURhdGEud2lkdGgsaW1hZ2VEYXRhLmhlaWdodCk7XG5cdFx0dmFyIHggPSAwO1xuXHRcdHZhciB5ID0gMDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlRGF0YS5kYXRhLmxlbmd0aDsgaSs9NCkge1xuXG5cdFx0XHRib29sZWFuQml0bWFwW3hdW3ldID0gIGltYWdlRGF0YS5kYXRhW2ldICE9PSAwO1xuXHRcdFx0eCsrO1xuXHRcdFx0aWYgKHggPT09IGltYWdlRGF0YS53aWR0aCkge1xuXHRcdFx0XHR4ID0gMDtcblx0XHRcdFx0eSsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0dmFyIG1pblggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtaW5ZID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WCA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhZID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IGJvb2xlYW5CaXRtYXAubGVuZ3RoOyB4KyspIHtcblx0XHRcdGZvciAoeSA9IDA7IHkgPCBib29sZWFuQml0bWFwW3hdLmxlbmd0aDsgeSsrKSB7XG5cdFx0XHRcdGlmIChib29sZWFuQml0bWFwW3hdW3ldKSB7XG5cdFx0XHRcdFx0bWluWCA9IE1hdGgubWluKG1pblgseCk7XG5cdFx0XHRcdFx0bWluWSA9IE1hdGgubWluKG1pblkseSk7XG5cdFx0XHRcdFx0bWF4WCA9IE1hdGgubWF4KG1heFgseCk7XG5cdFx0XHRcdFx0bWF4WSA9IE1hdGgubWF4KG1heFkseSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBUcmltIHRoZSBib3VuZGluZyBib3ggdG8ganVzdCBwaXhlbHMgdGhhdCBhcmUgZmlsbGVkXG5cdFx0dmFyIHRyaW1tZWRCb29sZWFuQml0bWFwID0gXy5jcmVhdGVBcnJheShtYXhYLW1pblgsbWF4WS1taW5ZKTtcblx0XHRmb3IgKHggPSAwOyB4IDwgbWF4WC1taW5YOyB4KyspIHtcblx0XHRcdGZvciAoeSA9IDA7IHkgPCBtYXhZLW1pblk7IHkrKykge1xuXHRcdFx0XHR0cmltbWVkQm9vbGVhbkJpdG1hcFt4XVt5XSA9IGJvb2xlYW5CaXRtYXBbbWluWCt4XVttaW5ZK3ldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAneWVsbG93Jztcblx0XHRcdGN0eC5zdHJva2VSZWN0KHN0YXJ0WCxzdGFydFksZW5kWC1zdGFydFgsZW5kWS1zdGFydFkpO1xuXHRcdH1cblxuXHRcdGN0eC5zdHJva2VTdHlsZSA9ICdyZWQnO1xuXHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYLHRleHRSZW5kZXJZLHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgYmJXaWR0aCA9IG1heFgtbWluWDtcblx0XHR2YXIgYmJIZWlnaHQgPSBtYXhZLW1pblk7XG5cdFx0dmFyIGJiT2Zmc2V0WCA9IC0odGV4dFJlbmRlclggLSAoc3RhcnRYICsgbWluWCApKTtcblx0XHR2YXIgYmJPZmZzZXRZID0gLSh0ZXh0UmVuZGVyWSAtIChzdGFydFkgKyBtaW5ZKSk7XG5cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYICsgYmJPZmZzZXRYLCB0ZXh0UmVuZGVyWSArIGJiT2Zmc2V0WSwgYmJXaWR0aCwgYmJIZWlnaHQpO1xuXHRcdH1cblxuXHRcdHZhciByZW5kZXJJbmZvID0ge1xuXHRcdFx0YmIgOiB7XG5cdFx0XHRcdG9mZnNldFggOiBiYk9mZnNldFgsXG5cdFx0XHRcdG9mZnNldFkgOiBiYk9mZnNldFksXG5cdFx0XHRcdHdpZHRoIDogYmJXaWR0aCxcblx0XHRcdFx0aGVpZ2h0IDogYmJIZWlnaHRcblx0XHRcdH0sXG5cdFx0XHRiaXRtYXAgOiB0cmltbWVkQm9vbGVhbkJpdG1hcCxcblx0XHRcdGZvbnRTaXplIDogZm9udEhlaWdodCxcblx0XHRcdGZvbnRGYW1pbHkgOiBmb250RmFtaWx5XG5cdFx0fTtcblxuXHRcdHJldHVybiByZW5kZXJJbmZvO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiB0ZXN0cyB3aGV0aGVyIGEgcmVuZGVySW5mbyBvYmplY3QgZml0cyBpbnRvIGEgZ2xvYmFsIGJvb2xlYW4gYml0bWFwXG5cdCAqIEBwYXJhbSByZW5kZXJJbmZvIC0gcmVuZGVySW5mbyBmb3IgYSB3b3JkIChyZXR1cm5lZCBmcm9tIGNyZWF0ZSlcblx0ICogQHBhcmFtIGJpdG1hcCAtIHNjZW5lIGJpdG1hcFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSB0cnVlIGlmIHdvcmQgZml0cywgZmFsc2Ugb3RoZXJ3aXNlXG5cdCAqL1xuXHRmaXRzIDogZnVuY3Rpb24ocmVuZGVySW5mbyxiaXRtYXApIHtcblxuXHRcdHZhciBzdGFydFggPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFg7XG5cdFx0dmFyIHN0YXJ0WSA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WTtcblxuXHRcdHZhciBiaXRtYXBXaWR0aCA9IGJpdG1hcC5sZW5ndGg7XG5cdFx0dmFyIGJpdG1hcEhlaWdodCA9IGJpdG1hcFswXS5sZW5ndGg7XG5cblx0XHR2YXIgaGl0RWRnZSA9IHN0YXJ0WCA8IDAgfHwgc3RhcnRZIDwgMDtcblx0XHR2YXIgaGl0T3RoZXIgPSBmYWxzZTtcblx0XHR2YXIgZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcmVuZGVySW5mby5iYi53aWR0aCAmJiAhZG9lc250Rml0OyBpKyspIHtcblx0XHRcdHZhciB1ID0gc3RhcnRYICsgaTtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgcmVuZGVySW5mby5iYi5oZWlnaHQgJiYgIWRvZXNudEZpdDsgaisrKSB7XG5cdFx0XHRcdHZhciB2ID0gc3RhcnRZICsgajtcblx0XHRcdFx0aWYgKHUgPj0gYml0bWFwV2lkdGggfHwgdiA+PSBiaXRtYXBIZWlnaHQpIHtcblx0XHRcdFx0XHRoaXRFZGdlID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmIChiaXRtYXBbdV1bdl0pIHtcblx0XHRcdFx0XHRoaXRPdGhlciA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuICFkb2VzbnRGaXQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHRCaXRtYXA7IiwiXG52YXIgVXRpbCA9IHtcblxuXHRleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcblx0XHR2YXIga2V5LCBpLCBzb3VyY2U7XG5cdFx0Zm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0ICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG5cdFx0ICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcblx0XHRcdGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0ICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcblx0XHRcdH1cblx0XHQgIH1cblx0XHR9XG5cdFx0cmV0dXJuIGRlc3Q7XG5cdH0sXG5cblx0bGVycCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBtaW4gKyAodCoobWF4LW1pbikpO1xuXHR9LFxuXG5cdHN0ZXAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gTWF0aC5yb3VuZCh0aGlzLmxlcnAobWluLG1heCx0KSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW4gYXJyYXlcblx0ICogQHBhcmFtIGxlbmd0aFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRjcmVhdGVBcnJheSA6IGZ1bmN0aW9uKGxlbmd0aCkge1xuXHRcdHZhciBhcnIgPSBuZXcgQXJyYXkobGVuZ3RoIHx8IDApLFxuXHRcdFx0aSA9IGxlbmd0aDtcblxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdFx0d2hpbGUoaS0tKSB7XG5cdFx0XHRcdGFycltsZW5ndGgtMSAtIGldID0gdGhpcy5jcmVhdGVBcnJheS5hcHBseSh0aGlzLCBhcmdzKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(3)
});
