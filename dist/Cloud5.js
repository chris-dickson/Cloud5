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

    layouter : function(handler) {
        this._layouter = handler;
        return this;
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
     * Places a word with the given render info into the scene.  Update the
     * scene boolean bitmap
     * @param word - string
     * @param renderInfo - render info from the text bitmapper
     */
    place : function(word,renderInfo) {
        var bitmapWidth = renderInfo.bitmap.length;
        var bitmapHeight = renderInfo.bitmap[0].length;

        for (var i = 0; i < bitmapWidth; i++) {
            for (var j = 0; j < bitmapHeight; j++) {
                var u = renderInfo.x + renderInfo.bb.offsetX + i;
                var v = renderInfo.y + renderInfo.bb.offsetY + j;

                if (renderInfo.bitmap[i][j]) {
                    this._bitmap[u][v] = word;
                }
            }
        }
    },

    /**
     *
     * @param renderInfo
     * @returns {*|boolean}
     */
    fits : function(renderInfo) {
        return this._textBitmapper.fits(renderInfo,this._bitmap)
    },


    randomLayout : function(words,renderInfo,width,height) {
        // Layout each word
        var that = this;
        words.forEach(function(word) {
            var placed = false;
            var attempts = 100;

            if (this.debug) {
                that.debugDrawAll();
            }

            var wordRenderInfo = renderInfo[word];

            // Try placing the word and see if it fits/hits anything else already placed
            while (!placed && attempts > 0) {
                var x = Math.floor(Math.random() * width);
                var y = Math.floor(Math.random() * height);

                wordRenderInfo.x = x;
                wordRenderInfo.y = y;

                // If it fits, update the bitmap for the entire scene to say those pixels are occupied
                if (that.fits(wordRenderInfo)) {
                    placed = true;
                    that.place(word, wordRenderInfo);

                } else {
                    attempts--;
                }
            }
            if (!placed) {
                wordRenderInfo.x = -1;
                wordRenderInfo.y = -1;
            }
        });
    },

    /**
     * Debug routine to draw our words as we lay them out
     * @param ctx - canvas context
     * @param w - width
     * @param h - height
     */
    debugDrawAll : function() {
		var ctx = this._canvas.getContext('2d');
        ctx.clearRect(0,0,this._canvas.width,this._canvas.height);
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

        // Call custom layouter if provided
        if (this._layouter) {
            this._layouter.call(this,sortedWordArray,that._renderInfo,this._canvas.width,this._canvas.height,this.fits,this.place);
        } else {
            this.randomLayout(sortedWordArray, that._renderInfo,this._canvas.width,this._canvas.height);
        }


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
		var filtered = text.replace(/[\.,-\/#!?$%\^&\*;:{}=\-_`~()]/g,'');
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

    layout : function(handler) {
        this._layout = handler;
        return this;
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
            .layouter(this._layout)
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
var french = "alors,au,aucuns,aussi,autre,avant,avec,avoir,bon,car,ce,cela,ces,ceux,chaque,ci,comme,comment,dans,des,du,dedans,dehors,depuis,devrait,doit,donc,dos,début,elle,elles,en,encore,essai,est,et,eu,fait,faites,fois,font,hors,ici,il,ils,je,juste,la,le,les,leur,là,ma,maintenant,mais,mes,mine,moins,mon,mot,même,ni,nommés,notre,nous,ou,où,par,parce,pas,peut,peu,plupart,pour,pourquoi,quand,que,quel,quelle,quelles,quels,qui,sa,sans,ses,seulement,si,sien,son,sont,sous,soyez, sujet,sur,ta,tandis,tellement,tels,tes,ton,tous,tout,trop,très,tu,voient,vont,votre,vous,vu,ça,étaient,état,étions,été,être,de,un,i,qu,d,l,ne,se,une,n,s,m,plus,à,'un,'il,'est,lui,mme,avait,c,-,--,---,me,j,?";
var englishWords = english.split(',');
var frenchWords = french.split(',');

exports.English = englishWords;
exports.French = frenchWords;





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
		renderInfo.x = Math.floor(renderInfo.x);
		renderInfo.y = Math.floor(renderInfo.y);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9zdG9wd29yZHMuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM2VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFRleHRCaXRtYXAgPSByZXF1aXJlKCcuL3RleHRiaXRtYXAnKTtcblxuXG4vKipcbiAqIExheW91dCBjb25zdHJ1Y3RvclxuICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgTGF5b3V0ID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl93b3JkcyA9IG51bGw7XG5cdHRoaXMuX2JpdG1hcCA9IG51bGw7XG4gICAgdGhpcy5fcmVuZGVySW5mbyA9IG51bGw7XG5cdHRoaXMuX3RleHRCaXRtYXBwZXIgPSBudWxsO1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIHRoZSB0ZXh0IGJpdG1hcHBlciBhbmQgY3JlYXRlIG91ciBib29sZWFuIGJpdG1hcCBvZiB0aGUgc2NlbmVcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9pbml0aWFsaXplIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzID0ge1xuXHRcdFx0d2lkdGggOiB0aGlzLl9jYW52YXMud2lkdGgsXG5cdFx0XHRoZWlnaHQgOiB0aGlzLl9jYW52YXMuaGVpZ2h0XG5cdFx0fTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0dGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHRoaXMuX3RleHRCaXRtYXBwZXIgPSBuZXcgVGV4dEJpdG1hcCh0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcyk7XG4gICAgICAgIHRoaXMuX3JlbmRlckluZm8gPSB7fTtcblx0XHR0aGlzLl9iaXRtYXAgPSBfLmNyZWF0ZUFycmF5KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuX2NhbnZhcy5oZWlnaHQ7IGorKykge1xuXHRcdFx0XHR0aGlzLl9iaXRtYXBbaV1bal0gPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBIaXQgdGVzdCBhIHBvc2l0aW9uIHgseSBmb3IgYSB3b3JkLiAgVE9ETzogIG1ha2UgdGhpcyB3YXkgZmFzdGVyLiAgIEJTUCBUcmVlP1xuICAgICAqIEBwYXJhbSB4IC0geCBvZmZzZXQgaW50byBjYW52YXNcbiAgICAgKiBAcGFyYW0geSAtIHkgb2Zmc2V0IGludG8gY2FudmFzXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaGl0IDogZnVuY3Rpb24oeCx5KSB7XG4gICAgICAgIHZhciB3b3JkID0gbnVsbDtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIC8vIEdldCBhIGxpc3Qgb2YgYm91bmRpbmcgYm94ZXMgdGhhdCB4LHkgYXJlIGluXG4gICAgICAgIHZhciBjb250YWluZWRXb3JkcyA9IE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZpbHRlcihmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG4gICAgICAgICAgICB2YXIgbWluWCA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WDtcbiAgICAgICAgICAgIHZhciBtaW5ZID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZO1xuICAgICAgICAgICAgdmFyIG1heFggPSBtaW5YICsgcmVuZGVySW5mby5iYi53aWR0aDtcbiAgICAgICAgICAgIHZhciBtYXhZID0gbWluWSArIHJlbmRlckluZm8uYmIuaGVpZ2h0O1xuICAgICAgICAgICAgaWYgKG1pblggPD0geCAmJiB4IDw9IG1heFggJiYgbWluWSA8PSB5ICYmIHkgPD0gbWF4WSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNvcnQgYnkgc2l6ZVxuICAgICAgICBjb250YWluZWRXb3Jkcy5zb3J0KGZ1bmN0aW9uKHcxLHcyKSB7XG4gICAgICAgICAgICB2YXIgYjEgPSB0aGF0Ll9yZW5kZXJJbmZvW3cxXS5iYjtcbiAgICAgICAgICAgIHZhciBiMiA9IHRoYXQuX3JlbmRlckluZm9bdzJdLmJiO1xuICAgICAgICAgICAgdmFyIGIxQSA9IGIxLndpZHRoICogYjEuaGVpZ2h0O1xuICAgICAgICAgICAgdmFyIGIyQSA9IGIyLndpZHRoICogYjIuaGVpZ2h0O1xuICAgICAgICAgICAgcmV0dXJuIGIxQSAtIGIyQTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSB3b3JkIHdpdGggdGhlIHNtYWxsZXN0IGJvdW5kaW5nIGJveFxuICAgICAgICBpZiAoY29udGFpbmVkV29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgd29yZCA9IGNvbnRhaW5lZFdvcmRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3b3JkO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzIGZvciB0aGUgbGF5b3V0XG5cdCAqIEBwYXJhbSBjYW52YXNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgdG8gbGF5b3V0XG5cdCAqIEBwYXJhbSB3b3Jkc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHRoaXMuX3dvcmRzID0gd29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuICAgIGxheW91dGVyIDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9sYXlvdXRlciA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIFNldCB3b3JkT3ZlciBoYW5kbGVyXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9XG5cdCAqL1xuXHRvbldvcmRPdmVyIDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE92ZXIgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgd29yZE91dCBoYW5kbGVyXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9XG5cdCAqL1xuXHRvbldvcmRPdXQgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3V0ID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuICAgIC8qKlxuICAgICAqIFNldCB3b3JkQ2xpY2sgaGFuZGxlclxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogQHJldHVybnMge0xheW91dH1cbiAgICAgKi9cbiAgICBvbldvcmRDbGljayA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fb25Xb3JkQ2xpY2sgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGxhY2VzIGEgd29yZCB3aXRoIHRoZSBnaXZlbiByZW5kZXIgaW5mbyBpbnRvIHRoZSBzY2VuZS4gIFVwZGF0ZSB0aGVcbiAgICAgKiBzY2VuZSBib29sZWFuIGJpdG1hcFxuICAgICAqIEBwYXJhbSB3b3JkIC0gc3RyaW5nXG4gICAgICogQHBhcmFtIHJlbmRlckluZm8gLSByZW5kZXIgaW5mbyBmcm9tIHRoZSB0ZXh0IGJpdG1hcHBlclxuICAgICAqL1xuICAgIHBsYWNlIDogZnVuY3Rpb24od29yZCxyZW5kZXJJbmZvKSB7XG4gICAgICAgIHZhciBiaXRtYXBXaWR0aCA9IHJlbmRlckluZm8uYml0bWFwLmxlbmd0aDtcbiAgICAgICAgdmFyIGJpdG1hcEhlaWdodCA9IHJlbmRlckluZm8uYml0bWFwWzBdLmxlbmd0aDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJpdG1hcFdpZHRoOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYml0bWFwSGVpZ2h0OyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdSA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WCArIGk7XG4gICAgICAgICAgICAgICAgdmFyIHYgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFkgKyBqO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlbmRlckluZm8uYml0bWFwW2ldW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2JpdG1hcFt1XVt2XSA9IHdvcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlbmRlckluZm9cbiAgICAgKiBAcmV0dXJucyB7Knxib29sZWFufVxuICAgICAqL1xuICAgIGZpdHMgOiBmdW5jdGlvbihyZW5kZXJJbmZvKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90ZXh0Qml0bWFwcGVyLmZpdHMocmVuZGVySW5mbyx0aGlzLl9iaXRtYXApXG4gICAgfSxcblxuXG4gICAgcmFuZG9tTGF5b3V0IDogZnVuY3Rpb24od29yZHMscmVuZGVySW5mbyx3aWR0aCxoZWlnaHQpIHtcbiAgICAgICAgLy8gTGF5b3V0IGVhY2ggd29yZFxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHdvcmRzLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHBsYWNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGF0dGVtcHRzID0gMTAwO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5kZWJ1Zykge1xuICAgICAgICAgICAgICAgIHRoYXQuZGVidWdEcmF3QWxsKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB3b3JkUmVuZGVySW5mbyA9IHJlbmRlckluZm9bd29yZF07XG5cbiAgICAgICAgICAgIC8vIFRyeSBwbGFjaW5nIHRoZSB3b3JkIGFuZCBzZWUgaWYgaXQgZml0cy9oaXRzIGFueXRoaW5nIGVsc2UgYWxyZWFkeSBwbGFjZWRcbiAgICAgICAgICAgIHdoaWxlICghcGxhY2VkICYmIGF0dGVtcHRzID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciB4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogd2lkdGgpO1xuICAgICAgICAgICAgICAgIHZhciB5ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgIHdvcmRSZW5kZXJJbmZvLnggPSB4O1xuICAgICAgICAgICAgICAgIHdvcmRSZW5kZXJJbmZvLnkgPSB5O1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgaXQgZml0cywgdXBkYXRlIHRoZSBiaXRtYXAgZm9yIHRoZSBlbnRpcmUgc2NlbmUgdG8gc2F5IHRob3NlIHBpeGVscyBhcmUgb2NjdXBpZWRcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5maXRzKHdvcmRSZW5kZXJJbmZvKSkge1xuICAgICAgICAgICAgICAgICAgICBwbGFjZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnBsYWNlKHdvcmQsIHdvcmRSZW5kZXJJbmZvKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dGVtcHRzLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFwbGFjZWQpIHtcbiAgICAgICAgICAgICAgICB3b3JkUmVuZGVySW5mby54ID0gLTE7XG4gICAgICAgICAgICAgICAgd29yZFJlbmRlckluZm8ueSA9IC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVidWcgcm91dGluZSB0byBkcmF3IG91ciB3b3JkcyBhcyB3ZSBsYXkgdGhlbSBvdXRcbiAgICAgKiBAcGFyYW0gY3R4IC0gY2FudmFzIGNvbnRleHRcbiAgICAgKiBAcGFyYW0gdyAtIHdpZHRoXG4gICAgICogQHBhcmFtIGggLSBoZWlnaHRcbiAgICAgKi9cbiAgICBkZWJ1Z0RyYXdBbGwgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwwLHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciB3b3JkUmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG4gICAgICAgICAgICBpZiAod29yZFJlbmRlckluZm8ueCAhPT0gdW5kZWZpbmVkICYmIHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gdGhlIGxheW91dFxuXHQgKiBAcmV0dXJucyB7e319XG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9pbml0aWFsaXplKCk7XG5cdFx0dGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXG5cdFx0Ly8gR2V0IGNvdW50cyBmb3IgZWFjaCB3b3JkLCB0aGVuIGZpZ3VyZSBvdXQgdGhlIGZvbnQgc2l6ZSBmb3IgZWFjaCB3b3JkLiAgIENyZWF0ZSBhIGJvb2xlYW4gYml0bWFwIGFuZFxuXHRcdC8vIGJvdW5kaW5nIGJveCBmb3IgZWFjaCB3b3JkXG5cdFx0aWYgKHRoaXMuX3dvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHRcdHZhciBtaW5Db3VudCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0XHR2YXIgbWF4Q291bnQgPSAwO1xuXG5cdFx0XHRPYmplY3Qua2V5cyh0aGlzLl93b3JkcykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHRcdG1pbkNvdW50ID0gTWF0aC5taW4odGhhdC5fd29yZHNbd29yZF0sbWluQ291bnQpO1xuXHRcdFx0XHRtYXhDb3VudCA9IE1hdGgubWF4KHRoYXQuX3dvcmRzW3dvcmRdLG1heENvdW50KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBTb3J0IHRoZSB3b3JkcyBieSBmcmVxdWVuY3lcblx0XHRcdHZhciBzb3J0ZWRXb3JkQXJyYXkgPSBPYmplY3Qua2V5cyh0aGlzLl93b3Jkcykuc29ydChmdW5jdGlvbih3MSx3Mikge1xuXHRcdFx0XHRyZXR1cm4gdGhhdC5fd29yZHNbdzJdLXRoYXQuX3dvcmRzW3cxXTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAodGhpcy5tYXhXb3JkcyA+IDAgJiYgc29ydGVkV29yZEFycmF5Lmxlbmd0aCA+IHRoaXMubWF4V29yZHMpIHtcblx0XHRcdFx0c29ydGVkV29yZEFycmF5ID0gc29ydGVkV29yZEFycmF5LnNwbGljZSgwLHRoaXMubWF4V29yZHMpO1xuXHRcdFx0fVxuXG5cbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcblx0XHRcdHZhciBtaW5Gb250U2l6ZSA9ICh0aGlzLm1pbkZvbnRTaXplIHx8IDEwKSAqIGRwcjtcblx0XHRcdHZhciBtYXhGb250U2l6ZSA9ICh0aGlzLm1heEZvbnRTaXplIHx8IDIwMCkqIGRwcjtcblx0XHRcdHNvcnRlZFdvcmRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblxuXHRcdFx0XHR2YXIgdCA9ICh0aGF0Ll93b3Jkc1t3b3JkXSAtIG1pbkNvdW50KS8obWF4Q291bnQtbWluQ291bnQpO1xuXHRcdFx0XHR2YXIgZm9udFNpemUgPV8uc3RlcChtaW5Gb250U2l6ZSxtYXhGb250U2l6ZSx0KTtcblxuXHRcdFx0XHR2YXIgYml0bWFwID0gdGhhdC5fdGV4dEJpdG1hcHBlci5jcmVhdGUod29yZCxmb250U2l6ZSx0aGF0LmZvbnQgfHwgJ0NhbGlicmknKTtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXSA9IGJpdG1hcDtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5jb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLm1pbkNvdW50ID0gbWluQ291bnQ7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0ubWF4Q291bnQgPSBtYXhDb3VudDtcblx0XHRcdH0pO1xuXHRcdH1cblxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBsYXlvdXRlciBpZiBwcm92aWRlZFxuICAgICAgICBpZiAodGhpcy5fbGF5b3V0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2xheW91dGVyLmNhbGwodGhpcyxzb3J0ZWRXb3JkQXJyYXksdGhhdC5fcmVuZGVySW5mbyx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCx0aGlzLmZpdHMsdGhpcy5wbGFjZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJhbmRvbUxheW91dChzb3J0ZWRXb3JkQXJyYXksIHRoYXQuX3JlbmRlckluZm8sdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuICAgICAgICB9XG5cblxuXHRcdC8vIEJpbmQgaGFuZGxlcnNcblx0XHR2YXIgb3ZlcldvcmQgPSBudWxsO1xuXHRcdGZ1bmN0aW9uIG9uTW91c2VNb3ZlKGUpIHtcblx0XHRcdHZhciB4ID0gZS5vZmZzZXRYO1xuXHRcdFx0dmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB4ICo9IGRwcjtcbiAgICAgICAgICAgIHkgKj0gZHByO1xuXG5cdFx0XHR2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuXHRcdFx0aWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAob3ZlcldvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuX29uV29yZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkT3V0KG92ZXJXb3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdmVyV29yZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvdmVyV29yZCA9IHdvcmQ7XG5cdFx0XHR9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkT3V0KG92ZXJXb3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3ZlcldvcmQgPSBudWxsO1xuICAgICAgICAgICAgfVxuXHRcdH1cblxuICAgICAgICBmdW5jdGlvbiBvbk1vdXNlQ2xpY2soZSkge1xuICAgICAgICAgICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgICAgICAgICB2YXIgeSA9IGUub2Zmc2V0WTtcbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHggKj0gZHByO1xuICAgICAgICAgICAgeSAqPSBkcHI7XG5cbiAgICAgICAgICAgIHZhciB3b3JkID0gdGhhdC5faGl0KHgseSk7XG4gICAgICAgICAgICBpZiAod29yZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRDbGljaykge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9vbldvcmRDbGljayh3b3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXHRcdHRoaXMuX2NhbnZhcy5vbm1vdXNlbW92ZSA9IG9uTW91c2VNb3ZlO1xuICAgICAgICB0aGlzLl9jYW52YXMub25jbGljayA9IG9uTW91c2VDbGljaztcblxuXG5cdFx0cmV0dXJuIHRoYXQuX3JlbmRlckluZm87XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgTG9nZ2VyID0gZnVuY3Rpb24od3JpdGVMb2cpIHtcblx0dGhpcy53cml0ZUxvZyA9IHdyaXRlTG9nO1xuXHR0aGlzLmxvZ3MgPSBbXTtcbn07XG5cbkxvZ2dlci5wcm90b3R5cGUgPSBfLmV4dGVuZChMb2dnZXIucHJvdG90eXBlLCB7XG5cdHB1c2ggOiBmdW5jdGlvbihsYWJlbCkge1xuXHRcdGlmICghdGhpcy53cml0ZUxvZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLmxvZ3MucHVzaCh7XG5cdFx0XHRsYWJlbCA6IGxhYmVsLFxuXHRcdFx0dGltZSA6IERhdGUubm93KClcblx0XHR9KTtcblx0fSxcblx0cG9wIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLndyaXRlTG9nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciB0YWJzID0gdGhpcy5sb2dzLmxlbmd0aDtcblx0XHR2YXIgbG9nID0gdGhpcy5sb2dzLnBvcCgpO1xuXHRcdHZhciBzdHIgPSAnJztcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRhYnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHN0ciArPSAnXFx0Jztcblx0XHR9XG5cdFx0dmFyIGVuZCA9IERhdGUubm93KCk7XG5cdFx0dmFyIGVsYXBzZWQgPSBlbmQgLSBsb2cudGltZTtcblx0XHRzdHIgKz0gbG9nLmxhYmVsICsgJzonICsgZWxhcHNlZCArICdtcyc7XG5cdFx0Y29uc29sZS5sb2coc3RyKTtcblx0fSxcblxuXHRfbWlsbGlzZWNvbmRzVG9TdHJpbmcgOiBmdW5jdGlvbihtaWxsaXNlY29uZHMpIHtcblx0XHR2YXIgb25lSG91ciA9IDM2MDAwMDA7XG5cdFx0dmFyIG9uZU1pbnV0ZSA9IDYwMDAwO1xuXHRcdHZhciBvbmVTZWNvbmQgPSAxMDAwO1xuXHRcdHZhciBzZWNvbmRzID0gMDtcblx0XHR2YXIgbWludXRlcyA9IDA7XG5cdFx0dmFyIGhvdXJzID0gMDtcblx0XHR2YXIgcmVzdWx0O1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVIb3VyKSB7XG5cdFx0XHRob3VycyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lSG91cik7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gaG91cnMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIGhvdXJzICogb25lSG91cikgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZU1pbnV0ZSkge1xuXHRcdFx0bWludXRlcyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lTWludXRlKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBtaW51dGVzID4gMCA/IChtaWxsaXNlY29uZHMgLSBtaW51dGVzICogb25lTWludXRlKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lU2Vjb25kKSB7XG5cdFx0XHRzZWNvbmRzID0gTWF0aC5mbG9vcihtaWxsaXNlY29uZHMgLyBvbmVTZWNvbmQpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IHNlY29uZHMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIHNlY29uZHMgKiBvbmVTZWNvbmQpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKGhvdXJzID4gMCkge1xuXHRcdFx0cmVzdWx0ID0gKGhvdXJzID4gOSA/IGhvdXJzIDogJzAnICsgaG91cnMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAobWludXRlcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAobWludXRlcyA+IDkgPyBtaW51dGVzIDogJzAnICsgbWludXRlcykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAoc2Vjb25kcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAoc2Vjb25kcyA+IDkgPyBzZWNvbmRzIDogJzAnICsgc2Vjb25kcykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID4gMCkge1xuXHRcdFx0cmVzdWx0ICs9IChtaWxsaXNlY29uZHMgPiA5ID8gbWlsbGlzZWNvbmRzIDogJzAnICsgbWlsbGlzZWNvbmRzKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ICs9ICcwMCc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbnZhciBTdG9wd29yZHMgPSByZXF1aXJlKCcuL3N0b3B3b3JkcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5cbnZhciBwZXJmTG9nID0gdHJ1ZTtcblxuLyoqXG4gKiBDbG91ZDUgY29uc3RydWN0b3JcbiAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENsb3VkNSA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblxuXHR0aGlzLl9sb2dnZXIgPSBuZXcgTG9nZ2VyKHBlcmZMb2cpO1xuXG5cdHRoaXMuX3dvcmRzID0ge307XG5cdHRoaXMuX3N0b3BXb3JkcyA9IHt9O1xuXG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cbiAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMgPSBudWxsO1xuICAgIHRoaXMuX2hpZ2hsaWdodGVkV29yZHMgPSBudWxsO1xuXG5cdHRoaXMuX3dpZHRoID0gbnVsbDtcblx0dGhpcy5faGVpZ2h0ID0gbnVsbDtcblx0dGhpcy5fYmFja2dyb3VuZEZpbGwgPSBudWxsO1xuXHR0aGlzLl9vbldvcmRPdmVyID0gbnVsbDtcbiAgICB0aGlzLl9vbldvcmRPdXQgPSBudWxsO1xuICAgIHRoaXMuX29uV29yZENsaWNrID0gbnVsbDtcblx0dGhpcy5fbGF5b3V0ID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuQ2xvdWQ1LnByb3RvdHlwZSA9IF8uZXh0ZW5kKENsb3VkNS5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGNhbnZhcyAtIEhUTUw1IENhbnZhcyBlbGVtZW50XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXG4gICAgICAgICAgICBpZiAoY2FudmFzID09PSB0aGlzLl9jYW52YXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgdmFyIGNXaWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHZhciBjSGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBjc3NXaWR0aCA9IGNXaWR0aDtcbiAgICAgICAgICAgIHZhciBjc3NIZWlnaHQgPSBjSGVpZ2h0O1xuICAgICAgICAgICAgaWYgKGRwciA+IDEpIHtcbiAgICAgICAgICAgICAgICBjV2lkdGggKj0gZHByO1xuICAgICAgICAgICAgICAgIGNIZWlnaHQgKj0gZHByO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRlZFdvcmRzID0ge307XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cblxuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoID0gY1dpZHRoO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCA9IGNIZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGggPSBjc3NXaWR0aCArICdweCc7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0ID0gY3NzSGVpZ2h0ICsgJ3B4Oydcblx0XHRcdHRoaXMuX3dpZHRoID0gY1dpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY0hlaWdodDtcblxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLndpZHRoID0gdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUudG9wID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5sZWZ0ID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5faGlnaGxpZ2h0Q2FudmFzLHRoaXMuX2NhbnZhcyk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzLiAgIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gd2lkdGggLSB3aWR0aCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKHdpZHRoKSB7XG5cdFx0aWYgKHdpZHRoKSB7XG5cdFx0XHR0aGlzLnJlc2l6ZSh3aWR0aCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMud2lkdGg7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzLiAgSWYgbm90IHNldCwgdXNlcyB0aGUgaW5oZXJpdGVkIHdpZHRoIGZyb20gY2FudmFzXG5cdCAqIEBwYXJhbSBoZWlnaHQgLSBoZWlnaHQgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0aGVpZ2h0IDogZnVuY3Rpb24oaGVpZ2h0KSB7XG5cdFx0aWYgKGhlaWdodCkge1xuXHRcdFx0aWYgKHRoaXMuX2NhbnZhcykge1xuXHRcdFx0XHR0aGlzLnJlc2l6ZSh1bmRlZmluZWQsaGVpZ2h0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5faGVpZ2h0O1xuXHRcdH1cblx0fSxcblxuICAgIHJlc2l6ZSA6IGZ1bmN0aW9uKHcsaCkge1xuICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgIGlmICh3KSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSBkcHIgKiB3O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoID0gdyArICdweCc7XG4gICAgICAgICAgICB0aGlzLl93aWR0aCA9ICBkcHIgKiB3O1xuXG4gICAgICAgICAgICBpZiAodGhpcy5faGlnaGxpZ2h0Q2FudmFzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoID0gdGhpcy5fY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIGlmIChoKSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0ID0gZHByICogaDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQgPSBoICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IGRwciAqIGg7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9oaWdobGlnaHRDYW52YXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSB0ZXh0IGZvciB3b3JkIGNsb3VkIGdlbmVyYXRpb24gZnJvbSBhIGxhcmdlIHN0cmluZ1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nLiAgIEJ5IGRlZmF1bHQsIHdlIHJlbW92ZSBhbGwgcHVuY3R1YXRpb24uICAgQWRkaXRpb25hbCBydWxlcyBjYW4gYmUgYWRkZWQgYnlcblx0ICogY2FsbGluZyB0ZXh0RmlsdGVycyguLi4pXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyE/JCVcXF4mXFwqOzp7fT1cXC1fYH4oKV0vZywnJyk7XG5cdFx0aWYgKHRoaXMuX2ZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXIpIHtcblx0XHRcdFx0ZmlsdGVyZWQgPSB0ZXh0LnJlcGxhY2UoZmlsdGVyLCcnKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHR2YXIgd29yZHMgPSBmaWx0ZXJlZC5zcGxpdCgnICcpO1xuXHRcdHRoaXMud29yZHMod29yZHMpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgYSBsaXN0IG9mIHRleHQgZmlsdGVycyAocmVndWxhciBleHByZXNzaW9ucykgdG8gYmUgYXBwbGllZC4gICBSdWxlcyB0aGF0IG1hdGNoIHdpbGwgYmUgZGVsZXRlZFxuXHQgKiBmcm9tIHRoZSBvcmlnaW5hbCB0ZXh0IHN0cmluZy4gIFRoZXkncmUgYXBwbGllZCBpbiB0aGUgb3JkZXIgZ2l2ZW4gdG8gdGhpcyBmdW5jdGlvblxuXHQgKiBAcGFyYW0gZmlsdGVycyAtIGFuIGFycmF5IG9mIHJlZ3VsYXIgZXhwcmVzc2lvbnNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR0ZXh0RmlsdGVycyA6IGZ1bmN0aW9uKGZpbHRlcnMpIHtcblx0XHRpZiAoZmlsdGVycykge1xuXHRcdFx0dGhpcy5fZmlsdGVycyA9IGZpbHRlcnM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZpbHRlcnM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBzdG9wIHdvcmRzICh3b3JkcyB0byBpZ25vcmUpXG5cdCAqIEBwYXJhbSB3b3JkcyAtIGFuIGFycmF5IG9mIHN0cmluZ3MgdG8gaWdub3JlXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0c3RvcCA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uICh3b3JkKSB7XG5cdFx0XHRcdHRoYXQuX3N0b3BXb3Jkc1t3b3JkLnRyaW0oKS50b0xvd2VyQ2FzZSgpXSA9IHRydWU7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fc3RvcFdvcmRzO1xuXHRcdH1cblx0fSxcblxuXHRjbGVhciA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRjdHguZmlsbFN0eWxlID0gdGhpcy5fYmFja2dyb3VuZEZpbGwgfHwgJ3doaXRlJztcblx0XHRjdHguZmlsbFJlY3QoMCwwLHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgYmFja2dyb3VuZCBmaWxsIHN0eWxlXG5cdCAqIEBwYXJhbSBmaWxsU3R5bGUgLSBhIHZhbGlkIGZpbGxTdHlsZSBzdHJpbmdcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRiYWNrZ3JvdW5kIDogZnVuY3Rpb24oZmlsbFN0eWxlKSB7XG5cdFx0aWYgKGZpbGxTdHlsZSkge1xuXHRcdFx0dGhpcy5fYmFja2dyb3VuZEZpbGwgPSBmaWxsU3R5bGU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2JhY2tncm91bmRGaWxsO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3b3JkcyBmb3IgdGhlIHdvcmQgY2xvdWRcblx0ICogQHBhcmFtIHdvcmRzIC0gYW4gYXJyYXkgb2Ygd29yZHMuXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHRpZiAoT2JqZWN0LmtleXModGhpcy5fc3RvcFdvcmRzKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0dGhpcy5zdG9wKFN0b3B3b3Jkcy5FbmdsaXNoKTtcblx0XHRcdH1cblxuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmF3KSB7XG5cdFx0XHRcdHZhciB3b3JkID0gcmF3LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRpZiAodGhhdC5fc3RvcFdvcmRzW3dvcmRdIHx8IHdvcmQgPT09ICcnKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGNvdW50ID0gdGhhdC5fd29yZHNbd29yZF07XG5cdFx0XHRcdGlmICghY291bnQpIHtcblx0XHRcdFx0XHRjb3VudCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0dGhhdC5fd29yZHNbd29yZF0gPSBjb3VudDtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuICAgIGhpZ2hsaWdodCA6IGZ1bmN0aW9uKHdvcmRzLGNvbG9yKSB7XG4gICAgICAgIGlmICh3b3JkcyBpbnN0YW5jZW9mIEFycmF5ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgd29yZHMgPSBbd29yZHNdO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB0aGF0Ll9oaWdobGlnaHRlZFdvcmRzW3dvcmRdID0gY29sb3I7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl91cGRhdGVIaWdodGxpZ2h0KCk7XG4gICAgfSxcblxuICAgIHVuaGlnaGxpZ2h0IDogZnVuY3Rpb24od29yZHMpIHtcbiAgICAgICAgaWYgKHdvcmRzIGluc3RhbmNlb2YgQXJyYXkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB3b3JkcyA9IFt3b3Jkc107XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGF0Ll9oaWdobGlnaHRlZFdvcmRzW3dvcmRdXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl91cGRhdGVIaWdodGxpZ2h0KCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIaWdodGxpZ2h0IDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIGhpZ2hsaWdodEN0eCA9IHRoaXMuX2hpZ2hsaWdodENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBoaWdobGlnaHRDdHguY2xlYXJSZWN0KDAsMCx0aGlzLl9oaWdobGlnaHRDYW52YXMud2lkdGgsdGhpcy5faGlnaGxpZ2h0Q2FudmFzLmhlaWdodCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX2hpZ2hsaWdodGVkV29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuICAgICAgICAgICAgdmFyIGNsciA9IHRoYXQuX2hpZ2hsaWdodGVkV29yZHNbd29yZF07XG4gICAgICAgICAgICBpZiAocmVuZGVySW5mbykge1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5maWxsU3R5bGUgPSBjbHI7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0Q3R4LmZvbnQgPSByZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyByZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0Q3R4LmZpbGxUZXh0KHdvcmQscmVuZGVySW5mby54LHJlbmRlckluZm8ueSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3ZlciBhIHdvcmRcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3V0IG9mIGEgd29yZFxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYSBoYW5kbGVyIGZvciBjbGlja2luZyBvbiBhIHdvcmRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtDbG91ZDV9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGZhbWlseSBmb3Igd29yZHNcblx0ICogQHBhcmFtIGZvbnQgLSBmb250IGZhbWlseSAoaWUvICdIZWx2ZXRpY2EnKVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGZvbnQgOiBmdW5jdGlvbihmb250KSB7XG5cdFx0aWYgKGZvbnQpIHtcblx0XHRcdHRoaXMuX2ZvbnQgPSBmb250O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250O1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtaW5pbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1pbkZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWluRm9udFNpemUgOiBmdW5jdGlvbihtaW5Gb250U2l6ZSkge1xuXHRcdGlmIChtaW5Gb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWluRm9udFNpemUgPSBtaW5Gb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gZm9udCBzaXplIGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gbWF4Rm9udFNpemUgLSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhGb250U2l6ZSA6IGZ1bmN0aW9uKG1heEZvbnRTaXplKSB7XG5cdFx0aWYgKG1heEZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9tYXhGb250U2l6ZSA9IG1heEZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWF4aW11bSBudW1iZXIgb2Ygd29yZHMgdG8gYmUgcmVuZGVyZWQgaW4gdGhlIGNsb3VkXG5cdCAqIEBwYXJhbSBtYXhXb3Jkc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1heFdvcmRzIDogZnVuY3Rpb24obWF4V29yZHMpIHtcblx0XHRpZiAobWF4V29yZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5fbWF4V29yZHMgPSBtYXhXb3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4V29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgY29sb3JzXG5cdCAqIEBwYXJhbSBjb2xvciAtIGNhbiBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcblx0ICogXHRcdDEpICBBIGZpbGxTdHlsZSBzdHJpbmcgKGllLyAncmVkJywncmdiKDI1NSwyNTUsMCknLCBldGMpXG5cdCAqIFx0ICAgIDIpICBBbiBhcnJheSBvZiBmaWxsU3R5bGUgc3RyaW5nc1xuXHQgKiBcdCAgICAzKSAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBmaWxsU3R5bGUgc3RyaW5nIGdpdmVuIHRoZSByZW5kZXJJbmZvIGZvciB0aGUgd29yZC4gIGllL1xuXHQgKiBcdCAgICAgICAgICAgICBmdW5jdGlvbihyZW5kZXJJbmZvKSB7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgd29yZCA9IHJlbmRlckluZm8ud29yZDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IHJlbmRlckluZm8uY291bnQ7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgeFBvcyA9IHJlbmRlckluZm8ueDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB5UG9zdCA9IHJlbmRlckluZm8ueTtcblx0ICogXHQgICAgICAgICAgICAgICAgIHJldHVybiAvLyBhIGZpbGxTdHlsZSBkZXJpdmVkIGZyb20gYWJvdmUgcHJvcGVydGllc1xuXHQgKiBcdCAgICAgICAgICAgICAgfVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNvbG9yIDogZnVuY3Rpb24oY29sb3IpIHtcblx0XHRpZiAoY29sb3IpIHtcblx0XHRcdHRoaXMuX2NvbG9yID0gY29sb3I7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbG9yO1xuXHRcdH1cblx0fSxcblxuICAgIGxheW91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fbGF5b3V0ID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogTGF5b3V0IGFuZCByZW5kZXIgdGhlIHdvcmQgY2xvdWQgdG8gdGhlIGNhbnZhcyBwcm92aWRlZFxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0Z2VuZXJhdGUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGF5b3V0QXR0cmlidXRlcyA9IHt9O1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2ZvbnQpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZm9udCA9IHRoaXMuX2ZvbnQ7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9taW5Gb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5taW5Gb250U2l6ZSA9IHRoaXMuX21pbkZvbnRTaXplO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWF4Rm9udFNpemUpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWF4Rm9udFNpemUgPSB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21heFdvcmRzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWF4V29yZHMgPSB0aGlzLl9tYXhXb3Jkcztcblx0XHR9XG5cblx0XHR0aGlzLl9sb2dnZXIucHVzaCgnTGF5b3V0Jyk7XG5cdFx0dGhpcy5fbGF5b3V0ID0gbmV3IExheW91dChsYXlvdXRBdHRyaWJ1dGVzKVxuXHRcdFx0LmNhbnZhcyh0aGlzLl9jYW52YXMpXG5cdFx0XHQud29yZHModGhpcy5fd29yZHMpXG4gICAgICAgICAgICAubGF5b3V0ZXIodGhpcy5fbGF5b3V0KVxuXHRcdFx0Lm9uV29yZE92ZXIodGhpcy5fb25Xb3JkT3Zlcilcblx0XHRcdC5vbldvcmRPdXQodGhpcy5fb25Xb3JkT3V0KVxuICAgICAgICAgICAgLm9uV29yZENsaWNrKHRoaXMuX29uV29yZENsaWNrKTtcblx0XHR0aGlzLl9sb2dnZXIucG9wKCk7XG5cblx0XHR0aGlzLl9yZW5kZXJJbmZvID0gdGhpcy5fbGF5b3V0LmxheW91dCgpO1xuXG5cdFx0dGhpcy5jbGVhcigpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXG5cdFx0dGhpcy5fbG9nZ2VyLnB1c2goJ1JlbmRlcicpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciB3b3JkUmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG5cdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0Y3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcblxuXG5cdFx0XHRcdHZhciBjbHIgPSAnYmxhY2snO1xuXHRcdFx0XHRpZiAodGhhdC5fY29sb3IpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0dmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NvbG9yLmxlbmd0aCk7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcltpZHhdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3Iod29yZFJlbmRlckluZm8pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9IGNscjtcblx0XHRcdFx0Y3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcblxuXHRcdFx0XHRpZiAodGhhdC5kZWJ1Zykge1xuXHRcdFx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuX2xvZ2dlci5wb3AoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuICAgIC8qKlxuICAgICAqIFNhdmVzIGltYWdlIHRvIGxvY2FsIGZpbGVzeXN0ZW0gd2l0aCB0aGUgZm9ybWF0L2ZpbGVuYW1lIHNwZWNpZmllZFxuICAgICAqIEBwYXJhbSBmb3JtYXQgKG9wdGlvbmFsKSAtIFRoZSBtaW1ldHlwZSB0byBzYXZlIGFzLiAgIERlZmF1bHQgJ2ltYWdlL3BuZydcbiAgICAgKiBAcGFyYW0gZmlsZW5hbWUgKG9wdGlvbmFsKSAtIFRoZSBmaWxlbmFtZSB0byBzYXZlIGl0IGFzLiAgICdkb3dubG9hZCcgYnkgZGVmYXVsdFxuICAgICAqL1xuICAgIHNhdmUgOiBmdW5jdGlvbihmb3JtYXQsZmlsZW5hbWUpIHtcbiAgICAgICAgdmFyIGRhdGFVUkkgPSB0aGlzLl9jYW52YXMudG9EYXRhVVJMKGZvcm1hdCB8fCAnaW1hZ2UvcG5nJyk7XG4gICAgICAgIHZhciB1cmlDb250ZW50ID0gZGF0YVVSSS5pbmRleE9mKCcsJyk7XG4gICAgICAgIGRhdGFVUkkgPSBkYXRhVVJJLnN1YnN0cmluZyh1cmlDb250ZW50KTtcbiAgICAgICAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGxpbmsuaHJlZiA9ICdkYXRhOmFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbTtiYXNlNjQnICsgZGF0YVVSSTtcbiAgICAgICAgaWYgKGZpbGVuYW1lKSB7XG4gICAgICAgICAgICBsaW5rLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgbGluay5jbGljaygpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsb3VkNTtcbm1vZHVsZS5leHBvcnRzLlN0b3B3b3JkcyA9IFN0b3B3b3JkczsiLCJ2YXIgZW5nbGlzaCA9IFwiYSwgYWJvdXQsIGFib3ZlLCBhY3Jvc3MsIGFmdGVyLCBhZ2FpbiwgYWdhaW5zdCwgYWxsLCBhbG1vc3QsIGFsb25lLCBhbG9uZywgYWxyZWFkeSwgYWxzbywgYWx0aG91Z2gsIGFsd2F5cywgYW0sIGFtb25nLCBhbiwgYW5kLCBhbm90aGVyLCBhbnksIGFueWJvZHksIGFueW9uZSwgYW55dGhpbmcsIGFueXdoZXJlLCBhcmUsIGFyZWEsIGFyZWFzLCBhcmVuJ3QsIGFyb3VuZCwgYXMsIGFzaywgYXNrZWQsIGFza2luZywgYXNrcywgYXQsIGF3YXksIGIsIGJhY2ssIGJhY2tlZCwgYmFja2luZywgYmFja3MsIGJlLCBiZWNhbWUsIGJlY2F1c2UsIGJlY29tZSwgYmVjb21lcywgYmVlbiwgYmVmb3JlLCBiZWdhbiwgYmVoaW5kLCBiZWluZywgYmVpbmdzLCBiZWxvdywgYmVzdCwgYmV0dGVyLCBiZXR3ZWVuLCBiaWcsIGJvdGgsIGJ1dCwgYnksIGMsIGNhbWUsIGNhbiwgY2Fubm90LCBjYW4ndCwgY2FzZSwgY2FzZXMsIGNlcnRhaW4sIGNlcnRhaW5seSwgY2xlYXIsIGNsZWFybHksIGNvbWUsIGNvdWxkLCBjb3VsZG4ndCwgZCwgZGlkLCBkaWRuJ3QsIGRpZmZlciwgZGlmZmVyZW50LCBkaWZmZXJlbnRseSwgZG8sIGRvZXMsIGRvZXNuJ3QsIGRvaW5nLCBkb25lLCBkb24ndCwgZG93biwgZG93bmVkLCBkb3duaW5nLCBkb3ducywgZHVyaW5nLCBlLCBlYWNoLCBlYXJseSwgZWl0aGVyLCBlbmQsIGVuZGVkLCBlbmRpbmcsIGVuZHMsIGVub3VnaCwgZXZlbiwgZXZlbmx5LCBldmVyLCBldmVyeSwgZXZlcnlib2R5LCBldmVyeW9uZSwgZXZlcnl0aGluZywgZXZlcnl3aGVyZSwgZiwgZmFjZSwgZmFjZXMsIGZhY3QsIGZhY3RzLCBmYXIsIGZlbHQsIGZldywgZmluZCwgZmluZHMsIGZpcnN0LCBmb3IsIGZvdXIsIGZyb20sIGZ1bGwsIGZ1bGx5LCBmdXJ0aGVyLCBmdXJ0aGVyZWQsIGZ1cnRoZXJpbmcsIGZ1cnRoZXJzLCBnLCBnYXZlLCBnZW5lcmFsLCBnZW5lcmFsbHksIGdldCwgZ2V0cywgZ2l2ZSwgZ2l2ZW4sIGdpdmVzLCBnbywgZ29pbmcsIGdvb2QsIGdvb2RzLCBnb3QsIGdyZWF0LCBncmVhdGVyLCBncmVhdGVzdCwgZ3JvdXAsIGdyb3VwZWQsIGdyb3VwaW5nLCBncm91cHMsIGgsIGhhZCwgaGFkbid0LCBoYXMsIGhhc24ndCwgaGF2ZSwgaGF2ZW4ndCwgaGF2aW5nLCBoZSwgaGUnZCwgaGUnbGwsIGhlciwgaGVyZSwgaGVyZSdzLCBoZXJzLCBoZXJzZWxmLCBoZSdzLCBoaWdoLCBoaWdoZXIsIGhpZ2hlc3QsIGhpbSwgaGltc2VsZiwgaGlzLCBob3csIGhvd2V2ZXIsIGhvdydzLCBpLCBpJ2QsIGlmLCBpJ2xsLCBpJ20sIGltcG9ydGFudCwgaW4sIGludGVyZXN0LCBpbnRlcmVzdGVkLCBpbnRlcmVzdGluZywgaW50ZXJlc3RzLCBpbnRvLCBpcywgaXNuJ3QsIGl0LCBpdHMsIGl0J3MsIGl0c2VsZiwgaSd2ZSwgaiwganVzdCwgaywga2VlcCwga2VlcHMsIGtpbmQsIGtuZXcsIGtub3csIGtub3duLCBrbm93cywgbCwgbGFyZ2UsIGxhcmdlbHksIGxhc3QsIGxhdGVyLCBsYXRlc3QsIGxlYXN0LCBsZXNzLCBsZXQsIGxldHMsIGxldCdzLCBsaWtlLCBsaWtlbHksIGxvbmcsIGxvbmdlciwgbG9uZ2VzdCwgbSwgbWFkZSwgbWFrZSwgbWFraW5nLCBtYW4sIG1hbnksIG1heSwgbWUsIG1lbWJlciwgbWVtYmVycywgbWVuLCBtaWdodCwgbW9yZSwgbW9zdCwgbW9zdGx5LCBtciwgbXJzLCBtdWNoLCBtdXN0LCBtdXN0bid0LCBteSwgbXlzZWxmLCBuLCBuZWNlc3NhcnksIG5lZWQsIG5lZWRlZCwgbmVlZGluZywgbmVlZHMsIG5ldmVyLCBuZXcsIG5ld2VyLCBuZXdlc3QsIG5leHQsIG5vLCBub2JvZHksIG5vbiwgbm9vbmUsIG5vciwgbm90LCBub3RoaW5nLCBub3csIG5vd2hlcmUsIG51bWJlciwgbnVtYmVycywgbywgb2YsIG9mZiwgb2Z0ZW4sIG9sZCwgb2xkZXIsIG9sZGVzdCwgb24sIG9uY2UsIG9uZSwgb25seSwgb3Blbiwgb3BlbmVkLCBvcGVuaW5nLCBvcGVucywgb3IsIG9yZGVyLCBvcmRlcmVkLCBvcmRlcmluZywgb3JkZXJzLCBvdGhlciwgb3RoZXJzLCBvdWdodCwgb3VyLCBvdXJzLCBvdXJzZWx2ZXMsIG91dCwgb3Zlciwgb3duLCBwLCBwYXJ0LCBwYXJ0ZWQsIHBhcnRpbmcsIHBhcnRzLCBwZXIsIHBlcmhhcHMsIHBsYWNlLCBwbGFjZXMsIHBvaW50LCBwb2ludGVkLCBwb2ludGluZywgcG9pbnRzLCBwb3NzaWJsZSwgcHJlc2VudCwgcHJlc2VudGVkLCBwcmVzZW50aW5nLCBwcmVzZW50cywgcHJvYmxlbSwgcHJvYmxlbXMsIHB1dCwgcHV0cywgcSwgcXVpdGUsIHIsIHJhdGhlciwgcmVhbGx5LCByaWdodCwgcm9vbSwgcm9vbXMsIHMsIHNhaWQsIHNhbWUsIHNhdywgc2F5LCBzYXlzLCBzZWNvbmQsIHNlY29uZHMsIHNlZSwgc2VlbSwgc2VlbWVkLCBzZWVtaW5nLCBzZWVtcywgc2Vlcywgc2V2ZXJhbCwgc2hhbGwsIHNoYW4ndCwgc2hlLCBzaGUnZCwgc2hlJ2xsLCBzaGUncywgc2hvdWxkLCBzaG91bGRuJ3QsIHNob3csIHNob3dlZCwgc2hvd2luZywgc2hvd3MsIHNpZGUsIHNpZGVzLCBzaW5jZSwgc21hbGwsIHNtYWxsZXIsIHNtYWxsZXN0LCBzbywgc29tZSwgc29tZWJvZHksIHNvbWVvbmUsIHNvbWV0aGluZywgc29tZXdoZXJlLCBzdGF0ZSwgc3RhdGVzLCBzdGlsbCwgc3VjaCwgc3VyZSwgdCwgdGFrZSwgdGFrZW4sIHRoYW4sIHRoYXQsIHRoYXQncywgdGhlLCB0aGVpciwgdGhlaXJzLCB0aGVtLCB0aGVtc2VsdmVzLCB0aGVuLCB0aGVyZSwgdGhlcmVmb3JlLCB0aGVyZSdzLCB0aGVzZSwgdGhleSwgdGhleSdkLCB0aGV5J2xsLCB0aGV5J3JlLCB0aGV5J3ZlLCB0aGluZywgdGhpbmdzLCB0aGluaywgdGhpbmtzLCB0aGlzLCB0aG9zZSwgdGhvdWdoLCB0aG91Z2h0LCB0aG91Z2h0cywgdGhyZWUsIHRocm91Z2gsIHRodXMsIHRvLCB0b2RheSwgdG9nZXRoZXIsIHRvbywgdG9vaywgdG93YXJkLCB0dXJuLCB0dXJuZWQsIHR1cm5pbmcsIHR1cm5zLCB0d28sIHUsIHVuZGVyLCB1bnRpbCwgdXAsIHVwb24sIHVzLCB1c2UsIHVzZWQsIHVzZXMsIHYsIHZlcnksIHcsIHdhbnQsIHdhbnRlZCwgd2FudGluZywgd2FudHMsIHdhcywgd2Fzbid0LCB3YXksIHdheXMsIHdlLCB3ZSdkLCB3ZWxsLCB3ZSdsbCwgd2VsbHMsIHdlbnQsIHdlcmUsIHdlJ3JlLCB3ZXJlbid0LCB3ZSd2ZSwgd2hhdCwgd2hhdCdzLCB3aGVuLCB3aGVuJ3MsIHdoZXJlLCB3aGVyZSdzLCB3aGV0aGVyLCB3aGljaCwgd2hpbGUsIHdobywgd2hvbGUsIHdob20sIHdobydzLCB3aG9zZSwgd2h5LCB3aHkncywgd2lsbCwgd2l0aCwgd2l0aGluLCB3aXRob3V0LCB3b24ndCwgd29yaywgd29ya2VkLCB3b3JraW5nLCB3b3Jrcywgd291bGQsIHdvdWxkbid0LCB4LCB5LCB5ZWFyLCB5ZWFycywgeWVzLCB5ZXQsIHlvdSwgeW91J2QsIHlvdSdsbCwgeW91bmcsIHlvdW5nZXIsIHlvdW5nZXN0LCB5b3VyLCB5b3UncmUsIHlvdXJzLCB5b3Vyc2VsZiwgeW91cnNlbHZlcywgeW91J3ZlLCB6XCI7XG52YXIgZnJlbmNoID0gXCJhbG9ycyxhdSxhdWN1bnMsYXVzc2ksYXV0cmUsYXZhbnQsYXZlYyxhdm9pcixib24sY2FyLGNlLGNlbGEsY2VzLGNldXgsY2hhcXVlLGNpLGNvbW1lLGNvbW1lbnQsZGFucyxkZXMsZHUsZGVkYW5zLGRlaG9ycyxkZXB1aXMsZGV2cmFpdCxkb2l0LGRvbmMsZG9zLGTDqWJ1dCxlbGxlLGVsbGVzLGVuLGVuY29yZSxlc3NhaSxlc3QsZXQsZXUsZmFpdCxmYWl0ZXMsZm9pcyxmb250LGhvcnMsaWNpLGlsLGlscyxqZSxqdXN0ZSxsYSxsZSxsZXMsbGV1cixsw6AsbWEsbWFpbnRlbmFudCxtYWlzLG1lcyxtaW5lLG1vaW5zLG1vbixtb3QsbcOqbWUsbmksbm9tbcOpcyxub3RyZSxub3VzLG91LG/DuSxwYXIscGFyY2UscGFzLHBldXQscGV1LHBsdXBhcnQscG91cixwb3VycXVvaSxxdWFuZCxxdWUscXVlbCxxdWVsbGUscXVlbGxlcyxxdWVscyxxdWksc2Esc2FucyxzZXMsc2V1bGVtZW50LHNpLHNpZW4sc29uLHNvbnQsc291cyxzb3lleiwgc3VqZXQsc3VyLHRhLHRhbmRpcyx0ZWxsZW1lbnQsdGVscyx0ZXMsdG9uLHRvdXMsdG91dCx0cm9wLHRyw6hzLHR1LHZvaWVudCx2b250LHZvdHJlLHZvdXMsdnUsw6dhLMOpdGFpZW50LMOpdGF0LMOpdGlvbnMsw6l0w6ksw6p0cmUsZGUsdW4saSxxdSxkLGwsbmUsc2UsdW5lLG4scyxtLHBsdXMsw6AsJ3VuLCdpbCwnZXN0LGx1aSxtbWUsYXZhaXQsYywtLC0tLC0tLSxtZSxqLD9cIjtcbnZhciBlbmdsaXNoV29yZHMgPSBlbmdsaXNoLnNwbGl0KCcsJyk7XG52YXIgZnJlbmNoV29yZHMgPSBmcmVuY2guc3BsaXQoJywnKTtcblxuZXhwb3J0cy5FbmdsaXNoID0gZW5nbGlzaFdvcmRzO1xuZXhwb3J0cy5GcmVuY2ggPSBmcmVuY2hXb3JkcztcblxuXG5cblxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG52YXIgVGV4dEJpdG1hcCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY29udGV4dCA9IG51bGw7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG5cblx0dGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdHRoaXMuX2NhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggfHwgNjQwO1xuXHR0aGlzLl9jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgNDgwO1xuXHR0aGlzLl9jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG5cdH1cblxuXHR0aGlzLl9iaXRtYXAgPSBfLmNyZWF0ZUFycmF5KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jYW52YXMud2lkdGg7IGkrKykge1xuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHR0aGlzLl9iaXRtYXBbaV1bal0gPSBmYWxzZTtcblx0XHR9XG5cdH1cbn07XG5cblRleHRCaXRtYXAucHJvdG90eXBlID0gXy5leHRlbmQoVGV4dEJpdG1hcC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogQ3JlYXRlIGEgYml0bWFwIGZvciB0aGUgZ2l2ZW4gd29yZC9mb250IHBhaXIuICAgUmV0dXJuIGEgcmVuZGVySW5mbyBvYmplY3QgZm9yIHRoaXNcblx0ICogQHBhcmFtIHRleHQgLSBhIHN0cmluZyB0aGF0IHdlIHdhbnQgdG8gYml0bWFwIChpZS8gYSB3b3JkKVxuXHQgKiBAcGFyYW0gZm9udEhlaWdodCAtIHRoZSBoZWlnaHQgb2YgdGhlIGZvbnRcblx0ICogQHBhcmFtIGZvbnRGYW1pbHkgLSB0aGUgZm9udCBmYW1pbHlcblx0ICogQHJldHVybnMge3tiYjoge29mZnNldFg6IG51bWJlciwgb2Zmc2V0WTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcn0sIGJpdG1hcDogKiwgZm9udFNpemU6ICosIGZvbnRGYW1pbHk6ICp9fVxuXHQgKi9cblx0Y3JlYXRlIDogZnVuY3Rpb24odGV4dCxmb250SGVpZ2h0LGZvbnRGYW1pbHkpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY29udGV4dDtcblx0XHRjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcblx0XHRjdHguZmlsbFJlY3QoMCwwLHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdHZhciB0ZXh0UmVuZGVyWCA9IDU7XG5cdFx0dmFyIHRleHRSZW5kZXJZID0gTWF0aC5mbG9vcih0aGlzLl9jYW52YXMuaGVpZ2h0LzIpO1xuXG5cdFx0Ly8gRmlsbCB0aGUgZm9udFxuXHRcdGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGN0eC5mb250ID0gZm9udEhlaWdodCArICdweCAnICsgZm9udEZhbWlseTtcblx0XHRjdHguZmlsbFRleHQodGV4dCx0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSk7XG5cblx0XHR2YXIgd2lkdGggPSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGg7XG5cblx0XHQvLyBHZXQgYSByZWxheGVkIGJvdW5kaW5nIGJveCB0byBncmFiIGZyb20gdGhlIGNhbnZhc1xuXHRcdHZhciBzdGFydFggPSB0ZXh0UmVuZGVyWDtcblx0XHR2YXIgc3RhcnRZID0gdGV4dFJlbmRlclkgLSBmb250SGVpZ2h0IC0gMjtcblx0XHR2YXIgZW5kWCA9IHN0YXJ0WCArIHdpZHRoICsgdGV4dFJlbmRlclg7XG5cdFx0dmFyIGVuZFkgPSBzdGFydFkgKyBmb250SGVpZ2h0ICsgZm9udEhlaWdodCowLjU7XG5cblxuXG5cdFx0dmFyIGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoc3RhcnRYLHN0YXJ0WSxlbmRYIC0gc3RhcnRYLGVuZFkgLSBzdGFydFkpO1xuXG5cdFx0dmFyIGJvb2xlYW5CaXRtYXAgPSBfLmNyZWF0ZUFycmF5KGltYWdlRGF0YS53aWR0aCxpbWFnZURhdGEuaGVpZ2h0KTtcblx0XHR2YXIgeCA9IDA7XG5cdFx0dmFyIHkgPSAwO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VEYXRhLmRhdGEubGVuZ3RoOyBpKz00KSB7XG5cblx0XHRcdGJvb2xlYW5CaXRtYXBbeF1beV0gPSAgaW1hZ2VEYXRhLmRhdGFbaV0gIT09IDA7XG5cdFx0XHR4Kys7XG5cdFx0XHRpZiAoeCA9PT0gaW1hZ2VEYXRhLndpZHRoKSB7XG5cdFx0XHRcdHggPSAwO1xuXHRcdFx0XHR5Kys7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHR2YXIgbWluWCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1pblkgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhYID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFkgPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRmb3IgKHggPSAwOyB4IDwgYm9vbGVhbkJpdG1hcC5sZW5ndGg7IHgrKykge1xuXHRcdFx0Zm9yICh5ID0gMDsgeSA8IGJvb2xlYW5CaXRtYXBbeF0ubGVuZ3RoOyB5KyspIHtcblx0XHRcdFx0aWYgKGJvb2xlYW5CaXRtYXBbeF1beV0pIHtcblx0XHRcdFx0XHRtaW5YID0gTWF0aC5taW4obWluWCx4KTtcblx0XHRcdFx0XHRtaW5ZID0gTWF0aC5taW4obWluWSx5KTtcblx0XHRcdFx0XHRtYXhYID0gTWF0aC5tYXgobWF4WCx4KTtcblx0XHRcdFx0XHRtYXhZID0gTWF0aC5tYXgobWF4WSx5KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFRyaW0gdGhlIGJvdW5kaW5nIGJveCB0byBqdXN0IHBpeGVscyB0aGF0IGFyZSBmaWxsZWRcblx0XHR2YXIgdHJpbW1lZEJvb2xlYW5CaXRtYXAgPSBfLmNyZWF0ZUFycmF5KG1heFgtbWluWCxtYXhZLW1pblkpO1xuXHRcdGZvciAoeCA9IDA7IHggPCBtYXhYLW1pblg7IHgrKykge1xuXHRcdFx0Zm9yICh5ID0gMDsgeSA8IG1heFktbWluWTsgeSsrKSB7XG5cdFx0XHRcdHRyaW1tZWRCb29sZWFuQml0bWFwW3hdW3ldID0gYm9vbGVhbkJpdG1hcFttaW5YK3hdW21pblkreV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICd5ZWxsb3cnO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3Qoc3RhcnRYLHN0YXJ0WSxlbmRYLXN0YXJ0WCxlbmRZLXN0YXJ0WSk7XG5cdFx0fVxuXG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3JlZCc7XG5cdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclgsdGV4dFJlbmRlclksdGhpcy5fY2FudmFzLndpZHRoLCB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdHZhciBiYldpZHRoID0gbWF4WC1taW5YO1xuXHRcdHZhciBiYkhlaWdodCA9IG1heFktbWluWTtcblx0XHR2YXIgYmJPZmZzZXRYID0gLSh0ZXh0UmVuZGVyWCAtIChzdGFydFggKyBtaW5YICkpO1xuXHRcdHZhciBiYk9mZnNldFkgPSAtKHRleHRSZW5kZXJZIC0gKHN0YXJ0WSArIG1pblkpKTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclggKyBiYk9mZnNldFgsIHRleHRSZW5kZXJZICsgYmJPZmZzZXRZLCBiYldpZHRoLCBiYkhlaWdodCk7XG5cdFx0fVxuXG5cdFx0dmFyIHJlbmRlckluZm8gPSB7XG5cdFx0XHRiYiA6IHtcblx0XHRcdFx0b2Zmc2V0WCA6IGJiT2Zmc2V0WCxcblx0XHRcdFx0b2Zmc2V0WSA6IGJiT2Zmc2V0WSxcblx0XHRcdFx0d2lkdGggOiBiYldpZHRoLFxuXHRcdFx0XHRoZWlnaHQgOiBiYkhlaWdodFxuXHRcdFx0fSxcblx0XHRcdGJpdG1hcCA6IHRyaW1tZWRCb29sZWFuQml0bWFwLFxuXHRcdFx0Zm9udFNpemUgOiBmb250SGVpZ2h0LFxuXHRcdFx0Zm9udEZhbWlseSA6IGZvbnRGYW1pbHlcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH0sXG5cblx0LyoqXG5cdCAqIHRlc3RzIHdoZXRoZXIgYSByZW5kZXJJbmZvIG9iamVjdCBmaXRzIGludG8gYSBnbG9iYWwgYm9vbGVhbiBiaXRtYXBcblx0ICogQHBhcmFtIHJlbmRlckluZm8gLSByZW5kZXJJbmZvIGZvciBhIHdvcmQgKHJldHVybmVkIGZyb20gY3JlYXRlKVxuXHQgKiBAcGFyYW0gYml0bWFwIC0gc2NlbmUgYml0bWFwXG5cdCAqIEByZXR1cm5zIHtib29sZWFufSAtIHRydWUgaWYgd29yZCBmaXRzLCBmYWxzZSBvdGhlcndpc2Vcblx0ICovXG5cdGZpdHMgOiBmdW5jdGlvbihyZW5kZXJJbmZvLGJpdG1hcCkge1xuXHRcdHJlbmRlckluZm8ueCA9IE1hdGguZmxvb3IocmVuZGVySW5mby54KTtcblx0XHRyZW5kZXJJbmZvLnkgPSBNYXRoLmZsb29yKHJlbmRlckluZm8ueSk7XG5cblx0XHR2YXIgc3RhcnRYID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuXHRcdHZhciBzdGFydFkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG5cblx0XHR2YXIgYml0bWFwV2lkdGggPSBiaXRtYXAubGVuZ3RoO1xuXHRcdHZhciBiaXRtYXBIZWlnaHQgPSBiaXRtYXBbMF0ubGVuZ3RoO1xuXG5cdFx0dmFyIGhpdEVkZ2UgPSBzdGFydFggPCAwIHx8IHN0YXJ0WSA8IDA7XG5cdFx0dmFyIGhpdE90aGVyID0gZmFsc2U7XG5cdFx0dmFyIGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJlbmRlckluZm8uYmIud2lkdGggJiYgIWRvZXNudEZpdDsgaSsrKSB7XG5cdFx0XHR2YXIgdSA9IHN0YXJ0WCArIGk7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHJlbmRlckluZm8uYmIuaGVpZ2h0ICYmICFkb2VzbnRGaXQ7IGorKykge1xuXHRcdFx0XHR2YXIgdiA9IHN0YXJ0WSArIGo7XG5cdFx0XHRcdGlmICh1ID49IGJpdG1hcFdpZHRoIHx8IHYgPj0gYml0bWFwSGVpZ2h0KSB7XG5cdFx0XHRcdFx0aGl0RWRnZSA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoYml0bWFwW3VdW3ZdKSB7XG5cdFx0XHRcdFx0aGl0T3RoZXIgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiAhZG9lc250Rml0O1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0Qml0bWFwOyIsIlxudmFyIFV0aWwgPSB7XG5cblx0ZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG5cdFx0dmFyIGtleSwgaSwgc291cmNlO1xuXHRcdGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdCAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuXHRcdCAgZm9yIChrZXkgaW4gc291cmNlKSB7XG5cdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdCAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG5cdFx0XHR9XG5cdFx0ICB9XG5cdFx0fVxuXHRcdHJldHVybiBkZXN0O1xuXHR9LFxuXG5cdGxlcnAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gbWluICsgKHQqKG1heC1taW4pKTtcblx0fSxcblxuXHRzdGVwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIE1hdGgucm91bmQodGhpcy5sZXJwKG1pbixtYXgsdCkpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBIZWxwZXIgZm9yIGNyZWF0aW5nIGFuIGFycmF5XG5cdCAqIEBwYXJhbSBsZW5ndGhcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0Y3JlYXRlQXJyYXkgOiBmdW5jdGlvbihsZW5ndGgpIHtcblx0XHR2YXIgYXJyID0gbmV3IEFycmF5KGxlbmd0aCB8fCAwKSxcblx0XHRcdGkgPSBsZW5ndGg7XG5cblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHRcdHdoaWxlKGktLSkge1xuXHRcdFx0XHRhcnJbbGVuZ3RoLTEgLSBpXSA9IHRoaXMuY3JlYXRlQXJyYXkuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFycjtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(3)
});
