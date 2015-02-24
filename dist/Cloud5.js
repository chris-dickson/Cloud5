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

		// If we have a mask, set the boolean bitmap to reflect it
		if (this.maskCanvas) {
			var maskWidth = this.maskCanvas.width;
			var maskHeight = this.maskCanvas.height;
			var maskCtx = this.maskCanvas.getContext('2d');

			var imageData = maskCtx.getImageData(0,0,maskWidth,maskHeight);
			var maskX = 0;
			var maskY = 0;

			for (var x = 0; x < this._canvas.width; x++) {
				for (var y = 0; y < this._canvas.height; y++) {
					this._bitmap[x][y] = true;
				}
			}

			for (var i = 0; i < imageData.data.length; i+=4) {
				var mask = imageData.data[i+3] > 0;
				if (mask && maskX < this._canvas.width && maskY < this._canvas.height) {
					this._bitmap[maskX][maskY] = false;
				}
				maskX++;
				if (maskX === maskWidth) {
					maskX = 0;
					maskY++;
				}
			}
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

	mask : function(maskUrl,callback) {
		var img = new Image();
		img.src = maskUrl;
		var that = this;
		img.onload = function() {
			var width = img.width;
			var height = img.height;
			that.resize(width,height);

			that._maskCanvas = document.createElement('canvas');
			that._maskCanvas.width = width;
			that._maskCanvas.height = height;

			var context = that._maskCanvas.getContext('2d');
			context.fillStyle = 'rgba(0,0,0,0)';
			context.fillRect(0,0,that._maskCanvas.width,that._maskCanvas.height);
			context.drawImage(img,0,0);
			callback();
		};
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
		if (this._maskCanvas) {
			layoutAttributes.maskCanvas = this._maskCanvas;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9zdG9wd29yZHMuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBUZXh0Qml0bWFwID0gcmVxdWlyZSgnLi90ZXh0Yml0bWFwJyk7XG5cblxuLyoqXG4gKiBMYXlvdXQgY29uc3RydWN0b3JcbiAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fd29yZHMgPSBudWxsO1xuXHR0aGlzLl9iaXRtYXAgPSBudWxsO1xuICAgIHRoaXMuX3JlbmRlckluZm8gPSBudWxsO1xuXHR0aGlzLl90ZXh0Qml0bWFwcGVyID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSB0aGUgdGV4dCBiaXRtYXBwZXIgYW5kIGNyZWF0ZSBvdXIgYm9vbGVhbiBiaXRtYXAgb2YgdGhlIHNjZW5lXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcyA9IHtcblx0XHRcdHdpZHRoIDogdGhpcy5fY2FudmFzLndpZHRoLFxuXHRcdFx0aGVpZ2h0IDogdGhpcy5fY2FudmFzLmhlaWdodFxuXHRcdH07XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cblx0XHR0aGlzLl90ZXh0Qml0bWFwcGVyID0gbmV3IFRleHRCaXRtYXAodGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cdFx0dGhpcy5fYml0bWFwID0gXy5jcmVhdGVBcnJheSh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jYW52YXMud2lkdGg7IGkrKykge1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdFx0dGhpcy5fYml0bWFwW2ldW2pdID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG4gICAgLyoqXG4gICAgICogSGl0IHRlc3QgYSBwb3NpdGlvbiB4LHkgZm9yIGEgd29yZC4gIFRPRE86ICBtYWtlIHRoaXMgd2F5IGZhc3Rlci4gICBCU1AgVHJlZT9cbiAgICAgKiBAcGFyYW0geCAtIHggb2Zmc2V0IGludG8gY2FudmFzXG4gICAgICogQHBhcmFtIHkgLSB5IG9mZnNldCBpbnRvIGNhbnZhc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2hpdCA6IGZ1bmN0aW9uKHgseSkge1xuICAgICAgICB2YXIgd29yZCA9IG51bGw7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgICAvLyBHZXQgYSBsaXN0IG9mIGJvdW5kaW5nIGJveGVzIHRoYXQgeCx5IGFyZSBpblxuICAgICAgICB2YXIgY29udGFpbmVkV29yZHMgPSBPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5maWx0ZXIoZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuICAgICAgICAgICAgdmFyIG1pblggPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFg7XG4gICAgICAgICAgICB2YXIgbWluWSA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WTtcbiAgICAgICAgICAgIHZhciBtYXhYID0gbWluWCArIHJlbmRlckluZm8uYmIud2lkdGg7XG4gICAgICAgICAgICB2YXIgbWF4WSA9IG1pblkgKyByZW5kZXJJbmZvLmJiLmhlaWdodDtcbiAgICAgICAgICAgIGlmIChtaW5YIDw9IHggJiYgeCA8PSBtYXhYICYmIG1pblkgPD0geSAmJiB5IDw9IG1heFkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTb3J0IGJ5IHNpemVcbiAgICAgICAgY29udGFpbmVkV29yZHMuc29ydChmdW5jdGlvbih3MSx3Mikge1xuICAgICAgICAgICAgdmFyIGIxID0gdGhhdC5fcmVuZGVySW5mb1t3MV0uYmI7XG4gICAgICAgICAgICB2YXIgYjIgPSB0aGF0Ll9yZW5kZXJJbmZvW3cyXS5iYjtcbiAgICAgICAgICAgIHZhciBiMUEgPSBiMS53aWR0aCAqIGIxLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBiMkEgPSBiMi53aWR0aCAqIGIyLmhlaWdodDtcbiAgICAgICAgICAgIHJldHVybiBiMUEgLSBiMkE7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgd29yZCB3aXRoIHRoZSBzbWFsbGVzdCBib3VuZGluZyBib3hcbiAgICAgICAgaWYgKGNvbnRhaW5lZFdvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHdvcmQgPSBjb250YWluZWRXb3Jkc1swXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd29yZDtcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGNhbnZhcyBmb3IgdGhlIGxheW91dFxuXHQgKiBAcGFyYW0gY2FudmFzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIHdvcmRzIHRvIGxheW91dFxuXHQgKiBAcGFyYW0gd29yZHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3b3JkcyA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR0aGlzLl93b3JkcyA9IHdvcmRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cbiAgICBsYXlvdXRlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fbGF5b3V0ZXIgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXQgd29yZE92ZXIgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdXQgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgd29yZENsaWNrIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtMYXlvdXR9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBsYWNlcyBhIHdvcmQgd2l0aCB0aGUgZ2l2ZW4gcmVuZGVyIGluZm8gaW50byB0aGUgc2NlbmUuICBVcGRhdGUgdGhlXG4gICAgICogc2NlbmUgYm9vbGVhbiBiaXRtYXBcbiAgICAgKiBAcGFyYW0gd29yZCAtIHN0cmluZ1xuICAgICAqIEBwYXJhbSByZW5kZXJJbmZvIC0gcmVuZGVyIGluZm8gZnJvbSB0aGUgdGV4dCBiaXRtYXBwZXJcbiAgICAgKi9cbiAgICBwbGFjZSA6IGZ1bmN0aW9uKHdvcmQscmVuZGVySW5mbykge1xuICAgICAgICB2YXIgYml0bWFwV2lkdGggPSByZW5kZXJJbmZvLmJpdG1hcC5sZW5ndGg7XG4gICAgICAgIHZhciBiaXRtYXBIZWlnaHQgPSByZW5kZXJJbmZvLmJpdG1hcFswXS5sZW5ndGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBiaXRtYXBXaWR0aDsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGJpdG1hcEhlaWdodDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHUgPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFggKyBpO1xuICAgICAgICAgICAgICAgIHZhciB2ID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZICsgajtcblxuICAgICAgICAgICAgICAgIGlmIChyZW5kZXJJbmZvLmJpdG1hcFtpXVtqXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaXRtYXBbdV1bdl0gPSB3b3JkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZW5kZXJJbmZvXG4gICAgICogQHJldHVybnMgeyp8Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmaXRzIDogZnVuY3Rpb24ocmVuZGVySW5mbykge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGV4dEJpdG1hcHBlci5maXRzKHJlbmRlckluZm8sdGhpcy5fYml0bWFwKVxuICAgIH0sXG5cblxuICAgIHJhbmRvbUxheW91dCA6IGZ1bmN0aW9uKHdvcmRzLHJlbmRlckluZm8sd2lkdGgsaGVpZ2h0KSB7XG4gICAgICAgIC8vIExheW91dCBlYWNoIHdvcmRcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciBwbGFjZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBhdHRlbXB0cyA9IDEwMDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgICAgICAgICAgICB0aGF0LmRlYnVnRHJhd0FsbCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgd29yZFJlbmRlckluZm8gPSByZW5kZXJJbmZvW3dvcmRdO1xuXG4gICAgICAgICAgICAvLyBUcnkgcGxhY2luZyB0aGUgd29yZCBhbmQgc2VlIGlmIGl0IGZpdHMvaGl0cyBhbnl0aGluZyBlbHNlIGFscmVhZHkgcGxhY2VkXG4gICAgICAgICAgICB3aGlsZSAoIXBsYWNlZCAmJiBhdHRlbXB0cyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHdpZHRoKTtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICB3b3JkUmVuZGVySW5mby54ID0geDtcbiAgICAgICAgICAgICAgICB3b3JkUmVuZGVySW5mby55ID0geTtcblxuICAgICAgICAgICAgICAgIC8vIElmIGl0IGZpdHMsIHVwZGF0ZSB0aGUgYml0bWFwIGZvciB0aGUgZW50aXJlIHNjZW5lIHRvIHNheSB0aG9zZSBwaXhlbHMgYXJlIG9jY3VwaWVkXG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuZml0cyh3b3JkUmVuZGVySW5mbykpIHtcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGFjZSh3b3JkLCB3b3JkUmVuZGVySW5mbyk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhdHRlbXB0cy0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghcGxhY2VkKSB7XG4gICAgICAgICAgICAgICAgd29yZFJlbmRlckluZm8ueCA9IC0xO1xuICAgICAgICAgICAgICAgIHdvcmRSZW5kZXJJbmZvLnkgPSAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlYnVnIHJvdXRpbmUgdG8gZHJhdyBvdXIgd29yZHMgYXMgd2UgbGF5IHRoZW0gb3V0XG4gICAgICogQHBhcmFtIGN0eCAtIGNhbnZhcyBjb250ZXh0XG4gICAgICogQHBhcmFtIHcgLSB3aWR0aFxuICAgICAqIEBwYXJhbSBoIC0gaGVpZ2h0XG4gICAgICovXG4gICAgZGVidWdEcmF3QWxsIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjdHguY2xlYXJSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgd29yZFJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuICAgICAgICAgICAgaWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG4gICAgICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIHRoZSBsYXlvdXRcblx0ICogQHJldHVybnMge3t9fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW5pdGlhbGl6ZSgpO1xuXHRcdHRoaXMuX3JlbmRlckluZm8gPSB7fTtcblxuXHRcdC8vIEdldCBjb3VudHMgZm9yIGVhY2ggd29yZCwgdGhlbiBmaWd1cmUgb3V0IHRoZSBmb250IHNpemUgZm9yIGVhY2ggd29yZC4gICBDcmVhdGUgYSBib29sZWFuIGJpdG1hcCBhbmRcblx0XHQvLyBib3VuZGluZyBib3ggZm9yIGVhY2ggd29yZFxuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdFx0dmFyIG1heENvdW50ID0gMDtcblxuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKHRoYXQuX3dvcmRzW3dvcmRdLG1pbkNvdW50KTtcblx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heCh0aGF0Ll93b3Jkc1t3b3JkXSxtYXhDb3VudCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gU29ydCB0aGUgd29yZHMgYnkgZnJlcXVlbmN5XG5cdFx0XHR2YXIgc29ydGVkV29yZEFycmF5ID0gT2JqZWN0LmtleXModGhpcy5fd29yZHMpLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcblx0XHRcdFx0cmV0dXJuIHRoYXQuX3dvcmRzW3cyXS10aGF0Ll93b3Jkc1t3MV07XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKHRoaXMubWF4V29yZHMgPiAwICYmIHNvcnRlZFdvcmRBcnJheS5sZW5ndGggPiB0aGlzLm1heFdvcmRzKSB7XG5cdFx0XHRcdHNvcnRlZFdvcmRBcnJheSA9IHNvcnRlZFdvcmRBcnJheS5zcGxpY2UoMCx0aGlzLm1heFdvcmRzKTtcblx0XHRcdH1cblxuXG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG5cdFx0XHR2YXIgbWluRm9udFNpemUgPSAodGhpcy5taW5Gb250U2l6ZSB8fCAxMCkgKiBkcHI7XG5cdFx0XHR2YXIgbWF4Rm9udFNpemUgPSAodGhpcy5tYXhGb250U2l6ZSB8fCAyMDApKiBkcHI7XG5cdFx0XHRzb3J0ZWRXb3JkQXJyYXkuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cblx0XHRcdFx0dmFyIHQgPSAodGhhdC5fd29yZHNbd29yZF0gLSBtaW5Db3VudCkvKG1heENvdW50LW1pbkNvdW50KTtcblx0XHRcdFx0dmFyIGZvbnRTaXplID1fLnN0ZXAobWluRm9udFNpemUsbWF4Rm9udFNpemUsdCk7XG5cblx0XHRcdFx0dmFyIGJpdG1hcCA9IHRoYXQuX3RleHRCaXRtYXBwZXIuY3JlYXRlKHdvcmQsZm9udFNpemUsdGhhdC5mb250IHx8ICdDYWxpYnJpJyk7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0gPSBiaXRtYXA7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0uY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5taW5Db3VudCA9IG1pbkNvdW50O1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLm1heENvdW50ID0gbWF4Q291bnQ7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBoYXZlIGEgbWFzaywgc2V0IHRoZSBib29sZWFuIGJpdG1hcCB0byByZWZsZWN0IGl0XG5cdFx0aWYgKHRoaXMubWFza0NhbnZhcykge1xuXHRcdFx0dmFyIG1hc2tXaWR0aCA9IHRoaXMubWFza0NhbnZhcy53aWR0aDtcblx0XHRcdHZhciBtYXNrSGVpZ2h0ID0gdGhpcy5tYXNrQ2FudmFzLmhlaWdodDtcblx0XHRcdHZhciBtYXNrQ3R4ID0gdGhpcy5tYXNrQ2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0XHRcdHZhciBpbWFnZURhdGEgPSBtYXNrQ3R4LmdldEltYWdlRGF0YSgwLDAsbWFza1dpZHRoLG1hc2tIZWlnaHQpO1xuXHRcdFx0dmFyIG1hc2tYID0gMDtcblx0XHRcdHZhciBtYXNrWSA9IDA7XG5cblx0XHRcdGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5fY2FudmFzLndpZHRoOyB4KyspIHtcblx0XHRcdFx0Zm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyB5KyspIHtcblx0XHRcdFx0XHR0aGlzLl9iaXRtYXBbeF1beV0gPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VEYXRhLmRhdGEubGVuZ3RoOyBpKz00KSB7XG5cdFx0XHRcdHZhciBtYXNrID0gaW1hZ2VEYXRhLmRhdGFbaSszXSA+IDA7XG5cdFx0XHRcdGlmIChtYXNrICYmIG1hc2tYIDwgdGhpcy5fY2FudmFzLndpZHRoICYmIG1hc2tZIDwgdGhpcy5fY2FudmFzLmhlaWdodCkge1xuXHRcdFx0XHRcdHRoaXMuX2JpdG1hcFttYXNrWF1bbWFza1ldID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0bWFza1grKztcblx0XHRcdFx0aWYgKG1hc2tYID09PSBtYXNrV2lkdGgpIHtcblx0XHRcdFx0XHRtYXNrWCA9IDA7XG5cdFx0XHRcdFx0bWFza1krKztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBsYXlvdXRlciBpZiBwcm92aWRlZFxuICAgICAgICBpZiAodGhpcy5fbGF5b3V0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2xheW91dGVyLmNhbGwodGhpcyxzb3J0ZWRXb3JkQXJyYXksdGhhdC5fcmVuZGVySW5mbyx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCx0aGlzLmZpdHMsdGhpcy5wbGFjZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJhbmRvbUxheW91dChzb3J0ZWRXb3JkQXJyYXksIHRoYXQuX3JlbmRlckluZm8sdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuICAgICAgICB9XG5cblxuXHRcdC8vIEJpbmQgaGFuZGxlcnNcblx0XHR2YXIgb3ZlcldvcmQgPSBudWxsO1xuXHRcdGZ1bmN0aW9uIG9uTW91c2VNb3ZlKGUpIHtcblx0XHRcdHZhciB4ID0gZS5vZmZzZXRYO1xuXHRcdFx0dmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB4ICo9IGRwcjtcbiAgICAgICAgICAgIHkgKj0gZHByO1xuXG5cdFx0XHR2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuXHRcdFx0aWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAob3ZlcldvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuX29uV29yZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkT3V0KG92ZXJXb3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdmVyV29yZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvdmVyV29yZCA9IHdvcmQ7XG5cdFx0XHR9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkT3V0KG92ZXJXb3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3ZlcldvcmQgPSBudWxsO1xuICAgICAgICAgICAgfVxuXHRcdH1cblxuICAgICAgICBmdW5jdGlvbiBvbk1vdXNlQ2xpY2soZSkge1xuICAgICAgICAgICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgICAgICAgICB2YXIgeSA9IGUub2Zmc2V0WTtcbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHggKj0gZHByO1xuICAgICAgICAgICAgeSAqPSBkcHI7XG5cbiAgICAgICAgICAgIHZhciB3b3JkID0gdGhhdC5faGl0KHgseSk7XG4gICAgICAgICAgICBpZiAod29yZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRDbGljaykge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9vbldvcmRDbGljayh3b3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXHRcdHRoaXMuX2NhbnZhcy5vbm1vdXNlbW92ZSA9IG9uTW91c2VNb3ZlO1xuICAgICAgICB0aGlzLl9jYW52YXMub25jbGljayA9IG9uTW91c2VDbGljaztcblxuXG5cdFx0cmV0dXJuIHRoYXQuX3JlbmRlckluZm87XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgTG9nZ2VyID0gZnVuY3Rpb24od3JpdGVMb2cpIHtcblx0dGhpcy53cml0ZUxvZyA9IHdyaXRlTG9nO1xuXHR0aGlzLmxvZ3MgPSBbXTtcbn07XG5cbkxvZ2dlci5wcm90b3R5cGUgPSBfLmV4dGVuZChMb2dnZXIucHJvdG90eXBlLCB7XG5cdHB1c2ggOiBmdW5jdGlvbihsYWJlbCkge1xuXHRcdGlmICghdGhpcy53cml0ZUxvZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLmxvZ3MucHVzaCh7XG5cdFx0XHRsYWJlbCA6IGxhYmVsLFxuXHRcdFx0dGltZSA6IERhdGUubm93KClcblx0XHR9KTtcblx0fSxcblx0cG9wIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLndyaXRlTG9nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciB0YWJzID0gdGhpcy5sb2dzLmxlbmd0aDtcblx0XHR2YXIgbG9nID0gdGhpcy5sb2dzLnBvcCgpO1xuXHRcdHZhciBzdHIgPSAnJztcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRhYnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHN0ciArPSAnXFx0Jztcblx0XHR9XG5cdFx0dmFyIGVuZCA9IERhdGUubm93KCk7XG5cdFx0dmFyIGVsYXBzZWQgPSBlbmQgLSBsb2cudGltZTtcblx0XHRzdHIgKz0gbG9nLmxhYmVsICsgJzonICsgZWxhcHNlZCArICdtcyc7XG5cdFx0Y29uc29sZS5sb2coc3RyKTtcblx0fSxcblxuXHRfbWlsbGlzZWNvbmRzVG9TdHJpbmcgOiBmdW5jdGlvbihtaWxsaXNlY29uZHMpIHtcblx0XHR2YXIgb25lSG91ciA9IDM2MDAwMDA7XG5cdFx0dmFyIG9uZU1pbnV0ZSA9IDYwMDAwO1xuXHRcdHZhciBvbmVTZWNvbmQgPSAxMDAwO1xuXHRcdHZhciBzZWNvbmRzID0gMDtcblx0XHR2YXIgbWludXRlcyA9IDA7XG5cdFx0dmFyIGhvdXJzID0gMDtcblx0XHR2YXIgcmVzdWx0O1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVIb3VyKSB7XG5cdFx0XHRob3VycyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lSG91cik7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gaG91cnMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIGhvdXJzICogb25lSG91cikgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZU1pbnV0ZSkge1xuXHRcdFx0bWludXRlcyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lTWludXRlKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBtaW51dGVzID4gMCA/IChtaWxsaXNlY29uZHMgLSBtaW51dGVzICogb25lTWludXRlKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lU2Vjb25kKSB7XG5cdFx0XHRzZWNvbmRzID0gTWF0aC5mbG9vcihtaWxsaXNlY29uZHMgLyBvbmVTZWNvbmQpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IHNlY29uZHMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIHNlY29uZHMgKiBvbmVTZWNvbmQpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKGhvdXJzID4gMCkge1xuXHRcdFx0cmVzdWx0ID0gKGhvdXJzID4gOSA/IGhvdXJzIDogJzAnICsgaG91cnMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAobWludXRlcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAobWludXRlcyA+IDkgPyBtaW51dGVzIDogJzAnICsgbWludXRlcykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAoc2Vjb25kcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAoc2Vjb25kcyA+IDkgPyBzZWNvbmRzIDogJzAnICsgc2Vjb25kcykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDA6Jztcblx0XHR9XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID4gMCkge1xuXHRcdFx0cmVzdWx0ICs9IChtaWxsaXNlY29uZHMgPiA5ID8gbWlsbGlzZWNvbmRzIDogJzAnICsgbWlsbGlzZWNvbmRzKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ICs9ICcwMCc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbnZhciBTdG9wd29yZHMgPSByZXF1aXJlKCcuL3N0b3B3b3JkcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5cbnZhciBwZXJmTG9nID0gdHJ1ZTtcblxuLyoqXG4gKiBDbG91ZDUgY29uc3RydWN0b3JcbiAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENsb3VkNSA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblxuXHR0aGlzLl9sb2dnZXIgPSBuZXcgTG9nZ2VyKHBlcmZMb2cpO1xuXG5cdHRoaXMuX3dvcmRzID0ge307XG5cdHRoaXMuX3N0b3BXb3JkcyA9IHt9O1xuXG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cbiAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMgPSBudWxsO1xuICAgIHRoaXMuX2hpZ2hsaWdodGVkV29yZHMgPSBudWxsO1xuXG5cdHRoaXMuX3dpZHRoID0gbnVsbDtcblx0dGhpcy5faGVpZ2h0ID0gbnVsbDtcblx0dGhpcy5fYmFja2dyb3VuZEZpbGwgPSBudWxsO1xuXHR0aGlzLl9vbldvcmRPdmVyID0gbnVsbDtcbiAgICB0aGlzLl9vbldvcmRPdXQgPSBudWxsO1xuICAgIHRoaXMuX29uV29yZENsaWNrID0gbnVsbDtcblx0dGhpcy5fbGF5b3V0ID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuQ2xvdWQ1LnByb3RvdHlwZSA9IF8uZXh0ZW5kKENsb3VkNS5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGNhbnZhcyAtIEhUTUw1IENhbnZhcyBlbGVtZW50XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXG4gICAgICAgICAgICBpZiAoY2FudmFzID09PSB0aGlzLl9jYW52YXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgdmFyIGNXaWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHZhciBjSGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBjc3NXaWR0aCA9IGNXaWR0aDtcbiAgICAgICAgICAgIHZhciBjc3NIZWlnaHQgPSBjSGVpZ2h0O1xuICAgICAgICAgICAgaWYgKGRwciA+IDEpIHtcbiAgICAgICAgICAgICAgICBjV2lkdGggKj0gZHByO1xuICAgICAgICAgICAgICAgIGNIZWlnaHQgKj0gZHByO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRlZFdvcmRzID0ge307XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cblxuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoID0gY1dpZHRoO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCA9IGNIZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGggPSBjc3NXaWR0aCArICdweCc7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0ID0gY3NzSGVpZ2h0ICsgJ3B4Oydcblx0XHRcdHRoaXMuX3dpZHRoID0gY1dpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY0hlaWdodDtcblxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLndpZHRoID0gdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUudG9wID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5sZWZ0ID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5faGlnaGxpZ2h0Q2FudmFzLHRoaXMuX2NhbnZhcyk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzLiAgIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gd2lkdGggLSB3aWR0aCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKHdpZHRoKSB7XG5cdFx0aWYgKHdpZHRoKSB7XG5cdFx0XHR0aGlzLnJlc2l6ZSh3aWR0aCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMud2lkdGg7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzLiAgSWYgbm90IHNldCwgdXNlcyB0aGUgaW5oZXJpdGVkIHdpZHRoIGZyb20gY2FudmFzXG5cdCAqIEBwYXJhbSBoZWlnaHQgLSBoZWlnaHQgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0aGVpZ2h0IDogZnVuY3Rpb24oaGVpZ2h0KSB7XG5cdFx0aWYgKGhlaWdodCkge1xuXHRcdFx0aWYgKHRoaXMuX2NhbnZhcykge1xuXHRcdFx0XHR0aGlzLnJlc2l6ZSh1bmRlZmluZWQsaGVpZ2h0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5faGVpZ2h0O1xuXHRcdH1cblx0fSxcblxuICAgIHJlc2l6ZSA6IGZ1bmN0aW9uKHcsaCkge1xuICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgIGlmICh3KSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSBkcHIgKiB3O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoID0gdyArICdweCc7XG4gICAgICAgICAgICB0aGlzLl93aWR0aCA9ICBkcHIgKiB3O1xuXG4gICAgICAgICAgICBpZiAodGhpcy5faGlnaGxpZ2h0Q2FudmFzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoID0gdGhpcy5fY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIGlmIChoKSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0ID0gZHByICogaDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQgPSBoICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IGRwciAqIGg7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9oaWdobGlnaHRDYW52YXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSB0ZXh0IGZvciB3b3JkIGNsb3VkIGdlbmVyYXRpb24gZnJvbSBhIGxhcmdlIHN0cmluZ1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nLiAgIEJ5IGRlZmF1bHQsIHdlIHJlbW92ZSBhbGwgcHVuY3R1YXRpb24uICAgQWRkaXRpb25hbCBydWxlcyBjYW4gYmUgYWRkZWQgYnlcblx0ICogY2FsbGluZyB0ZXh0RmlsdGVycyguLi4pXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyE/JCVcXF4mXFwqOzp7fT1cXC1fYH4oKV0vZywnJyk7XG5cdFx0aWYgKHRoaXMuX2ZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXIpIHtcblx0XHRcdFx0ZmlsdGVyZWQgPSB0ZXh0LnJlcGxhY2UoZmlsdGVyLCcnKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHR2YXIgd29yZHMgPSBmaWx0ZXJlZC5zcGxpdCgnICcpO1xuXHRcdHRoaXMud29yZHMod29yZHMpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdG1hc2sgOiBmdW5jdGlvbihtYXNrVXJsLGNhbGxiYWNrKSB7XG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xuXHRcdGltZy5zcmMgPSBtYXNrVXJsO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpbWcub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd2lkdGggPSBpbWcud2lkdGg7XG5cdFx0XHR2YXIgaGVpZ2h0ID0gaW1nLmhlaWdodDtcblx0XHRcdHRoYXQucmVzaXplKHdpZHRoLGhlaWdodCk7XG5cblx0XHRcdHRoYXQuX21hc2tDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRcdHRoYXQuX21hc2tDYW52YXMud2lkdGggPSB3aWR0aDtcblx0XHRcdHRoYXQuX21hc2tDYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0XHR2YXIgY29udGV4dCA9IHRoYXQuX21hc2tDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoMCwwLDAsMCknO1xuXHRcdFx0Y29udGV4dC5maWxsUmVjdCgwLDAsdGhhdC5fbWFza0NhbnZhcy53aWR0aCx0aGF0Ll9tYXNrQ2FudmFzLmhlaWdodCk7XG5cdFx0XHRjb250ZXh0LmRyYXdJbWFnZShpbWcsMCwwKTtcblx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGEgbGlzdCBvZiB0ZXh0IGZpbHRlcnMgKHJlZ3VsYXIgZXhwcmVzc2lvbnMpIHRvIGJlIGFwcGxpZWQuICAgUnVsZXMgdGhhdCBtYXRjaCB3aWxsIGJlIGRlbGV0ZWRcblx0ICogZnJvbSB0aGUgb3JpZ2luYWwgdGV4dCBzdHJpbmcuICBUaGV5J3JlIGFwcGxpZWQgaW4gdGhlIG9yZGVyIGdpdmVuIHRvIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIGZpbHRlcnMgLSBhbiBhcnJheSBvZiByZWd1bGFyIGV4cHJlc3Npb25zXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0dGV4dEZpbHRlcnMgOiBmdW5jdGlvbihmaWx0ZXJzKSB7XG5cdFx0aWYgKGZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMgPSBmaWx0ZXJzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9maWx0ZXJzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgc3RvcCB3b3JkcyAod29yZHMgdG8gaWdub3JlKVxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiBzdHJpbmdzIHRvIGlnbm9yZVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuX2JhY2tncm91bmRGaWxsIHx8ICd3aGl0ZSc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGJhY2tncm91bmQgZmlsbCBzdHlsZVxuXHQgKiBAcGFyYW0gZmlsbFN0eWxlIC0gYSB2YWxpZCBmaWxsU3R5bGUgc3RyaW5nXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgZm9yIHRoZSB3b3JkIGNsb3VkXG5cdCAqIEBwYXJhbSB3b3JkcyAtIGFuIGFycmF5IG9mIHdvcmRzLlxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMuX3N0b3BXb3JkcykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRoaXMuc3RvcChTdG9wd29yZHMuRW5nbGlzaCk7XG5cdFx0XHR9XG5cblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJhdykge1xuXHRcdFx0XHR2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKHRoYXQuX3N0b3BXb3Jkc1t3b3JkXSB8fCB3b3JkID09PSAnJykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBjb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHRpZiAoIWNvdW50KSB7XG5cdFx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cbiAgICBoaWdobGlnaHQgOiBmdW5jdGlvbih3b3Jkcyxjb2xvcikge1xuICAgICAgICBpZiAod29yZHMgaW5zdGFuY2VvZiBBcnJheSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdvcmRzID0gW3dvcmRzXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHdvcmRzLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXSA9IGNvbG9yO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGlnaHRsaWdodCgpO1xuICAgIH0sXG5cbiAgICB1bmhpZ2hsaWdodCA6IGZ1bmN0aW9uKHdvcmRzKSB7XG4gICAgICAgIGlmICh3b3JkcyBpbnN0YW5jZW9mIEFycmF5ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgd29yZHMgPSBbd29yZHNdO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGlnaHRsaWdodCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGlnaHRsaWdodCA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciBoaWdobGlnaHRDdHggPSB0aGlzLl9oaWdobGlnaHRDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgaGlnaGxpZ2h0Q3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoLHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQpO1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9oaWdobGlnaHRlZFdvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIHZhciBjbHIgPSB0aGF0Ll9oaWdobGlnaHRlZFdvcmRzW3dvcmRdO1xuICAgICAgICAgICAgaWYgKHJlbmRlckluZm8pIHtcbiAgICAgICAgICAgICAgICBoaWdobGlnaHRDdHguZmlsbFN0eWxlID0gY2xyO1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5mb250ID0gcmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgcmVuZGVySW5mby5mb250RmFtaWx5O1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5maWxsVGV4dCh3b3JkLHJlbmRlckluZm8ueCxyZW5kZXJJbmZvLnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXQgYSBoYW5kbGVyIGZvciBtb3VzaW5nIG92ZXIgYSB3b3JkXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRvbldvcmRPdmVyIDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE92ZXIgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgYSBoYW5kbGVyIGZvciBtb3VzaW5nIG91dCBvZiBhIHdvcmRcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdG9uV29yZE91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdXQgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGEgaGFuZGxlciBmb3IgY2xpY2tpbmcgb24gYSB3b3JkXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuICAgICAqL1xuICAgIG9uV29yZENsaWNrIDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9vbldvcmRDbGljayA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBmYW1pbHkgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBmb250IC0gZm9udCBmYW1pbHkgKGllLyAnSGVsdmV0aWNhJylcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRmb250IDogZnVuY3Rpb24oZm9udCkge1xuXHRcdGlmIChmb250KSB7XG5cdFx0XHR0aGlzLl9mb250ID0gZm9udDtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWluaW11bSBmb250IHNpemUgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBtaW5Gb250U2l6ZSAtIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1pbkZvbnRTaXplIDogZnVuY3Rpb24obWluRm9udFNpemUpIHtcblx0XHRpZiAobWluRm9udFNpemUpIHtcblx0XHRcdHRoaXMuX21pbkZvbnRTaXplID0gbWluRm9udFNpemU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21pbkZvbnRTaXplO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtYXhpbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1heEZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWF4Rm9udFNpemUgOiBmdW5jdGlvbihtYXhGb250U2l6ZSkge1xuXHRcdGlmIChtYXhGb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWF4Rm9udFNpemUgPSBtYXhGb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4Rm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gbnVtYmVyIG9mIHdvcmRzIHRvIGJlIHJlbmRlcmVkIGluIHRoZSBjbG91ZFxuXHQgKiBAcGFyYW0gbWF4V29yZHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhXb3JkcyA6IGZ1bmN0aW9uKG1heFdvcmRzKSB7XG5cdFx0aWYgKG1heFdvcmRzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuX21heFdvcmRzID0gbWF4V29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21heFdvcmRzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGNvbG9yc1xuXHQgKiBAcGFyYW0gY29sb3IgLSBjYW4gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG5cdCAqIFx0XHQxKSAgQSBmaWxsU3R5bGUgc3RyaW5nIChpZS8gJ3JlZCcsJ3JnYigyNTUsMjU1LDApJywgZXRjKVxuXHQgKiBcdCAgICAyKSAgQW4gYXJyYXkgb2YgZmlsbFN0eWxlIHN0cmluZ3Ncblx0ICogXHQgICAgMykgIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgZmlsbFN0eWxlIHN0cmluZyBnaXZlbiB0aGUgcmVuZGVySW5mbyBmb3IgdGhlIHdvcmQuICBpZS9cblx0ICogXHQgICAgICAgICAgICAgZnVuY3Rpb24ocmVuZGVySW5mbykge1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHdvcmQgPSByZW5kZXJJbmZvLndvcmQ7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgY291bnQgPSByZW5kZXJJbmZvLmNvdW50O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHhQb3MgPSByZW5kZXJJbmZvLng7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgeVBvc3QgPSByZW5kZXJJbmZvLnk7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICByZXR1cm4gLy8gYSBmaWxsU3R5bGUgZGVyaXZlZCBmcm9tIGFib3ZlIHByb3BlcnRpZXNcblx0ICogXHQgICAgICAgICAgICAgIH1cblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjb2xvciA6IGZ1bmN0aW9uKGNvbG9yKSB7XG5cdFx0aWYgKGNvbG9yKSB7XG5cdFx0XHR0aGlzLl9jb2xvciA9IGNvbG9yO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb2xvcjtcblx0XHR9XG5cdH0sXG5cbiAgICBsYXlvdXQgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2xheW91dCA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIExheW91dCBhbmQgcmVuZGVyIHRoZSB3b3JkIGNsb3VkIHRvIHRoZSBjYW52YXMgcHJvdmlkZWRcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdGdlbmVyYXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGxheW91dEF0dHJpYnV0ZXMgPSB7fTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9mb250KSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLmZvbnQgPSB0aGlzLl9mb250O1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWluRm9udFNpemUpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWluRm9udFNpemUgPSB0aGlzLl9taW5Gb250U2l6ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21heEZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1heEZvbnRTaXplID0gdGhpcy5fbWF4Rm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhXb3JkcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1heFdvcmRzID0gdGhpcy5fbWF4V29yZHM7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXNrQ2FudmFzKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1hc2tDYW52YXMgPSB0aGlzLl9tYXNrQ2FudmFzO1xuXHRcdH1cblxuXHRcdHRoaXMuX2xvZ2dlci5wdXNoKCdMYXlvdXQnKTtcblx0XHR0aGlzLl9sYXlvdXQgPSBuZXcgTGF5b3V0KGxheW91dEF0dHJpYnV0ZXMpXG5cdFx0XHQuY2FudmFzKHRoaXMuX2NhbnZhcylcblx0XHRcdC53b3Jkcyh0aGlzLl93b3JkcylcbiAgICAgICAgICAgIC5sYXlvdXRlcih0aGlzLl9sYXlvdXQpXG5cdFx0XHQub25Xb3JkT3Zlcih0aGlzLl9vbldvcmRPdmVyKVxuXHRcdFx0Lm9uV29yZE91dCh0aGlzLl9vbldvcmRPdXQpXG4gICAgICAgICAgICAub25Xb3JkQ2xpY2sodGhpcy5fb25Xb3JkQ2xpY2spO1xuXHRcdHRoaXMuX2xvZ2dlci5wb3AoKTtcblxuXHRcdHRoaXMuX3JlbmRlckluZm8gPSB0aGlzLl9sYXlvdXQubGF5b3V0KCk7XG5cblx0XHR0aGlzLmNsZWFyKCk7XG5cbiAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cblx0XHR0aGlzLl9sb2dnZXIucHVzaCgnUmVuZGVyJyk7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0dmFyIHdvcmRSZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcblx0XHRcdGlmICh3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuXHRcdFx0XHRjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuXG5cblx0XHRcdFx0dmFyIGNsciA9ICdibGFjayc7XG5cdFx0XHRcdGlmICh0aGF0Ll9jb2xvcikge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9jb2xvciBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHR2YXIgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY29sb3IubGVuZ3RoKTtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yW2lkeF07XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGF0Ll9jb2xvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcih3b3JkUmVuZGVySW5mbyk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRjdHguZmlsbFN0eWxlID0gY2xyO1xuXHRcdFx0XHRjdHguZmlsbFRleHQod29yZCx3b3JkUmVuZGVySW5mby54LHdvcmRSZW5kZXJJbmZvLnkpO1xuXG5cdFx0XHRcdGlmICh0aGF0LmRlYnVnKSB7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5fbG9nZ2VyLnBvcCgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgaW1hZ2UgdG8gbG9jYWwgZmlsZXN5c3RlbSB3aXRoIHRoZSBmb3JtYXQvZmlsZW5hbWUgc3BlY2lmaWVkXG4gICAgICogQHBhcmFtIGZvcm1hdCAob3B0aW9uYWwpIC0gVGhlIG1pbWV0eXBlIHRvIHNhdmUgYXMuICAgRGVmYXVsdCAnaW1hZ2UvcG5nJ1xuICAgICAqIEBwYXJhbSBmaWxlbmFtZSAob3B0aW9uYWwpIC0gVGhlIGZpbGVuYW1lIHRvIHNhdmUgaXQgYXMuICAgJ2Rvd25sb2FkJyBieSBkZWZhdWx0XG4gICAgICovXG4gICAgc2F2ZSA6IGZ1bmN0aW9uKGZvcm1hdCxmaWxlbmFtZSkge1xuICAgICAgICB2YXIgZGF0YVVSSSA9IHRoaXMuX2NhbnZhcy50b0RhdGFVUkwoZm9ybWF0IHx8ICdpbWFnZS9wbmcnKTtcbiAgICAgICAgdmFyIHVyaUNvbnRlbnQgPSBkYXRhVVJJLmluZGV4T2YoJywnKTtcbiAgICAgICAgZGF0YVVSSSA9IGRhdGFVUkkuc3Vic3RyaW5nKHVyaUNvbnRlbnQpO1xuICAgICAgICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgbGluay5ocmVmID0gJ2RhdGE6YXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtO2Jhc2U2NCcgKyBkYXRhVVJJO1xuICAgICAgICBpZiAoZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIGxpbmsuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgICAgfVxuICAgICAgICBsaW5rLmNsaWNrKCk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xvdWQ1O1xubW9kdWxlLmV4cG9ydHMuU3RvcHdvcmRzID0gU3RvcHdvcmRzOyIsInZhciBlbmdsaXNoID0gXCJhLCBhYm91dCwgYWJvdmUsIGFjcm9zcywgYWZ0ZXIsIGFnYWluLCBhZ2FpbnN0LCBhbGwsIGFsbW9zdCwgYWxvbmUsIGFsb25nLCBhbHJlYWR5LCBhbHNvLCBhbHRob3VnaCwgYWx3YXlzLCBhbSwgYW1vbmcsIGFuLCBhbmQsIGFub3RoZXIsIGFueSwgYW55Ym9keSwgYW55b25lLCBhbnl0aGluZywgYW55d2hlcmUsIGFyZSwgYXJlYSwgYXJlYXMsIGFyZW4ndCwgYXJvdW5kLCBhcywgYXNrLCBhc2tlZCwgYXNraW5nLCBhc2tzLCBhdCwgYXdheSwgYiwgYmFjaywgYmFja2VkLCBiYWNraW5nLCBiYWNrcywgYmUsIGJlY2FtZSwgYmVjYXVzZSwgYmVjb21lLCBiZWNvbWVzLCBiZWVuLCBiZWZvcmUsIGJlZ2FuLCBiZWhpbmQsIGJlaW5nLCBiZWluZ3MsIGJlbG93LCBiZXN0LCBiZXR0ZXIsIGJldHdlZW4sIGJpZywgYm90aCwgYnV0LCBieSwgYywgY2FtZSwgY2FuLCBjYW5ub3QsIGNhbid0LCBjYXNlLCBjYXNlcywgY2VydGFpbiwgY2VydGFpbmx5LCBjbGVhciwgY2xlYXJseSwgY29tZSwgY291bGQsIGNvdWxkbid0LCBkLCBkaWQsIGRpZG4ndCwgZGlmZmVyLCBkaWZmZXJlbnQsIGRpZmZlcmVudGx5LCBkbywgZG9lcywgZG9lc24ndCwgZG9pbmcsIGRvbmUsIGRvbid0LCBkb3duLCBkb3duZWQsIGRvd25pbmcsIGRvd25zLCBkdXJpbmcsIGUsIGVhY2gsIGVhcmx5LCBlaXRoZXIsIGVuZCwgZW5kZWQsIGVuZGluZywgZW5kcywgZW5vdWdoLCBldmVuLCBldmVubHksIGV2ZXIsIGV2ZXJ5LCBldmVyeWJvZHksIGV2ZXJ5b25lLCBldmVyeXRoaW5nLCBldmVyeXdoZXJlLCBmLCBmYWNlLCBmYWNlcywgZmFjdCwgZmFjdHMsIGZhciwgZmVsdCwgZmV3LCBmaW5kLCBmaW5kcywgZmlyc3QsIGZvciwgZm91ciwgZnJvbSwgZnVsbCwgZnVsbHksIGZ1cnRoZXIsIGZ1cnRoZXJlZCwgZnVydGhlcmluZywgZnVydGhlcnMsIGcsIGdhdmUsIGdlbmVyYWwsIGdlbmVyYWxseSwgZ2V0LCBnZXRzLCBnaXZlLCBnaXZlbiwgZ2l2ZXMsIGdvLCBnb2luZywgZ29vZCwgZ29vZHMsIGdvdCwgZ3JlYXQsIGdyZWF0ZXIsIGdyZWF0ZXN0LCBncm91cCwgZ3JvdXBlZCwgZ3JvdXBpbmcsIGdyb3VwcywgaCwgaGFkLCBoYWRuJ3QsIGhhcywgaGFzbid0LCBoYXZlLCBoYXZlbid0LCBoYXZpbmcsIGhlLCBoZSdkLCBoZSdsbCwgaGVyLCBoZXJlLCBoZXJlJ3MsIGhlcnMsIGhlcnNlbGYsIGhlJ3MsIGhpZ2gsIGhpZ2hlciwgaGlnaGVzdCwgaGltLCBoaW1zZWxmLCBoaXMsIGhvdywgaG93ZXZlciwgaG93J3MsIGksIGknZCwgaWYsIGknbGwsIGknbSwgaW1wb3J0YW50LCBpbiwgaW50ZXJlc3QsIGludGVyZXN0ZWQsIGludGVyZXN0aW5nLCBpbnRlcmVzdHMsIGludG8sIGlzLCBpc24ndCwgaXQsIGl0cywgaXQncywgaXRzZWxmLCBpJ3ZlLCBqLCBqdXN0LCBrLCBrZWVwLCBrZWVwcywga2luZCwga25ldywga25vdywga25vd24sIGtub3dzLCBsLCBsYXJnZSwgbGFyZ2VseSwgbGFzdCwgbGF0ZXIsIGxhdGVzdCwgbGVhc3QsIGxlc3MsIGxldCwgbGV0cywgbGV0J3MsIGxpa2UsIGxpa2VseSwgbG9uZywgbG9uZ2VyLCBsb25nZXN0LCBtLCBtYWRlLCBtYWtlLCBtYWtpbmcsIG1hbiwgbWFueSwgbWF5LCBtZSwgbWVtYmVyLCBtZW1iZXJzLCBtZW4sIG1pZ2h0LCBtb3JlLCBtb3N0LCBtb3N0bHksIG1yLCBtcnMsIG11Y2gsIG11c3QsIG11c3RuJ3QsIG15LCBteXNlbGYsIG4sIG5lY2Vzc2FyeSwgbmVlZCwgbmVlZGVkLCBuZWVkaW5nLCBuZWVkcywgbmV2ZXIsIG5ldywgbmV3ZXIsIG5ld2VzdCwgbmV4dCwgbm8sIG5vYm9keSwgbm9uLCBub29uZSwgbm9yLCBub3QsIG5vdGhpbmcsIG5vdywgbm93aGVyZSwgbnVtYmVyLCBudW1iZXJzLCBvLCBvZiwgb2ZmLCBvZnRlbiwgb2xkLCBvbGRlciwgb2xkZXN0LCBvbiwgb25jZSwgb25lLCBvbmx5LCBvcGVuLCBvcGVuZWQsIG9wZW5pbmcsIG9wZW5zLCBvciwgb3JkZXIsIG9yZGVyZWQsIG9yZGVyaW5nLCBvcmRlcnMsIG90aGVyLCBvdGhlcnMsIG91Z2h0LCBvdXIsIG91cnMsIG91cnNlbHZlcywgb3V0LCBvdmVyLCBvd24sIHAsIHBhcnQsIHBhcnRlZCwgcGFydGluZywgcGFydHMsIHBlciwgcGVyaGFwcywgcGxhY2UsIHBsYWNlcywgcG9pbnQsIHBvaW50ZWQsIHBvaW50aW5nLCBwb2ludHMsIHBvc3NpYmxlLCBwcmVzZW50LCBwcmVzZW50ZWQsIHByZXNlbnRpbmcsIHByZXNlbnRzLCBwcm9ibGVtLCBwcm9ibGVtcywgcHV0LCBwdXRzLCBxLCBxdWl0ZSwgciwgcmF0aGVyLCByZWFsbHksIHJpZ2h0LCByb29tLCByb29tcywgcywgc2FpZCwgc2FtZSwgc2F3LCBzYXksIHNheXMsIHNlY29uZCwgc2Vjb25kcywgc2VlLCBzZWVtLCBzZWVtZWQsIHNlZW1pbmcsIHNlZW1zLCBzZWVzLCBzZXZlcmFsLCBzaGFsbCwgc2hhbid0LCBzaGUsIHNoZSdkLCBzaGUnbGwsIHNoZSdzLCBzaG91bGQsIHNob3VsZG4ndCwgc2hvdywgc2hvd2VkLCBzaG93aW5nLCBzaG93cywgc2lkZSwgc2lkZXMsIHNpbmNlLCBzbWFsbCwgc21hbGxlciwgc21hbGxlc3QsIHNvLCBzb21lLCBzb21lYm9keSwgc29tZW9uZSwgc29tZXRoaW5nLCBzb21ld2hlcmUsIHN0YXRlLCBzdGF0ZXMsIHN0aWxsLCBzdWNoLCBzdXJlLCB0LCB0YWtlLCB0YWtlbiwgdGhhbiwgdGhhdCwgdGhhdCdzLCB0aGUsIHRoZWlyLCB0aGVpcnMsIHRoZW0sIHRoZW1zZWx2ZXMsIHRoZW4sIHRoZXJlLCB0aGVyZWZvcmUsIHRoZXJlJ3MsIHRoZXNlLCB0aGV5LCB0aGV5J2QsIHRoZXknbGwsIHRoZXkncmUsIHRoZXkndmUsIHRoaW5nLCB0aGluZ3MsIHRoaW5rLCB0aGlua3MsIHRoaXMsIHRob3NlLCB0aG91Z2gsIHRob3VnaHQsIHRob3VnaHRzLCB0aHJlZSwgdGhyb3VnaCwgdGh1cywgdG8sIHRvZGF5LCB0b2dldGhlciwgdG9vLCB0b29rLCB0b3dhcmQsIHR1cm4sIHR1cm5lZCwgdHVybmluZywgdHVybnMsIHR3bywgdSwgdW5kZXIsIHVudGlsLCB1cCwgdXBvbiwgdXMsIHVzZSwgdXNlZCwgdXNlcywgdiwgdmVyeSwgdywgd2FudCwgd2FudGVkLCB3YW50aW5nLCB3YW50cywgd2FzLCB3YXNuJ3QsIHdheSwgd2F5cywgd2UsIHdlJ2QsIHdlbGwsIHdlJ2xsLCB3ZWxscywgd2VudCwgd2VyZSwgd2UncmUsIHdlcmVuJ3QsIHdlJ3ZlLCB3aGF0LCB3aGF0J3MsIHdoZW4sIHdoZW4ncywgd2hlcmUsIHdoZXJlJ3MsIHdoZXRoZXIsIHdoaWNoLCB3aGlsZSwgd2hvLCB3aG9sZSwgd2hvbSwgd2hvJ3MsIHdob3NlLCB3aHksIHdoeSdzLCB3aWxsLCB3aXRoLCB3aXRoaW4sIHdpdGhvdXQsIHdvbid0LCB3b3JrLCB3b3JrZWQsIHdvcmtpbmcsIHdvcmtzLCB3b3VsZCwgd291bGRuJ3QsIHgsIHksIHllYXIsIHllYXJzLCB5ZXMsIHlldCwgeW91LCB5b3UnZCwgeW91J2xsLCB5b3VuZywgeW91bmdlciwgeW91bmdlc3QsIHlvdXIsIHlvdSdyZSwgeW91cnMsIHlvdXJzZWxmLCB5b3Vyc2VsdmVzLCB5b3UndmUsIHpcIjtcbnZhciBmcmVuY2ggPSBcImFsb3JzLGF1LGF1Y3VucyxhdXNzaSxhdXRyZSxhdmFudCxhdmVjLGF2b2lyLGJvbixjYXIsY2UsY2VsYSxjZXMsY2V1eCxjaGFxdWUsY2ksY29tbWUsY29tbWVudCxkYW5zLGRlcyxkdSxkZWRhbnMsZGVob3JzLGRlcHVpcyxkZXZyYWl0LGRvaXQsZG9uYyxkb3MsZMOpYnV0LGVsbGUsZWxsZXMsZW4sZW5jb3JlLGVzc2FpLGVzdCxldCxldSxmYWl0LGZhaXRlcyxmb2lzLGZvbnQsaG9ycyxpY2ksaWwsaWxzLGplLGp1c3RlLGxhLGxlLGxlcyxsZXVyLGzDoCxtYSxtYWludGVuYW50LG1haXMsbWVzLG1pbmUsbW9pbnMsbW9uLG1vdCxtw6ptZSxuaSxub21tw6lzLG5vdHJlLG5vdXMsb3Usb8O5LHBhcixwYXJjZSxwYXMscGV1dCxwZXUscGx1cGFydCxwb3VyLHBvdXJxdW9pLHF1YW5kLHF1ZSxxdWVsLHF1ZWxsZSxxdWVsbGVzLHF1ZWxzLHF1aSxzYSxzYW5zLHNlcyxzZXVsZW1lbnQsc2ksc2llbixzb24sc29udCxzb3VzLHNveWV6LCBzdWpldCxzdXIsdGEsdGFuZGlzLHRlbGxlbWVudCx0ZWxzLHRlcyx0b24sdG91cyx0b3V0LHRyb3AsdHLDqHMsdHUsdm9pZW50LHZvbnQsdm90cmUsdm91cyx2dSzDp2Esw6l0YWllbnQsw6l0YXQsw6l0aW9ucyzDqXTDqSzDqnRyZSxkZSx1bixpLHF1LGQsbCxuZSxzZSx1bmUsbixzLG0scGx1cyzDoCwndW4sJ2lsLCdlc3QsbHVpLG1tZSxhdmFpdCxjLC0sLS0sLS0tLG1lLGosP1wiO1xudmFyIGVuZ2xpc2hXb3JkcyA9IGVuZ2xpc2guc3BsaXQoJywnKTtcbnZhciBmcmVuY2hXb3JkcyA9IGZyZW5jaC5zcGxpdCgnLCcpO1xuXG5leHBvcnRzLkVuZ2xpc2ggPSBlbmdsaXNoV29yZHM7XG5leHBvcnRzLkZyZW5jaCA9IGZyZW5jaFdvcmRzO1xuXG5cblxuXG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5cbnZhciBUZXh0Qml0bWFwID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9jb250ZXh0ID0gbnVsbDtcblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcblxuXHR0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0dGhpcy5fY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCB8fCA2NDA7XG5cdHRoaXMuX2NhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCB8fCA0ODA7XG5cdHRoaXMuX2NvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5fY2FudmFzKTtcblx0fVxuXG5cdHRoaXMuX2JpdG1hcCA9IF8uY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuVGV4dEJpdG1hcC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0Qml0bWFwLnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBiaXRtYXAgZm9yIHRoZSBnaXZlbiB3b3JkL2ZvbnQgcGFpci4gICBSZXR1cm4gYSByZW5kZXJJbmZvIG9iamVjdCBmb3IgdGhpc1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nIHRoYXQgd2Ugd2FudCB0byBiaXRtYXAgKGllLyBhIHdvcmQpXG5cdCAqIEBwYXJhbSBmb250SGVpZ2h0IC0gdGhlIGhlaWdodCBvZiB0aGUgZm9udFxuXHQgKiBAcGFyYW0gZm9udEZhbWlseSAtIHRoZSBmb250IGZhbWlseVxuXHQgKiBAcmV0dXJucyB7e2JiOiB7b2Zmc2V0WDogbnVtYmVyLCBvZmZzZXRZOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyfSwgYml0bWFwOiAqLCBmb250U2l6ZTogKiwgZm9udEZhbWlseTogKn19XG5cdCAqL1xuXHRjcmVhdGUgOiBmdW5jdGlvbih0ZXh0LGZvbnRIZWlnaHQsZm9udEZhbWlseSkge1xuXHRcdHZhciBjdHggPSB0aGlzLl9jb250ZXh0O1xuXHRcdGN0eC5maWxsU3R5bGUgPSAnYmxhY2snO1xuXHRcdGN0eC5maWxsUmVjdCgwLDAsdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIHRleHRSZW5kZXJYID0gNTtcblx0XHR2YXIgdGV4dFJlbmRlclkgPSBNYXRoLmZsb29yKHRoaXMuX2NhbnZhcy5oZWlnaHQvMik7XG5cblx0XHQvLyBGaWxsIHRoZSBmb250XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0Y3R4LmZvbnQgPSBmb250SGVpZ2h0ICsgJ3B4ICcgKyBmb250RmFtaWx5O1xuXHRcdGN0eC5maWxsVGV4dCh0ZXh0LHRleHRSZW5kZXJYLHRleHRSZW5kZXJZKTtcblxuXHRcdHZhciB3aWR0aCA9IGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcblxuXHRcdC8vIEdldCBhIHJlbGF4ZWQgYm91bmRpbmcgYm94IHRvIGdyYWIgZnJvbSB0aGUgY2FudmFzXG5cdFx0dmFyIHN0YXJ0WCA9IHRleHRSZW5kZXJYO1xuXHRcdHZhciBzdGFydFkgPSB0ZXh0UmVuZGVyWSAtIGZvbnRIZWlnaHQgLSAyO1xuXHRcdHZhciBlbmRYID0gc3RhcnRYICsgd2lkdGggKyB0ZXh0UmVuZGVyWDtcblx0XHR2YXIgZW5kWSA9IHN0YXJ0WSArIGZvbnRIZWlnaHQgKyBmb250SGVpZ2h0KjAuNTtcblxuXG5cblx0XHR2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YShzdGFydFgsc3RhcnRZLGVuZFggLSBzdGFydFgsZW5kWSAtIHN0YXJ0WSk7XG5cblx0XHR2YXIgYm9vbGVhbkJpdG1hcCA9IF8uY3JlYXRlQXJyYXkoaW1hZ2VEYXRhLndpZHRoLGltYWdlRGF0YS5oZWlnaHQpO1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkrPTQpIHtcblxuXHRcdFx0Ym9vbGVhbkJpdG1hcFt4XVt5XSA9ICBpbWFnZURhdGEuZGF0YVtpXSAhPT0gMDtcblx0XHRcdHgrKztcblx0XHRcdGlmICh4ID09PSBpbWFnZURhdGEud2lkdGgpIHtcblx0XHRcdFx0eCA9IDA7XG5cdFx0XHRcdHkrKztcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWluWSA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFggPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WSA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGZvciAoeCA9IDA7IHggPCBib29sZWFuQml0bWFwLmxlbmd0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgYm9vbGVhbkJpdG1hcFt4XS5sZW5ndGg7IHkrKykge1xuXHRcdFx0XHRpZiAoYm9vbGVhbkJpdG1hcFt4XVt5XSkge1xuXHRcdFx0XHRcdG1pblggPSBNYXRoLm1pbihtaW5YLHgpO1xuXHRcdFx0XHRcdG1pblkgPSBNYXRoLm1pbihtaW5ZLHkpO1xuXHRcdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLHgpO1xuXHRcdFx0XHRcdG1heFkgPSBNYXRoLm1heChtYXhZLHkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gVHJpbSB0aGUgYm91bmRpbmcgYm94IHRvIGp1c3QgcGl4ZWxzIHRoYXQgYXJlIGZpbGxlZFxuXHRcdHZhciB0cmltbWVkQm9vbGVhbkJpdG1hcCA9IF8uY3JlYXRlQXJyYXkobWF4WC1taW5YLG1heFktbWluWSk7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IG1heFgtbWluWDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgbWF4WS1taW5ZOyB5KyspIHtcblx0XHRcdFx0dHJpbW1lZEJvb2xlYW5CaXRtYXBbeF1beV0gPSBib29sZWFuQml0bWFwW21pblgreF1bbWluWSt5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3llbGxvdyc7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdChzdGFydFgsc3RhcnRZLGVuZFgtc3RhcnRYLGVuZFktc3RhcnRZKTtcblx0XHR9XG5cblx0XHRjdHguc3Ryb2tlU3R5bGUgPSAncmVkJztcblx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSx0aGlzLl9jYW52YXMud2lkdGgsIHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIGJiV2lkdGggPSBtYXhYLW1pblg7XG5cdFx0dmFyIGJiSGVpZ2h0ID0gbWF4WS1taW5ZO1xuXHRcdHZhciBiYk9mZnNldFggPSAtKHRleHRSZW5kZXJYIC0gKHN0YXJ0WCArIG1pblggKSk7XG5cdFx0dmFyIGJiT2Zmc2V0WSA9IC0odGV4dFJlbmRlclkgLSAoc3RhcnRZICsgbWluWSkpO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCArIGJiT2Zmc2V0WCwgdGV4dFJlbmRlclkgKyBiYk9mZnNldFksIGJiV2lkdGgsIGJiSGVpZ2h0KTtcblx0XHR9XG5cblx0XHR2YXIgcmVuZGVySW5mbyA9IHtcblx0XHRcdGJiIDoge1xuXHRcdFx0XHRvZmZzZXRYIDogYmJPZmZzZXRYLFxuXHRcdFx0XHRvZmZzZXRZIDogYmJPZmZzZXRZLFxuXHRcdFx0XHR3aWR0aCA6IGJiV2lkdGgsXG5cdFx0XHRcdGhlaWdodCA6IGJiSGVpZ2h0XG5cdFx0XHR9LFxuXHRcdFx0Yml0bWFwIDogdHJpbW1lZEJvb2xlYW5CaXRtYXAsXG5cdFx0XHRmb250U2l6ZSA6IGZvbnRIZWlnaHQsXG5cdFx0XHRmb250RmFtaWx5IDogZm9udEZhbWlseVxuXHRcdH07XG5cblx0XHRyZXR1cm4gcmVuZGVySW5mbztcblx0fSxcblxuXHQvKipcblx0ICogdGVzdHMgd2hldGhlciBhIHJlbmRlckluZm8gb2JqZWN0IGZpdHMgaW50byBhIGdsb2JhbCBib29sZWFuIGJpdG1hcFxuXHQgKiBAcGFyYW0gcmVuZGVySW5mbyAtIHJlbmRlckluZm8gZm9yIGEgd29yZCAocmV0dXJuZWQgZnJvbSBjcmVhdGUpXG5cdCAqIEBwYXJhbSBiaXRtYXAgLSBzY2VuZSBiaXRtYXBcblx0ICogQHJldHVybnMge2Jvb2xlYW59IC0gdHJ1ZSBpZiB3b3JkIGZpdHMsIGZhbHNlIG90aGVyd2lzZVxuXHQgKi9cblx0Zml0cyA6IGZ1bmN0aW9uKHJlbmRlckluZm8sYml0bWFwKSB7XG5cdFx0cmVuZGVySW5mby54ID0gTWF0aC5mbG9vcihyZW5kZXJJbmZvLngpO1xuXHRcdHJlbmRlckluZm8ueSA9IE1hdGguZmxvb3IocmVuZGVySW5mby55KTtcblxuXHRcdHZhciBzdGFydFggPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFg7XG5cdFx0dmFyIHN0YXJ0WSA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WTtcblxuXHRcdHZhciBiaXRtYXBXaWR0aCA9IGJpdG1hcC5sZW5ndGg7XG5cdFx0dmFyIGJpdG1hcEhlaWdodCA9IGJpdG1hcFswXS5sZW5ndGg7XG5cblx0XHR2YXIgaGl0RWRnZSA9IHN0YXJ0WCA8IDAgfHwgc3RhcnRZIDwgMDtcblx0XHR2YXIgaGl0T3RoZXIgPSBmYWxzZTtcblx0XHR2YXIgZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcmVuZGVySW5mby5iYi53aWR0aCAmJiAhZG9lc250Rml0OyBpKyspIHtcblx0XHRcdHZhciB1ID0gc3RhcnRYICsgaTtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgcmVuZGVySW5mby5iYi5oZWlnaHQgJiYgIWRvZXNudEZpdDsgaisrKSB7XG5cdFx0XHRcdHZhciB2ID0gc3RhcnRZICsgajtcblx0XHRcdFx0aWYgKHUgPj0gYml0bWFwV2lkdGggfHwgdiA+PSBiaXRtYXBIZWlnaHQpIHtcblx0XHRcdFx0XHRoaXRFZGdlID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmIChiaXRtYXBbdV1bdl0pIHtcblx0XHRcdFx0XHRoaXRPdGhlciA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuICFkb2VzbnRGaXQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHRCaXRtYXA7IiwiXG52YXIgVXRpbCA9IHtcblxuXHRleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcblx0XHR2YXIga2V5LCBpLCBzb3VyY2U7XG5cdFx0Zm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0ICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG5cdFx0ICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcblx0XHRcdGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0ICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcblx0XHRcdH1cblx0XHQgIH1cblx0XHR9XG5cdFx0cmV0dXJuIGRlc3Q7XG5cdH0sXG5cblx0bGVycCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBtaW4gKyAodCoobWF4LW1pbikpO1xuXHR9LFxuXG5cdHN0ZXAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gTWF0aC5yb3VuZCh0aGlzLmxlcnAobWluLG1heCx0KSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW4gYXJyYXlcblx0ICogQHBhcmFtIGxlbmd0aFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRjcmVhdGVBcnJheSA6IGZ1bmN0aW9uKGxlbmd0aCkge1xuXHRcdHZhciBhcnIgPSBuZXcgQXJyYXkobGVuZ3RoIHx8IDApLFxuXHRcdFx0aSA9IGxlbmd0aDtcblxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdFx0d2hpbGUoaS0tKSB7XG5cdFx0XHRcdGFycltsZW5ndGgtMSAtIGldID0gdGhpcy5jcmVhdGVBcnJheS5hcHBseSh0aGlzLCBhcmdzKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(3)
});
