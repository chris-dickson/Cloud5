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
                if (overWord) {
                    if (that._onWordOut) {
                        that._onWordOut(overWord);
                    }
                    overWord = null;
                }

				if (that._onWordOver) {
					that._onWordOver(word);
				}
				overWord = word;
			} else {
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

    this._highlightCanvas = null;
    this._highlightedWords = null;

	this._width = null;
	this._height = null;
	this._backgroundFill = null;
	this._onWordOver = null;
    this._onWordOut = null;
    this._onWordClick = null;
	this._layout = null;
    this._renderInfo = null;

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

            if (canvas === this._canvas) {
                return this;
            }

            var dpr = window.devicePixelRatio;
            var cWidth = canvas.width;
            var cHeight = canvas.height;
            var cssWidth = cWidth;
            var cssHeight = cHeight;
            if (dpr > 1) {
                cWidth *= dpr;
                cHeight *= dpr;
            }

            this._highlightedWords = {};
            this._renderInfo = {};


			this._canvas = canvas;
            this._canvas.width = cWidth;
            this._canvas.height = cHeight;
            this._canvas.style.width = cssWidth + 'px';
            this._canvas.style.height = cssHeight + 'px;'
			this._width = cWidth;
			this._height = cHeight;


            this._highlightCanvas = document.createElement('canvas');
            this._highlightCanvas.width = this._canvas.width;
            this._highlightCanvas.height = this._canvas.height;
            this._highlightCanvas.style.width = this._canvas.style.width;
            this._highlightCanvas.style.height = this._canvas.style.height;
            this._highlightCanvas.style.position = 'absolute';
            this._highlightCanvas.style.pointerEvents = 'none';
            this._highlightCanvas.style.top = this._canvas.getBoundingClientRect().top;
            this._highlightCanvas.style.left = this._canvas.getBoundingClientRect().left;
            this._canvas.parentNode.insertBefore(this._highlightCanvas,this._canvas);

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

            if (this._highlightCanvas) {
                this._highlightCanvas.width = this._canvas.width;
                this._highlightCanvas.style.width = this._canvas.style.width;
            }

        }
        if (h) {
            this._canvas.height = dpr * h;
            this._canvas.style.height = h + 'px';
            this._height = dpr * h;

            if (this._highlightCanvas) {
                this._highlightCanvas.height = this._canvas.height;
                this._highlightCanvas.style.height = this._canvas.style.height;
            }
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

    highlight : function(words,color) {
        if (words instanceof Array === false) {
            words = [words];
        }
        var that = this;
        words.forEach(function(word) {
            that._highlightedWords[word] = color;
        });
        this._updateHightlight();
    },

    unhighlight : function(words) {
        if (words instanceof Array === false) {
            words = [words];
        }
        var that = this;
        words.forEach(function(word) {
            delete that._highlightedWords[word]
        });
        this._updateHightlight();
    },

    _updateHightlight : function() {
        var that = this;
        var highlightCtx = this._highlightCanvas.getContext('2d');
        highlightCtx.clearRect(0,0,this._highlightCanvas.width,this._highlightCanvas.height);
        Object.keys(this._highlightedWords).forEach(function(word) {
            var renderInfo = that._renderInfo[word];
            var clr = that._highlightedWords[word];
            if (renderInfo) {
                highlightCtx.fillStyle = clr;
                highlightCtx.font = renderInfo.fontSize + 'px ' + renderInfo.fontFamily;
                highlightCtx.fillText(word,renderInfo.x,renderInfo.y);
            }
        });
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

		this._renderInfo = this._layout.layout();

		this.clear();

        var ctx = this._canvas.getContext('2d');


		this._logger.push('Render');
		var that = this;
		Object.keys(this._renderInfo).forEach(function(word) {
			var wordRenderInfo = that._renderInfo[word];
			if (wordRenderInfo.x !== -1 && wordRenderInfo.y !== -1) {
				ctx.font = wordRenderInfo.fontSize + 'px ' + wordRenderInfo.fontFamily;


				var clr = 'black';
				if (that._color) {
					if (that._color instanceof Array) {
						var idx = Math.floor(Math.random() * that._color.length);
						clr = that._color[idx];
					} else if (that._color instanceof Function) {
						clr = that._color(wordRenderInfo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvc3RvcHdvcmRzLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JlQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVGV4dEJpdG1hcCA9IHJlcXVpcmUoJy4vdGV4dGJpdG1hcCcpO1xuXG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX3dvcmRzID0gbnVsbDtcblx0dGhpcy5fYml0bWFwID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHRleHQgYml0bWFwcGVyIGFuZCBjcmVhdGUgb3VyIGJvb2xlYW4gYml0bWFwIG9mIHRoZSBzY2VuZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2luaXRpYWxpemUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMgPSB7XG5cdFx0XHR3aWR0aCA6IHRoaXMuX2NhbnZhcy53aWR0aCxcblx0XHRcdGhlaWdodCA6IHRoaXMuX2NhbnZhcy5oZWlnaHRcblx0XHR9O1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHR0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG5ldyBUZXh0Qml0bWFwKHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXHRcdHRoaXMuX2JpdG1hcCA9IF8uY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuICAgIC8qKlxuICAgICAqIEhpdCB0ZXN0IGEgcG9zaXRpb24geCx5IGZvciBhIHdvcmQuICBUT0RPOiAgbWFrZSB0aGlzIHdheSBmYXN0ZXIuICAgQlNQIFRyZWU/XG4gICAgICogQHBhcmFtIHggLSB4IG9mZnNldCBpbnRvIGNhbnZhc1xuICAgICAqIEBwYXJhbSB5IC0geSBvZmZzZXQgaW50byBjYW52YXNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9oaXQgOiBmdW5jdGlvbih4LHkpIHtcbiAgICAgICAgdmFyIHdvcmQgPSBudWxsO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgLy8gR2V0IGEgbGlzdCBvZiBib3VuZGluZyBib3hlcyB0aGF0IHgseSBhcmUgaW5cbiAgICAgICAgdmFyIGNvbnRhaW5lZFdvcmRzID0gT2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZmlsdGVyKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIHZhciBtaW5YID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIG1pblkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgbWF4WCA9IG1pblggKyByZW5kZXJJbmZvLmJiLndpZHRoO1xuICAgICAgICAgICAgdmFyIG1heFkgPSBtaW5ZICsgcmVuZGVySW5mby5iYi5oZWlnaHQ7XG4gICAgICAgICAgICBpZiAobWluWCA8PSB4ICYmIHggPD0gbWF4WCAmJiBtaW5ZIDw9IHkgJiYgeSA8PSBtYXhZKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydCBieSBzaXplXG4gICAgICAgIGNvbnRhaW5lZFdvcmRzLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcbiAgICAgICAgICAgIHZhciBiMSA9IHRoYXQuX3JlbmRlckluZm9bdzFdLmJiO1xuICAgICAgICAgICAgdmFyIGIyID0gdGhhdC5fcmVuZGVySW5mb1t3Ml0uYmI7XG4gICAgICAgICAgICB2YXIgYjFBID0gYjEud2lkdGggKiBiMS5oZWlnaHQ7XG4gICAgICAgICAgICB2YXIgYjJBID0gYjIud2lkdGggKiBiMi5oZWlnaHQ7XG4gICAgICAgICAgICByZXR1cm4gYjFBIC0gYjJBO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIHdvcmQgd2l0aCB0aGUgc21hbGxlc3QgYm91bmRpbmcgYm94XG4gICAgICAgIGlmIChjb250YWluZWRXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3b3JkID0gY29udGFpbmVkV29yZHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdvcmQ7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3b3JkcyB0byBsYXlvdXRcblx0ICogQHBhcmFtIHdvcmRzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dGhpcy5fd29yZHMgPSB3b3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgd29yZE92ZXIgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdXQgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgd29yZENsaWNrIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtMYXlvdXR9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIHRoZSBsYXlvdXRcblx0ICogQHJldHVybnMge3t9fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW5pdGlhbGl6ZSgpO1xuXHRcdHRoaXMuX3JlbmRlckluZm8gPSB7fTtcblxuXHRcdC8vIEdldCBjb3VudHMgZm9yIGVhY2ggd29yZCwgdGhlbiBmaWd1cmUgb3V0IHRoZSBmb250IHNpemUgZm9yIGVhY2ggd29yZC4gICBDcmVhdGUgYSBib29sZWFuIGJpdG1hcCBhbmRcblx0XHQvLyBib3VuZGluZyBib3ggZm9yIGVhY2ggd29yZFxuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdFx0dmFyIG1heENvdW50ID0gMDtcblxuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKHRoYXQuX3dvcmRzW3dvcmRdLG1pbkNvdW50KTtcblx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heCh0aGF0Ll93b3Jkc1t3b3JkXSxtYXhDb3VudCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gU29ydCB0aGUgd29yZHMgYnkgZnJlcXVlbmN5XG5cdFx0XHR2YXIgc29ydGVkV29yZEFycmF5ID0gT2JqZWN0LmtleXModGhpcy5fd29yZHMpLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcblx0XHRcdFx0cmV0dXJuIHRoYXQuX3dvcmRzW3cyXS10aGF0Ll93b3Jkc1t3MV07XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKHRoaXMubWF4V29yZHMgPiAwICYmIHNvcnRlZFdvcmRBcnJheS5sZW5ndGggPiB0aGlzLm1heFdvcmRzKSB7XG5cdFx0XHRcdHNvcnRlZFdvcmRBcnJheSA9IHNvcnRlZFdvcmRBcnJheS5zcGxpY2UoMCx0aGlzLm1heFdvcmRzKTtcblx0XHRcdH1cblxuXG5cdFx0XHR2YXIgbWluRm9udFNpemUgPSB0aGlzLm1pbkZvbnRTaXplIHx8IDEwO1xuXHRcdFx0dmFyIG1heEZvbnRTaXplID0gdGhpcy5tYXhGb250U2l6ZSB8fCAyMDA7XG5cdFx0XHRzb3J0ZWRXb3JkQXJyYXkuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cblx0XHRcdFx0dmFyIHQgPSAodGhhdC5fd29yZHNbd29yZF0gLSBtaW5Db3VudCkvKG1heENvdW50LW1pbkNvdW50KTtcblx0XHRcdFx0dmFyIGZvbnRTaXplID1fLnN0ZXAobWluRm9udFNpemUsbWF4Rm9udFNpemUsdCk7XG5cblx0XHRcdFx0dmFyIGJpdG1hcCA9IHRoYXQuX3RleHRCaXRtYXBwZXIuY3JlYXRlKHdvcmQsZm9udFNpemUsdGhhdC5mb250IHx8ICdDYWxpYnJpJyk7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0gPSBiaXRtYXA7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0uY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5taW5Db3VudCA9IG1pbkNvdW50O1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLm1heENvdW50ID0gbWF4Q291bnQ7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEZWJ1ZyByb3V0aW5lIHRvIGRyYXcgb3VyIHdvcmRzIGFzIHdlIGxheSB0aGVtIG91dFxuXHRcdCAqIEBwYXJhbSBjdHggLSBjYW52YXMgY29udGV4dFxuXHRcdCAqIEBwYXJhbSB3IC0gd2lkdGhcblx0XHQgKiBAcGFyYW0gaCAtIGhlaWdodFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRlYnVnRHJhd0FsbChjdHgsdyxoKSB7XG5cdFx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRcdGN0eC5maWxsUmVjdCgwLDAsdyxoKTtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHR2YXIgd29yZFJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuXHRcdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gdW5kZWZpbmVkICYmIHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuXHRcdFx0XHRcdGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRcdFx0Y3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcblx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBMYXlvdXQgZWFjaCB3b3JkXG5cdFx0c29ydGVkV29yZEFycmF5LmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0dmFyIHBsYWNlZCA9IGZhbHNlO1xuXHRcdFx0dmFyIGF0dGVtcHRzID0gMTAwO1xuXG5cdFx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0XHRkZWJ1Z0RyYXdBbGwodGhhdC5fY2FudmFzLmdldENvbnRleHQoJzJkJyksdGhhdC5fY2FudmFzLndpZHRoLCB0aGF0Ll9jYW52YXMuaGVpZ2h0KTtcblx0XHRcdH1cblxuICAgICAgICAgICAgdmFyIHJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuXG5cdFx0XHQvLyBUcnkgcGxhY2luZyB0aGUgd29yZCBhbmQgc2VlIGlmIGl0IGZpdHMvaGl0cyBhbnl0aGluZyBlbHNlIGFscmVhZHkgcGxhY2VkXG5cdFx0XHR3aGlsZSAoIXBsYWNlZCAmJiBhdHRlbXB0cyA+IDApIHtcblx0XHRcdFx0dmFyIHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGF0Ll9jYW52YXMud2lkdGgpO1xuXHRcdFx0XHR2YXIgeSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0XHRcdHJlbmRlckluZm8ueCA9IHg7XG5cdFx0XHRcdHJlbmRlckluZm8ueSA9IHk7XG5cblx0XHRcdFx0Ly8gSWYgaXQgZml0cywgdXBkYXRlIHRoZSBiaXRtYXAgZm9yIHRoZSBlbnRpcmUgc2NlbmUgdG8gc2F5IHRob3NlIHBpeGVscyBhcmUgb2NjdXBpZWRcblx0XHRcdFx0aWYgKHRoYXQuX3RleHRCaXRtYXBwZXIuZml0cyhyZW5kZXJJbmZvLHRoYXQuX2JpdG1hcCkpIHtcblx0XHRcdFx0XHRwbGFjZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0dmFyIGJpdG1hcFdpZHRoID0gcmVuZGVySW5mby5iaXRtYXAubGVuZ3RoO1xuXHRcdFx0XHRcdHZhciBiaXRtYXBIZWlnaHQgPSByZW5kZXJJbmZvLmJpdG1hcFswXS5sZW5ndGg7XG5cblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGJpdG1hcFdpZHRoOyBpKyspIHtcblx0XHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYml0bWFwSGVpZ2h0OyBqKyspIHtcblx0XHRcdFx0XHRcdFx0dmFyIHUgPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFggKyBpO1xuXHRcdFx0XHRcdFx0XHR2YXIgdiA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WSArIGo7XG5cblx0XHRcdFx0XHRcdFx0aWYgKHJlbmRlckluZm8uYml0bWFwW2ldW2pdKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhhdC5fYml0bWFwW3VdW3ZdID0gd29yZDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGF0dGVtcHRzLS07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICghcGxhY2VkKSB7XG5cdFx0XHRcdHJlbmRlckluZm8ueCA9IC0xO1xuXHRcdFx0XHRyZW5kZXJJbmZvLnkgPSAtMTtcblx0XHRcdH1cblx0XHR9KTtcblxuXG5cdFx0Ly8gQmluZCBoYW5kbGVyc1xuXHRcdHZhciBvdmVyV29yZCA9IG51bGw7XG5cdFx0ZnVuY3Rpb24gb25Nb3VzZU1vdmUoZSkge1xuXHRcdFx0dmFyIHggPSBlLm9mZnNldFg7XG5cdFx0XHR2YXIgeSA9IGUub2Zmc2V0WTtcbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHggKj0gZHByO1xuICAgICAgICAgICAgeSAqPSBkcHI7XG5cblx0XHRcdHZhciB3b3JkID0gdGhhdC5faGl0KHgseSk7XG5cdFx0XHRpZiAod29yZCkge1xuICAgICAgICAgICAgICAgIGlmIChvdmVyV29yZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9vbldvcmRPdXQob3ZlcldvcmQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG92ZXJXb3JkID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cblx0XHRcdFx0aWYgKHRoYXQuX29uV29yZE92ZXIpIHtcblx0XHRcdFx0XHR0aGF0Ll9vbldvcmRPdmVyKHdvcmQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG92ZXJXb3JkID0gd29yZDtcblx0XHRcdH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX29uV29yZE91dCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9vbldvcmRPdXQob3ZlcldvcmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdmVyV29yZCA9IG51bGw7XG4gICAgICAgICAgICB9XG5cdFx0fVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uTW91c2VDbGljayhlKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICAgICAgICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgeCAqPSBkcHI7XG4gICAgICAgICAgICB5ICo9IGRwcjtcblxuICAgICAgICAgICAgdmFyIHdvcmQgPSB0aGF0Ll9oaXQoeCx5KTtcbiAgICAgICAgICAgIGlmICh3b3JkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX29uV29yZENsaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX29uV29yZENsaWNrKHdvcmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cdFx0dGhpcy5fY2FudmFzLm9ubW91c2Vtb3ZlID0gb25Nb3VzZU1vdmU7XG4gICAgICAgIHRoaXMuX2NhbnZhcy5vbmNsaWNrID0gb25Nb3VzZUNsaWNrO1xuXG5cblx0XHRyZXR1cm4gdGhhdC5fcmVuZGVySW5mbztcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0OyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBMb2dnZXIgPSBmdW5jdGlvbih3cml0ZUxvZykge1xuXHR0aGlzLndyaXRlTG9nID0gd3JpdGVMb2c7XG5cdHRoaXMubG9ncyA9IFtdO1xufTtcblxuTG9nZ2VyLnByb3RvdHlwZSA9IF8uZXh0ZW5kKExvZ2dlci5wcm90b3R5cGUsIHtcblx0cHVzaCA6IGZ1bmN0aW9uKGxhYmVsKSB7XG5cdFx0aWYgKCF0aGlzLndyaXRlTG9nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMubG9ncy5wdXNoKHtcblx0XHRcdGxhYmVsIDogbGFiZWwsXG5cdFx0XHR0aW1lIDogRGF0ZS5ub3coKVxuXHRcdH0pO1xuXHR9LFxuXHRwb3AgOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMud3JpdGVMb2cpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHRhYnMgPSB0aGlzLmxvZ3MubGVuZ3RoO1xuXHRcdHZhciBsb2cgPSB0aGlzLmxvZ3MucG9wKCk7XG5cdFx0dmFyIHN0ciA9ICcnO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGFicy5sZW5ndGg7IGkrKykge1xuXHRcdFx0c3RyICs9ICdcXHQnO1xuXHRcdH1cblx0XHR2YXIgZW5kID0gRGF0ZS5ub3coKTtcblx0XHR2YXIgZWxhcHNlZCA9IGVuZCAtIGxvZy50aW1lO1xuXHRcdHN0ciArPSBsb2cubGFiZWwgKyAnOicgKyBlbGFwc2VkICsgJ21zJztcblx0XHRjb25zb2xlLmxvZyhzdHIpO1xuXHR9LFxuXG5cdF9taWxsaXNlY29uZHNUb1N0cmluZyA6IGZ1bmN0aW9uKG1pbGxpc2Vjb25kcykge1xuXHRcdHZhciBvbmVIb3VyID0gMzYwMDAwMDtcblx0XHR2YXIgb25lTWludXRlID0gNjAwMDA7XG5cdFx0dmFyIG9uZVNlY29uZCA9IDEwMDA7XG5cdFx0dmFyIHNlY29uZHMgPSAwO1xuXHRcdHZhciBtaW51dGVzID0gMDtcblx0XHR2YXIgaG91cnMgPSAwO1xuXHRcdHZhciByZXN1bHQ7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZUhvdXIpIHtcblx0XHRcdGhvdXJzID0gTWF0aC5mbG9vcihtaWxsaXNlY29uZHMgLyBvbmVIb3VyKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBob3VycyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gaG91cnMgKiBvbmVIb3VyKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lTWludXRlKSB7XG5cdFx0XHRtaW51dGVzID0gTWF0aC5mbG9vcihtaWxsaXNlY29uZHMgLyBvbmVNaW51dGUpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IG1pbnV0ZXMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIG1pbnV0ZXMgKiBvbmVNaW51dGUpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVTZWNvbmQpIHtcblx0XHRcdHNlY29uZHMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZVNlY29uZCk7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gc2Vjb25kcyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gc2Vjb25kcyAqIG9uZVNlY29uZCkgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAoaG91cnMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgPSAoaG91cnMgPiA5ID8gaG91cnMgOiAnMCcgKyBob3VycykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCA9ICcwMDonO1xuXHRcdH1cblxuXHRcdGlmIChtaW51dGVzID4gMCkge1xuXHRcdFx0cmVzdWx0ICs9IChtaW51dGVzID4gOSA/IG1pbnV0ZXMgOiAnMCcgKyBtaW51dGVzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ICs9ICcwMDonO1xuXHRcdH1cblxuXHRcdGlmIChzZWNvbmRzID4gMCkge1xuXHRcdFx0cmVzdWx0ICs9IChzZWNvbmRzID4gOSA/IHNlY29uZHMgOiAnMCcgKyBzZWNvbmRzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ICs9ICcwMDonO1xuXHRcdH1cblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKG1pbGxpc2Vjb25kcyA+IDkgPyBtaWxsaXNlY29uZHMgOiAnMCcgKyBtaWxsaXNlY29uZHMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwJztcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xudmFyIFN0b3B3b3JkcyA9IHJlcXVpcmUoJy4vc3RvcHdvcmRzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIHBlcmZMb2cgPSB0cnVlO1xuXG4vKipcbiAqIENsb3VkNSBjb25zdHJ1Y3RvclxuICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQ2xvdWQ1ID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXG5cdHRoaXMuX2xvZ2dlciA9IG5ldyBMb2dnZXIocGVyZkxvZyk7XG5cblx0dGhpcy5fd29yZHMgPSB7fTtcblx0dGhpcy5fc3RvcFdvcmRzID0ge307XG5cblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblxuICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcyA9IG51bGw7XG4gICAgdGhpcy5faGlnaGxpZ2h0ZWRXb3JkcyA9IG51bGw7XG5cblx0dGhpcy5fd2lkdGggPSBudWxsO1xuXHR0aGlzLl9oZWlnaHQgPSBudWxsO1xuXHR0aGlzLl9iYWNrZ3JvdW5kRmlsbCA9IG51bGw7XG5cdHRoaXMuX29uV29yZE92ZXIgPSBudWxsO1xuICAgIHRoaXMuX29uV29yZE91dCA9IG51bGw7XG4gICAgdGhpcy5fb25Xb3JkQ2xpY2sgPSBudWxsO1xuXHR0aGlzLl9sYXlvdXQgPSBudWxsO1xuICAgIHRoaXMuX3JlbmRlckluZm8gPSBudWxsO1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5DbG91ZDUucHJvdG90eXBlID0gXy5leHRlbmQoQ2xvdWQ1LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGNhbnZhc1xuXHQgKiBAcGFyYW0gY2FudmFzIC0gSFRNTDUgQ2FudmFzIGVsZW1lbnRcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cbiAgICAgICAgICAgIGlmIChjYW52YXMgPT09IHRoaXMuX2NhbnZhcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB2YXIgY1dpZHRoID0gY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgdmFyIGNIZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgdmFyIGNzc1dpZHRoID0gY1dpZHRoO1xuICAgICAgICAgICAgdmFyIGNzc0hlaWdodCA9IGNIZWlnaHQ7XG4gICAgICAgICAgICBpZiAoZHByID4gMSkge1xuICAgICAgICAgICAgICAgIGNXaWR0aCAqPSBkcHI7XG4gICAgICAgICAgICAgICAgY0hlaWdodCAqPSBkcHI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodGVkV29yZHMgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlckluZm8gPSB7fTtcblxuXG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSBjV2lkdGg7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0ID0gY0hlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aCA9IGNzc1dpZHRoICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQgPSBjc3NIZWlnaHQgKyAncHg7J1xuXHRcdFx0dGhpcy5fd2lkdGggPSBjV2lkdGg7XG5cdFx0XHR0aGlzLl9oZWlnaHQgPSBjSGVpZ2h0O1xuXG5cbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoID0gdGhpcy5fY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUud2lkdGggPSB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGg7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS50b3AgPSB0aGlzLl9jYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLmxlZnQgPSB0aGlzLl9jYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLl9oaWdobGlnaHRDYW52YXMsdGhpcy5fY2FudmFzKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIHdpZHRoIG9mIHRoZSBjYW52YXMuICAgSWYgbm90IHNldCwgdXNlcyB0aGUgaW5oZXJpdGVkIHdpZHRoIGZyb20gY2FudmFzXG5cdCAqIEBwYXJhbSB3aWR0aCAtIHdpZHRoIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdpZHRoIDogZnVuY3Rpb24od2lkdGgpIHtcblx0XHRpZiAod2lkdGgpIHtcblx0XHRcdHRoaXMucmVzaXplKHdpZHRoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy53aWR0aDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXMuICBJZiBub3Qgc2V0LCB1c2VzIHRoZSBpbmhlcml0ZWQgd2lkdGggZnJvbSBjYW52YXNcblx0ICogQHBhcmFtIGhlaWdodCAtIGhlaWdodCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRoZWlnaHQgOiBmdW5jdGlvbihoZWlnaHQpIHtcblx0XHRpZiAoaGVpZ2h0KSB7XG5cdFx0XHRpZiAodGhpcy5fY2FudmFzKSB7XG5cdFx0XHRcdHRoaXMucmVzaXplKHVuZGVmaW5lZCxoZWlnaHQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9oZWlnaHQ7XG5cdFx0fVxuXHR9LFxuXG4gICAgcmVzaXplIDogZnVuY3Rpb24odyxoKSB7XG4gICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgaWYgKHcpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy53aWR0aCA9IGRwciAqIHc7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGggPSB3ICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX3dpZHRoID0gIGRwciAqIHc7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9oaWdobGlnaHRDYW52YXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMud2lkdGggPSB0aGlzLl9jYW52YXMud2lkdGg7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLndpZHRoID0gdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGgpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQgPSBkcHIgKiBoO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodCA9IGggKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gZHByICogaDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2hpZ2hsaWdodENhbnZhcykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5oZWlnaHQgPSB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHRleHQgZm9yIHdvcmQgY2xvdWQgZ2VuZXJhdGlvbiBmcm9tIGEgbGFyZ2Ugc3RyaW5nXG5cdCAqIEBwYXJhbSB0ZXh0IC0gYSBzdHJpbmcuICAgQnkgZGVmYXVsdCwgd2UgcmVtb3ZlIGFsbCBwdW5jdHVhdGlvbi4gICBBZGRpdGlvbmFsIHJ1bGVzIGNhbiBiZSBhZGRlZCBieVxuXHQgKiBjYWxsaW5nIHRleHRGaWx0ZXJzKC4uLilcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdHRleHQgOiBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0dmFyIGZpbHRlcmVkID0gdGV4dC5yZXBsYWNlKC9bXFwuLC1cXC8jISQlXFxeJlxcKjs6e309XFwtX2B+KCldL2csJycpO1xuXHRcdGlmICh0aGlzLl9maWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzLmZvckVhY2goZnVuY3Rpb24oZmlsdGVyKSB7XG5cdFx0XHRcdGZpbHRlcmVkID0gdGV4dC5yZXBsYWNlKGZpbHRlciwnJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0dmFyIHdvcmRzID0gZmlsdGVyZWQuc3BsaXQoJyAnKTtcblx0XHR0aGlzLndvcmRzKHdvcmRzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGEgbGlzdCBvZiB0ZXh0IGZpbHRlcnMgKHJlZ3VsYXIgZXhwcmVzc2lvbnMpIHRvIGJlIGFwcGxpZWQuICAgUnVsZXMgdGhhdCBtYXRjaCB3aWxsIGJlIGRlbGV0ZWRcblx0ICogZnJvbSB0aGUgb3JpZ2luYWwgdGV4dCBzdHJpbmcuICBUaGV5J3JlIGFwcGxpZWQgaW4gdGhlIG9yZGVyIGdpdmVuIHRvIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIGZpbHRlcnMgLSBhbiBhcnJheSBvZiByZWd1bGFyIGV4cHJlc3Npb25zXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0dGV4dEZpbHRlcnMgOiBmdW5jdGlvbihmaWx0ZXJzKSB7XG5cdFx0aWYgKGZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMgPSBmaWx0ZXJzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9maWx0ZXJzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgc3RvcCB3b3JkcyAod29yZHMgdG8gaWdub3JlKVxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiBzdHJpbmdzIHRvIGlnbm9yZVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuX2JhY2tncm91bmRGaWxsIHx8ICd3aGl0ZSc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGJhY2tncm91bmQgZmlsbCBzdHlsZVxuXHQgKiBAcGFyYW0gZmlsbFN0eWxlIC0gYSB2YWxpZCBmaWxsU3R5bGUgc3RyaW5nXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgZm9yIHRoZSB3b3JkIGNsb3VkXG5cdCAqIEBwYXJhbSB3b3JkcyAtIGFuIGFycmF5IG9mIHdvcmRzLlxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMuX3N0b3BXb3JkcykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRoaXMuc3RvcChTdG9wd29yZHMuRW5nbGlzaCk7XG5cdFx0XHR9XG5cblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJhdykge1xuXHRcdFx0XHR2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKHRoYXQuX3N0b3BXb3Jkc1t3b3JkXSB8fCB3b3JkID09PSAnJykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBjb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHRpZiAoIWNvdW50KSB7XG5cdFx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cbiAgICBoaWdobGlnaHQgOiBmdW5jdGlvbih3b3Jkcyxjb2xvcikge1xuICAgICAgICBpZiAod29yZHMgaW5zdGFuY2VvZiBBcnJheSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdvcmRzID0gW3dvcmRzXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHdvcmRzLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXSA9IGNvbG9yO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGlnaHRsaWdodCgpO1xuICAgIH0sXG5cbiAgICB1bmhpZ2hsaWdodCA6IGZ1bmN0aW9uKHdvcmRzKSB7XG4gICAgICAgIGlmICh3b3JkcyBpbnN0YW5jZW9mIEFycmF5ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgd29yZHMgPSBbd29yZHNdO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGlnaHRsaWdodCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGlnaHRsaWdodCA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciBoaWdobGlnaHRDdHggPSB0aGlzLl9oaWdobGlnaHRDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgaGlnaGxpZ2h0Q3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoLHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQpO1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9oaWdobGlnaHRlZFdvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIHZhciBjbHIgPSB0aGF0Ll9oaWdobGlnaHRlZFdvcmRzW3dvcmRdO1xuICAgICAgICAgICAgaWYgKHJlbmRlckluZm8pIHtcbiAgICAgICAgICAgICAgICBoaWdobGlnaHRDdHguZmlsbFN0eWxlID0gY2xyO1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5mb250ID0gcmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgcmVuZGVySW5mby5mb250RmFtaWx5O1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5maWxsVGV4dCh3b3JkLHJlbmRlckluZm8ueCxyZW5kZXJJbmZvLnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXQgYSBoYW5kbGVyIGZvciBtb3VzaW5nIG92ZXIgYSB3b3JkXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRvbldvcmRPdmVyIDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE92ZXIgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgYSBoYW5kbGVyIGZvciBtb3VzaW5nIG91dCBvZiBhIHdvcmRcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdG9uV29yZE91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdXQgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGEgaGFuZGxlciBmb3IgY2xpY2tpbmcgb24gYSB3b3JkXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuICAgICAqL1xuICAgIG9uV29yZENsaWNrIDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9vbldvcmRDbGljayA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBmYW1pbHkgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBmb250IC0gZm9udCBmYW1pbHkgKGllLyAnSGVsdmV0aWNhJylcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRmb250IDogZnVuY3Rpb24oZm9udCkge1xuXHRcdGlmIChmb250KSB7XG5cdFx0XHR0aGlzLl9mb250ID0gZm9udDtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWluaW11bSBmb250IHNpemUgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBtaW5Gb250U2l6ZSAtIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1pbkZvbnRTaXplIDogZnVuY3Rpb24obWluRm9udFNpemUpIHtcblx0XHRpZiAobWluRm9udFNpemUpIHtcblx0XHRcdHRoaXMuX21pbkZvbnRTaXplID0gbWluRm9udFNpemU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21pbkZvbnRTaXplO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtYXhpbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1heEZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWF4Rm9udFNpemUgOiBmdW5jdGlvbihtYXhGb250U2l6ZSkge1xuXHRcdGlmIChtYXhGb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWF4Rm9udFNpemUgPSBtYXhGb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4Rm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gbnVtYmVyIG9mIHdvcmRzIHRvIGJlIHJlbmRlcmVkIGluIHRoZSBjbG91ZFxuXHQgKiBAcGFyYW0gbWF4V29yZHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhXb3JkcyA6IGZ1bmN0aW9uKG1heFdvcmRzKSB7XG5cdFx0aWYgKG1heFdvcmRzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuX21heFdvcmRzID0gbWF4V29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21heFdvcmRzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGNvbG9yc1xuXHQgKiBAcGFyYW0gY29sb3IgLSBjYW4gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG5cdCAqIFx0XHQxKSAgQSBmaWxsU3R5bGUgc3RyaW5nIChpZS8gJ3JlZCcsJ3JnYigyNTUsMjU1LDApJywgZXRjKVxuXHQgKiBcdCAgICAyKSAgQW4gYXJyYXkgb2YgZmlsbFN0eWxlIHN0cmluZ3Ncblx0ICogXHQgICAgMykgIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgZmlsbFN0eWxlIHN0cmluZyBnaXZlbiB0aGUgcmVuZGVySW5mbyBmb3IgdGhlIHdvcmQuICBpZS9cblx0ICogXHQgICAgICAgICAgICAgZnVuY3Rpb24ocmVuZGVySW5mbykge1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHdvcmQgPSByZW5kZXJJbmZvLndvcmQ7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgY291bnQgPSByZW5kZXJJbmZvLmNvdW50O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHhQb3MgPSByZW5kZXJJbmZvLng7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgeVBvc3QgPSByZW5kZXJJbmZvLnk7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICByZXR1cm4gLy8gYSBmaWxsU3R5bGUgZGVyaXZlZCBmcm9tIGFib3ZlIHByb3BlcnRpZXNcblx0ICogXHQgICAgICAgICAgICAgIH1cblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjb2xvciA6IGZ1bmN0aW9uKGNvbG9yKSB7XG5cdFx0aWYgKGNvbG9yKSB7XG5cdFx0XHR0aGlzLl9jb2xvciA9IGNvbG9yO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb2xvcjtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIExheW91dCBhbmQgcmVuZGVyIHRoZSB3b3JkIGNsb3VkIHRvIHRoZSBjYW52YXMgcHJvdmlkZWRcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdGdlbmVyYXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGxheW91dEF0dHJpYnV0ZXMgPSB7fTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9mb250KSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLmZvbnQgPSB0aGlzLl9mb250O1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWluRm9udFNpemUpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWluRm9udFNpemUgPSB0aGlzLl9taW5Gb250U2l6ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21heEZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1heEZvbnRTaXplID0gdGhpcy5fbWF4Rm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhXb3JkcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1heFdvcmRzID0gdGhpcy5fbWF4V29yZHM7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbG9nZ2VyLnB1c2goJ0xheW91dCcpO1xuXHRcdHRoaXMuX2xheW91dCA9IG5ldyBMYXlvdXQobGF5b3V0QXR0cmlidXRlcylcblx0XHRcdC5jYW52YXModGhpcy5fY2FudmFzKVxuXHRcdFx0LndvcmRzKHRoaXMuX3dvcmRzKVxuXHRcdFx0Lm9uV29yZE92ZXIodGhpcy5fb25Xb3JkT3Zlcilcblx0XHRcdC5vbldvcmRPdXQodGhpcy5fb25Xb3JkT3V0KVxuICAgICAgICAgICAgLm9uV29yZENsaWNrKHRoaXMuX29uV29yZENsaWNrKTtcblx0XHR0aGlzLl9sb2dnZXIucG9wKCk7XG5cblx0XHR0aGlzLl9yZW5kZXJJbmZvID0gdGhpcy5fbGF5b3V0LmxheW91dCgpO1xuXG5cdFx0dGhpcy5jbGVhcigpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXG5cdFx0dGhpcy5fbG9nZ2VyLnB1c2goJ1JlbmRlcicpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciB3b3JkUmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG5cdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0Y3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcblxuXG5cdFx0XHRcdHZhciBjbHIgPSAnYmxhY2snO1xuXHRcdFx0XHRpZiAodGhhdC5fY29sb3IpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0dmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NvbG9yLmxlbmd0aCk7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcltpZHhdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3Iod29yZFJlbmRlckluZm8pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9IGNscjtcblx0XHRcdFx0Y3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcblxuXHRcdFx0XHRpZiAodGhhdC5kZWJ1Zykge1xuXHRcdFx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuX2xvZ2dlci5wb3AoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuICAgIC8qKlxuICAgICAqIFNhdmVzIGltYWdlIHRvIGxvY2FsIGZpbGVzeXN0ZW0gd2l0aCB0aGUgZm9ybWF0L2ZpbGVuYW1lIHNwZWNpZmllZFxuICAgICAqIEBwYXJhbSBmb3JtYXQgKG9wdGlvbmFsKSAtIFRoZSBtaW1ldHlwZSB0byBzYXZlIGFzLiAgIERlZmF1bHQgJ2ltYWdlL3BuZydcbiAgICAgKiBAcGFyYW0gZmlsZW5hbWUgKG9wdGlvbmFsKSAtIFRoZSBmaWxlbmFtZSB0byBzYXZlIGl0IGFzLiAgICdkb3dubG9hZCcgYnkgZGVmYXVsdFxuICAgICAqL1xuICAgIHNhdmUgOiBmdW5jdGlvbihmb3JtYXQsZmlsZW5hbWUpIHtcbiAgICAgICAgdmFyIGRhdGFVUkkgPSB0aGlzLl9jYW52YXMudG9EYXRhVVJMKGZvcm1hdCB8fCAnaW1hZ2UvcG5nJyk7XG4gICAgICAgIHZhciB1cmlDb250ZW50ID0gZGF0YVVSSS5pbmRleE9mKCcsJyk7XG4gICAgICAgIGRhdGFVUkkgPSBkYXRhVVJJLnN1YnN0cmluZyh1cmlDb250ZW50KTtcbiAgICAgICAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGxpbmsuaHJlZiA9ICdkYXRhOmFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbTtiYXNlNjQnICsgZGF0YVVSSTtcbiAgICAgICAgaWYgKGZpbGVuYW1lKSB7XG4gICAgICAgICAgICBsaW5rLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgbGluay5jbGljaygpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsb3VkNTtcbm1vZHVsZS5leHBvcnRzLlN0b3B3b3JkcyA9IFN0b3B3b3JkczsiLCJ2YXIgZW5nbGlzaCA9IFwiYSwgYWJvdXQsIGFib3ZlLCBhY3Jvc3MsIGFmdGVyLCBhZ2FpbiwgYWdhaW5zdCwgYWxsLCBhbG1vc3QsIGFsb25lLCBhbG9uZywgYWxyZWFkeSwgYWxzbywgYWx0aG91Z2gsIGFsd2F5cywgYW0sIGFtb25nLCBhbiwgYW5kLCBhbm90aGVyLCBhbnksIGFueWJvZHksIGFueW9uZSwgYW55dGhpbmcsIGFueXdoZXJlLCBhcmUsIGFyZWEsIGFyZWFzLCBhcmVuJ3QsIGFyb3VuZCwgYXMsIGFzaywgYXNrZWQsIGFza2luZywgYXNrcywgYXQsIGF3YXksIGIsIGJhY2ssIGJhY2tlZCwgYmFja2luZywgYmFja3MsIGJlLCBiZWNhbWUsIGJlY2F1c2UsIGJlY29tZSwgYmVjb21lcywgYmVlbiwgYmVmb3JlLCBiZWdhbiwgYmVoaW5kLCBiZWluZywgYmVpbmdzLCBiZWxvdywgYmVzdCwgYmV0dGVyLCBiZXR3ZWVuLCBiaWcsIGJvdGgsIGJ1dCwgYnksIGMsIGNhbWUsIGNhbiwgY2Fubm90LCBjYW4ndCwgY2FzZSwgY2FzZXMsIGNlcnRhaW4sIGNlcnRhaW5seSwgY2xlYXIsIGNsZWFybHksIGNvbWUsIGNvdWxkLCBjb3VsZG4ndCwgZCwgZGlkLCBkaWRuJ3QsIGRpZmZlciwgZGlmZmVyZW50LCBkaWZmZXJlbnRseSwgZG8sIGRvZXMsIGRvZXNuJ3QsIGRvaW5nLCBkb25lLCBkb24ndCwgZG93biwgZG93bmVkLCBkb3duaW5nLCBkb3ducywgZHVyaW5nLCBlLCBlYWNoLCBlYXJseSwgZWl0aGVyLCBlbmQsIGVuZGVkLCBlbmRpbmcsIGVuZHMsIGVub3VnaCwgZXZlbiwgZXZlbmx5LCBldmVyLCBldmVyeSwgZXZlcnlib2R5LCBldmVyeW9uZSwgZXZlcnl0aGluZywgZXZlcnl3aGVyZSwgZiwgZmFjZSwgZmFjZXMsIGZhY3QsIGZhY3RzLCBmYXIsIGZlbHQsIGZldywgZmluZCwgZmluZHMsIGZpcnN0LCBmb3IsIGZvdXIsIGZyb20sIGZ1bGwsIGZ1bGx5LCBmdXJ0aGVyLCBmdXJ0aGVyZWQsIGZ1cnRoZXJpbmcsIGZ1cnRoZXJzLCBnLCBnYXZlLCBnZW5lcmFsLCBnZW5lcmFsbHksIGdldCwgZ2V0cywgZ2l2ZSwgZ2l2ZW4sIGdpdmVzLCBnbywgZ29pbmcsIGdvb2QsIGdvb2RzLCBnb3QsIGdyZWF0LCBncmVhdGVyLCBncmVhdGVzdCwgZ3JvdXAsIGdyb3VwZWQsIGdyb3VwaW5nLCBncm91cHMsIGgsIGhhZCwgaGFkbid0LCBoYXMsIGhhc24ndCwgaGF2ZSwgaGF2ZW4ndCwgaGF2aW5nLCBoZSwgaGUnZCwgaGUnbGwsIGhlciwgaGVyZSwgaGVyZSdzLCBoZXJzLCBoZXJzZWxmLCBoZSdzLCBoaWdoLCBoaWdoZXIsIGhpZ2hlc3QsIGhpbSwgaGltc2VsZiwgaGlzLCBob3csIGhvd2V2ZXIsIGhvdydzLCBpLCBpJ2QsIGlmLCBpJ2xsLCBpJ20sIGltcG9ydGFudCwgaW4sIGludGVyZXN0LCBpbnRlcmVzdGVkLCBpbnRlcmVzdGluZywgaW50ZXJlc3RzLCBpbnRvLCBpcywgaXNuJ3QsIGl0LCBpdHMsIGl0J3MsIGl0c2VsZiwgaSd2ZSwgaiwganVzdCwgaywga2VlcCwga2VlcHMsIGtpbmQsIGtuZXcsIGtub3csIGtub3duLCBrbm93cywgbCwgbGFyZ2UsIGxhcmdlbHksIGxhc3QsIGxhdGVyLCBsYXRlc3QsIGxlYXN0LCBsZXNzLCBsZXQsIGxldHMsIGxldCdzLCBsaWtlLCBsaWtlbHksIGxvbmcsIGxvbmdlciwgbG9uZ2VzdCwgbSwgbWFkZSwgbWFrZSwgbWFraW5nLCBtYW4sIG1hbnksIG1heSwgbWUsIG1lbWJlciwgbWVtYmVycywgbWVuLCBtaWdodCwgbW9yZSwgbW9zdCwgbW9zdGx5LCBtciwgbXJzLCBtdWNoLCBtdXN0LCBtdXN0bid0LCBteSwgbXlzZWxmLCBuLCBuZWNlc3NhcnksIG5lZWQsIG5lZWRlZCwgbmVlZGluZywgbmVlZHMsIG5ldmVyLCBuZXcsIG5ld2VyLCBuZXdlc3QsIG5leHQsIG5vLCBub2JvZHksIG5vbiwgbm9vbmUsIG5vciwgbm90LCBub3RoaW5nLCBub3csIG5vd2hlcmUsIG51bWJlciwgbnVtYmVycywgbywgb2YsIG9mZiwgb2Z0ZW4sIG9sZCwgb2xkZXIsIG9sZGVzdCwgb24sIG9uY2UsIG9uZSwgb25seSwgb3Blbiwgb3BlbmVkLCBvcGVuaW5nLCBvcGVucywgb3IsIG9yZGVyLCBvcmRlcmVkLCBvcmRlcmluZywgb3JkZXJzLCBvdGhlciwgb3RoZXJzLCBvdWdodCwgb3VyLCBvdXJzLCBvdXJzZWx2ZXMsIG91dCwgb3Zlciwgb3duLCBwLCBwYXJ0LCBwYXJ0ZWQsIHBhcnRpbmcsIHBhcnRzLCBwZXIsIHBlcmhhcHMsIHBsYWNlLCBwbGFjZXMsIHBvaW50LCBwb2ludGVkLCBwb2ludGluZywgcG9pbnRzLCBwb3NzaWJsZSwgcHJlc2VudCwgcHJlc2VudGVkLCBwcmVzZW50aW5nLCBwcmVzZW50cywgcHJvYmxlbSwgcHJvYmxlbXMsIHB1dCwgcHV0cywgcSwgcXVpdGUsIHIsIHJhdGhlciwgcmVhbGx5LCByaWdodCwgcm9vbSwgcm9vbXMsIHMsIHNhaWQsIHNhbWUsIHNhdywgc2F5LCBzYXlzLCBzZWNvbmQsIHNlY29uZHMsIHNlZSwgc2VlbSwgc2VlbWVkLCBzZWVtaW5nLCBzZWVtcywgc2Vlcywgc2V2ZXJhbCwgc2hhbGwsIHNoYW4ndCwgc2hlLCBzaGUnZCwgc2hlJ2xsLCBzaGUncywgc2hvdWxkLCBzaG91bGRuJ3QsIHNob3csIHNob3dlZCwgc2hvd2luZywgc2hvd3MsIHNpZGUsIHNpZGVzLCBzaW5jZSwgc21hbGwsIHNtYWxsZXIsIHNtYWxsZXN0LCBzbywgc29tZSwgc29tZWJvZHksIHNvbWVvbmUsIHNvbWV0aGluZywgc29tZXdoZXJlLCBzdGF0ZSwgc3RhdGVzLCBzdGlsbCwgc3VjaCwgc3VyZSwgdCwgdGFrZSwgdGFrZW4sIHRoYW4sIHRoYXQsIHRoYXQncywgdGhlLCB0aGVpciwgdGhlaXJzLCB0aGVtLCB0aGVtc2VsdmVzLCB0aGVuLCB0aGVyZSwgdGhlcmVmb3JlLCB0aGVyZSdzLCB0aGVzZSwgdGhleSwgdGhleSdkLCB0aGV5J2xsLCB0aGV5J3JlLCB0aGV5J3ZlLCB0aGluZywgdGhpbmdzLCB0aGluaywgdGhpbmtzLCB0aGlzLCB0aG9zZSwgdGhvdWdoLCB0aG91Z2h0LCB0aG91Z2h0cywgdGhyZWUsIHRocm91Z2gsIHRodXMsIHRvLCB0b2RheSwgdG9nZXRoZXIsIHRvbywgdG9vaywgdG93YXJkLCB0dXJuLCB0dXJuZWQsIHR1cm5pbmcsIHR1cm5zLCB0d28sIHUsIHVuZGVyLCB1bnRpbCwgdXAsIHVwb24sIHVzLCB1c2UsIHVzZWQsIHVzZXMsIHYsIHZlcnksIHcsIHdhbnQsIHdhbnRlZCwgd2FudGluZywgd2FudHMsIHdhcywgd2Fzbid0LCB3YXksIHdheXMsIHdlLCB3ZSdkLCB3ZWxsLCB3ZSdsbCwgd2VsbHMsIHdlbnQsIHdlcmUsIHdlJ3JlLCB3ZXJlbid0LCB3ZSd2ZSwgd2hhdCwgd2hhdCdzLCB3aGVuLCB3aGVuJ3MsIHdoZXJlLCB3aGVyZSdzLCB3aGV0aGVyLCB3aGljaCwgd2hpbGUsIHdobywgd2hvbGUsIHdob20sIHdobydzLCB3aG9zZSwgd2h5LCB3aHkncywgd2lsbCwgd2l0aCwgd2l0aGluLCB3aXRob3V0LCB3b24ndCwgd29yaywgd29ya2VkLCB3b3JraW5nLCB3b3Jrcywgd291bGQsIHdvdWxkbid0LCB4LCB5LCB5ZWFyLCB5ZWFycywgeWVzLCB5ZXQsIHlvdSwgeW91J2QsIHlvdSdsbCwgeW91bmcsIHlvdW5nZXIsIHlvdW5nZXN0LCB5b3VyLCB5b3UncmUsIHlvdXJzLCB5b3Vyc2VsZiwgeW91cnNlbHZlcywgeW91J3ZlLCB6XCI7XG52YXIgZW5nbGlzaFdvcmRzID0gZW5nbGlzaC5zcGxpdCgnLCcpO1xuXG5leHBvcnRzLkVuZ2xpc2ggPSBlbmdsaXNoV29yZHM7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG52YXIgVGV4dEJpdG1hcCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY29udGV4dCA9IG51bGw7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG5cblx0dGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdHRoaXMuX2NhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggfHwgNjQwO1xuXHR0aGlzLl9jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgNDgwO1xuXHR0aGlzLl9jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG5cdH1cblxuXHR0aGlzLl9iaXRtYXAgPSBfLmNyZWF0ZUFycmF5KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jYW52YXMud2lkdGg7IGkrKykge1xuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHR0aGlzLl9iaXRtYXBbaV1bal0gPSBmYWxzZTtcblx0XHR9XG5cdH1cbn07XG5cblRleHRCaXRtYXAucHJvdG90eXBlID0gXy5leHRlbmQoVGV4dEJpdG1hcC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogQ3JlYXRlIGEgYml0bWFwIGZvciB0aGUgZ2l2ZW4gd29yZC9mb250IHBhaXIuICAgUmV0dXJuIGEgcmVuZGVySW5mbyBvYmplY3QgZm9yIHRoaXNcblx0ICogQHBhcmFtIHRleHQgLSBhIHN0cmluZyB0aGF0IHdlIHdhbnQgdG8gYml0bWFwIChpZS8gYSB3b3JkKVxuXHQgKiBAcGFyYW0gZm9udEhlaWdodCAtIHRoZSBoZWlnaHQgb2YgdGhlIGZvbnRcblx0ICogQHBhcmFtIGZvbnRGYW1pbHkgLSB0aGUgZm9udCBmYW1pbHlcblx0ICogQHJldHVybnMge3tiYjoge29mZnNldFg6IG51bWJlciwgb2Zmc2V0WTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcn0sIGJpdG1hcDogKiwgZm9udFNpemU6ICosIGZvbnRGYW1pbHk6ICp9fVxuXHQgKi9cblx0Y3JlYXRlIDogZnVuY3Rpb24odGV4dCxmb250SGVpZ2h0LGZvbnRGYW1pbHkpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY29udGV4dDtcblx0XHRjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcblx0XHRjdHguZmlsbFJlY3QoMCwwLHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdHZhciB0ZXh0UmVuZGVyWCA9IDU7XG5cdFx0dmFyIHRleHRSZW5kZXJZID0gTWF0aC5mbG9vcih0aGlzLl9jYW52YXMuaGVpZ2h0LzIpO1xuXG5cdFx0Ly8gRmlsbCB0aGUgZm9udFxuXHRcdGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGN0eC5mb250ID0gZm9udEhlaWdodCArICdweCAnICsgZm9udEZhbWlseTtcblx0XHRjdHguZmlsbFRleHQodGV4dCx0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSk7XG5cblx0XHR2YXIgd2lkdGggPSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGg7XG5cblx0XHQvLyBHZXQgYSByZWxheGVkIGJvdW5kaW5nIGJveCB0byBncmFiIGZyb20gdGhlIGNhbnZhc1xuXHRcdHZhciBzdGFydFggPSB0ZXh0UmVuZGVyWDtcblx0XHR2YXIgc3RhcnRZID0gdGV4dFJlbmRlclkgLSBmb250SGVpZ2h0IC0gMjtcblx0XHR2YXIgZW5kWCA9IHN0YXJ0WCArIHdpZHRoICsgdGV4dFJlbmRlclg7XG5cdFx0dmFyIGVuZFkgPSBzdGFydFkgKyBmb250SGVpZ2h0ICsgZm9udEhlaWdodCowLjU7XG5cblxuXG5cdFx0dmFyIGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoc3RhcnRYLHN0YXJ0WSxlbmRYIC0gc3RhcnRYLGVuZFkgLSBzdGFydFkpO1xuXG5cdFx0dmFyIGJvb2xlYW5CaXRtYXAgPSBfLmNyZWF0ZUFycmF5KGltYWdlRGF0YS53aWR0aCxpbWFnZURhdGEuaGVpZ2h0KTtcblx0XHR2YXIgeCA9IDA7XG5cdFx0dmFyIHkgPSAwO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VEYXRhLmRhdGEubGVuZ3RoOyBpKz00KSB7XG5cblx0XHRcdGJvb2xlYW5CaXRtYXBbeF1beV0gPSAgaW1hZ2VEYXRhLmRhdGFbaV0gIT09IDA7XG5cdFx0XHR4Kys7XG5cdFx0XHRpZiAoeCA9PT0gaW1hZ2VEYXRhLndpZHRoKSB7XG5cdFx0XHRcdHggPSAwO1xuXHRcdFx0XHR5Kys7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHR2YXIgbWluWCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1pblkgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhYID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFkgPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRmb3IgKHggPSAwOyB4IDwgYm9vbGVhbkJpdG1hcC5sZW5ndGg7IHgrKykge1xuXHRcdFx0Zm9yICh5ID0gMDsgeSA8IGJvb2xlYW5CaXRtYXBbeF0ubGVuZ3RoOyB5KyspIHtcblx0XHRcdFx0aWYgKGJvb2xlYW5CaXRtYXBbeF1beV0pIHtcblx0XHRcdFx0XHRtaW5YID0gTWF0aC5taW4obWluWCx4KTtcblx0XHRcdFx0XHRtaW5ZID0gTWF0aC5taW4obWluWSx5KTtcblx0XHRcdFx0XHRtYXhYID0gTWF0aC5tYXgobWF4WCx4KTtcblx0XHRcdFx0XHRtYXhZID0gTWF0aC5tYXgobWF4WSx5KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFRyaW0gdGhlIGJvdW5kaW5nIGJveCB0byBqdXN0IHBpeGVscyB0aGF0IGFyZSBmaWxsZWRcblx0XHR2YXIgdHJpbW1lZEJvb2xlYW5CaXRtYXAgPSBfLmNyZWF0ZUFycmF5KG1heFgtbWluWCxtYXhZLW1pblkpO1xuXHRcdGZvciAoeCA9IDA7IHggPCBtYXhYLW1pblg7IHgrKykge1xuXHRcdFx0Zm9yICh5ID0gMDsgeSA8IG1heFktbWluWTsgeSsrKSB7XG5cdFx0XHRcdHRyaW1tZWRCb29sZWFuQml0bWFwW3hdW3ldID0gYm9vbGVhbkJpdG1hcFttaW5YK3hdW21pblkreV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICd5ZWxsb3cnO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3Qoc3RhcnRYLHN0YXJ0WSxlbmRYLXN0YXJ0WCxlbmRZLXN0YXJ0WSk7XG5cdFx0fVxuXG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3JlZCc7XG5cdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclgsdGV4dFJlbmRlclksdGhpcy5fY2FudmFzLndpZHRoLCB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdHZhciBiYldpZHRoID0gbWF4WC1taW5YO1xuXHRcdHZhciBiYkhlaWdodCA9IG1heFktbWluWTtcblx0XHR2YXIgYmJPZmZzZXRYID0gLSh0ZXh0UmVuZGVyWCAtIChzdGFydFggKyBtaW5YICkpO1xuXHRcdHZhciBiYk9mZnNldFkgPSAtKHRleHRSZW5kZXJZIC0gKHN0YXJ0WSArIG1pblkpKTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclggKyBiYk9mZnNldFgsIHRleHRSZW5kZXJZICsgYmJPZmZzZXRZLCBiYldpZHRoLCBiYkhlaWdodCk7XG5cdFx0fVxuXG5cdFx0dmFyIHJlbmRlckluZm8gPSB7XG5cdFx0XHRiYiA6IHtcblx0XHRcdFx0b2Zmc2V0WCA6IGJiT2Zmc2V0WCxcblx0XHRcdFx0b2Zmc2V0WSA6IGJiT2Zmc2V0WSxcblx0XHRcdFx0d2lkdGggOiBiYldpZHRoLFxuXHRcdFx0XHRoZWlnaHQgOiBiYkhlaWdodFxuXHRcdFx0fSxcblx0XHRcdGJpdG1hcCA6IHRyaW1tZWRCb29sZWFuQml0bWFwLFxuXHRcdFx0Zm9udFNpemUgOiBmb250SGVpZ2h0LFxuXHRcdFx0Zm9udEZhbWlseSA6IGZvbnRGYW1pbHlcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH0sXG5cblx0LyoqXG5cdCAqIHRlc3RzIHdoZXRoZXIgYSByZW5kZXJJbmZvIG9iamVjdCBmaXRzIGludG8gYSBnbG9iYWwgYm9vbGVhbiBiaXRtYXBcblx0ICogQHBhcmFtIHJlbmRlckluZm8gLSByZW5kZXJJbmZvIGZvciBhIHdvcmQgKHJldHVybmVkIGZyb20gY3JlYXRlKVxuXHQgKiBAcGFyYW0gYml0bWFwIC0gc2NlbmUgYml0bWFwXG5cdCAqIEByZXR1cm5zIHtib29sZWFufSAtIHRydWUgaWYgd29yZCBmaXRzLCBmYWxzZSBvdGhlcndpc2Vcblx0ICovXG5cdGZpdHMgOiBmdW5jdGlvbihyZW5kZXJJbmZvLGJpdG1hcCkge1xuXG5cdFx0dmFyIHN0YXJ0WCA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WDtcblx0XHR2YXIgc3RhcnRZID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZO1xuXG5cdFx0dmFyIGJpdG1hcFdpZHRoID0gYml0bWFwLmxlbmd0aDtcblx0XHR2YXIgYml0bWFwSGVpZ2h0ID0gYml0bWFwWzBdLmxlbmd0aDtcblxuXHRcdHZhciBoaXRFZGdlID0gc3RhcnRYIDwgMCB8fCBzdGFydFkgPCAwO1xuXHRcdHZhciBoaXRPdGhlciA9IGZhbHNlO1xuXHRcdHZhciBkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByZW5kZXJJbmZvLmJiLndpZHRoICYmICFkb2VzbnRGaXQ7IGkrKykge1xuXHRcdFx0dmFyIHUgPSBzdGFydFggKyBpO1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCByZW5kZXJJbmZvLmJiLmhlaWdodCAmJiAhZG9lc250Rml0OyBqKyspIHtcblx0XHRcdFx0dmFyIHYgPSBzdGFydFkgKyBqO1xuXHRcdFx0XHRpZiAodSA+PSBiaXRtYXBXaWR0aCB8fCB2ID49IGJpdG1hcEhlaWdodCkge1xuXHRcdFx0XHRcdGhpdEVkZ2UgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGJpdG1hcFt1XVt2XSkge1xuXHRcdFx0XHRcdGhpdE90aGVyID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gIWRvZXNudEZpdDtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dEJpdG1hcDsiLCJcbnZhciBVdGlsID0ge1xuXG5cdGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuXHRcdHZhciBrZXksIGksIHNvdXJjZTtcblx0XHRmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHQgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblx0XHQgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuXHRcdFx0aWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHQgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuXHRcdFx0fVxuXHRcdCAgfVxuXHRcdH1cblx0XHRyZXR1cm4gZGVzdDtcblx0fSxcblxuXHRsZXJwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIG1pbiArICh0KihtYXgtbWluKSk7XG5cdH0sXG5cblx0c3RlcCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBNYXRoLnJvdW5kKHRoaXMubGVycChtaW4sbWF4LHQpKTtcblx0fSxcblxuXHQvKipcblx0ICogSGVscGVyIGZvciBjcmVhdGluZyBhbiBhcnJheVxuXHQgKiBAcGFyYW0gbGVuZ3RoXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG5cdGNyZWF0ZUFycmF5IDogZnVuY3Rpb24obGVuZ3RoKSB7XG5cdFx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0XHRpID0gbGVuZ3RoO1xuXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0XHR3aGlsZShpLS0pIHtcblx0XHRcdFx0YXJyW2xlbmd0aC0xIC0gaV0gPSB0aGlzLmNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnI7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(3)
});
