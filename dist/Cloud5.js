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


            var dpr = window.devicePixelRatio;
			var minFontSize = (this.minFontSize || 10) * dpr;
			var maxFontSize = (this.maxFontSize || 200)* dpr;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvc3RvcHdvcmRzLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoZUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFRleHRCaXRtYXAgPSByZXF1aXJlKCcuL3RleHRiaXRtYXAnKTtcblxuXG4vKipcbiAqIExheW91dCBjb25zdHJ1Y3RvclxuICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgTGF5b3V0ID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl93b3JkcyA9IG51bGw7XG5cdHRoaXMuX2JpdG1hcCA9IG51bGw7XG4gICAgdGhpcy5fcmVuZGVySW5mbyA9IG51bGw7XG5cdHRoaXMuX3RleHRCaXRtYXBwZXIgPSBudWxsO1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIHRoZSB0ZXh0IGJpdG1hcHBlciBhbmQgY3JlYXRlIG91ciBib29sZWFuIGJpdG1hcCBvZiB0aGUgc2NlbmVcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9pbml0aWFsaXplIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzID0ge1xuXHRcdFx0d2lkdGggOiB0aGlzLl9jYW52YXMud2lkdGgsXG5cdFx0XHRoZWlnaHQgOiB0aGlzLl9jYW52YXMuaGVpZ2h0XG5cdFx0fTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0dGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHRoaXMuX3RleHRCaXRtYXBwZXIgPSBuZXcgVGV4dEJpdG1hcCh0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcyk7XG4gICAgICAgIHRoaXMuX3JlbmRlckluZm8gPSB7fTtcblx0XHR0aGlzLl9iaXRtYXAgPSBfLmNyZWF0ZUFycmF5KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuX2NhbnZhcy5oZWlnaHQ7IGorKykge1xuXHRcdFx0XHR0aGlzLl9iaXRtYXBbaV1bal0gPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBIaXQgdGVzdCBhIHBvc2l0aW9uIHgseSBmb3IgYSB3b3JkLiAgVE9ETzogIG1ha2UgdGhpcyB3YXkgZmFzdGVyLiAgIEJTUCBUcmVlP1xuICAgICAqIEBwYXJhbSB4IC0geCBvZmZzZXQgaW50byBjYW52YXNcbiAgICAgKiBAcGFyYW0geSAtIHkgb2Zmc2V0IGludG8gY2FudmFzXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaGl0IDogZnVuY3Rpb24oeCx5KSB7XG4gICAgICAgIHZhciB3b3JkID0gbnVsbDtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIC8vIEdldCBhIGxpc3Qgb2YgYm91bmRpbmcgYm94ZXMgdGhhdCB4LHkgYXJlIGluXG4gICAgICAgIHZhciBjb250YWluZWRXb3JkcyA9IE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZpbHRlcihmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG4gICAgICAgICAgICB2YXIgbWluWCA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WDtcbiAgICAgICAgICAgIHZhciBtaW5ZID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZO1xuICAgICAgICAgICAgdmFyIG1heFggPSBtaW5YICsgcmVuZGVySW5mby5iYi53aWR0aDtcbiAgICAgICAgICAgIHZhciBtYXhZID0gbWluWSArIHJlbmRlckluZm8uYmIuaGVpZ2h0O1xuICAgICAgICAgICAgaWYgKG1pblggPD0geCAmJiB4IDw9IG1heFggJiYgbWluWSA8PSB5ICYmIHkgPD0gbWF4WSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNvcnQgYnkgc2l6ZVxuICAgICAgICBjb250YWluZWRXb3Jkcy5zb3J0KGZ1bmN0aW9uKHcxLHcyKSB7XG4gICAgICAgICAgICB2YXIgYjEgPSB0aGF0Ll9yZW5kZXJJbmZvW3cxXS5iYjtcbiAgICAgICAgICAgIHZhciBiMiA9IHRoYXQuX3JlbmRlckluZm9bdzJdLmJiO1xuICAgICAgICAgICAgdmFyIGIxQSA9IGIxLndpZHRoICogYjEuaGVpZ2h0O1xuICAgICAgICAgICAgdmFyIGIyQSA9IGIyLndpZHRoICogYjIuaGVpZ2h0O1xuICAgICAgICAgICAgcmV0dXJuIGIxQSAtIGIyQTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSB3b3JkIHdpdGggdGhlIHNtYWxsZXN0IGJvdW5kaW5nIGJveFxuICAgICAgICBpZiAoY29udGFpbmVkV29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgd29yZCA9IGNvbnRhaW5lZFdvcmRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3b3JkO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzIGZvciB0aGUgbGF5b3V0XG5cdCAqIEBwYXJhbSBjYW52YXNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgdG8gbGF5b3V0XG5cdCAqIEBwYXJhbSB3b3Jkc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHRoaXMuX3dvcmRzID0gd29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdmVyIGhhbmRsZXJcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCB3b3JkT3V0IGhhbmRsZXJcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdG9uV29yZE91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdXQgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHdvcmRDbGljayBoYW5kbGVyXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiBAcmV0dXJucyB7TGF5b3V0fVxuICAgICAqL1xuICAgIG9uV29yZENsaWNrIDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9vbldvcmRDbGljayA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblxuXHQvKipcblx0ICogUGVyZm9ybSB0aGUgbGF5b3V0XG5cdCAqIEByZXR1cm5zIHt7fX1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2luaXRpYWxpemUoKTtcblx0XHR0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cblx0XHQvLyBHZXQgY291bnRzIGZvciBlYWNoIHdvcmQsIHRoZW4gZmlndXJlIG91dCB0aGUgZm9udCBzaXplIGZvciBlYWNoIHdvcmQuICAgQ3JlYXRlIGEgYm9vbGVhbiBiaXRtYXAgYW5kXG5cdFx0Ly8gYm91bmRpbmcgYm94IGZvciBlYWNoIHdvcmRcblx0XHRpZiAodGhpcy5fd29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0dmFyIG1pbkNvdW50ID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRcdHZhciBtYXhDb3VudCA9IDA7XG5cblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdFx0bWluQ291bnQgPSBNYXRoLm1pbih0aGF0Ll93b3Jkc1t3b3JkXSxtaW5Db3VudCk7XG5cdFx0XHRcdG1heENvdW50ID0gTWF0aC5tYXgodGhhdC5fd29yZHNbd29yZF0sbWF4Q291bnQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIFNvcnQgdGhlIHdvcmRzIGJ5IGZyZXF1ZW5jeVxuXHRcdFx0dmFyIHNvcnRlZFdvcmRBcnJheSA9IE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5zb3J0KGZ1bmN0aW9uKHcxLHcyKSB7XG5cdFx0XHRcdHJldHVybiB0aGF0Ll93b3Jkc1t3Ml0tdGhhdC5fd29yZHNbdzFdO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmICh0aGlzLm1heFdvcmRzID4gMCAmJiBzb3J0ZWRXb3JkQXJyYXkubGVuZ3RoID4gdGhpcy5tYXhXb3Jkcykge1xuXHRcdFx0XHRzb3J0ZWRXb3JkQXJyYXkgPSBzb3J0ZWRXb3JkQXJyYXkuc3BsaWNlKDAsdGhpcy5tYXhXb3Jkcyk7XG5cdFx0XHR9XG5cblxuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuXHRcdFx0dmFyIG1pbkZvbnRTaXplID0gKHRoaXMubWluRm9udFNpemUgfHwgMTApICogZHByO1xuXHRcdFx0dmFyIG1heEZvbnRTaXplID0gKHRoaXMubWF4Rm9udFNpemUgfHwgMjAwKSogZHByO1xuXHRcdFx0c29ydGVkV29yZEFycmF5LmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXG5cdFx0XHRcdHZhciB0ID0gKHRoYXQuX3dvcmRzW3dvcmRdIC0gbWluQ291bnQpLyhtYXhDb3VudC1taW5Db3VudCk7XG5cdFx0XHRcdHZhciBmb250U2l6ZSA9Xy5zdGVwKG1pbkZvbnRTaXplLG1heEZvbnRTaXplLHQpO1xuXG5cdFx0XHRcdHZhciBiaXRtYXAgPSB0aGF0Ll90ZXh0Qml0bWFwcGVyLmNyZWF0ZSh3b3JkLGZvbnRTaXplLHRoYXQuZm9udCB8fCAnQ2FsaWJyaScpO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdID0gYml0bWFwO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLmNvdW50ID0gdGhhdC5fd29yZHNbd29yZF07XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0ubWluQ291bnQgPSBtaW5Db3VudDtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5tYXhDb3VudCA9IG1heENvdW50O1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRGVidWcgcm91dGluZSB0byBkcmF3IG91ciB3b3JkcyBhcyB3ZSBsYXkgdGhlbSBvdXRcblx0XHQgKiBAcGFyYW0gY3R4IC0gY2FudmFzIGNvbnRleHRcblx0XHQgKiBAcGFyYW0gdyAtIHdpZHRoXG5cdFx0ICogQHBhcmFtIGggLSBoZWlnaHRcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkZWJ1Z0RyYXdBbGwoY3R4LHcsaCkge1xuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0XHRjdHguZmlsbFJlY3QoMCwwLHcsaCk7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHRPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdFx0dmFyIHdvcmRSZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcblx0XHRcdFx0aWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0XHRjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuXHRcdFx0XHRcdGN0eC5maWxsU3R5bGUgPSAncmVkJztcblx0XHRcdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gTGF5b3V0IGVhY2ggd29yZFxuXHRcdHNvcnRlZFdvcmRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciBwbGFjZWQgPSBmYWxzZTtcblx0XHRcdHZhciBhdHRlbXB0cyA9IDEwMDtcblxuXHRcdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdFx0ZGVidWdEcmF3QWxsKHRoYXQuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpLHRoYXQuX2NhbnZhcy53aWR0aCwgdGhhdC5fY2FudmFzLmhlaWdodCk7XG5cdFx0XHR9XG5cbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcblxuXHRcdFx0Ly8gVHJ5IHBsYWNpbmcgdGhlIHdvcmQgYW5kIHNlZSBpZiBpdCBmaXRzL2hpdHMgYW55dGhpbmcgZWxzZSBhbHJlYWR5IHBsYWNlZFxuXHRcdFx0d2hpbGUgKCFwbGFjZWQgJiYgYXR0ZW1wdHMgPiAwKSB7XG5cdFx0XHRcdHZhciB4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY2FudmFzLndpZHRoKTtcblx0XHRcdFx0dmFyIHkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGF0Ll9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdFx0XHRyZW5kZXJJbmZvLnggPSB4O1xuXHRcdFx0XHRyZW5kZXJJbmZvLnkgPSB5O1xuXG5cdFx0XHRcdC8vIElmIGl0IGZpdHMsIHVwZGF0ZSB0aGUgYml0bWFwIGZvciB0aGUgZW50aXJlIHNjZW5lIHRvIHNheSB0aG9zZSBwaXhlbHMgYXJlIG9jY3VwaWVkXG5cdFx0XHRcdGlmICh0aGF0Ll90ZXh0Qml0bWFwcGVyLmZpdHMocmVuZGVySW5mbyx0aGF0Ll9iaXRtYXApKSB7XG5cdFx0XHRcdFx0cGxhY2VkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdHZhciBiaXRtYXBXaWR0aCA9IHJlbmRlckluZm8uYml0bWFwLmxlbmd0aDtcblx0XHRcdFx0XHR2YXIgYml0bWFwSGVpZ2h0ID0gcmVuZGVySW5mby5iaXRtYXBbMF0ubGVuZ3RoO1xuXG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBiaXRtYXBXaWR0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGJpdG1hcEhlaWdodDsgaisrKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB1ID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYICsgaTtcblx0XHRcdFx0XHRcdFx0dmFyIHYgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFkgKyBqO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChyZW5kZXJJbmZvLmJpdG1hcFtpXVtqXSkge1xuXHRcdFx0XHRcdFx0XHRcdHRoYXQuX2JpdG1hcFt1XVt2XSA9IHdvcmQ7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhdHRlbXB0cy0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIXBsYWNlZCkge1xuXHRcdFx0XHRyZW5kZXJJbmZvLnggPSAtMTtcblx0XHRcdFx0cmVuZGVySW5mby55ID0gLTE7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblxuXHRcdC8vIEJpbmQgaGFuZGxlcnNcblx0XHR2YXIgb3ZlcldvcmQgPSBudWxsO1xuXHRcdGZ1bmN0aW9uIG9uTW91c2VNb3ZlKGUpIHtcblx0XHRcdHZhciB4ID0gZS5vZmZzZXRYO1xuXHRcdFx0dmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB4ICo9IGRwcjtcbiAgICAgICAgICAgIHkgKj0gZHByO1xuXG5cdFx0XHR2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuXHRcdFx0aWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAob3ZlcldvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuX29uV29yZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkT3V0KG92ZXJXb3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdmVyV29yZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvdmVyV29yZCA9IHdvcmQ7XG5cdFx0XHR9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkT3V0KG92ZXJXb3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3ZlcldvcmQgPSBudWxsO1xuICAgICAgICAgICAgfVxuXHRcdH1cblxuICAgICAgICBmdW5jdGlvbiBvbk1vdXNlQ2xpY2soZSkge1xuICAgICAgICAgICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgICAgICAgICB2YXIgeSA9IGUub2Zmc2V0WTtcbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHggKj0gZHByO1xuICAgICAgICAgICAgeSAqPSBkcHI7XG5cbiAgICAgICAgICAgIHZhciB3b3JkID0gdGhhdC5faGl0KHgseSk7XG4gICAgICAgICAgICBpZiAod29yZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRDbGljaykge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9vbldvcmRDbGljayh3b3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXHRcdHRoaXMuX2NhbnZhcy5vbm1vdXNlbW92ZSA9IG9uTW91c2VNb3ZlO1xuICAgICAgICB0aGlzLl9jYW52YXMub25jbGljayA9IG9uTW91c2VDbGljaztcblxuXG5cdFx0cmV0dXJuIHRoYXQuX3JlbmRlckluZm87XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgTG9nZ2VyID0gZnVuY3Rpb24od3JpdGVMb2cpIHtcblx0dGhpcy53cml0ZUxvZyA9IHdyaXRlTG9nO1xuXHR0aGlzLmxvZ3MgPSBbXTtcbn07XG5cbkxvZ2dlci5wcm90b3R5cGUgPSBfLmV4dGVuZChMb2dnZXIucHJvdG90eXBlLCB7XG5cdHB1c2ggOiBmdW5jdGlvbihsYWJlbCkge1xuXHRcdGlmICghdGhpcy53cml0ZUxvZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLmxvZ3MucHVzaCh7XG5cdFx0XHRsYWJlbCA6IGxhYmVsLFxuXHRcdFx0dGltZSA6IERhdGUubm93KClcblx0XHR9KTtcblx0fSxcblx0cG9wIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLndyaXRlTG9nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciB0YWJzID0gdGhpcy5sb2dzLmxlbmd0aDtcblx0XHR2YXIgbG9nID0gdGhpcy5sb2dzLnBvcCgpO1xuXHRcdHZhciBzdHIgPSAnJztcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRhYnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHN0ciArPSAnXFx0Jztcblx0XHR9XG5cdFx0dmFyIGVuZCA9IERhdGUubm93KCk7XG5cdFx0dmFyIGVsYXBzZWQgPSBlbmQgLSBsb2cudGltZTtcblx0XHRzdHIgKz0gbG9nLmxhYmVsICsgJzonICsgZWxhcHNlZCArICdtcyc7XG5cdFx0Y29uc29sZS5sb2coc3RyKTtcblx0fSxcblxuXHRfbWlsbGlzZWNvbmRzVG9TdHJpbmcgOiBmdW5jdGlvbihtaWxsaXNlY29uZHMpIHtcblx0XHR2YXIgb25lSG91ciA9IDM2MDAwMDA7XG5cdFx0dmFyIG9uZU1pbnV0ZSA9IDYwMDAwO1xuXHRcdHZhciBvbmVTZWNvbmQgPSAxMDAwO1xuXHRcdHZhciBzZWNvbmRzID0gMDtcblx0XHR2YXIgbWludXRlcyA9IDA7XG5cdFx0dmFyIGhvdXJzID0gMDtcblx0XHR2YXIgcmVzdWx0O1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVIb3VyKSB7XG5cdFx0XHRob3VycyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lSG91cik7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gaG91cnMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIGhvdXJzICogb25lSG91cikgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZU1pbnV0ZSkge1xuXHRcdFx0bWludXRlcyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lTWludXRlKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBtaW51dGVzID4gMCA/IChtaWxsaXNlY29uZHMgLSBtaW51dGVzICogb25lTWludXRlKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lU2Vjb25kKSB7XG5cdFx0XHRzZWNvbmRzID0gTWF0aC5mbG9vcihtaWxsaXNlY29uZHMgLyBvbmVTZWNvbmQpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IHNlY29uZHMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIHNlY29uZHMgKiBvbmVTZWNvbmQpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKGhvdXJzID4gMCkge1xuXHRcdFx0cmVzdWx0ID0gKGhvdXJzID4gOSA/IGhvdXJzIDogJzAnICsgaG91cnMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAobWludXRlcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAobWludXRlcyA+IDkgPyBtaW51dGVzIDogJzAnICsgbWludXRlcykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAoc2Vjb25kcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAoc2Vjb25kcyA+IDkgPyBzZWNvbmRzIDogJzAnICsgc2Vjb25kcykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID4gMCkge1xuXHRcdFx0cmVzdWx0ICs9IChtaWxsaXNlY29uZHMgPiA5ID8gbWlsbGlzZWNvbmRzIDogJzAnICsgbWlsbGlzZWNvbmRzKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ICs9ICcwMCc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbnZhciBTdG9wd29yZHMgPSByZXF1aXJlKCcuL3N0b3B3b3JkcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5cbnZhciBwZXJmTG9nID0gdHJ1ZTtcblxuLyoqXG4gKiBDbG91ZDUgY29uc3RydWN0b3JcbiAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENsb3VkNSA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblxuXHR0aGlzLl9sb2dnZXIgPSBuZXcgTG9nZ2VyKHBlcmZMb2cpO1xuXG5cdHRoaXMuX3dvcmRzID0ge307XG5cdHRoaXMuX3N0b3BXb3JkcyA9IHt9O1xuXG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cbiAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMgPSBudWxsO1xuICAgIHRoaXMuX2hpZ2hsaWdodGVkV29yZHMgPSBudWxsO1xuXG5cdHRoaXMuX3dpZHRoID0gbnVsbDtcblx0dGhpcy5faGVpZ2h0ID0gbnVsbDtcblx0dGhpcy5fYmFja2dyb3VuZEZpbGwgPSBudWxsO1xuXHR0aGlzLl9vbldvcmRPdmVyID0gbnVsbDtcbiAgICB0aGlzLl9vbldvcmRPdXQgPSBudWxsO1xuICAgIHRoaXMuX29uV29yZENsaWNrID0gbnVsbDtcblx0dGhpcy5fbGF5b3V0ID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuQ2xvdWQ1LnByb3RvdHlwZSA9IF8uZXh0ZW5kKENsb3VkNS5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGNhbnZhcyAtIEhUTUw1IENhbnZhcyBlbGVtZW50XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgdmFyIGNXaWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHZhciBjSGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBjc3NXaWR0aCA9IGNXaWR0aDtcbiAgICAgICAgICAgIHZhciBjc3NIZWlnaHQgPSBjSGVpZ2h0O1xuICAgICAgICAgICAgaWYgKGRwciA+IDEpIHtcbiAgICAgICAgICAgICAgICBjV2lkdGggKj0gZHByO1xuICAgICAgICAgICAgICAgIGNIZWlnaHQgKj0gZHByO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRlZFdvcmRzID0ge307XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cblxuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoID0gY1dpZHRoO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCA9IGNIZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGggPSBjc3NXaWR0aCArICdweCc7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0ID0gY3NzSGVpZ2h0ICsgJ3B4Oydcblx0XHRcdHRoaXMuX3dpZHRoID0gY1dpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY0hlaWdodDtcblxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLndpZHRoID0gdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUudG9wID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5sZWZ0ID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5faGlnaGxpZ2h0Q2FudmFzLHRoaXMuX2NhbnZhcyk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzLiAgIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gd2lkdGggLSB3aWR0aCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKHdpZHRoKSB7XG5cdFx0aWYgKHdpZHRoKSB7XG5cdFx0XHR0aGlzLnJlc2l6ZSh3aWR0aCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMud2lkdGg7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzLiAgSWYgbm90IHNldCwgdXNlcyB0aGUgaW5oZXJpdGVkIHdpZHRoIGZyb20gY2FudmFzXG5cdCAqIEBwYXJhbSBoZWlnaHQgLSBoZWlnaHQgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0aGVpZ2h0IDogZnVuY3Rpb24oaGVpZ2h0KSB7XG5cdFx0aWYgKGhlaWdodCkge1xuXHRcdFx0aWYgKHRoaXMuX2NhbnZhcykge1xuXHRcdFx0XHR0aGlzLnJlc2l6ZSh1bmRlZmluZWQsaGVpZ2h0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5faGVpZ2h0O1xuXHRcdH1cblx0fSxcblxuICAgIHJlc2l6ZSA6IGZ1bmN0aW9uKHcsaCkge1xuICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgIGlmICh3KSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSBkcHIgKiB3O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoID0gdyArICdweCc7XG4gICAgICAgICAgICB0aGlzLl93aWR0aCA9ICBkcHIgKiB3O1xuXG4gICAgICAgICAgICBpZiAodGhpcy5faGlnaGxpZ2h0Q2FudmFzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoID0gdGhpcy5fY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIGlmIChoKSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0ID0gZHByICogaDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQgPSBoICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IGRwciAqIGg7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9oaWdobGlnaHRDYW52YXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSB0ZXh0IGZvciB3b3JkIGNsb3VkIGdlbmVyYXRpb24gZnJvbSBhIGxhcmdlIHN0cmluZ1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nLiAgIEJ5IGRlZmF1bHQsIHdlIHJlbW92ZSBhbGwgcHVuY3R1YXRpb24uICAgQWRkaXRpb25hbCBydWxlcyBjYW4gYmUgYWRkZWQgYnlcblx0ICogY2FsbGluZyB0ZXh0RmlsdGVycyguLi4pXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyEkJVxcXiZcXCo7Ont9PVxcLV9gfigpXS9nLCcnKTtcblx0XHRpZiAodGhpcy5fZmlsdGVycykge1xuXHRcdFx0dGhpcy5fZmlsdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlcikge1xuXHRcdFx0XHRmaWx0ZXJlZCA9IHRleHQucmVwbGFjZShmaWx0ZXIsJycpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHZhciB3b3JkcyA9IGZpbHRlcmVkLnNwbGl0KCcgJyk7XG5cdFx0dGhpcy53b3Jkcyh3b3Jkcyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyBhIGxpc3Qgb2YgdGV4dCBmaWx0ZXJzIChyZWd1bGFyIGV4cHJlc3Npb25zKSB0byBiZSBhcHBsaWVkLiAgIFJ1bGVzIHRoYXQgbWF0Y2ggd2lsbCBiZSBkZWxldGVkXG5cdCAqIGZyb20gdGhlIG9yaWdpbmFsIHRleHQgc3RyaW5nLiAgVGhleSdyZSBhcHBsaWVkIGluIHRoZSBvcmRlciBnaXZlbiB0byB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBmaWx0ZXJzIC0gYW4gYXJyYXkgb2YgcmVndWxhciBleHByZXNzaW9uc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHRleHRGaWx0ZXJzIDogZnVuY3Rpb24oZmlsdGVycykge1xuXHRcdGlmIChmaWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzID0gZmlsdGVycztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZmlsdGVycztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHN0b3Agd29yZHMgKHdvcmRzIHRvIGlnbm9yZSlcblx0ICogQHBhcmFtIHdvcmRzIC0gYW4gYXJyYXkgb2Ygc3RyaW5ncyB0byBpZ25vcmVcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRzdG9wIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHdvcmQpIHtcblx0XHRcdFx0dGhhdC5fc3RvcFdvcmRzW3dvcmQudHJpbSgpLnRvTG93ZXJDYXNlKCldID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9zdG9wV29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdGNsZWFyIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGN0eC5maWxsU3R5bGUgPSB0aGlzLl9iYWNrZ3JvdW5kRmlsbCB8fCAnd2hpdGUnO1xuXHRcdGN0eC5maWxsUmVjdCgwLDAsdGhpcy5fd2lkdGgsdGhpcy5faGVpZ2h0KTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBiYWNrZ3JvdW5kIGZpbGwgc3R5bGVcblx0ICogQHBhcmFtIGZpbGxTdHlsZSAtIGEgdmFsaWQgZmlsbFN0eWxlIHN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGJhY2tncm91bmQgOiBmdW5jdGlvbihmaWxsU3R5bGUpIHtcblx0XHRpZiAoZmlsbFN0eWxlKSB7XG5cdFx0XHR0aGlzLl9iYWNrZ3JvdW5kRmlsbCA9IGZpbGxTdHlsZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYmFja2dyb3VuZEZpbGw7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIHdvcmRzIGZvciB0aGUgd29yZCBjbG91ZFxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiB3b3Jkcy5cblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3b3JkcyA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHRcdGlmIChPYmplY3Qua2V5cyh0aGlzLl9zdG9wV29yZHMpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHR0aGlzLnN0b3AoU3RvcHdvcmRzLkVuZ2xpc2gpO1xuXHRcdFx0fVxuXG5cdFx0XHR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyYXcpIHtcblx0XHRcdFx0dmFyIHdvcmQgPSByYXcudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdGlmICh0aGF0Ll9zdG9wV29yZHNbd29yZF0gfHwgd29yZCA9PT0gJycpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0aWYgKCFjb3VudCkge1xuXHRcdFx0XHRcdGNvdW50ID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHR0aGF0Ll93b3Jkc1t3b3JkXSA9IGNvdW50O1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG4gICAgaGlnaGxpZ2h0IDogZnVuY3Rpb24od29yZHMsY29sb3IpIHtcbiAgICAgICAgaWYgKHdvcmRzIGluc3RhbmNlb2YgQXJyYXkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB3b3JkcyA9IFt3b3Jkc107XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHRoYXQuX2hpZ2hsaWdodGVkV29yZHNbd29yZF0gPSBjb2xvcjtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhpZ2h0bGlnaHQoKTtcbiAgICB9LFxuXG4gICAgdW5oaWdobGlnaHQgOiBmdW5jdGlvbih3b3Jkcykge1xuICAgICAgICBpZiAod29yZHMgaW5zdGFuY2VvZiBBcnJheSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdvcmRzID0gW3dvcmRzXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHdvcmRzLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoYXQuX2hpZ2hsaWdodGVkV29yZHNbd29yZF1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhpZ2h0bGlnaHQoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhpZ2h0bGlnaHQgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgaGlnaGxpZ2h0Q3R4ID0gdGhpcy5faGlnaGxpZ2h0Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGhpZ2hsaWdodEN0eC5jbGVhclJlY3QoMCwwLHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCx0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5faGlnaGxpZ2h0ZWRXb3JkcykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG4gICAgICAgICAgICB2YXIgY2xyID0gdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXTtcbiAgICAgICAgICAgIGlmIChyZW5kZXJJbmZvKSB7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0Q3R4LmZpbGxTdHlsZSA9IGNscjtcbiAgICAgICAgICAgICAgICBoaWdobGlnaHRDdHguZm9udCA9IHJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHJlbmRlckluZm8uZm9udEZhbWlseTtcbiAgICAgICAgICAgICAgICBoaWdobGlnaHRDdHguZmlsbFRleHQod29yZCxyZW5kZXJJbmZvLngscmVuZGVySW5mby55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXHQvKipcblx0ICogU2V0IGEgaGFuZGxlciBmb3IgbW91c2luZyBvdmVyIGEgd29yZFxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IGEgaGFuZGxlciBmb3IgbW91c2luZyBvdXQgb2YgYSB3b3JkXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRvbldvcmRPdXQgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3V0ID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuICAgIC8qKlxuICAgICAqIFNldCBhIGhhbmRsZXIgZm9yIGNsaWNraW5nIG9uIGEgd29yZFxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogQHJldHVybnMge0Nsb3VkNX1cbiAgICAgKi9cbiAgICBvbldvcmRDbGljayA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fb25Xb3JkQ2xpY2sgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgZmFtaWx5IGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gZm9udCAtIGZvbnQgZmFtaWx5IChpZS8gJ0hlbHZldGljYScpXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Zm9udCA6IGZ1bmN0aW9uKGZvbnQpIHtcblx0XHRpZiAoZm9udCkge1xuXHRcdFx0dGhpcy5fZm9udCA9IGZvbnQ7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnQ7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1pbmltdW0gZm9udCBzaXplIGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gbWluRm9udFNpemUgLSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtaW5Gb250U2l6ZSA6IGZ1bmN0aW9uKG1pbkZvbnRTaXplKSB7XG5cdFx0aWYgKG1pbkZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9taW5Gb250U2l6ZSA9IG1pbkZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9taW5Gb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWF4aW11bSBmb250IHNpemUgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBtYXhGb250U2l6ZSAtIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1heEZvbnRTaXplIDogZnVuY3Rpb24obWF4Rm9udFNpemUpIHtcblx0XHRpZiAobWF4Rm9udFNpemUpIHtcblx0XHRcdHRoaXMuX21heEZvbnRTaXplID0gbWF4Rm9udFNpemU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21heEZvbnRTaXplO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtYXhpbXVtIG51bWJlciBvZiB3b3JkcyB0byBiZSByZW5kZXJlZCBpbiB0aGUgY2xvdWRcblx0ICogQHBhcmFtIG1heFdvcmRzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWF4V29yZHMgOiBmdW5jdGlvbihtYXhXb3Jkcykge1xuXHRcdGlmIChtYXhXb3JkcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLl9tYXhXb3JkcyA9IG1heFdvcmRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9tYXhXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyBjb2xvcnNcblx0ICogQHBhcmFtIGNvbG9yIC0gY2FuIGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nOlxuXHQgKiBcdFx0MSkgIEEgZmlsbFN0eWxlIHN0cmluZyAoaWUvICdyZWQnLCdyZ2IoMjU1LDI1NSwwKScsIGV0Yylcblx0ICogXHQgICAgMikgIEFuIGFycmF5IG9mIGZpbGxTdHlsZSBzdHJpbmdzXG5cdCAqIFx0ICAgIDMpICBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIGZpbGxTdHlsZSBzdHJpbmcgZ2l2ZW4gdGhlIHJlbmRlckluZm8gZm9yIHRoZSB3b3JkLiAgaWUvXG5cdCAqIFx0ICAgICAgICAgICAgIGZ1bmN0aW9uKHJlbmRlckluZm8pIHtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB3b3JkID0gcmVuZGVySW5mby53b3JkO1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gcmVuZGVySW5mby5jb3VudDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB4UG9zID0gcmVuZGVySW5mby54O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHlQb3N0ID0gcmVuZGVySW5mby55O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgcmV0dXJuIC8vIGEgZmlsbFN0eWxlIGRlcml2ZWQgZnJvbSBhYm92ZSBwcm9wZXJ0aWVzXG5cdCAqIFx0ICAgICAgICAgICAgICB9XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y29sb3IgOiBmdW5jdGlvbihjb2xvcikge1xuXHRcdGlmIChjb2xvcikge1xuXHRcdFx0dGhpcy5fY29sb3IgPSBjb2xvcjtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29sb3I7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBMYXlvdXQgYW5kIHJlbmRlciB0aGUgd29yZCBjbG91ZCB0byB0aGUgY2FudmFzIHByb3ZpZGVkXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRnZW5lcmF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYXlvdXRBdHRyaWJ1dGVzID0ge307XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fZm9udCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5mb250ID0gdGhpcy5fZm9udDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21pbkZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1pbkZvbnRTaXplID0gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhGb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhGb250U2l6ZSA9IHRoaXMuX21heEZvbnRTaXplO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWF4V29yZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhXb3JkcyA9IHRoaXMuX21heFdvcmRzO1xuXHRcdH1cblxuXHRcdHRoaXMuX2xvZ2dlci5wdXNoKCdMYXlvdXQnKTtcblx0XHR0aGlzLl9sYXlvdXQgPSBuZXcgTGF5b3V0KGxheW91dEF0dHJpYnV0ZXMpXG5cdFx0XHQuY2FudmFzKHRoaXMuX2NhbnZhcylcblx0XHRcdC53b3Jkcyh0aGlzLl93b3Jkcylcblx0XHRcdC5vbldvcmRPdmVyKHRoaXMuX29uV29yZE92ZXIpXG5cdFx0XHQub25Xb3JkT3V0KHRoaXMuX29uV29yZE91dClcbiAgICAgICAgICAgIC5vbldvcmRDbGljayh0aGlzLl9vbldvcmRDbGljayk7XG5cdFx0dGhpcy5fbG9nZ2VyLnBvcCgpO1xuXG5cdFx0dGhpcy5fcmVuZGVySW5mbyA9IHRoaXMuX2xheW91dC5sYXlvdXQoKTtcblxuXHRcdHRoaXMuY2xlYXIoKTtcblxuICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblxuXHRcdHRoaXMuX2xvZ2dlci5wdXNoKCdSZW5kZXInKTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0T2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHR2YXIgd29yZFJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuXHRcdFx0aWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IC0xKSB7XG5cdFx0XHRcdGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG5cblxuXHRcdFx0XHR2YXIgY2xyID0gJ2JsYWNrJztcblx0XHRcdFx0aWYgKHRoYXQuX2NvbG9yKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2NvbG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdHZhciBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGF0Ll9jb2xvci5sZW5ndGgpO1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3JbaWR4XTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuX2NvbG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yKHdvcmRSZW5kZXJJbmZvKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3I7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5maWxsU3R5bGUgPSBjbHI7XG5cdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cblx0XHRcdFx0aWYgKHRoYXQuZGVidWcpIHtcblx0XHRcdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VSZWN0KHdvcmRSZW5kZXJJbmZvLnggKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRYLCB3b3JkUmVuZGVySW5mby55ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WSwgd29yZFJlbmRlckluZm8uYmIud2lkdGgsIHdvcmRSZW5kZXJJbmZvLmJiLmhlaWdodCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLl9sb2dnZXIucG9wKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlcyBpbWFnZSB0byBsb2NhbCBmaWxlc3lzdGVtIHdpdGggdGhlIGZvcm1hdC9maWxlbmFtZSBzcGVjaWZpZWRcbiAgICAgKiBAcGFyYW0gZm9ybWF0IChvcHRpb25hbCkgLSBUaGUgbWltZXR5cGUgdG8gc2F2ZSBhcy4gICBEZWZhdWx0ICdpbWFnZS9wbmcnXG4gICAgICogQHBhcmFtIGZpbGVuYW1lIChvcHRpb25hbCkgLSBUaGUgZmlsZW5hbWUgdG8gc2F2ZSBpdCBhcy4gICAnZG93bmxvYWQnIGJ5IGRlZmF1bHRcbiAgICAgKi9cbiAgICBzYXZlIDogZnVuY3Rpb24oZm9ybWF0LGZpbGVuYW1lKSB7XG4gICAgICAgIHZhciBkYXRhVVJJID0gdGhpcy5fY2FudmFzLnRvRGF0YVVSTChmb3JtYXQgfHwgJ2ltYWdlL3BuZycpO1xuICAgICAgICB2YXIgdXJpQ29udGVudCA9IGRhdGFVUkkuaW5kZXhPZignLCcpO1xuICAgICAgICBkYXRhVVJJID0gZGF0YVVSSS5zdWJzdHJpbmcodXJpQ29udGVudCk7XG4gICAgICAgIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBsaW5rLmhyZWYgPSAnZGF0YTphcHBsaWNhdGlvbi9vY3RldC1zdHJlYW07YmFzZTY0JyArIGRhdGFVUkk7XG4gICAgICAgIGlmIChmaWxlbmFtZSkge1xuICAgICAgICAgICAgbGluay5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGxpbmsuY2xpY2soKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbG91ZDU7XG5tb2R1bGUuZXhwb3J0cy5TdG9wd29yZHMgPSBTdG9wd29yZHM7IiwidmFyIGVuZ2xpc2ggPSBcImEsIGFib3V0LCBhYm92ZSwgYWNyb3NzLCBhZnRlciwgYWdhaW4sIGFnYWluc3QsIGFsbCwgYWxtb3N0LCBhbG9uZSwgYWxvbmcsIGFscmVhZHksIGFsc28sIGFsdGhvdWdoLCBhbHdheXMsIGFtLCBhbW9uZywgYW4sIGFuZCwgYW5vdGhlciwgYW55LCBhbnlib2R5LCBhbnlvbmUsIGFueXRoaW5nLCBhbnl3aGVyZSwgYXJlLCBhcmVhLCBhcmVhcywgYXJlbid0LCBhcm91bmQsIGFzLCBhc2ssIGFza2VkLCBhc2tpbmcsIGFza3MsIGF0LCBhd2F5LCBiLCBiYWNrLCBiYWNrZWQsIGJhY2tpbmcsIGJhY2tzLCBiZSwgYmVjYW1lLCBiZWNhdXNlLCBiZWNvbWUsIGJlY29tZXMsIGJlZW4sIGJlZm9yZSwgYmVnYW4sIGJlaGluZCwgYmVpbmcsIGJlaW5ncywgYmVsb3csIGJlc3QsIGJldHRlciwgYmV0d2VlbiwgYmlnLCBib3RoLCBidXQsIGJ5LCBjLCBjYW1lLCBjYW4sIGNhbm5vdCwgY2FuJ3QsIGNhc2UsIGNhc2VzLCBjZXJ0YWluLCBjZXJ0YWlubHksIGNsZWFyLCBjbGVhcmx5LCBjb21lLCBjb3VsZCwgY291bGRuJ3QsIGQsIGRpZCwgZGlkbid0LCBkaWZmZXIsIGRpZmZlcmVudCwgZGlmZmVyZW50bHksIGRvLCBkb2VzLCBkb2Vzbid0LCBkb2luZywgZG9uZSwgZG9uJ3QsIGRvd24sIGRvd25lZCwgZG93bmluZywgZG93bnMsIGR1cmluZywgZSwgZWFjaCwgZWFybHksIGVpdGhlciwgZW5kLCBlbmRlZCwgZW5kaW5nLCBlbmRzLCBlbm91Z2gsIGV2ZW4sIGV2ZW5seSwgZXZlciwgZXZlcnksIGV2ZXJ5Ym9keSwgZXZlcnlvbmUsIGV2ZXJ5dGhpbmcsIGV2ZXJ5d2hlcmUsIGYsIGZhY2UsIGZhY2VzLCBmYWN0LCBmYWN0cywgZmFyLCBmZWx0LCBmZXcsIGZpbmQsIGZpbmRzLCBmaXJzdCwgZm9yLCBmb3VyLCBmcm9tLCBmdWxsLCBmdWxseSwgZnVydGhlciwgZnVydGhlcmVkLCBmdXJ0aGVyaW5nLCBmdXJ0aGVycywgZywgZ2F2ZSwgZ2VuZXJhbCwgZ2VuZXJhbGx5LCBnZXQsIGdldHMsIGdpdmUsIGdpdmVuLCBnaXZlcywgZ28sIGdvaW5nLCBnb29kLCBnb29kcywgZ290LCBncmVhdCwgZ3JlYXRlciwgZ3JlYXRlc3QsIGdyb3VwLCBncm91cGVkLCBncm91cGluZywgZ3JvdXBzLCBoLCBoYWQsIGhhZG4ndCwgaGFzLCBoYXNuJ3QsIGhhdmUsIGhhdmVuJ3QsIGhhdmluZywgaGUsIGhlJ2QsIGhlJ2xsLCBoZXIsIGhlcmUsIGhlcmUncywgaGVycywgaGVyc2VsZiwgaGUncywgaGlnaCwgaGlnaGVyLCBoaWdoZXN0LCBoaW0sIGhpbXNlbGYsIGhpcywgaG93LCBob3dldmVyLCBob3cncywgaSwgaSdkLCBpZiwgaSdsbCwgaSdtLCBpbXBvcnRhbnQsIGluLCBpbnRlcmVzdCwgaW50ZXJlc3RlZCwgaW50ZXJlc3RpbmcsIGludGVyZXN0cywgaW50bywgaXMsIGlzbid0LCBpdCwgaXRzLCBpdCdzLCBpdHNlbGYsIGkndmUsIGosIGp1c3QsIGssIGtlZXAsIGtlZXBzLCBraW5kLCBrbmV3LCBrbm93LCBrbm93biwga25vd3MsIGwsIGxhcmdlLCBsYXJnZWx5LCBsYXN0LCBsYXRlciwgbGF0ZXN0LCBsZWFzdCwgbGVzcywgbGV0LCBsZXRzLCBsZXQncywgbGlrZSwgbGlrZWx5LCBsb25nLCBsb25nZXIsIGxvbmdlc3QsIG0sIG1hZGUsIG1ha2UsIG1ha2luZywgbWFuLCBtYW55LCBtYXksIG1lLCBtZW1iZXIsIG1lbWJlcnMsIG1lbiwgbWlnaHQsIG1vcmUsIG1vc3QsIG1vc3RseSwgbXIsIG1ycywgbXVjaCwgbXVzdCwgbXVzdG4ndCwgbXksIG15c2VsZiwgbiwgbmVjZXNzYXJ5LCBuZWVkLCBuZWVkZWQsIG5lZWRpbmcsIG5lZWRzLCBuZXZlciwgbmV3LCBuZXdlciwgbmV3ZXN0LCBuZXh0LCBubywgbm9ib2R5LCBub24sIG5vb25lLCBub3IsIG5vdCwgbm90aGluZywgbm93LCBub3doZXJlLCBudW1iZXIsIG51bWJlcnMsIG8sIG9mLCBvZmYsIG9mdGVuLCBvbGQsIG9sZGVyLCBvbGRlc3QsIG9uLCBvbmNlLCBvbmUsIG9ubHksIG9wZW4sIG9wZW5lZCwgb3BlbmluZywgb3BlbnMsIG9yLCBvcmRlciwgb3JkZXJlZCwgb3JkZXJpbmcsIG9yZGVycywgb3RoZXIsIG90aGVycywgb3VnaHQsIG91ciwgb3Vycywgb3Vyc2VsdmVzLCBvdXQsIG92ZXIsIG93biwgcCwgcGFydCwgcGFydGVkLCBwYXJ0aW5nLCBwYXJ0cywgcGVyLCBwZXJoYXBzLCBwbGFjZSwgcGxhY2VzLCBwb2ludCwgcG9pbnRlZCwgcG9pbnRpbmcsIHBvaW50cywgcG9zc2libGUsIHByZXNlbnQsIHByZXNlbnRlZCwgcHJlc2VudGluZywgcHJlc2VudHMsIHByb2JsZW0sIHByb2JsZW1zLCBwdXQsIHB1dHMsIHEsIHF1aXRlLCByLCByYXRoZXIsIHJlYWxseSwgcmlnaHQsIHJvb20sIHJvb21zLCBzLCBzYWlkLCBzYW1lLCBzYXcsIHNheSwgc2F5cywgc2Vjb25kLCBzZWNvbmRzLCBzZWUsIHNlZW0sIHNlZW1lZCwgc2VlbWluZywgc2VlbXMsIHNlZXMsIHNldmVyYWwsIHNoYWxsLCBzaGFuJ3QsIHNoZSwgc2hlJ2QsIHNoZSdsbCwgc2hlJ3MsIHNob3VsZCwgc2hvdWxkbid0LCBzaG93LCBzaG93ZWQsIHNob3dpbmcsIHNob3dzLCBzaWRlLCBzaWRlcywgc2luY2UsIHNtYWxsLCBzbWFsbGVyLCBzbWFsbGVzdCwgc28sIHNvbWUsIHNvbWVib2R5LCBzb21lb25lLCBzb21ldGhpbmcsIHNvbWV3aGVyZSwgc3RhdGUsIHN0YXRlcywgc3RpbGwsIHN1Y2gsIHN1cmUsIHQsIHRha2UsIHRha2VuLCB0aGFuLCB0aGF0LCB0aGF0J3MsIHRoZSwgdGhlaXIsIHRoZWlycywgdGhlbSwgdGhlbXNlbHZlcywgdGhlbiwgdGhlcmUsIHRoZXJlZm9yZSwgdGhlcmUncywgdGhlc2UsIHRoZXksIHRoZXknZCwgdGhleSdsbCwgdGhleSdyZSwgdGhleSd2ZSwgdGhpbmcsIHRoaW5ncywgdGhpbmssIHRoaW5rcywgdGhpcywgdGhvc2UsIHRob3VnaCwgdGhvdWdodCwgdGhvdWdodHMsIHRocmVlLCB0aHJvdWdoLCB0aHVzLCB0bywgdG9kYXksIHRvZ2V0aGVyLCB0b28sIHRvb2ssIHRvd2FyZCwgdHVybiwgdHVybmVkLCB0dXJuaW5nLCB0dXJucywgdHdvLCB1LCB1bmRlciwgdW50aWwsIHVwLCB1cG9uLCB1cywgdXNlLCB1c2VkLCB1c2VzLCB2LCB2ZXJ5LCB3LCB3YW50LCB3YW50ZWQsIHdhbnRpbmcsIHdhbnRzLCB3YXMsIHdhc24ndCwgd2F5LCB3YXlzLCB3ZSwgd2UnZCwgd2VsbCwgd2UnbGwsIHdlbGxzLCB3ZW50LCB3ZXJlLCB3ZSdyZSwgd2VyZW4ndCwgd2UndmUsIHdoYXQsIHdoYXQncywgd2hlbiwgd2hlbidzLCB3aGVyZSwgd2hlcmUncywgd2hldGhlciwgd2hpY2gsIHdoaWxlLCB3aG8sIHdob2xlLCB3aG9tLCB3aG8ncywgd2hvc2UsIHdoeSwgd2h5J3MsIHdpbGwsIHdpdGgsIHdpdGhpbiwgd2l0aG91dCwgd29uJ3QsIHdvcmssIHdvcmtlZCwgd29ya2luZywgd29ya3MsIHdvdWxkLCB3b3VsZG4ndCwgeCwgeSwgeWVhciwgeWVhcnMsIHllcywgeWV0LCB5b3UsIHlvdSdkLCB5b3UnbGwsIHlvdW5nLCB5b3VuZ2VyLCB5b3VuZ2VzdCwgeW91ciwgeW91J3JlLCB5b3VycywgeW91cnNlbGYsIHlvdXJzZWx2ZXMsIHlvdSd2ZSwgelwiO1xudmFyIGVuZ2xpc2hXb3JkcyA9IGVuZ2xpc2guc3BsaXQoJywnKTtcblxuZXhwb3J0cy5FbmdsaXNoID0gZW5nbGlzaFdvcmRzOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxudmFyIFRleHRCaXRtYXAgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NvbnRleHQgPSBudWxsO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xuXG5cdHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHR0aGlzLl9jYW52YXMud2lkdGggPSB0aGlzLndpZHRoIHx8IDY0MDtcblx0dGhpcy5fY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0IHx8IDQ4MDtcblx0dGhpcy5fY29udGV4dCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuXHR9XG5cblx0dGhpcy5fYml0bWFwID0gXy5jcmVhdGVBcnJheSh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuX2NhbnZhcy5oZWlnaHQ7IGorKykge1xuXHRcdFx0dGhpcy5fYml0bWFwW2ldW2pdID0gZmFsc2U7XG5cdFx0fVxuXHR9XG59O1xuXG5UZXh0Qml0bWFwLnByb3RvdHlwZSA9IF8uZXh0ZW5kKFRleHRCaXRtYXAucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhIGJpdG1hcCBmb3IgdGhlIGdpdmVuIHdvcmQvZm9udCBwYWlyLiAgIFJldHVybiBhIHJlbmRlckluZm8gb2JqZWN0IGZvciB0aGlzXG5cdCAqIEBwYXJhbSB0ZXh0IC0gYSBzdHJpbmcgdGhhdCB3ZSB3YW50IHRvIGJpdG1hcCAoaWUvIGEgd29yZClcblx0ICogQHBhcmFtIGZvbnRIZWlnaHQgLSB0aGUgaGVpZ2h0IG9mIHRoZSBmb250XG5cdCAqIEBwYXJhbSBmb250RmFtaWx5IC0gdGhlIGZvbnQgZmFtaWx5XG5cdCAqIEByZXR1cm5zIHt7YmI6IHtvZmZzZXRYOiBudW1iZXIsIG9mZnNldFk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9LCBiaXRtYXA6ICosIGZvbnRTaXplOiAqLCBmb250RmFtaWx5OiAqfX1cblx0ICovXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uKHRleHQsZm9udEhlaWdodCxmb250RmFtaWx5KSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NvbnRleHQ7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgdGV4dFJlbmRlclggPSA1O1xuXHRcdHZhciB0ZXh0UmVuZGVyWSA9IE1hdGguZmxvb3IodGhpcy5fY2FudmFzLmhlaWdodC8yKTtcblxuXHRcdC8vIEZpbGwgdGhlIGZvbnRcblx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRjdHguZm9udCA9IGZvbnRIZWlnaHQgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cdFx0Y3R4LmZpbGxUZXh0KHRleHQsdGV4dFJlbmRlclgsdGV4dFJlbmRlclkpO1xuXG5cdFx0dmFyIHdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuXG5cdFx0Ly8gR2V0IGEgcmVsYXhlZCBib3VuZGluZyBib3ggdG8gZ3JhYiBmcm9tIHRoZSBjYW52YXNcblx0XHR2YXIgc3RhcnRYID0gdGV4dFJlbmRlclg7XG5cdFx0dmFyIHN0YXJ0WSA9IHRleHRSZW5kZXJZIC0gZm9udEhlaWdodCAtIDI7XG5cdFx0dmFyIGVuZFggPSBzdGFydFggKyB3aWR0aCArIHRleHRSZW5kZXJYO1xuXHRcdHZhciBlbmRZID0gc3RhcnRZICsgZm9udEhlaWdodCArIGZvbnRIZWlnaHQqMC41O1xuXG5cblxuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKHN0YXJ0WCxzdGFydFksZW5kWCAtIHN0YXJ0WCxlbmRZIC0gc3RhcnRZKTtcblxuXHRcdHZhciBib29sZWFuQml0bWFwID0gXy5jcmVhdGVBcnJheShpbWFnZURhdGEud2lkdGgsaW1hZ2VEYXRhLmhlaWdodCk7XG5cdFx0dmFyIHggPSAwO1xuXHRcdHZhciB5ID0gMDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlRGF0YS5kYXRhLmxlbmd0aDsgaSs9NCkge1xuXG5cdFx0XHRib29sZWFuQml0bWFwW3hdW3ldID0gIGltYWdlRGF0YS5kYXRhW2ldICE9PSAwO1xuXHRcdFx0eCsrO1xuXHRcdFx0aWYgKHggPT09IGltYWdlRGF0YS53aWR0aCkge1xuXHRcdFx0XHR4ID0gMDtcblx0XHRcdFx0eSsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0dmFyIG1pblggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtaW5ZID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WCA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhZID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IGJvb2xlYW5CaXRtYXAubGVuZ3RoOyB4KyspIHtcblx0XHRcdGZvciAoeSA9IDA7IHkgPCBib29sZWFuQml0bWFwW3hdLmxlbmd0aDsgeSsrKSB7XG5cdFx0XHRcdGlmIChib29sZWFuQml0bWFwW3hdW3ldKSB7XG5cdFx0XHRcdFx0bWluWCA9IE1hdGgubWluKG1pblgseCk7XG5cdFx0XHRcdFx0bWluWSA9IE1hdGgubWluKG1pblkseSk7XG5cdFx0XHRcdFx0bWF4WCA9IE1hdGgubWF4KG1heFgseCk7XG5cdFx0XHRcdFx0bWF4WSA9IE1hdGgubWF4KG1heFkseSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBUcmltIHRoZSBib3VuZGluZyBib3ggdG8ganVzdCBwaXhlbHMgdGhhdCBhcmUgZmlsbGVkXG5cdFx0dmFyIHRyaW1tZWRCb29sZWFuQml0bWFwID0gXy5jcmVhdGVBcnJheShtYXhYLW1pblgsbWF4WS1taW5ZKTtcblx0XHRmb3IgKHggPSAwOyB4IDwgbWF4WC1taW5YOyB4KyspIHtcblx0XHRcdGZvciAoeSA9IDA7IHkgPCBtYXhZLW1pblk7IHkrKykge1xuXHRcdFx0XHR0cmltbWVkQm9vbGVhbkJpdG1hcFt4XVt5XSA9IGJvb2xlYW5CaXRtYXBbbWluWCt4XVttaW5ZK3ldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAneWVsbG93Jztcblx0XHRcdGN0eC5zdHJva2VSZWN0KHN0YXJ0WCxzdGFydFksZW5kWC1zdGFydFgsZW5kWS1zdGFydFkpO1xuXHRcdH1cblxuXHRcdGN0eC5zdHJva2VTdHlsZSA9ICdyZWQnO1xuXHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYLHRleHRSZW5kZXJZLHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgYmJXaWR0aCA9IG1heFgtbWluWDtcblx0XHR2YXIgYmJIZWlnaHQgPSBtYXhZLW1pblk7XG5cdFx0dmFyIGJiT2Zmc2V0WCA9IC0odGV4dFJlbmRlclggLSAoc3RhcnRYICsgbWluWCApKTtcblx0XHR2YXIgYmJPZmZzZXRZID0gLSh0ZXh0UmVuZGVyWSAtIChzdGFydFkgKyBtaW5ZKSk7XG5cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYICsgYmJPZmZzZXRYLCB0ZXh0UmVuZGVyWSArIGJiT2Zmc2V0WSwgYmJXaWR0aCwgYmJIZWlnaHQpO1xuXHRcdH1cblxuXHRcdHZhciByZW5kZXJJbmZvID0ge1xuXHRcdFx0YmIgOiB7XG5cdFx0XHRcdG9mZnNldFggOiBiYk9mZnNldFgsXG5cdFx0XHRcdG9mZnNldFkgOiBiYk9mZnNldFksXG5cdFx0XHRcdHdpZHRoIDogYmJXaWR0aCxcblx0XHRcdFx0aGVpZ2h0IDogYmJIZWlnaHRcblx0XHRcdH0sXG5cdFx0XHRiaXRtYXAgOiB0cmltbWVkQm9vbGVhbkJpdG1hcCxcblx0XHRcdGZvbnRTaXplIDogZm9udEhlaWdodCxcblx0XHRcdGZvbnRGYW1pbHkgOiBmb250RmFtaWx5XG5cdFx0fTtcblxuXHRcdHJldHVybiByZW5kZXJJbmZvO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiB0ZXN0cyB3aGV0aGVyIGEgcmVuZGVySW5mbyBvYmplY3QgZml0cyBpbnRvIGEgZ2xvYmFsIGJvb2xlYW4gYml0bWFwXG5cdCAqIEBwYXJhbSByZW5kZXJJbmZvIC0gcmVuZGVySW5mbyBmb3IgYSB3b3JkIChyZXR1cm5lZCBmcm9tIGNyZWF0ZSlcblx0ICogQHBhcmFtIGJpdG1hcCAtIHNjZW5lIGJpdG1hcFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSB0cnVlIGlmIHdvcmQgZml0cywgZmFsc2Ugb3RoZXJ3aXNlXG5cdCAqL1xuXHRmaXRzIDogZnVuY3Rpb24ocmVuZGVySW5mbyxiaXRtYXApIHtcblxuXHRcdHZhciBzdGFydFggPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFg7XG5cdFx0dmFyIHN0YXJ0WSA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WTtcblxuXHRcdHZhciBiaXRtYXBXaWR0aCA9IGJpdG1hcC5sZW5ndGg7XG5cdFx0dmFyIGJpdG1hcEhlaWdodCA9IGJpdG1hcFswXS5sZW5ndGg7XG5cblx0XHR2YXIgaGl0RWRnZSA9IHN0YXJ0WCA8IDAgfHwgc3RhcnRZIDwgMDtcblx0XHR2YXIgaGl0T3RoZXIgPSBmYWxzZTtcblx0XHR2YXIgZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcmVuZGVySW5mby5iYi53aWR0aCAmJiAhZG9lc250Rml0OyBpKyspIHtcblx0XHRcdHZhciB1ID0gc3RhcnRYICsgaTtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgcmVuZGVySW5mby5iYi5oZWlnaHQgJiYgIWRvZXNudEZpdDsgaisrKSB7XG5cdFx0XHRcdHZhciB2ID0gc3RhcnRZICsgajtcblx0XHRcdFx0aWYgKHUgPj0gYml0bWFwV2lkdGggfHwgdiA+PSBiaXRtYXBIZWlnaHQpIHtcblx0XHRcdFx0XHRoaXRFZGdlID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmIChiaXRtYXBbdV1bdl0pIHtcblx0XHRcdFx0XHRoaXRPdGhlciA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuICFkb2VzbnRGaXQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHRCaXRtYXA7IiwiXG52YXIgVXRpbCA9IHtcblxuXHRleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcblx0XHR2YXIga2V5LCBpLCBzb3VyY2U7XG5cdFx0Zm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0ICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG5cdFx0ICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcblx0XHRcdGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0ICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcblx0XHRcdH1cblx0XHQgIH1cblx0XHR9XG5cdFx0cmV0dXJuIGRlc3Q7XG5cdH0sXG5cblx0bGVycCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBtaW4gKyAodCoobWF4LW1pbikpO1xuXHR9LFxuXG5cdHN0ZXAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gTWF0aC5yb3VuZCh0aGlzLmxlcnAobWluLG1heCx0KSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW4gYXJyYXlcblx0ICogQHBhcmFtIGxlbmd0aFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRjcmVhdGVBcnJheSA6IGZ1bmN0aW9uKGxlbmd0aCkge1xuXHRcdHZhciBhcnIgPSBuZXcgQXJyYXkobGVuZ3RoIHx8IDApLFxuXHRcdFx0aSA9IGxlbmd0aDtcblxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdFx0d2hpbGUoaS0tKSB7XG5cdFx0XHRcdGFycltsZW5ndGgtMSAtIGldID0gdGhpcy5jcmVhdGVBcnJheS5hcHBseSh0aGlzLCBhcmdzKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(3)
});
