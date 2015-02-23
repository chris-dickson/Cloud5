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
            var dpr = window.devicePixelRatio;
            x *= dpr;
            y *= dpr;

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
            var dpr = window.devicePixelRatio;
            x *= dpr;
            y *= dpr;

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
            var dpr = window.devicePixelRatio;
            var cWidth = canvas.width;
            var cHeight = canvas.height;
            var cssWidth = cWidth;
            var cssHeight = cHeight;
            if (dpr > 1) {
                cWidth *= dpr;
                cHeight *= dpr;
            }


			this._canvas = canvas;
            this._canvas.width = cWidth;
            this._canvas.height = cHeight;
            this._canvas.style.width = cssWidth + 'px';
            this._canvas.style.height = cssHeight + 'px;'
			this._width = cWidth;
			this._height = cHeight;
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
			this.resize(width);
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
				this.resize(undefined,height);
			}
			return this;
		} else {
			return this._height;
		}
	},

    resize : function(w,h) {
        var dpr = window.devicePixelRatio;
        if (w) {
            this._canvas.width = dpr * w;
            this._canvas.style.width = w + 'px';
            this._width =  dpr * w;

        }
        if (h) {
            this._canvas.height = dpr * h;
            this._canvas.style.height = h + 'px';
            this._height = dpr * h;
        }
        return this;
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
		ctx.fillRect(0,0,this._width,this._height);
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

		this.clear();

        var ctx = this._canvas.getContext('2d');


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
module.exports.Stopwords = Stopwords;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvc3RvcHdvcmRzLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVpBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBUZXh0Qml0bWFwID0gcmVxdWlyZSgnLi90ZXh0Yml0bWFwJyk7XG5cblxuLyoqXG4gKiBMYXlvdXQgY29uc3RydWN0b3JcbiAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fd29yZHMgPSBudWxsO1xuXHR0aGlzLl9iaXRtYXAgPSBudWxsO1xuICAgIHRoaXMuX3JlbmRlckluZm8gPSBudWxsO1xuXHR0aGlzLl90ZXh0Qml0bWFwcGVyID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSB0aGUgdGV4dCBiaXRtYXBwZXIgYW5kIGNyZWF0ZSBvdXIgYm9vbGVhbiBiaXRtYXAgb2YgdGhlIHNjZW5lXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcyA9IHtcblx0XHRcdHdpZHRoIDogdGhpcy5fY2FudmFzLndpZHRoLFxuXHRcdFx0aGVpZ2h0IDogdGhpcy5fY2FudmFzLmhlaWdodFxuXHRcdH07XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cblx0XHR0aGlzLl90ZXh0Qml0bWFwcGVyID0gbmV3IFRleHRCaXRtYXAodGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cdFx0dGhpcy5fYml0bWFwID0gXy5jcmVhdGVBcnJheSh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jYW52YXMud2lkdGg7IGkrKykge1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdFx0dGhpcy5fYml0bWFwW2ldW2pdID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG4gICAgLyoqXG4gICAgICogSGl0IHRlc3QgYSBwb3NpdGlvbiB4LHkgZm9yIGEgd29yZC4gIFRPRE86ICBtYWtlIHRoaXMgd2F5IGZhc3Rlci4gICBCU1AgVHJlZT9cbiAgICAgKiBAcGFyYW0geCAtIHggb2Zmc2V0IGludG8gY2FudmFzXG4gICAgICogQHBhcmFtIHkgLSB5IG9mZnNldCBpbnRvIGNhbnZhc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2hpdCA6IGZ1bmN0aW9uKHgseSkge1xuICAgICAgICB2YXIgd29yZCA9IG51bGw7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgICAvLyBHZXQgYSBsaXN0IG9mIGJvdW5kaW5nIGJveGVzIHRoYXQgeCx5IGFyZSBpblxuICAgICAgICB2YXIgY29udGFpbmVkV29yZHMgPSBPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5maWx0ZXIoZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuICAgICAgICAgICAgdmFyIG1pblggPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFg7XG4gICAgICAgICAgICB2YXIgbWluWSA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WTtcbiAgICAgICAgICAgIHZhciBtYXhYID0gbWluWCArIHJlbmRlckluZm8uYmIud2lkdGg7XG4gICAgICAgICAgICB2YXIgbWF4WSA9IG1pblkgKyByZW5kZXJJbmZvLmJiLmhlaWdodDtcbiAgICAgICAgICAgIGlmIChtaW5YIDw9IHggJiYgeCA8PSBtYXhYICYmIG1pblkgPD0geSAmJiB5IDw9IG1heFkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTb3J0IGJ5IHNpemVcbiAgICAgICAgY29udGFpbmVkV29yZHMuc29ydChmdW5jdGlvbih3MSx3Mikge1xuICAgICAgICAgICAgdmFyIGIxID0gdGhhdC5fcmVuZGVySW5mb1t3MV0uYmI7XG4gICAgICAgICAgICB2YXIgYjIgPSB0aGF0Ll9yZW5kZXJJbmZvW3cyXS5iYjtcbiAgICAgICAgICAgIHZhciBiMUEgPSBiMS53aWR0aCAqIGIxLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBiMkEgPSBiMi53aWR0aCAqIGIyLmhlaWdodDtcbiAgICAgICAgICAgIHJldHVybiBiMUEgLSBiMkE7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgd29yZCB3aXRoIHRoZSBzbWFsbGVzdCBib3VuZGluZyBib3hcbiAgICAgICAgaWYgKGNvbnRhaW5lZFdvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHdvcmQgPSBjb250YWluZWRXb3Jkc1swXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd29yZDtcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGNhbnZhcyBmb3IgdGhlIGxheW91dFxuXHQgKiBAcGFyYW0gY2FudmFzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIHdvcmRzIHRvIGxheW91dFxuXHQgKiBAcGFyYW0gd29yZHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3b3JkcyA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR0aGlzLl93b3JkcyA9IHdvcmRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCB3b3JkT3ZlciBoYW5kbGVyXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9XG5cdCAqL1xuXHRvbldvcmRPdmVyIDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE92ZXIgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgd29yZE91dCBoYW5kbGVyXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9XG5cdCAqL1xuXHRvbldvcmRPdXQgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3V0ID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuICAgIC8qKlxuICAgICAqIFNldCB3b3JkQ2xpY2sgaGFuZGxlclxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogQHJldHVybnMge0xheW91dH1cbiAgICAgKi9cbiAgICBvbldvcmRDbGljayA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fb25Xb3JkQ2xpY2sgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gdGhlIGxheW91dFxuXHQgKiBAcmV0dXJucyB7e319XG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9pbml0aWFsaXplKCk7XG5cdFx0dGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXG5cdFx0Ly8gR2V0IGNvdW50cyBmb3IgZWFjaCB3b3JkLCB0aGVuIGZpZ3VyZSBvdXQgdGhlIGZvbnQgc2l6ZSBmb3IgZWFjaCB3b3JkLiAgIENyZWF0ZSBhIGJvb2xlYW4gYml0bWFwIGFuZFxuXHRcdC8vIGJvdW5kaW5nIGJveCBmb3IgZWFjaCB3b3JkXG5cdFx0aWYgKHRoaXMuX3dvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHRcdHZhciBtaW5Db3VudCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0XHR2YXIgbWF4Q291bnQgPSAwO1xuXG5cdFx0XHRPYmplY3Qua2V5cyh0aGlzLl93b3JkcykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHRcdG1pbkNvdW50ID0gTWF0aC5taW4odGhhdC5fd29yZHNbd29yZF0sbWluQ291bnQpO1xuXHRcdFx0XHRtYXhDb3VudCA9IE1hdGgubWF4KHRoYXQuX3dvcmRzW3dvcmRdLG1heENvdW50KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBTb3J0IHRoZSB3b3JkcyBieSBmcmVxdWVuY3lcblx0XHRcdHZhciBzb3J0ZWRXb3JkQXJyYXkgPSBPYmplY3Qua2V5cyh0aGlzLl93b3Jkcykuc29ydChmdW5jdGlvbih3MSx3Mikge1xuXHRcdFx0XHRyZXR1cm4gdGhhdC5fd29yZHNbdzJdLXRoYXQuX3dvcmRzW3cxXTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAodGhpcy5tYXhXb3JkcyA+IDAgJiYgc29ydGVkV29yZEFycmF5Lmxlbmd0aCA+IHRoaXMubWF4V29yZHMpIHtcblx0XHRcdFx0c29ydGVkV29yZEFycmF5ID0gc29ydGVkV29yZEFycmF5LnNwbGljZSgwLHRoaXMubWF4V29yZHMpO1xuXHRcdFx0fVxuXG5cblx0XHRcdHZhciBtaW5Gb250U2l6ZSA9IHRoaXMubWluRm9udFNpemUgfHwgMTA7XG5cdFx0XHR2YXIgbWF4Rm9udFNpemUgPSB0aGlzLm1heEZvbnRTaXplIHx8IDIwMDtcblx0XHRcdHNvcnRlZFdvcmRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblxuXHRcdFx0XHR2YXIgdCA9ICh0aGF0Ll93b3Jkc1t3b3JkXSAtIG1pbkNvdW50KS8obWF4Q291bnQtbWluQ291bnQpO1xuXHRcdFx0XHR2YXIgZm9udFNpemUgPV8uc3RlcChtaW5Gb250U2l6ZSxtYXhGb250U2l6ZSx0KTtcblxuXHRcdFx0XHR2YXIgYml0bWFwID0gdGhhdC5fdGV4dEJpdG1hcHBlci5jcmVhdGUod29yZCxmb250U2l6ZSx0aGF0LmZvbnQgfHwgJ0NhbGlicmknKTtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXSA9IGJpdG1hcDtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5jb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLm1pbkNvdW50ID0gbWluQ291bnQ7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0ubWF4Q291bnQgPSBtYXhDb3VudDtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIERlYnVnIHJvdXRpbmUgdG8gZHJhdyBvdXIgd29yZHMgYXMgd2UgbGF5IHRoZW0gb3V0XG5cdFx0ICogQHBhcmFtIGN0eCAtIGNhbnZhcyBjb250ZXh0XG5cdFx0ICogQHBhcmFtIHcgLSB3aWR0aFxuXHRcdCAqIEBwYXJhbSBoIC0gaGVpZ2h0XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGVidWdEcmF3QWxsKGN0eCx3LGgpIHtcblx0XHRcdGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdFx0Y3R4LmZpbGxSZWN0KDAsMCx3LGgpO1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHRcdHZhciB3b3JkUmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG5cdFx0XHRcdGlmICh3b3JkUmVuZGVySW5mby54ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gdW5kZWZpbmVkICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IC0xKSB7XG5cdFx0XHRcdFx0Y3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcblx0XHRcdFx0XHRjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdFx0XHRjdHguZmlsbFRleHQod29yZCx3b3JkUmVuZGVySW5mby54LHdvcmRSZW5kZXJJbmZvLnkpO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VSZWN0KHdvcmRSZW5kZXJJbmZvLnggKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRYLCB3b3JkUmVuZGVySW5mby55ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WSwgd29yZFJlbmRlckluZm8uYmIud2lkdGgsIHdvcmRSZW5kZXJJbmZvLmJiLmhlaWdodCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIExheW91dCBlYWNoIHdvcmRcblx0XHRzb3J0ZWRXb3JkQXJyYXkuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHR2YXIgcGxhY2VkID0gZmFsc2U7XG5cdFx0XHR2YXIgYXR0ZW1wdHMgPSAxMDA7XG5cblx0XHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRcdGRlYnVnRHJhd0FsbCh0aGF0Ll9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKSx0aGF0Ll9jYW52YXMud2lkdGgsIHRoYXQuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdFx0fVxuXG4gICAgICAgICAgICB2YXIgcmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG5cblx0XHRcdC8vIFRyeSBwbGFjaW5nIHRoZSB3b3JkIGFuZCBzZWUgaWYgaXQgZml0cy9oaXRzIGFueXRoaW5nIGVsc2UgYWxyZWFkeSBwbGFjZWRcblx0XHRcdHdoaWxlICghcGxhY2VkICYmIGF0dGVtcHRzID4gMCkge1xuXHRcdFx0XHR2YXIgeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NhbnZhcy53aWR0aCk7XG5cdFx0XHRcdHZhciB5ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY2FudmFzLmhlaWdodCk7XG5cblx0XHRcdFx0cmVuZGVySW5mby54ID0geDtcblx0XHRcdFx0cmVuZGVySW5mby55ID0geTtcblxuXHRcdFx0XHQvLyBJZiBpdCBmaXRzLCB1cGRhdGUgdGhlIGJpdG1hcCBmb3IgdGhlIGVudGlyZSBzY2VuZSB0byBzYXkgdGhvc2UgcGl4ZWxzIGFyZSBvY2N1cGllZFxuXHRcdFx0XHRpZiAodGhhdC5fdGV4dEJpdG1hcHBlci5maXRzKHJlbmRlckluZm8sdGhhdC5fYml0bWFwKSkge1xuXHRcdFx0XHRcdHBsYWNlZCA9IHRydWU7XG5cblx0XHRcdFx0XHR2YXIgYml0bWFwV2lkdGggPSByZW5kZXJJbmZvLmJpdG1hcC5sZW5ndGg7XG5cdFx0XHRcdFx0dmFyIGJpdG1hcEhlaWdodCA9IHJlbmRlckluZm8uYml0bWFwWzBdLmxlbmd0aDtcblxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYml0bWFwV2lkdGg7IGkrKykge1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBiaXRtYXBIZWlnaHQ7IGorKykge1xuXHRcdFx0XHRcdFx0XHR2YXIgdSA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WCArIGk7XG5cdFx0XHRcdFx0XHRcdHZhciB2ID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZICsgajtcblxuXHRcdFx0XHRcdFx0XHRpZiAocmVuZGVySW5mby5iaXRtYXBbaV1bal0pIHtcblx0XHRcdFx0XHRcdFx0XHR0aGF0Ll9iaXRtYXBbdV1bdl0gPSB3b3JkO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YXR0ZW1wdHMtLTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFwbGFjZWQpIHtcblx0XHRcdFx0cmVuZGVySW5mby54ID0gLTE7XG5cdFx0XHRcdHJlbmRlckluZm8ueSA9IC0xO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cblx0XHQvLyBCaW5kIGhhbmRsZXJzXG5cdFx0dmFyIG92ZXJXb3JkID0gbnVsbDtcblx0XHRmdW5jdGlvbiBvbk1vdXNlTW92ZShlKSB7XG5cdFx0XHR2YXIgeCA9IGUub2Zmc2V0WDtcblx0XHRcdHZhciB5ID0gZS5vZmZzZXRZO1xuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgeCAqPSBkcHI7XG4gICAgICAgICAgICB5ICo9IGRwcjtcblxuXHRcdFx0dmFyIHdvcmQgPSB0aGF0Ll9oaXQoeCx5KTtcblx0XHRcdGlmICh3b3JkKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvdmVyV29yZCA9IHdvcmQ7XG5cdFx0XHR9IGVsc2UgaWYgKG92ZXJXb3JkKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcblx0XHRcdFx0XHR0aGF0Ll9vbldvcmRPdXQob3ZlcldvcmQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG92ZXJXb3JkID0gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Nb3VzZUNsaWNrKGUpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB4ICo9IGRwcjtcbiAgICAgICAgICAgIHkgKj0gZHByO1xuXG4gICAgICAgICAgICB2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkQ2xpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkQ2xpY2sod29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblx0XHR0aGlzLl9jYW52YXMub25tb3VzZW1vdmUgPSBvbk1vdXNlTW92ZTtcbiAgICAgICAgdGhpcy5fY2FudmFzLm9uY2xpY2sgPSBvbk1vdXNlQ2xpY2s7XG5cblxuXHRcdHJldHVybiB0aGF0Ll9yZW5kZXJJbmZvO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIExvZ2dlciA9IGZ1bmN0aW9uKHdyaXRlTG9nKSB7XG5cdHRoaXMud3JpdGVMb2cgPSB3cml0ZUxvZztcblx0dGhpcy5sb2dzID0gW107XG59O1xuXG5Mb2dnZXIucHJvdG90eXBlID0gXy5leHRlbmQoTG9nZ2VyLnByb3RvdHlwZSwge1xuXHRwdXNoIDogZnVuY3Rpb24obGFiZWwpIHtcblx0XHRpZiAoIXRoaXMud3JpdGVMb2cpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5sb2dzLnB1c2goe1xuXHRcdFx0bGFiZWwgOiBsYWJlbCxcblx0XHRcdHRpbWUgOiBEYXRlLm5vdygpXG5cdFx0fSk7XG5cdH0sXG5cdHBvcCA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy53cml0ZUxvZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgdGFicyA9IHRoaXMubG9ncy5sZW5ndGg7XG5cdFx0dmFyIGxvZyA9IHRoaXMubG9ncy5wb3AoKTtcblx0XHR2YXIgc3RyID0gJyc7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0YWJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRzdHIgKz0gJ1xcdCc7XG5cdFx0fVxuXHRcdHZhciBlbmQgPSBEYXRlLm5vdygpO1xuXHRcdHZhciBlbGFwc2VkID0gZW5kIC0gbG9nLnRpbWU7XG5cdFx0c3RyICs9IGxvZy5sYWJlbCArICc6JyArIGVsYXBzZWQgKyAnbXMnO1xuXHRcdGNvbnNvbGUubG9nKHN0cik7XG5cdH0sXG5cblx0X21pbGxpc2Vjb25kc1RvU3RyaW5nIDogZnVuY3Rpb24obWlsbGlzZWNvbmRzKSB7XG5cdFx0dmFyIG9uZUhvdXIgPSAzNjAwMDAwO1xuXHRcdHZhciBvbmVNaW51dGUgPSA2MDAwMDtcblx0XHR2YXIgb25lU2Vjb25kID0gMTAwMDtcblx0XHR2YXIgc2Vjb25kcyA9IDA7XG5cdFx0dmFyIG1pbnV0ZXMgPSAwO1xuXHRcdHZhciBob3VycyA9IDA7XG5cdFx0dmFyIHJlc3VsdDtcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lSG91cikge1xuXHRcdFx0aG91cnMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZUhvdXIpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IGhvdXJzID4gMCA/IChtaWxsaXNlY29uZHMgLSBob3VycyAqIG9uZUhvdXIpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVNaW51dGUpIHtcblx0XHRcdG1pbnV0ZXMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZU1pbnV0ZSk7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gbWludXRlcyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gbWludXRlcyAqIG9uZU1pbnV0ZSkgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZVNlY29uZCkge1xuXHRcdFx0c2Vjb25kcyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lU2Vjb25kKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBzZWNvbmRzID4gMCA/IChtaWxsaXNlY29uZHMgLSBzZWNvbmRzICogb25lU2Vjb25kKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChob3VycyA+IDApIHtcblx0XHRcdHJlc3VsdCA9IChob3VycyA+IDkgPyBob3VycyA6ICcwJyArIGhvdXJzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ID0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbnV0ZXMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKG1pbnV0ZXMgPiA5ID8gbWludXRlcyA6ICcwJyArIG1pbnV0ZXMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKHNlY29uZHMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKHNlY29uZHMgPiA5ID8gc2Vjb25kcyA6ICcwJyArIHNlY29uZHMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAobWlsbGlzZWNvbmRzID4gOSA/IG1pbGxpc2Vjb25kcyA6ICcwJyArIG1pbGxpc2Vjb25kcyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDAnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG52YXIgU3RvcHdvcmRzID0gcmVxdWlyZSgnLi9zdG9wd29yZHMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGVyZkxvZyA9IHRydWU7XG5cbi8qKlxuICogQ2xvdWQ1IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBDbG91ZDUgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cblx0dGhpcy5fbG9nZ2VyID0gbmV3IExvZ2dlcihwZXJmTG9nKTtcblxuXHR0aGlzLl93b3JkcyA9IHt9O1xuXHR0aGlzLl9zdG9wV29yZHMgPSB7fTtcblxuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl93aWR0aCA9IG51bGw7XG5cdHRoaXMuX2hlaWdodCA9IG51bGw7XG5cdHRoaXMuX2JhY2tncm91bmRGaWxsID0gbnVsbDtcblx0dGhpcy5fb25Xb3JkT3ZlciA9IG51bGw7XG4gICAgdGhpcy5fb25Xb3JkT3V0ID0gbnVsbDtcbiAgICB0aGlzLl9vbldvcmRDbGljayA9IG51bGw7XG5cdHRoaXMuX2xheW91dCA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkNsb3VkNS5wcm90b3R5cGUgPSBfLmV4dGVuZChDbG91ZDUucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBIVE1MNSBDYW52YXMgZWxlbWVudFxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHZhciBjV2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICAgICAgICB2YXIgY0hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICB2YXIgY3NzV2lkdGggPSBjV2lkdGg7XG4gICAgICAgICAgICB2YXIgY3NzSGVpZ2h0ID0gY0hlaWdodDtcbiAgICAgICAgICAgIGlmIChkcHIgPiAxKSB7XG4gICAgICAgICAgICAgICAgY1dpZHRoICo9IGRwcjtcbiAgICAgICAgICAgICAgICBjSGVpZ2h0ICo9IGRwcjtcbiAgICAgICAgICAgIH1cblxuXG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSBjV2lkdGg7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0ID0gY0hlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aCA9IGNzc1dpZHRoICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQgPSBjc3NIZWlnaHQgKyAncHg7J1xuXHRcdFx0dGhpcy5fd2lkdGggPSBjV2lkdGg7XG5cdFx0XHR0aGlzLl9oZWlnaHQgPSBjSGVpZ2h0O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIHdpZHRoIG9mIHRoZSBjYW52YXMuICAgSWYgbm90IHNldCwgdXNlcyB0aGUgaW5oZXJpdGVkIHdpZHRoIGZyb20gY2FudmFzXG5cdCAqIEBwYXJhbSB3aWR0aCAtIHdpZHRoIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdpZHRoIDogZnVuY3Rpb24od2lkdGgpIHtcblx0XHRpZiAod2lkdGgpIHtcblx0XHRcdHRoaXMucmVzaXplKHdpZHRoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy53aWR0aDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXMuICBJZiBub3Qgc2V0LCB1c2VzIHRoZSBpbmhlcml0ZWQgd2lkdGggZnJvbSBjYW52YXNcblx0ICogQHBhcmFtIGhlaWdodCAtIGhlaWdodCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRoZWlnaHQgOiBmdW5jdGlvbihoZWlnaHQpIHtcblx0XHRpZiAoaGVpZ2h0KSB7XG5cdFx0XHRpZiAodGhpcy5fY2FudmFzKSB7XG5cdFx0XHRcdHRoaXMucmVzaXplKHVuZGVmaW5lZCxoZWlnaHQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9oZWlnaHQ7XG5cdFx0fVxuXHR9LFxuXG4gICAgcmVzaXplIDogZnVuY3Rpb24odyxoKSB7XG4gICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgaWYgKHcpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy53aWR0aCA9IGRwciAqIHc7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGggPSB3ICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX3dpZHRoID0gIGRwciAqIHc7XG5cbiAgICAgICAgfVxuICAgICAgICBpZiAoaCkge1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCA9IGRwciAqIGg7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0ID0gaCArICdweCc7XG4gICAgICAgICAgICB0aGlzLl9oZWlnaHQgPSBkcHIgKiBoO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHRleHQgZm9yIHdvcmQgY2xvdWQgZ2VuZXJhdGlvbiBmcm9tIGEgbGFyZ2Ugc3RyaW5nXG5cdCAqIEBwYXJhbSB0ZXh0IC0gYSBzdHJpbmcuICAgQnkgZGVmYXVsdCwgd2UgcmVtb3ZlIGFsbCBwdW5jdHVhdGlvbi4gICBBZGRpdGlvbmFsIHJ1bGVzIGNhbiBiZSBhZGRlZCBieVxuXHQgKiBjYWxsaW5nIHRleHRGaWx0ZXJzKC4uLilcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdHRleHQgOiBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0dmFyIGZpbHRlcmVkID0gdGV4dC5yZXBsYWNlKC9bXFwuLC1cXC8jISQlXFxeJlxcKjs6e309XFwtX2B+KCldL2csJycpO1xuXHRcdGlmICh0aGlzLl9maWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzLmZvckVhY2goZnVuY3Rpb24oZmlsdGVyKSB7XG5cdFx0XHRcdGZpbHRlcmVkID0gdGV4dC5yZXBsYWNlKGZpbHRlciwnJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0dmFyIHdvcmRzID0gZmlsdGVyZWQuc3BsaXQoJyAnKTtcblx0XHR0aGlzLndvcmRzKHdvcmRzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGEgbGlzdCBvZiB0ZXh0IGZpbHRlcnMgKHJlZ3VsYXIgZXhwcmVzc2lvbnMpIHRvIGJlIGFwcGxpZWQuICAgUnVsZXMgdGhhdCBtYXRjaCB3aWxsIGJlIGRlbGV0ZWRcblx0ICogZnJvbSB0aGUgb3JpZ2luYWwgdGV4dCBzdHJpbmcuICBUaGV5J3JlIGFwcGxpZWQgaW4gdGhlIG9yZGVyIGdpdmVuIHRvIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIGZpbHRlcnMgLSBhbiBhcnJheSBvZiByZWd1bGFyIGV4cHJlc3Npb25zXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0dGV4dEZpbHRlcnMgOiBmdW5jdGlvbihmaWx0ZXJzKSB7XG5cdFx0aWYgKGZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMgPSBmaWx0ZXJzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9maWx0ZXJzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgc3RvcCB3b3JkcyAod29yZHMgdG8gaWdub3JlKVxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiBzdHJpbmdzIHRvIGlnbm9yZVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuX2JhY2tncm91bmRGaWxsIHx8ICd3aGl0ZSc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGJhY2tncm91bmQgZmlsbCBzdHlsZVxuXHQgKiBAcGFyYW0gZmlsbFN0eWxlIC0gYSB2YWxpZCBmaWxsU3R5bGUgc3RyaW5nXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgZm9yIHRoZSB3b3JkIGNsb3VkXG5cdCAqIEBwYXJhbSB3b3JkcyAtIGFuIGFycmF5IG9mIHdvcmRzLlxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMuX3N0b3BXb3JkcykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRoaXMuc3RvcChTdG9wd29yZHMuRW5nbGlzaCk7XG5cdFx0XHR9XG5cblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJhdykge1xuXHRcdFx0XHR2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKHRoYXQuX3N0b3BXb3Jkc1t3b3JkXSB8fCB3b3JkID09PSAnJykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBjb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHRpZiAoIWNvdW50KSB7XG5cdFx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3ZlciBhIHdvcmRcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3V0IG9mIGEgd29yZFxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYSBoYW5kbGVyIGZvciBjbGlja2luZyBvbiBhIHdvcmRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtDbG91ZDV9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGZhbWlseSBmb3Igd29yZHNcblx0ICogQHBhcmFtIGZvbnQgLSBmb250IGZhbWlseSAoaWUvICdIZWx2ZXRpY2EnKVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGZvbnQgOiBmdW5jdGlvbihmb250KSB7XG5cdFx0aWYgKGZvbnQpIHtcblx0XHRcdHRoaXMuX2ZvbnQgPSBmb250O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250O1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtaW5pbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1pbkZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWluRm9udFNpemUgOiBmdW5jdGlvbihtaW5Gb250U2l6ZSkge1xuXHRcdGlmIChtaW5Gb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWluRm9udFNpemUgPSBtaW5Gb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gZm9udCBzaXplIGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gbWF4Rm9udFNpemUgLSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhGb250U2l6ZSA6IGZ1bmN0aW9uKG1heEZvbnRTaXplKSB7XG5cdFx0aWYgKG1heEZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9tYXhGb250U2l6ZSA9IG1heEZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWF4aW11bSBudW1iZXIgb2Ygd29yZHMgdG8gYmUgcmVuZGVyZWQgaW4gdGhlIGNsb3VkXG5cdCAqIEBwYXJhbSBtYXhXb3Jkc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1heFdvcmRzIDogZnVuY3Rpb24obWF4V29yZHMpIHtcblx0XHRpZiAobWF4V29yZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5fbWF4V29yZHMgPSBtYXhXb3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4V29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgY29sb3JzXG5cdCAqIEBwYXJhbSBjb2xvciAtIGNhbiBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcblx0ICogXHRcdDEpICBBIGZpbGxTdHlsZSBzdHJpbmcgKGllLyAncmVkJywncmdiKDI1NSwyNTUsMCknLCBldGMpXG5cdCAqIFx0ICAgIDIpICBBbiBhcnJheSBvZiBmaWxsU3R5bGUgc3RyaW5nc1xuXHQgKiBcdCAgICAzKSAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBmaWxsU3R5bGUgc3RyaW5nIGdpdmVuIHRoZSByZW5kZXJJbmZvIGZvciB0aGUgd29yZC4gIGllL1xuXHQgKiBcdCAgICAgICAgICAgICBmdW5jdGlvbihyZW5kZXJJbmZvKSB7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgd29yZCA9IHJlbmRlckluZm8ud29yZDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IHJlbmRlckluZm8uY291bnQ7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgeFBvcyA9IHJlbmRlckluZm8ueDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB5UG9zdCA9IHJlbmRlckluZm8ueTtcblx0ICogXHQgICAgICAgICAgICAgICAgIHJldHVybiAvLyBhIGZpbGxTdHlsZSBkZXJpdmVkIGZyb20gYWJvdmUgcHJvcGVydGllc1xuXHQgKiBcdCAgICAgICAgICAgICAgfVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNvbG9yIDogZnVuY3Rpb24oY29sb3IpIHtcblx0XHRpZiAoY29sb3IpIHtcblx0XHRcdHRoaXMuX2NvbG9yID0gY29sb3I7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbG9yO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogTGF5b3V0IGFuZCByZW5kZXIgdGhlIHdvcmQgY2xvdWQgdG8gdGhlIGNhbnZhcyBwcm92aWRlZFxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0Z2VuZXJhdGUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGF5b3V0QXR0cmlidXRlcyA9IHt9O1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2ZvbnQpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZm9udCA9IHRoaXMuX2ZvbnQ7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9taW5Gb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5taW5Gb250U2l6ZSA9IHRoaXMuX21pbkZvbnRTaXplO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWF4Rm9udFNpemUpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWF4Rm9udFNpemUgPSB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21heFdvcmRzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWF4V29yZHMgPSB0aGlzLl9tYXhXb3Jkcztcblx0XHR9XG5cblx0XHR0aGlzLl9sb2dnZXIucHVzaCgnTGF5b3V0Jyk7XG5cdFx0dGhpcy5fbGF5b3V0ID0gbmV3IExheW91dChsYXlvdXRBdHRyaWJ1dGVzKVxuXHRcdFx0LmNhbnZhcyh0aGlzLl9jYW52YXMpXG5cdFx0XHQud29yZHModGhpcy5fd29yZHMpXG5cdFx0XHQub25Xb3JkT3Zlcih0aGlzLl9vbldvcmRPdmVyKVxuXHRcdFx0Lm9uV29yZE91dCh0aGlzLl9vbldvcmRPdXQpXG4gICAgICAgICAgICAub25Xb3JkQ2xpY2sodGhpcy5fb25Xb3JkQ2xpY2spO1xuXHRcdHRoaXMuX2xvZ2dlci5wb3AoKTtcblxuXHRcdHZhciByZW5kZXJJbmZvID0gdGhpcy5fbGF5b3V0LmxheW91dCgpO1xuXG5cdFx0dGhpcy5jbGVhcigpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXG5cdFx0dGhpcy5fbG9nZ2VyLnB1c2goJ1JlbmRlcicpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyhyZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciB3b3JkUmVuZGVySW5mbyA9IHJlbmRlckluZm9bd29yZF07XG5cdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0Y3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcblxuXG5cdFx0XHRcdHZhciBjbHIgPSAnYmxhY2snO1xuXHRcdFx0XHRpZiAodGhhdC5fY29sb3IpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0dmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NvbG9yLmxlbmd0aCk7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcltpZHhdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3IocmVuZGVySW5mb1t3b3JkXSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRjdHguZmlsbFN0eWxlID0gY2xyO1xuXHRcdFx0XHRjdHguZmlsbFRleHQod29yZCx3b3JkUmVuZGVySW5mby54LHdvcmRSZW5kZXJJbmZvLnkpO1xuXG5cdFx0XHRcdGlmICh0aGF0LmRlYnVnKSB7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5fbG9nZ2VyLnBvcCgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgaW1hZ2UgdG8gbG9jYWwgZmlsZXN5c3RlbSB3aXRoIHRoZSBmb3JtYXQvZmlsZW5hbWUgc3BlY2lmaWVkXG4gICAgICogQHBhcmFtIGZvcm1hdCAob3B0aW9uYWwpIC0gVGhlIG1pbWV0eXBlIHRvIHNhdmUgYXMuICAgRGVmYXVsdCAnaW1hZ2UvcG5nJ1xuICAgICAqIEBwYXJhbSBmaWxlbmFtZSAob3B0aW9uYWwpIC0gVGhlIGZpbGVuYW1lIHRvIHNhdmUgaXQgYXMuICAgJ2Rvd25sb2FkJyBieSBkZWZhdWx0XG4gICAgICovXG4gICAgc2F2ZSA6IGZ1bmN0aW9uKGZvcm1hdCxmaWxlbmFtZSkge1xuICAgICAgICB2YXIgZGF0YVVSSSA9IHRoaXMuX2NhbnZhcy50b0RhdGFVUkwoZm9ybWF0IHx8ICdpbWFnZS9wbmcnKTtcbiAgICAgICAgdmFyIHVyaUNvbnRlbnQgPSBkYXRhVVJJLmluZGV4T2YoJywnKTtcbiAgICAgICAgZGF0YVVSSSA9IGRhdGFVUkkuc3Vic3RyaW5nKHVyaUNvbnRlbnQpO1xuICAgICAgICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgbGluay5ocmVmID0gJ2RhdGE6YXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtO2Jhc2U2NCcgKyBkYXRhVVJJO1xuICAgICAgICBpZiAoZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIGxpbmsuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgICAgfVxuICAgICAgICBsaW5rLmNsaWNrKCk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xvdWQ1O1xubW9kdWxlLmV4cG9ydHMuU3RvcHdvcmRzID0gU3RvcHdvcmRzOyIsInZhciBlbmdsaXNoID0gXCJhLCBhYm91dCwgYWJvdmUsIGFjcm9zcywgYWZ0ZXIsIGFnYWluLCBhZ2FpbnN0LCBhbGwsIGFsbW9zdCwgYWxvbmUsIGFsb25nLCBhbHJlYWR5LCBhbHNvLCBhbHRob3VnaCwgYWx3YXlzLCBhbSwgYW1vbmcsIGFuLCBhbmQsIGFub3RoZXIsIGFueSwgYW55Ym9keSwgYW55b25lLCBhbnl0aGluZywgYW55d2hlcmUsIGFyZSwgYXJlYSwgYXJlYXMsIGFyZW4ndCwgYXJvdW5kLCBhcywgYXNrLCBhc2tlZCwgYXNraW5nLCBhc2tzLCBhdCwgYXdheSwgYiwgYmFjaywgYmFja2VkLCBiYWNraW5nLCBiYWNrcywgYmUsIGJlY2FtZSwgYmVjYXVzZSwgYmVjb21lLCBiZWNvbWVzLCBiZWVuLCBiZWZvcmUsIGJlZ2FuLCBiZWhpbmQsIGJlaW5nLCBiZWluZ3MsIGJlbG93LCBiZXN0LCBiZXR0ZXIsIGJldHdlZW4sIGJpZywgYm90aCwgYnV0LCBieSwgYywgY2FtZSwgY2FuLCBjYW5ub3QsIGNhbid0LCBjYXNlLCBjYXNlcywgY2VydGFpbiwgY2VydGFpbmx5LCBjbGVhciwgY2xlYXJseSwgY29tZSwgY291bGQsIGNvdWxkbid0LCBkLCBkaWQsIGRpZG4ndCwgZGlmZmVyLCBkaWZmZXJlbnQsIGRpZmZlcmVudGx5LCBkbywgZG9lcywgZG9lc24ndCwgZG9pbmcsIGRvbmUsIGRvbid0LCBkb3duLCBkb3duZWQsIGRvd25pbmcsIGRvd25zLCBkdXJpbmcsIGUsIGVhY2gsIGVhcmx5LCBlaXRoZXIsIGVuZCwgZW5kZWQsIGVuZGluZywgZW5kcywgZW5vdWdoLCBldmVuLCBldmVubHksIGV2ZXIsIGV2ZXJ5LCBldmVyeWJvZHksIGV2ZXJ5b25lLCBldmVyeXRoaW5nLCBldmVyeXdoZXJlLCBmLCBmYWNlLCBmYWNlcywgZmFjdCwgZmFjdHMsIGZhciwgZmVsdCwgZmV3LCBmaW5kLCBmaW5kcywgZmlyc3QsIGZvciwgZm91ciwgZnJvbSwgZnVsbCwgZnVsbHksIGZ1cnRoZXIsIGZ1cnRoZXJlZCwgZnVydGhlcmluZywgZnVydGhlcnMsIGcsIGdhdmUsIGdlbmVyYWwsIGdlbmVyYWxseSwgZ2V0LCBnZXRzLCBnaXZlLCBnaXZlbiwgZ2l2ZXMsIGdvLCBnb2luZywgZ29vZCwgZ29vZHMsIGdvdCwgZ3JlYXQsIGdyZWF0ZXIsIGdyZWF0ZXN0LCBncm91cCwgZ3JvdXBlZCwgZ3JvdXBpbmcsIGdyb3VwcywgaCwgaGFkLCBoYWRuJ3QsIGhhcywgaGFzbid0LCBoYXZlLCBoYXZlbid0LCBoYXZpbmcsIGhlLCBoZSdkLCBoZSdsbCwgaGVyLCBoZXJlLCBoZXJlJ3MsIGhlcnMsIGhlcnNlbGYsIGhlJ3MsIGhpZ2gsIGhpZ2hlciwgaGlnaGVzdCwgaGltLCBoaW1zZWxmLCBoaXMsIGhvdywgaG93ZXZlciwgaG93J3MsIGksIGknZCwgaWYsIGknbGwsIGknbSwgaW1wb3J0YW50LCBpbiwgaW50ZXJlc3QsIGludGVyZXN0ZWQsIGludGVyZXN0aW5nLCBpbnRlcmVzdHMsIGludG8sIGlzLCBpc24ndCwgaXQsIGl0cywgaXQncywgaXRzZWxmLCBpJ3ZlLCBqLCBqdXN0LCBrLCBrZWVwLCBrZWVwcywga2luZCwga25ldywga25vdywga25vd24sIGtub3dzLCBsLCBsYXJnZSwgbGFyZ2VseSwgbGFzdCwgbGF0ZXIsIGxhdGVzdCwgbGVhc3QsIGxlc3MsIGxldCwgbGV0cywgbGV0J3MsIGxpa2UsIGxpa2VseSwgbG9uZywgbG9uZ2VyLCBsb25nZXN0LCBtLCBtYWRlLCBtYWtlLCBtYWtpbmcsIG1hbiwgbWFueSwgbWF5LCBtZSwgbWVtYmVyLCBtZW1iZXJzLCBtZW4sIG1pZ2h0LCBtb3JlLCBtb3N0LCBtb3N0bHksIG1yLCBtcnMsIG11Y2gsIG11c3QsIG11c3RuJ3QsIG15LCBteXNlbGYsIG4sIG5lY2Vzc2FyeSwgbmVlZCwgbmVlZGVkLCBuZWVkaW5nLCBuZWVkcywgbmV2ZXIsIG5ldywgbmV3ZXIsIG5ld2VzdCwgbmV4dCwgbm8sIG5vYm9keSwgbm9uLCBub29uZSwgbm9yLCBub3QsIG5vdGhpbmcsIG5vdywgbm93aGVyZSwgbnVtYmVyLCBudW1iZXJzLCBvLCBvZiwgb2ZmLCBvZnRlbiwgb2xkLCBvbGRlciwgb2xkZXN0LCBvbiwgb25jZSwgb25lLCBvbmx5LCBvcGVuLCBvcGVuZWQsIG9wZW5pbmcsIG9wZW5zLCBvciwgb3JkZXIsIG9yZGVyZWQsIG9yZGVyaW5nLCBvcmRlcnMsIG90aGVyLCBvdGhlcnMsIG91Z2h0LCBvdXIsIG91cnMsIG91cnNlbHZlcywgb3V0LCBvdmVyLCBvd24sIHAsIHBhcnQsIHBhcnRlZCwgcGFydGluZywgcGFydHMsIHBlciwgcGVyaGFwcywgcGxhY2UsIHBsYWNlcywgcG9pbnQsIHBvaW50ZWQsIHBvaW50aW5nLCBwb2ludHMsIHBvc3NpYmxlLCBwcmVzZW50LCBwcmVzZW50ZWQsIHByZXNlbnRpbmcsIHByZXNlbnRzLCBwcm9ibGVtLCBwcm9ibGVtcywgcHV0LCBwdXRzLCBxLCBxdWl0ZSwgciwgcmF0aGVyLCByZWFsbHksIHJpZ2h0LCByb29tLCByb29tcywgcywgc2FpZCwgc2FtZSwgc2F3LCBzYXksIHNheXMsIHNlY29uZCwgc2Vjb25kcywgc2VlLCBzZWVtLCBzZWVtZWQsIHNlZW1pbmcsIHNlZW1zLCBzZWVzLCBzZXZlcmFsLCBzaGFsbCwgc2hhbid0LCBzaGUsIHNoZSdkLCBzaGUnbGwsIHNoZSdzLCBzaG91bGQsIHNob3VsZG4ndCwgc2hvdywgc2hvd2VkLCBzaG93aW5nLCBzaG93cywgc2lkZSwgc2lkZXMsIHNpbmNlLCBzbWFsbCwgc21hbGxlciwgc21hbGxlc3QsIHNvLCBzb21lLCBzb21lYm9keSwgc29tZW9uZSwgc29tZXRoaW5nLCBzb21ld2hlcmUsIHN0YXRlLCBzdGF0ZXMsIHN0aWxsLCBzdWNoLCBzdXJlLCB0LCB0YWtlLCB0YWtlbiwgdGhhbiwgdGhhdCwgdGhhdCdzLCB0aGUsIHRoZWlyLCB0aGVpcnMsIHRoZW0sIHRoZW1zZWx2ZXMsIHRoZW4sIHRoZXJlLCB0aGVyZWZvcmUsIHRoZXJlJ3MsIHRoZXNlLCB0aGV5LCB0aGV5J2QsIHRoZXknbGwsIHRoZXkncmUsIHRoZXkndmUsIHRoaW5nLCB0aGluZ3MsIHRoaW5rLCB0aGlua3MsIHRoaXMsIHRob3NlLCB0aG91Z2gsIHRob3VnaHQsIHRob3VnaHRzLCB0aHJlZSwgdGhyb3VnaCwgdGh1cywgdG8sIHRvZGF5LCB0b2dldGhlciwgdG9vLCB0b29rLCB0b3dhcmQsIHR1cm4sIHR1cm5lZCwgdHVybmluZywgdHVybnMsIHR3bywgdSwgdW5kZXIsIHVudGlsLCB1cCwgdXBvbiwgdXMsIHVzZSwgdXNlZCwgdXNlcywgdiwgdmVyeSwgdywgd2FudCwgd2FudGVkLCB3YW50aW5nLCB3YW50cywgd2FzLCB3YXNuJ3QsIHdheSwgd2F5cywgd2UsIHdlJ2QsIHdlbGwsIHdlJ2xsLCB3ZWxscywgd2VudCwgd2VyZSwgd2UncmUsIHdlcmVuJ3QsIHdlJ3ZlLCB3aGF0LCB3aGF0J3MsIHdoZW4sIHdoZW4ncywgd2hlcmUsIHdoZXJlJ3MsIHdoZXRoZXIsIHdoaWNoLCB3aGlsZSwgd2hvLCB3aG9sZSwgd2hvbSwgd2hvJ3MsIHdob3NlLCB3aHksIHdoeSdzLCB3aWxsLCB3aXRoLCB3aXRoaW4sIHdpdGhvdXQsIHdvbid0LCB3b3JrLCB3b3JrZWQsIHdvcmtpbmcsIHdvcmtzLCB3b3VsZCwgd291bGRuJ3QsIHgsIHksIHllYXIsIHllYXJzLCB5ZXMsIHlldCwgeW91LCB5b3UnZCwgeW91J2xsLCB5b3VuZywgeW91bmdlciwgeW91bmdlc3QsIHlvdXIsIHlvdSdyZSwgeW91cnMsIHlvdXJzZWxmLCB5b3Vyc2VsdmVzLCB5b3UndmUsIHpcIjtcbnZhciBlbmdsaXNoV29yZHMgPSBlbmdsaXNoLnNwbGl0KCcsJyk7XG5cbmV4cG9ydHMuRW5nbGlzaCA9IGVuZ2xpc2hXb3JkczsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5cbnZhciBUZXh0Qml0bWFwID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9jb250ZXh0ID0gbnVsbDtcblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcblxuXHR0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0dGhpcy5fY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCB8fCA2NDA7XG5cdHRoaXMuX2NhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCB8fCA0ODA7XG5cdHRoaXMuX2NvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5fY2FudmFzKTtcblx0fVxuXG5cdHRoaXMuX2JpdG1hcCA9IF8uY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuVGV4dEJpdG1hcC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0Qml0bWFwLnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBiaXRtYXAgZm9yIHRoZSBnaXZlbiB3b3JkL2ZvbnQgcGFpci4gICBSZXR1cm4gYSByZW5kZXJJbmZvIG9iamVjdCBmb3IgdGhpc1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nIHRoYXQgd2Ugd2FudCB0byBiaXRtYXAgKGllLyBhIHdvcmQpXG5cdCAqIEBwYXJhbSBmb250SGVpZ2h0IC0gdGhlIGhlaWdodCBvZiB0aGUgZm9udFxuXHQgKiBAcGFyYW0gZm9udEZhbWlseSAtIHRoZSBmb250IGZhbWlseVxuXHQgKiBAcmV0dXJucyB7e2JiOiB7b2Zmc2V0WDogbnVtYmVyLCBvZmZzZXRZOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyfSwgYml0bWFwOiAqLCBmb250U2l6ZTogKiwgZm9udEZhbWlseTogKn19XG5cdCAqL1xuXHRjcmVhdGUgOiBmdW5jdGlvbih0ZXh0LGZvbnRIZWlnaHQsZm9udEZhbWlseSkge1xuXHRcdHZhciBjdHggPSB0aGlzLl9jb250ZXh0O1xuXHRcdGN0eC5maWxsU3R5bGUgPSAnYmxhY2snO1xuXHRcdGN0eC5maWxsUmVjdCgwLDAsdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIHRleHRSZW5kZXJYID0gNTtcblx0XHR2YXIgdGV4dFJlbmRlclkgPSBNYXRoLmZsb29yKHRoaXMuX2NhbnZhcy5oZWlnaHQvMik7XG5cblx0XHQvLyBGaWxsIHRoZSBmb250XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0Y3R4LmZvbnQgPSBmb250SGVpZ2h0ICsgJ3B4ICcgKyBmb250RmFtaWx5O1xuXHRcdGN0eC5maWxsVGV4dCh0ZXh0LHRleHRSZW5kZXJYLHRleHRSZW5kZXJZKTtcblxuXHRcdHZhciB3aWR0aCA9IGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcblxuXHRcdC8vIEdldCBhIHJlbGF4ZWQgYm91bmRpbmcgYm94IHRvIGdyYWIgZnJvbSB0aGUgY2FudmFzXG5cdFx0dmFyIHN0YXJ0WCA9IHRleHRSZW5kZXJYO1xuXHRcdHZhciBzdGFydFkgPSB0ZXh0UmVuZGVyWSAtIGZvbnRIZWlnaHQgLSAyO1xuXHRcdHZhciBlbmRYID0gc3RhcnRYICsgd2lkdGggKyB0ZXh0UmVuZGVyWDtcblx0XHR2YXIgZW5kWSA9IHN0YXJ0WSArIGZvbnRIZWlnaHQgKyBmb250SGVpZ2h0KjAuNTtcblxuXG5cblx0XHR2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YShzdGFydFgsc3RhcnRZLGVuZFggLSBzdGFydFgsZW5kWSAtIHN0YXJ0WSk7XG5cblx0XHR2YXIgYm9vbGVhbkJpdG1hcCA9IF8uY3JlYXRlQXJyYXkoaW1hZ2VEYXRhLndpZHRoLGltYWdlRGF0YS5oZWlnaHQpO1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkrPTQpIHtcblxuXHRcdFx0Ym9vbGVhbkJpdG1hcFt4XVt5XSA9ICBpbWFnZURhdGEuZGF0YVtpXSAhPT0gMDtcblx0XHRcdHgrKztcblx0XHRcdGlmICh4ID09PSBpbWFnZURhdGEud2lkdGgpIHtcblx0XHRcdFx0eCA9IDA7XG5cdFx0XHRcdHkrKztcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWluWSA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFggPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WSA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGZvciAoeCA9IDA7IHggPCBib29sZWFuQml0bWFwLmxlbmd0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgYm9vbGVhbkJpdG1hcFt4XS5sZW5ndGg7IHkrKykge1xuXHRcdFx0XHRpZiAoYm9vbGVhbkJpdG1hcFt4XVt5XSkge1xuXHRcdFx0XHRcdG1pblggPSBNYXRoLm1pbihtaW5YLHgpO1xuXHRcdFx0XHRcdG1pblkgPSBNYXRoLm1pbihtaW5ZLHkpO1xuXHRcdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLHgpO1xuXHRcdFx0XHRcdG1heFkgPSBNYXRoLm1heChtYXhZLHkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gVHJpbSB0aGUgYm91bmRpbmcgYm94IHRvIGp1c3QgcGl4ZWxzIHRoYXQgYXJlIGZpbGxlZFxuXHRcdHZhciB0cmltbWVkQm9vbGVhbkJpdG1hcCA9IF8uY3JlYXRlQXJyYXkobWF4WC1taW5YLG1heFktbWluWSk7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IG1heFgtbWluWDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgbWF4WS1taW5ZOyB5KyspIHtcblx0XHRcdFx0dHJpbW1lZEJvb2xlYW5CaXRtYXBbeF1beV0gPSBib29sZWFuQml0bWFwW21pblgreF1bbWluWSt5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3llbGxvdyc7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdChzdGFydFgsc3RhcnRZLGVuZFgtc3RhcnRYLGVuZFktc3RhcnRZKTtcblx0XHR9XG5cblx0XHRjdHguc3Ryb2tlU3R5bGUgPSAncmVkJztcblx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSx0aGlzLl9jYW52YXMud2lkdGgsIHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIGJiV2lkdGggPSBtYXhYLW1pblg7XG5cdFx0dmFyIGJiSGVpZ2h0ID0gbWF4WS1taW5ZO1xuXHRcdHZhciBiYk9mZnNldFggPSAtKHRleHRSZW5kZXJYIC0gKHN0YXJ0WCArIG1pblggKSk7XG5cdFx0dmFyIGJiT2Zmc2V0WSA9IC0odGV4dFJlbmRlclkgLSAoc3RhcnRZICsgbWluWSkpO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCArIGJiT2Zmc2V0WCwgdGV4dFJlbmRlclkgKyBiYk9mZnNldFksIGJiV2lkdGgsIGJiSGVpZ2h0KTtcblx0XHR9XG5cblx0XHR2YXIgcmVuZGVySW5mbyA9IHtcblx0XHRcdGJiIDoge1xuXHRcdFx0XHRvZmZzZXRYIDogYmJPZmZzZXRYLFxuXHRcdFx0XHRvZmZzZXRZIDogYmJPZmZzZXRZLFxuXHRcdFx0XHR3aWR0aCA6IGJiV2lkdGgsXG5cdFx0XHRcdGhlaWdodCA6IGJiSGVpZ2h0XG5cdFx0XHR9LFxuXHRcdFx0Yml0bWFwIDogdHJpbW1lZEJvb2xlYW5CaXRtYXAsXG5cdFx0XHRmb250U2l6ZSA6IGZvbnRIZWlnaHQsXG5cdFx0XHRmb250RmFtaWx5IDogZm9udEZhbWlseVxuXHRcdH07XG5cblx0XHRyZXR1cm4gcmVuZGVySW5mbztcblx0fSxcblxuXHQvKipcblx0ICogdGVzdHMgd2hldGhlciBhIHJlbmRlckluZm8gb2JqZWN0IGZpdHMgaW50byBhIGdsb2JhbCBib29sZWFuIGJpdG1hcFxuXHQgKiBAcGFyYW0gcmVuZGVySW5mbyAtIHJlbmRlckluZm8gZm9yIGEgd29yZCAocmV0dXJuZWQgZnJvbSBjcmVhdGUpXG5cdCAqIEBwYXJhbSBiaXRtYXAgLSBzY2VuZSBiaXRtYXBcblx0ICogQHJldHVybnMge2Jvb2xlYW59IC0gdHJ1ZSBpZiB3b3JkIGZpdHMsIGZhbHNlIG90aGVyd2lzZVxuXHQgKi9cblx0Zml0cyA6IGZ1bmN0aW9uKHJlbmRlckluZm8sYml0bWFwKSB7XG5cblx0XHR2YXIgc3RhcnRYID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuXHRcdHZhciBzdGFydFkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG5cblx0XHR2YXIgYml0bWFwV2lkdGggPSBiaXRtYXAubGVuZ3RoO1xuXHRcdHZhciBiaXRtYXBIZWlnaHQgPSBiaXRtYXBbMF0ubGVuZ3RoO1xuXG5cdFx0dmFyIGhpdEVkZ2UgPSBzdGFydFggPCAwIHx8IHN0YXJ0WSA8IDA7XG5cdFx0dmFyIGhpdE90aGVyID0gZmFsc2U7XG5cdFx0dmFyIGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJlbmRlckluZm8uYmIud2lkdGggJiYgIWRvZXNudEZpdDsgaSsrKSB7XG5cdFx0XHR2YXIgdSA9IHN0YXJ0WCArIGk7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHJlbmRlckluZm8uYmIuaGVpZ2h0ICYmICFkb2VzbnRGaXQ7IGorKykge1xuXHRcdFx0XHR2YXIgdiA9IHN0YXJ0WSArIGo7XG5cdFx0XHRcdGlmICh1ID49IGJpdG1hcFdpZHRoIHx8IHYgPj0gYml0bWFwSGVpZ2h0KSB7XG5cdFx0XHRcdFx0aGl0RWRnZSA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoYml0bWFwW3VdW3ZdKSB7XG5cdFx0XHRcdFx0aGl0T3RoZXIgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiAhZG9lc250Rml0O1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0Qml0bWFwOyIsIlxudmFyIFV0aWwgPSB7XG5cblx0ZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG5cdFx0dmFyIGtleSwgaSwgc291cmNlO1xuXHRcdGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdCAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuXHRcdCAgZm9yIChrZXkgaW4gc291cmNlKSB7XG5cdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdCAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG5cdFx0XHR9XG5cdFx0ICB9XG5cdFx0fVxuXHRcdHJldHVybiBkZXN0O1xuXHR9LFxuXG5cdGxlcnAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gbWluICsgKHQqKG1heC1taW4pKTtcblx0fSxcblxuXHRzdGVwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIE1hdGgucm91bmQodGhpcy5sZXJwKG1pbixtYXgsdCkpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBIZWxwZXIgZm9yIGNyZWF0aW5nIGFuIGFycmF5XG5cdCAqIEBwYXJhbSBsZW5ndGhcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0Y3JlYXRlQXJyYXkgOiBmdW5jdGlvbihsZW5ndGgpIHtcblx0XHR2YXIgYXJyID0gbmV3IEFycmF5KGxlbmd0aCB8fCAwKSxcblx0XHRcdGkgPSBsZW5ndGg7XG5cblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHRcdHdoaWxlKGktLSkge1xuXHRcdFx0XHRhcnJbbGVuZ3RoLTEgLSBpXSA9IHRoaXMuY3JlYXRlQXJyYXkuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFycjtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(3)
});
