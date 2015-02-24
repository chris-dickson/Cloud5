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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9zdG9wd29yZHMuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVGV4dEJpdG1hcCA9IHJlcXVpcmUoJy4vdGV4dGJpdG1hcCcpO1xuXG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX3dvcmRzID0gbnVsbDtcblx0dGhpcy5fYml0bWFwID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHRleHQgYml0bWFwcGVyIGFuZCBjcmVhdGUgb3VyIGJvb2xlYW4gYml0bWFwIG9mIHRoZSBzY2VuZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2luaXRpYWxpemUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMgPSB7XG5cdFx0XHR3aWR0aCA6IHRoaXMuX2NhbnZhcy53aWR0aCxcblx0XHRcdGhlaWdodCA6IHRoaXMuX2NhbnZhcy5oZWlnaHRcblx0XHR9O1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHR0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG5ldyBUZXh0Qml0bWFwKHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXHRcdHRoaXMuX2JpdG1hcCA9IF8uY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuICAgIC8qKlxuICAgICAqIEhpdCB0ZXN0IGEgcG9zaXRpb24geCx5IGZvciBhIHdvcmQuICBUT0RPOiAgbWFrZSB0aGlzIHdheSBmYXN0ZXIuICAgQlNQIFRyZWU/XG4gICAgICogQHBhcmFtIHggLSB4IG9mZnNldCBpbnRvIGNhbnZhc1xuICAgICAqIEBwYXJhbSB5IC0geSBvZmZzZXQgaW50byBjYW52YXNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9oaXQgOiBmdW5jdGlvbih4LHkpIHtcbiAgICAgICAgdmFyIHdvcmQgPSBudWxsO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgLy8gR2V0IGEgbGlzdCBvZiBib3VuZGluZyBib3hlcyB0aGF0IHgseSBhcmUgaW5cbiAgICAgICAgdmFyIGNvbnRhaW5lZFdvcmRzID0gT2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZmlsdGVyKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIHZhciBtaW5YID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIG1pblkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgbWF4WCA9IG1pblggKyByZW5kZXJJbmZvLmJiLndpZHRoO1xuICAgICAgICAgICAgdmFyIG1heFkgPSBtaW5ZICsgcmVuZGVySW5mby5iYi5oZWlnaHQ7XG4gICAgICAgICAgICBpZiAobWluWCA8PSB4ICYmIHggPD0gbWF4WCAmJiBtaW5ZIDw9IHkgJiYgeSA8PSBtYXhZKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydCBieSBzaXplXG4gICAgICAgIGNvbnRhaW5lZFdvcmRzLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcbiAgICAgICAgICAgIHZhciBiMSA9IHRoYXQuX3JlbmRlckluZm9bdzFdLmJiO1xuICAgICAgICAgICAgdmFyIGIyID0gdGhhdC5fcmVuZGVySW5mb1t3Ml0uYmI7XG4gICAgICAgICAgICB2YXIgYjFBID0gYjEud2lkdGggKiBiMS5oZWlnaHQ7XG4gICAgICAgICAgICB2YXIgYjJBID0gYjIud2lkdGggKiBiMi5oZWlnaHQ7XG4gICAgICAgICAgICByZXR1cm4gYjFBIC0gYjJBO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIHdvcmQgd2l0aCB0aGUgc21hbGxlc3QgYm91bmRpbmcgYm94XG4gICAgICAgIGlmIChjb250YWluZWRXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3b3JkID0gY29udGFpbmVkV29yZHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdvcmQ7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3b3JkcyB0byBsYXlvdXRcblx0ICogQHBhcmFtIHdvcmRzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dGhpcy5fd29yZHMgPSB3b3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG4gICAgbGF5b3V0ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2xheW91dGVyID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdmVyIGhhbmRsZXJcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCB3b3JkT3V0IGhhbmRsZXJcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdG9uV29yZE91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdXQgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHdvcmRDbGljayBoYW5kbGVyXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiBAcmV0dXJucyB7TGF5b3V0fVxuICAgICAqL1xuICAgIG9uV29yZENsaWNrIDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9vbldvcmRDbGljayA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQbGFjZXMgYSB3b3JkIHdpdGggdGhlIGdpdmVuIHJlbmRlciBpbmZvIGludG8gdGhlIHNjZW5lLiAgVXBkYXRlIHRoZVxuICAgICAqIHNjZW5lIGJvb2xlYW4gYml0bWFwXG4gICAgICogQHBhcmFtIHdvcmQgLSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gcmVuZGVySW5mbyAtIHJlbmRlciBpbmZvIGZyb20gdGhlIHRleHQgYml0bWFwcGVyXG4gICAgICovXG4gICAgcGxhY2UgOiBmdW5jdGlvbih3b3JkLHJlbmRlckluZm8pIHtcbiAgICAgICAgdmFyIGJpdG1hcFdpZHRoID0gcmVuZGVySW5mby5iaXRtYXAubGVuZ3RoO1xuICAgICAgICB2YXIgYml0bWFwSGVpZ2h0ID0gcmVuZGVySW5mby5iaXRtYXBbMF0ubGVuZ3RoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYml0bWFwV2lkdGg7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBiaXRtYXBIZWlnaHQ7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciB1ID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYICsgaTtcbiAgICAgICAgICAgICAgICB2YXIgdiA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WSArIGo7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVuZGVySW5mby5iaXRtYXBbaV1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYml0bWFwW3VdW3ZdID0gd29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVuZGVySW5mb1xuICAgICAqIEByZXR1cm5zIHsqfGJvb2xlYW59XG4gICAgICovXG4gICAgZml0cyA6IGZ1bmN0aW9uKHJlbmRlckluZm8pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RleHRCaXRtYXBwZXIuZml0cyhyZW5kZXJJbmZvLHRoaXMuX2JpdG1hcClcbiAgICB9LFxuXG5cbiAgICByYW5kb21MYXlvdXQgOiBmdW5jdGlvbih3b3JkcyxyZW5kZXJJbmZvLHdpZHRoLGhlaWdodCkge1xuICAgICAgICAvLyBMYXlvdXQgZWFjaCB3b3JkXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgcGxhY2VkID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYXR0ZW1wdHMgPSAxMDA7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5kZWJ1Z0RyYXdBbGwoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHdvcmRSZW5kZXJJbmZvID0gcmVuZGVySW5mb1t3b3JkXTtcblxuICAgICAgICAgICAgLy8gVHJ5IHBsYWNpbmcgdGhlIHdvcmQgYW5kIHNlZSBpZiBpdCBmaXRzL2hpdHMgYW55dGhpbmcgZWxzZSBhbHJlYWR5IHBsYWNlZFxuICAgICAgICAgICAgd2hpbGUgKCFwbGFjZWQgJiYgYXR0ZW1wdHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB3aWR0aCk7XG4gICAgICAgICAgICAgICAgdmFyIHkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBoZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgd29yZFJlbmRlckluZm8ueCA9IHg7XG4gICAgICAgICAgICAgICAgd29yZFJlbmRlckluZm8ueSA9IHk7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBpdCBmaXRzLCB1cGRhdGUgdGhlIGJpdG1hcCBmb3IgdGhlIGVudGlyZSBzY2VuZSB0byBzYXkgdGhvc2UgcGl4ZWxzIGFyZSBvY2N1cGllZFxuICAgICAgICAgICAgICAgIGlmICh0aGF0LmZpdHMod29yZFJlbmRlckluZm8pKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsYWNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQucGxhY2Uod29yZCwgd29yZFJlbmRlckluZm8pO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ZW1wdHMtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXBsYWNlZCkge1xuICAgICAgICAgICAgICAgIHdvcmRSZW5kZXJJbmZvLnggPSAtMTtcbiAgICAgICAgICAgICAgICB3b3JkUmVuZGVySW5mby55ID0gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWJ1ZyByb3V0aW5lIHRvIGRyYXcgb3VyIHdvcmRzIGFzIHdlIGxheSB0aGVtIG91dFxuICAgICAqIEBwYXJhbSBjdHggLSBjYW52YXMgY29udGV4dFxuICAgICAqIEBwYXJhbSB3IC0gd2lkdGhcbiAgICAgKiBAcGFyYW0gaCAtIGhlaWdodFxuICAgICAqL1xuICAgIGRlYnVnRHJhd0FsbCA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHdvcmRSZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIGlmICh3b3JkUmVuZGVySW5mby54ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gdW5kZWZpbmVkICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgY3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcbiAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcbiAgICAgICAgICAgICAgICBjdHguZmlsbFRleHQod29yZCx3b3JkUmVuZGVySW5mby54LHdvcmRSZW5kZXJJbmZvLnkpO1xuICAgICAgICAgICAgICAgIGN0eC5zdHJva2VSZWN0KHdvcmRSZW5kZXJJbmZvLnggKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRYLCB3b3JkUmVuZGVySW5mby55ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WSwgd29yZFJlbmRlckluZm8uYmIud2lkdGgsIHdvcmRSZW5kZXJJbmZvLmJiLmhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuXHQvKipcblx0ICogUGVyZm9ybSB0aGUgbGF5b3V0XG5cdCAqIEByZXR1cm5zIHt7fX1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2luaXRpYWxpemUoKTtcblx0XHR0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cblx0XHQvLyBHZXQgY291bnRzIGZvciBlYWNoIHdvcmQsIHRoZW4gZmlndXJlIG91dCB0aGUgZm9udCBzaXplIGZvciBlYWNoIHdvcmQuICAgQ3JlYXRlIGEgYm9vbGVhbiBiaXRtYXAgYW5kXG5cdFx0Ly8gYm91bmRpbmcgYm94IGZvciBlYWNoIHdvcmRcblx0XHRpZiAodGhpcy5fd29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0dmFyIG1pbkNvdW50ID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRcdHZhciBtYXhDb3VudCA9IDA7XG5cblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdFx0bWluQ291bnQgPSBNYXRoLm1pbih0aGF0Ll93b3Jkc1t3b3JkXSxtaW5Db3VudCk7XG5cdFx0XHRcdG1heENvdW50ID0gTWF0aC5tYXgodGhhdC5fd29yZHNbd29yZF0sbWF4Q291bnQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIFNvcnQgdGhlIHdvcmRzIGJ5IGZyZXF1ZW5jeVxuXHRcdFx0dmFyIHNvcnRlZFdvcmRBcnJheSA9IE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5zb3J0KGZ1bmN0aW9uKHcxLHcyKSB7XG5cdFx0XHRcdHJldHVybiB0aGF0Ll93b3Jkc1t3Ml0tdGhhdC5fd29yZHNbdzFdO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmICh0aGlzLm1heFdvcmRzID4gMCAmJiBzb3J0ZWRXb3JkQXJyYXkubGVuZ3RoID4gdGhpcy5tYXhXb3Jkcykge1xuXHRcdFx0XHRzb3J0ZWRXb3JkQXJyYXkgPSBzb3J0ZWRXb3JkQXJyYXkuc3BsaWNlKDAsdGhpcy5tYXhXb3Jkcyk7XG5cdFx0XHR9XG5cblxuXHRcdFx0dmFyIG1pbkZvbnRTaXplID0gdGhpcy5taW5Gb250U2l6ZSB8fCAxMDtcblx0XHRcdHZhciBtYXhGb250U2l6ZSA9IHRoaXMubWF4Rm9udFNpemUgfHwgMjAwO1xuXHRcdFx0c29ydGVkV29yZEFycmF5LmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXG5cdFx0XHRcdHZhciB0ID0gKHRoYXQuX3dvcmRzW3dvcmRdIC0gbWluQ291bnQpLyhtYXhDb3VudC1taW5Db3VudCk7XG5cdFx0XHRcdHZhciBmb250U2l6ZSA9Xy5zdGVwKG1pbkZvbnRTaXplLG1heEZvbnRTaXplLHQpO1xuXG5cdFx0XHRcdHZhciBiaXRtYXAgPSB0aGF0Ll90ZXh0Qml0bWFwcGVyLmNyZWF0ZSh3b3JkLGZvbnRTaXplLHRoYXQuZm9udCB8fCAnQ2FsaWJyaScpO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdID0gYml0bWFwO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLmNvdW50ID0gdGhhdC5fd29yZHNbd29yZF07XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0ubWluQ291bnQgPSBtaW5Db3VudDtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5tYXhDb3VudCA9IG1heENvdW50O1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIG1hc2ssIHNldCB0aGUgYm9vbGVhbiBiaXRtYXAgdG8gcmVmbGVjdCBpdFxuXHRcdGlmICh0aGlzLm1hc2tDYW52YXMpIHtcblx0XHRcdHZhciBtYXNrV2lkdGggPSB0aGlzLm1hc2tDYW52YXMud2lkdGg7XG5cdFx0XHR2YXIgbWFza0hlaWdodCA9IHRoaXMubWFza0NhbnZhcy5oZWlnaHQ7XG5cdFx0XHR2YXIgbWFza0N0eCA9IHRoaXMubWFza0NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdFx0XHR2YXIgaW1hZ2VEYXRhID0gbWFza0N0eC5nZXRJbWFnZURhdGEoMCwwLG1hc2tXaWR0aCxtYXNrSGVpZ2h0KTtcblx0XHRcdHZhciBtYXNrWCA9IDA7XG5cdFx0XHR2YXIgbWFza1kgPSAwO1xuXG5cdFx0XHRmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMuX2NhbnZhcy53aWR0aDsgeCsrKSB7XG5cdFx0XHRcdGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5fY2FudmFzLmhlaWdodDsgeSsrKSB7XG5cdFx0XHRcdFx0dGhpcy5fYml0bWFwW3hdW3ldID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlRGF0YS5kYXRhLmxlbmd0aDsgaSs9NCkge1xuXHRcdFx0XHR2YXIgbWFzayA9IGltYWdlRGF0YS5kYXRhW2krM10gPiAwO1xuXHRcdFx0XHRpZiAobWFzayAmJiBtYXNrWCA8IHRoaXMuX2NhbnZhcy53aWR0aCAmJiBtYXNrWSA8IHRoaXMuX2NhbnZhcy5oZWlnaHQpIHtcblx0XHRcdFx0XHR0aGlzLl9iaXRtYXBbbWFza1hdW21hc2tZXSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG1hc2tYKys7XG5cdFx0XHRcdGlmIChtYXNrWCA9PT0gbWFza1dpZHRoKSB7XG5cdFx0XHRcdFx0bWFza1ggPSAwO1xuXHRcdFx0XHRcdG1hc2tZKys7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gbGF5b3V0ZXIgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHRoaXMuX2xheW91dGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9sYXlvdXRlci5jYWxsKHRoaXMsc29ydGVkV29yZEFycmF5LHRoYXQuX3JlbmRlckluZm8sdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQsdGhpcy5maXRzLHRoaXMucGxhY2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yYW5kb21MYXlvdXQoc29ydGVkV29yZEFycmF5LCB0aGF0Ll9yZW5kZXJJbmZvLHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuXG5cblx0XHQvLyBCaW5kIGhhbmRsZXJzXG5cdFx0dmFyIG92ZXJXb3JkID0gbnVsbDtcblx0XHRmdW5jdGlvbiBvbk1vdXNlTW92ZShlKSB7XG5cdFx0XHR2YXIgeCA9IGUub2Zmc2V0WDtcblx0XHRcdHZhciB5ID0gZS5vZmZzZXRZO1xuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgeCAqPSBkcHI7XG4gICAgICAgICAgICB5ICo9IGRwcjtcblxuXHRcdFx0dmFyIHdvcmQgPSB0aGF0Ll9oaXQoeCx5KTtcblx0XHRcdGlmICh3b3JkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG92ZXJXb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX29uV29yZE91dChvdmVyV29yZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3ZlcldvcmQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cblxuXHRcdFx0XHRpZiAodGhhdC5fb25Xb3JkT3Zlcikge1xuXHRcdFx0XHRcdHRoYXQuX29uV29yZE92ZXIod29yZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0b3ZlcldvcmQgPSB3b3JkO1xuXHRcdFx0fSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX29uV29yZE91dChvdmVyV29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG92ZXJXb3JkID0gbnVsbDtcbiAgICAgICAgICAgIH1cblx0XHR9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Nb3VzZUNsaWNrKGUpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB4ICo9IGRwcjtcbiAgICAgICAgICAgIHkgKj0gZHByO1xuXG4gICAgICAgICAgICB2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkQ2xpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkQ2xpY2sod29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblx0XHR0aGlzLl9jYW52YXMub25tb3VzZW1vdmUgPSBvbk1vdXNlTW92ZTtcbiAgICAgICAgdGhpcy5fY2FudmFzLm9uY2xpY2sgPSBvbk1vdXNlQ2xpY2s7XG5cblxuXHRcdHJldHVybiB0aGF0Ll9yZW5kZXJJbmZvO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIExvZ2dlciA9IGZ1bmN0aW9uKHdyaXRlTG9nKSB7XG5cdHRoaXMud3JpdGVMb2cgPSB3cml0ZUxvZztcblx0dGhpcy5sb2dzID0gW107XG59O1xuXG5Mb2dnZXIucHJvdG90eXBlID0gXy5leHRlbmQoTG9nZ2VyLnByb3RvdHlwZSwge1xuXHRwdXNoIDogZnVuY3Rpb24obGFiZWwpIHtcblx0XHRpZiAoIXRoaXMud3JpdGVMb2cpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5sb2dzLnB1c2goe1xuXHRcdFx0bGFiZWwgOiBsYWJlbCxcblx0XHRcdHRpbWUgOiBEYXRlLm5vdygpXG5cdFx0fSk7XG5cdH0sXG5cdHBvcCA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy53cml0ZUxvZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgdGFicyA9IHRoaXMubG9ncy5sZW5ndGg7XG5cdFx0dmFyIGxvZyA9IHRoaXMubG9ncy5wb3AoKTtcblx0XHR2YXIgc3RyID0gJyc7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0YWJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRzdHIgKz0gJ1xcdCc7XG5cdFx0fVxuXHRcdHZhciBlbmQgPSBEYXRlLm5vdygpO1xuXHRcdHZhciBlbGFwc2VkID0gZW5kIC0gbG9nLnRpbWU7XG5cdFx0c3RyICs9IGxvZy5sYWJlbCArICc6JyArIGVsYXBzZWQgKyAnbXMnO1xuXHRcdGNvbnNvbGUubG9nKHN0cik7XG5cdH0sXG5cblx0X21pbGxpc2Vjb25kc1RvU3RyaW5nIDogZnVuY3Rpb24obWlsbGlzZWNvbmRzKSB7XG5cdFx0dmFyIG9uZUhvdXIgPSAzNjAwMDAwO1xuXHRcdHZhciBvbmVNaW51dGUgPSA2MDAwMDtcblx0XHR2YXIgb25lU2Vjb25kID0gMTAwMDtcblx0XHR2YXIgc2Vjb25kcyA9IDA7XG5cdFx0dmFyIG1pbnV0ZXMgPSAwO1xuXHRcdHZhciBob3VycyA9IDA7XG5cdFx0dmFyIHJlc3VsdDtcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lSG91cikge1xuXHRcdFx0aG91cnMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZUhvdXIpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IGhvdXJzID4gMCA/IChtaWxsaXNlY29uZHMgLSBob3VycyAqIG9uZUhvdXIpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVNaW51dGUpIHtcblx0XHRcdG1pbnV0ZXMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZU1pbnV0ZSk7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gbWludXRlcyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gbWludXRlcyAqIG9uZU1pbnV0ZSkgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZVNlY29uZCkge1xuXHRcdFx0c2Vjb25kcyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lU2Vjb25kKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBzZWNvbmRzID4gMCA/IChtaWxsaXNlY29uZHMgLSBzZWNvbmRzICogb25lU2Vjb25kKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChob3VycyA+IDApIHtcblx0XHRcdHJlc3VsdCA9IChob3VycyA+IDkgPyBob3VycyA6ICcwJyArIGhvdXJzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ID0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbnV0ZXMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKG1pbnV0ZXMgPiA5ID8gbWludXRlcyA6ICcwJyArIG1pbnV0ZXMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKHNlY29uZHMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKHNlY29uZHMgPiA5ID8gc2Vjb25kcyA6ICcwJyArIHNlY29uZHMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAobWlsbGlzZWNvbmRzID4gOSA/IG1pbGxpc2Vjb25kcyA6ICcwJyArIG1pbGxpc2Vjb25kcyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDAnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG52YXIgU3RvcHdvcmRzID0gcmVxdWlyZSgnLi9zdG9wd29yZHMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGVyZkxvZyA9IHRydWU7XG5cbi8qKlxuICogQ2xvdWQ1IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBDbG91ZDUgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cblx0dGhpcy5fbG9nZ2VyID0gbmV3IExvZ2dlcihwZXJmTG9nKTtcblxuXHR0aGlzLl93b3JkcyA9IHt9O1xuXHR0aGlzLl9zdG9wV29yZHMgPSB7fTtcblxuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXG4gICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzID0gbnVsbDtcbiAgICB0aGlzLl9oaWdobGlnaHRlZFdvcmRzID0gbnVsbDtcblxuXHR0aGlzLl93aWR0aCA9IG51bGw7XG5cdHRoaXMuX2hlaWdodCA9IG51bGw7XG5cdHRoaXMuX2JhY2tncm91bmRGaWxsID0gbnVsbDtcblx0dGhpcy5fb25Xb3JkT3ZlciA9IG51bGw7XG4gICAgdGhpcy5fb25Xb3JkT3V0ID0gbnVsbDtcbiAgICB0aGlzLl9vbldvcmRDbGljayA9IG51bGw7XG5cdHRoaXMuX2xheW91dCA9IG51bGw7XG4gICAgdGhpcy5fcmVuZGVySW5mbyA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkNsb3VkNS5wcm90b3R5cGUgPSBfLmV4dGVuZChDbG91ZDUucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBIVE1MNSBDYW52YXMgZWxlbWVudFxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblxuICAgICAgICAgICAgaWYgKGNhbnZhcyA9PT0gdGhpcy5fY2FudmFzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHZhciBjV2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICAgICAgICB2YXIgY0hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICB2YXIgY3NzV2lkdGggPSBjV2lkdGg7XG4gICAgICAgICAgICB2YXIgY3NzSGVpZ2h0ID0gY0hlaWdodDtcbiAgICAgICAgICAgIGlmIChkcHIgPiAxKSB7XG4gICAgICAgICAgICAgICAgY1dpZHRoICo9IGRwcjtcbiAgICAgICAgICAgICAgICBjSGVpZ2h0ICo9IGRwcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0ZWRXb3JkcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXG5cblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy53aWR0aCA9IGNXaWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQgPSBjSGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoID0gY3NzV2lkdGggKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodCA9IGNzc0hlaWdodCArICdweDsnXG5cdFx0XHR0aGlzLl93aWR0aCA9IGNXaWR0aDtcblx0XHRcdHRoaXMuX2hlaWdodCA9IGNIZWlnaHQ7XG5cblxuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMud2lkdGggPSB0aGlzLl9jYW52YXMud2lkdGg7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5oZWlnaHQgPSB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnRvcCA9IHRoaXMuX2NhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUubGVmdCA9IHRoaXMuX2NhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuX2hpZ2hsaWdodENhbnZhcyx0aGlzLl9jYW52YXMpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcy4gICBJZiBub3Qgc2V0LCB1c2VzIHRoZSBpbmhlcml0ZWQgd2lkdGggZnJvbSBjYW52YXNcblx0ICogQHBhcmFtIHdpZHRoIC0gd2lkdGggaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d2lkdGggOiBmdW5jdGlvbih3aWR0aCkge1xuXHRcdGlmICh3aWR0aCkge1xuXHRcdFx0dGhpcy5yZXNpemUod2lkdGgpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLndpZHRoO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcy4gIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gaGVpZ2h0IC0gaGVpZ2h0IGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGhlaWdodCA6IGZ1bmN0aW9uKGhlaWdodCkge1xuXHRcdGlmIChoZWlnaHQpIHtcblx0XHRcdGlmICh0aGlzLl9jYW52YXMpIHtcblx0XHRcdFx0dGhpcy5yZXNpemUodW5kZWZpbmVkLGhlaWdodCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2hlaWdodDtcblx0XHR9XG5cdH0sXG5cbiAgICByZXNpemUgOiBmdW5jdGlvbih3LGgpIHtcbiAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICBpZiAodykge1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoID0gZHByICogdztcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aCA9IHcgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5fd2lkdGggPSAgZHByICogdztcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2hpZ2hsaWdodENhbnZhcykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUud2lkdGggPSB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICBpZiAoaCkge1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCA9IGRwciAqIGg7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0ID0gaCArICdweCc7XG4gICAgICAgICAgICB0aGlzLl9oZWlnaHQgPSBkcHIgKiBoO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5faGlnaGxpZ2h0Q2FudmFzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgdGV4dCBmb3Igd29yZCBjbG91ZCBnZW5lcmF0aW9uIGZyb20gYSBsYXJnZSBzdHJpbmdcblx0ICogQHBhcmFtIHRleHQgLSBhIHN0cmluZy4gICBCeSBkZWZhdWx0LCB3ZSByZW1vdmUgYWxsIHB1bmN0dWF0aW9uLiAgIEFkZGl0aW9uYWwgcnVsZXMgY2FuIGJlIGFkZGVkIGJ5XG5cdCAqIGNhbGxpbmcgdGV4dEZpbHRlcnMoLi4uKVxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0dGV4dCA6IGZ1bmN0aW9uKHRleHQpIHtcblx0XHR2YXIgZmlsdGVyZWQgPSB0ZXh0LnJlcGxhY2UoL1tcXC4sLVxcLyMhPyQlXFxeJlxcKjs6e309XFwtX2B+KCldL2csJycpO1xuXHRcdGlmICh0aGlzLl9maWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzLmZvckVhY2goZnVuY3Rpb24oZmlsdGVyKSB7XG5cdFx0XHRcdGZpbHRlcmVkID0gdGV4dC5yZXBsYWNlKGZpbHRlciwnJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0dmFyIHdvcmRzID0gZmlsdGVyZWQuc3BsaXQoJyAnKTtcblx0XHR0aGlzLndvcmRzKHdvcmRzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRtYXNrIDogZnVuY3Rpb24obWFza1VybCxjYWxsYmFjaykge1xuXHRcdHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcblx0XHRpbWcuc3JjID0gbWFza1VybDtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aW1nLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdpZHRoID0gaW1nLndpZHRoO1xuXHRcdFx0dmFyIGhlaWdodCA9IGltZy5oZWlnaHQ7XG5cdFx0XHR0aGF0LnJlc2l6ZSh3aWR0aCxoZWlnaHQpO1xuXG5cdFx0XHR0aGF0Ll9tYXNrQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0XHR0aGF0Ll9tYXNrQ2FudmFzLndpZHRoID0gd2lkdGg7XG5cdFx0XHR0aGF0Ll9tYXNrQ2FudmFzLmhlaWdodCA9IGhlaWdodDtcblxuXHRcdFx0dmFyIGNvbnRleHQgPSB0aGF0Ll9tYXNrQ2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2JhKDAsMCwwLDApJztcblx0XHRcdGNvbnRleHQuZmlsbFJlY3QoMCwwLHRoYXQuX21hc2tDYW52YXMud2lkdGgsdGhhdC5fbWFza0NhbnZhcy5oZWlnaHQpO1xuXHRcdFx0Y29udGV4dC5kcmF3SW1hZ2UoaW1nLDAsMCk7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdH07XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyBhIGxpc3Qgb2YgdGV4dCBmaWx0ZXJzIChyZWd1bGFyIGV4cHJlc3Npb25zKSB0byBiZSBhcHBsaWVkLiAgIFJ1bGVzIHRoYXQgbWF0Y2ggd2lsbCBiZSBkZWxldGVkXG5cdCAqIGZyb20gdGhlIG9yaWdpbmFsIHRleHQgc3RyaW5nLiAgVGhleSdyZSBhcHBsaWVkIGluIHRoZSBvcmRlciBnaXZlbiB0byB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBmaWx0ZXJzIC0gYW4gYXJyYXkgb2YgcmVndWxhciBleHByZXNzaW9uc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHRleHRGaWx0ZXJzIDogZnVuY3Rpb24oZmlsdGVycykge1xuXHRcdGlmIChmaWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzID0gZmlsdGVycztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZmlsdGVycztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHN0b3Agd29yZHMgKHdvcmRzIHRvIGlnbm9yZSlcblx0ICogQHBhcmFtIHdvcmRzIC0gYW4gYXJyYXkgb2Ygc3RyaW5ncyB0byBpZ25vcmVcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRzdG9wIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHdvcmQpIHtcblx0XHRcdFx0dGhhdC5fc3RvcFdvcmRzW3dvcmQudHJpbSgpLnRvTG93ZXJDYXNlKCldID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9zdG9wV29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdGNsZWFyIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGN0eC5maWxsU3R5bGUgPSB0aGlzLl9iYWNrZ3JvdW5kRmlsbCB8fCAnd2hpdGUnO1xuXHRcdGN0eC5maWxsUmVjdCgwLDAsdGhpcy5fd2lkdGgsdGhpcy5faGVpZ2h0KTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBiYWNrZ3JvdW5kIGZpbGwgc3R5bGVcblx0ICogQHBhcmFtIGZpbGxTdHlsZSAtIGEgdmFsaWQgZmlsbFN0eWxlIHN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGJhY2tncm91bmQgOiBmdW5jdGlvbihmaWxsU3R5bGUpIHtcblx0XHRpZiAoZmlsbFN0eWxlKSB7XG5cdFx0XHR0aGlzLl9iYWNrZ3JvdW5kRmlsbCA9IGZpbGxTdHlsZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYmFja2dyb3VuZEZpbGw7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIHdvcmRzIGZvciB0aGUgd29yZCBjbG91ZFxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiB3b3Jkcy5cblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3b3JkcyA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHRcdGlmIChPYmplY3Qua2V5cyh0aGlzLl9zdG9wV29yZHMpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHR0aGlzLnN0b3AoU3RvcHdvcmRzLkVuZ2xpc2gpO1xuXHRcdFx0fVxuXG5cdFx0XHR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyYXcpIHtcblx0XHRcdFx0dmFyIHdvcmQgPSByYXcudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdGlmICh0aGF0Ll9zdG9wV29yZHNbd29yZF0gfHwgd29yZCA9PT0gJycpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0aWYgKCFjb3VudCkge1xuXHRcdFx0XHRcdGNvdW50ID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHR0aGF0Ll93b3Jkc1t3b3JkXSA9IGNvdW50O1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG4gICAgaGlnaGxpZ2h0IDogZnVuY3Rpb24od29yZHMsY29sb3IpIHtcbiAgICAgICAgaWYgKHdvcmRzIGluc3RhbmNlb2YgQXJyYXkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB3b3JkcyA9IFt3b3Jkc107XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHRoYXQuX2hpZ2hsaWdodGVkV29yZHNbd29yZF0gPSBjb2xvcjtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhpZ2h0bGlnaHQoKTtcbiAgICB9LFxuXG4gICAgdW5oaWdobGlnaHQgOiBmdW5jdGlvbih3b3Jkcykge1xuICAgICAgICBpZiAod29yZHMgaW5zdGFuY2VvZiBBcnJheSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdvcmRzID0gW3dvcmRzXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHdvcmRzLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoYXQuX2hpZ2hsaWdodGVkV29yZHNbd29yZF1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhpZ2h0bGlnaHQoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhpZ2h0bGlnaHQgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgaGlnaGxpZ2h0Q3R4ID0gdGhpcy5faGlnaGxpZ2h0Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGhpZ2hsaWdodEN0eC5jbGVhclJlY3QoMCwwLHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCx0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5faGlnaGxpZ2h0ZWRXb3JkcykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG4gICAgICAgICAgICB2YXIgY2xyID0gdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXTtcbiAgICAgICAgICAgIGlmIChyZW5kZXJJbmZvKSB7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0Q3R4LmZpbGxTdHlsZSA9IGNscjtcbiAgICAgICAgICAgICAgICBoaWdobGlnaHRDdHguZm9udCA9IHJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHJlbmRlckluZm8uZm9udEZhbWlseTtcbiAgICAgICAgICAgICAgICBoaWdobGlnaHRDdHguZmlsbFRleHQod29yZCxyZW5kZXJJbmZvLngscmVuZGVySW5mby55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXHQvKipcblx0ICogU2V0IGEgaGFuZGxlciBmb3IgbW91c2luZyBvdmVyIGEgd29yZFxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IGEgaGFuZGxlciBmb3IgbW91c2luZyBvdXQgb2YgYSB3b3JkXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRvbldvcmRPdXQgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3V0ID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuICAgIC8qKlxuICAgICAqIFNldCBhIGhhbmRsZXIgZm9yIGNsaWNraW5nIG9uIGEgd29yZFxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogQHJldHVybnMge0Nsb3VkNX1cbiAgICAgKi9cbiAgICBvbldvcmRDbGljayA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fb25Xb3JkQ2xpY2sgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgZmFtaWx5IGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gZm9udCAtIGZvbnQgZmFtaWx5IChpZS8gJ0hlbHZldGljYScpXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Zm9udCA6IGZ1bmN0aW9uKGZvbnQpIHtcblx0XHRpZiAoZm9udCkge1xuXHRcdFx0dGhpcy5fZm9udCA9IGZvbnQ7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnQ7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1pbmltdW0gZm9udCBzaXplIGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gbWluRm9udFNpemUgLSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtaW5Gb250U2l6ZSA6IGZ1bmN0aW9uKG1pbkZvbnRTaXplKSB7XG5cdFx0aWYgKG1pbkZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9taW5Gb250U2l6ZSA9IG1pbkZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9taW5Gb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWF4aW11bSBmb250IHNpemUgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBtYXhGb250U2l6ZSAtIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1heEZvbnRTaXplIDogZnVuY3Rpb24obWF4Rm9udFNpemUpIHtcblx0XHRpZiAobWF4Rm9udFNpemUpIHtcblx0XHRcdHRoaXMuX21heEZvbnRTaXplID0gbWF4Rm9udFNpemU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21heEZvbnRTaXplO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtYXhpbXVtIG51bWJlciBvZiB3b3JkcyB0byBiZSByZW5kZXJlZCBpbiB0aGUgY2xvdWRcblx0ICogQHBhcmFtIG1heFdvcmRzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWF4V29yZHMgOiBmdW5jdGlvbihtYXhXb3Jkcykge1xuXHRcdGlmIChtYXhXb3JkcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLl9tYXhXb3JkcyA9IG1heFdvcmRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9tYXhXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyBjb2xvcnNcblx0ICogQHBhcmFtIGNvbG9yIC0gY2FuIGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nOlxuXHQgKiBcdFx0MSkgIEEgZmlsbFN0eWxlIHN0cmluZyAoaWUvICdyZWQnLCdyZ2IoMjU1LDI1NSwwKScsIGV0Yylcblx0ICogXHQgICAgMikgIEFuIGFycmF5IG9mIGZpbGxTdHlsZSBzdHJpbmdzXG5cdCAqIFx0ICAgIDMpICBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIGZpbGxTdHlsZSBzdHJpbmcgZ2l2ZW4gdGhlIHJlbmRlckluZm8gZm9yIHRoZSB3b3JkLiAgaWUvXG5cdCAqIFx0ICAgICAgICAgICAgIGZ1bmN0aW9uKHJlbmRlckluZm8pIHtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB3b3JkID0gcmVuZGVySW5mby53b3JkO1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gcmVuZGVySW5mby5jb3VudDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB4UG9zID0gcmVuZGVySW5mby54O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHlQb3N0ID0gcmVuZGVySW5mby55O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgcmV0dXJuIC8vIGEgZmlsbFN0eWxlIGRlcml2ZWQgZnJvbSBhYm92ZSBwcm9wZXJ0aWVzXG5cdCAqIFx0ICAgICAgICAgICAgICB9XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y29sb3IgOiBmdW5jdGlvbihjb2xvcikge1xuXHRcdGlmIChjb2xvcikge1xuXHRcdFx0dGhpcy5fY29sb3IgPSBjb2xvcjtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29sb3I7XG5cdFx0fVxuXHR9LFxuXG4gICAgbGF5b3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9sYXlvdXQgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBMYXlvdXQgYW5kIHJlbmRlciB0aGUgd29yZCBjbG91ZCB0byB0aGUgY2FudmFzIHByb3ZpZGVkXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRnZW5lcmF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYXlvdXRBdHRyaWJ1dGVzID0ge307XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fZm9udCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5mb250ID0gdGhpcy5fZm9udDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21pbkZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1pbkZvbnRTaXplID0gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhGb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhGb250U2l6ZSA9IHRoaXMuX21heEZvbnRTaXplO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWF4V29yZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhXb3JkcyA9IHRoaXMuX21heFdvcmRzO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWFza0NhbnZhcykge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXNrQ2FudmFzID0gdGhpcy5fbWFza0NhbnZhcztcblx0XHR9XG5cblx0XHR0aGlzLl9sb2dnZXIucHVzaCgnTGF5b3V0Jyk7XG5cdFx0dGhpcy5fbGF5b3V0ID0gbmV3IExheW91dChsYXlvdXRBdHRyaWJ1dGVzKVxuXHRcdFx0LmNhbnZhcyh0aGlzLl9jYW52YXMpXG5cdFx0XHQud29yZHModGhpcy5fd29yZHMpXG4gICAgICAgICAgICAubGF5b3V0ZXIodGhpcy5fbGF5b3V0KVxuXHRcdFx0Lm9uV29yZE92ZXIodGhpcy5fb25Xb3JkT3Zlcilcblx0XHRcdC5vbldvcmRPdXQodGhpcy5fb25Xb3JkT3V0KVxuICAgICAgICAgICAgLm9uV29yZENsaWNrKHRoaXMuX29uV29yZENsaWNrKTtcblx0XHR0aGlzLl9sb2dnZXIucG9wKCk7XG5cblx0XHR0aGlzLl9yZW5kZXJJbmZvID0gdGhpcy5fbGF5b3V0LmxheW91dCgpO1xuXG5cdFx0dGhpcy5jbGVhcigpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXG5cdFx0dGhpcy5fbG9nZ2VyLnB1c2goJ1JlbmRlcicpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdHZhciB3b3JkUmVuZGVySW5mbyA9IHRoYXQuX3JlbmRlckluZm9bd29yZF07XG5cdFx0XHRpZiAod29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0Y3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcblxuXG5cdFx0XHRcdHZhciBjbHIgPSAnYmxhY2snO1xuXHRcdFx0XHRpZiAodGhhdC5fY29sb3IpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0dmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoYXQuX2NvbG9yLmxlbmd0aCk7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcltpZHhdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fY29sb3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3Iod29yZFJlbmRlckluZm8pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9IGNscjtcblx0XHRcdFx0Y3R4LmZpbGxUZXh0KHdvcmQsd29yZFJlbmRlckluZm8ueCx3b3JkUmVuZGVySW5mby55KTtcblxuXHRcdFx0XHRpZiAodGhhdC5kZWJ1Zykge1xuXHRcdFx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuX2xvZ2dlci5wb3AoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuICAgIC8qKlxuICAgICAqIFNhdmVzIGltYWdlIHRvIGxvY2FsIGZpbGVzeXN0ZW0gd2l0aCB0aGUgZm9ybWF0L2ZpbGVuYW1lIHNwZWNpZmllZFxuICAgICAqIEBwYXJhbSBmb3JtYXQgKG9wdGlvbmFsKSAtIFRoZSBtaW1ldHlwZSB0byBzYXZlIGFzLiAgIERlZmF1bHQgJ2ltYWdlL3BuZydcbiAgICAgKiBAcGFyYW0gZmlsZW5hbWUgKG9wdGlvbmFsKSAtIFRoZSBmaWxlbmFtZSB0byBzYXZlIGl0IGFzLiAgICdkb3dubG9hZCcgYnkgZGVmYXVsdFxuICAgICAqL1xuICAgIHNhdmUgOiBmdW5jdGlvbihmb3JtYXQsZmlsZW5hbWUpIHtcbiAgICAgICAgdmFyIGRhdGFVUkkgPSB0aGlzLl9jYW52YXMudG9EYXRhVVJMKGZvcm1hdCB8fCAnaW1hZ2UvcG5nJyk7XG4gICAgICAgIHZhciB1cmlDb250ZW50ID0gZGF0YVVSSS5pbmRleE9mKCcsJyk7XG4gICAgICAgIGRhdGFVUkkgPSBkYXRhVVJJLnN1YnN0cmluZyh1cmlDb250ZW50KTtcbiAgICAgICAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGxpbmsuaHJlZiA9ICdkYXRhOmFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbTtiYXNlNjQnICsgZGF0YVVSSTtcbiAgICAgICAgaWYgKGZpbGVuYW1lKSB7XG4gICAgICAgICAgICBsaW5rLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgbGluay5jbGljaygpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsb3VkNTtcbm1vZHVsZS5leHBvcnRzLlN0b3B3b3JkcyA9IFN0b3B3b3JkczsiLCJ2YXIgZW5nbGlzaCA9IFwiYSwgYWJvdXQsIGFib3ZlLCBhY3Jvc3MsIGFmdGVyLCBhZ2FpbiwgYWdhaW5zdCwgYWxsLCBhbG1vc3QsIGFsb25lLCBhbG9uZywgYWxyZWFkeSwgYWxzbywgYWx0aG91Z2gsIGFsd2F5cywgYW0sIGFtb25nLCBhbiwgYW5kLCBhbm90aGVyLCBhbnksIGFueWJvZHksIGFueW9uZSwgYW55dGhpbmcsIGFueXdoZXJlLCBhcmUsIGFyZWEsIGFyZWFzLCBhcmVuJ3QsIGFyb3VuZCwgYXMsIGFzaywgYXNrZWQsIGFza2luZywgYXNrcywgYXQsIGF3YXksIGIsIGJhY2ssIGJhY2tlZCwgYmFja2luZywgYmFja3MsIGJlLCBiZWNhbWUsIGJlY2F1c2UsIGJlY29tZSwgYmVjb21lcywgYmVlbiwgYmVmb3JlLCBiZWdhbiwgYmVoaW5kLCBiZWluZywgYmVpbmdzLCBiZWxvdywgYmVzdCwgYmV0dGVyLCBiZXR3ZWVuLCBiaWcsIGJvdGgsIGJ1dCwgYnksIGMsIGNhbWUsIGNhbiwgY2Fubm90LCBjYW4ndCwgY2FzZSwgY2FzZXMsIGNlcnRhaW4sIGNlcnRhaW5seSwgY2xlYXIsIGNsZWFybHksIGNvbWUsIGNvdWxkLCBjb3VsZG4ndCwgZCwgZGlkLCBkaWRuJ3QsIGRpZmZlciwgZGlmZmVyZW50LCBkaWZmZXJlbnRseSwgZG8sIGRvZXMsIGRvZXNuJ3QsIGRvaW5nLCBkb25lLCBkb24ndCwgZG93biwgZG93bmVkLCBkb3duaW5nLCBkb3ducywgZHVyaW5nLCBlLCBlYWNoLCBlYXJseSwgZWl0aGVyLCBlbmQsIGVuZGVkLCBlbmRpbmcsIGVuZHMsIGVub3VnaCwgZXZlbiwgZXZlbmx5LCBldmVyLCBldmVyeSwgZXZlcnlib2R5LCBldmVyeW9uZSwgZXZlcnl0aGluZywgZXZlcnl3aGVyZSwgZiwgZmFjZSwgZmFjZXMsIGZhY3QsIGZhY3RzLCBmYXIsIGZlbHQsIGZldywgZmluZCwgZmluZHMsIGZpcnN0LCBmb3IsIGZvdXIsIGZyb20sIGZ1bGwsIGZ1bGx5LCBmdXJ0aGVyLCBmdXJ0aGVyZWQsIGZ1cnRoZXJpbmcsIGZ1cnRoZXJzLCBnLCBnYXZlLCBnZW5lcmFsLCBnZW5lcmFsbHksIGdldCwgZ2V0cywgZ2l2ZSwgZ2l2ZW4sIGdpdmVzLCBnbywgZ29pbmcsIGdvb2QsIGdvb2RzLCBnb3QsIGdyZWF0LCBncmVhdGVyLCBncmVhdGVzdCwgZ3JvdXAsIGdyb3VwZWQsIGdyb3VwaW5nLCBncm91cHMsIGgsIGhhZCwgaGFkbid0LCBoYXMsIGhhc24ndCwgaGF2ZSwgaGF2ZW4ndCwgaGF2aW5nLCBoZSwgaGUnZCwgaGUnbGwsIGhlciwgaGVyZSwgaGVyZSdzLCBoZXJzLCBoZXJzZWxmLCBoZSdzLCBoaWdoLCBoaWdoZXIsIGhpZ2hlc3QsIGhpbSwgaGltc2VsZiwgaGlzLCBob3csIGhvd2V2ZXIsIGhvdydzLCBpLCBpJ2QsIGlmLCBpJ2xsLCBpJ20sIGltcG9ydGFudCwgaW4sIGludGVyZXN0LCBpbnRlcmVzdGVkLCBpbnRlcmVzdGluZywgaW50ZXJlc3RzLCBpbnRvLCBpcywgaXNuJ3QsIGl0LCBpdHMsIGl0J3MsIGl0c2VsZiwgaSd2ZSwgaiwganVzdCwgaywga2VlcCwga2VlcHMsIGtpbmQsIGtuZXcsIGtub3csIGtub3duLCBrbm93cywgbCwgbGFyZ2UsIGxhcmdlbHksIGxhc3QsIGxhdGVyLCBsYXRlc3QsIGxlYXN0LCBsZXNzLCBsZXQsIGxldHMsIGxldCdzLCBsaWtlLCBsaWtlbHksIGxvbmcsIGxvbmdlciwgbG9uZ2VzdCwgbSwgbWFkZSwgbWFrZSwgbWFraW5nLCBtYW4sIG1hbnksIG1heSwgbWUsIG1lbWJlciwgbWVtYmVycywgbWVuLCBtaWdodCwgbW9yZSwgbW9zdCwgbW9zdGx5LCBtciwgbXJzLCBtdWNoLCBtdXN0LCBtdXN0bid0LCBteSwgbXlzZWxmLCBuLCBuZWNlc3NhcnksIG5lZWQsIG5lZWRlZCwgbmVlZGluZywgbmVlZHMsIG5ldmVyLCBuZXcsIG5ld2VyLCBuZXdlc3QsIG5leHQsIG5vLCBub2JvZHksIG5vbiwgbm9vbmUsIG5vciwgbm90LCBub3RoaW5nLCBub3csIG5vd2hlcmUsIG51bWJlciwgbnVtYmVycywgbywgb2YsIG9mZiwgb2Z0ZW4sIG9sZCwgb2xkZXIsIG9sZGVzdCwgb24sIG9uY2UsIG9uZSwgb25seSwgb3Blbiwgb3BlbmVkLCBvcGVuaW5nLCBvcGVucywgb3IsIG9yZGVyLCBvcmRlcmVkLCBvcmRlcmluZywgb3JkZXJzLCBvdGhlciwgb3RoZXJzLCBvdWdodCwgb3VyLCBvdXJzLCBvdXJzZWx2ZXMsIG91dCwgb3Zlciwgb3duLCBwLCBwYXJ0LCBwYXJ0ZWQsIHBhcnRpbmcsIHBhcnRzLCBwZXIsIHBlcmhhcHMsIHBsYWNlLCBwbGFjZXMsIHBvaW50LCBwb2ludGVkLCBwb2ludGluZywgcG9pbnRzLCBwb3NzaWJsZSwgcHJlc2VudCwgcHJlc2VudGVkLCBwcmVzZW50aW5nLCBwcmVzZW50cywgcHJvYmxlbSwgcHJvYmxlbXMsIHB1dCwgcHV0cywgcSwgcXVpdGUsIHIsIHJhdGhlciwgcmVhbGx5LCByaWdodCwgcm9vbSwgcm9vbXMsIHMsIHNhaWQsIHNhbWUsIHNhdywgc2F5LCBzYXlzLCBzZWNvbmQsIHNlY29uZHMsIHNlZSwgc2VlbSwgc2VlbWVkLCBzZWVtaW5nLCBzZWVtcywgc2Vlcywgc2V2ZXJhbCwgc2hhbGwsIHNoYW4ndCwgc2hlLCBzaGUnZCwgc2hlJ2xsLCBzaGUncywgc2hvdWxkLCBzaG91bGRuJ3QsIHNob3csIHNob3dlZCwgc2hvd2luZywgc2hvd3MsIHNpZGUsIHNpZGVzLCBzaW5jZSwgc21hbGwsIHNtYWxsZXIsIHNtYWxsZXN0LCBzbywgc29tZSwgc29tZWJvZHksIHNvbWVvbmUsIHNvbWV0aGluZywgc29tZXdoZXJlLCBzdGF0ZSwgc3RhdGVzLCBzdGlsbCwgc3VjaCwgc3VyZSwgdCwgdGFrZSwgdGFrZW4sIHRoYW4sIHRoYXQsIHRoYXQncywgdGhlLCB0aGVpciwgdGhlaXJzLCB0aGVtLCB0aGVtc2VsdmVzLCB0aGVuLCB0aGVyZSwgdGhlcmVmb3JlLCB0aGVyZSdzLCB0aGVzZSwgdGhleSwgdGhleSdkLCB0aGV5J2xsLCB0aGV5J3JlLCB0aGV5J3ZlLCB0aGluZywgdGhpbmdzLCB0aGluaywgdGhpbmtzLCB0aGlzLCB0aG9zZSwgdGhvdWdoLCB0aG91Z2h0LCB0aG91Z2h0cywgdGhyZWUsIHRocm91Z2gsIHRodXMsIHRvLCB0b2RheSwgdG9nZXRoZXIsIHRvbywgdG9vaywgdG93YXJkLCB0dXJuLCB0dXJuZWQsIHR1cm5pbmcsIHR1cm5zLCB0d28sIHUsIHVuZGVyLCB1bnRpbCwgdXAsIHVwb24sIHVzLCB1c2UsIHVzZWQsIHVzZXMsIHYsIHZlcnksIHcsIHdhbnQsIHdhbnRlZCwgd2FudGluZywgd2FudHMsIHdhcywgd2Fzbid0LCB3YXksIHdheXMsIHdlLCB3ZSdkLCB3ZWxsLCB3ZSdsbCwgd2VsbHMsIHdlbnQsIHdlcmUsIHdlJ3JlLCB3ZXJlbid0LCB3ZSd2ZSwgd2hhdCwgd2hhdCdzLCB3aGVuLCB3aGVuJ3MsIHdoZXJlLCB3aGVyZSdzLCB3aGV0aGVyLCB3aGljaCwgd2hpbGUsIHdobywgd2hvbGUsIHdob20sIHdobydzLCB3aG9zZSwgd2h5LCB3aHkncywgd2lsbCwgd2l0aCwgd2l0aGluLCB3aXRob3V0LCB3b24ndCwgd29yaywgd29ya2VkLCB3b3JraW5nLCB3b3Jrcywgd291bGQsIHdvdWxkbid0LCB4LCB5LCB5ZWFyLCB5ZWFycywgeWVzLCB5ZXQsIHlvdSwgeW91J2QsIHlvdSdsbCwgeW91bmcsIHlvdW5nZXIsIHlvdW5nZXN0LCB5b3VyLCB5b3UncmUsIHlvdXJzLCB5b3Vyc2VsZiwgeW91cnNlbHZlcywgeW91J3ZlLCB6XCI7XG52YXIgZnJlbmNoID0gXCJhbG9ycyxhdSxhdWN1bnMsYXVzc2ksYXV0cmUsYXZhbnQsYXZlYyxhdm9pcixib24sY2FyLGNlLGNlbGEsY2VzLGNldXgsY2hhcXVlLGNpLGNvbW1lLGNvbW1lbnQsZGFucyxkZXMsZHUsZGVkYW5zLGRlaG9ycyxkZXB1aXMsZGV2cmFpdCxkb2l0LGRvbmMsZG9zLGTDqWJ1dCxlbGxlLGVsbGVzLGVuLGVuY29yZSxlc3NhaSxlc3QsZXQsZXUsZmFpdCxmYWl0ZXMsZm9pcyxmb250LGhvcnMsaWNpLGlsLGlscyxqZSxqdXN0ZSxsYSxsZSxsZXMsbGV1cixsw6AsbWEsbWFpbnRlbmFudCxtYWlzLG1lcyxtaW5lLG1vaW5zLG1vbixtb3QsbcOqbWUsbmksbm9tbcOpcyxub3RyZSxub3VzLG91LG/DuSxwYXIscGFyY2UscGFzLHBldXQscGV1LHBsdXBhcnQscG91cixwb3VycXVvaSxxdWFuZCxxdWUscXVlbCxxdWVsbGUscXVlbGxlcyxxdWVscyxxdWksc2Esc2FucyxzZXMsc2V1bGVtZW50LHNpLHNpZW4sc29uLHNvbnQsc291cyxzb3lleiwgc3VqZXQsc3VyLHRhLHRhbmRpcyx0ZWxsZW1lbnQsdGVscyx0ZXMsdG9uLHRvdXMsdG91dCx0cm9wLHRyw6hzLHR1LHZvaWVudCx2b250LHZvdHJlLHZvdXMsdnUsw6dhLMOpdGFpZW50LMOpdGF0LMOpdGlvbnMsw6l0w6ksw6p0cmUsZGUsdW4saSxxdSxkLGwsbmUsc2UsdW5lLG4scyxtLHBsdXMsw6AsJ3VuLCdpbCwnZXN0LGx1aSxtbWUsYXZhaXQsYywtLC0tLC0tLSxtZSxqLD9cIjtcbnZhciBlbmdsaXNoV29yZHMgPSBlbmdsaXNoLnNwbGl0KCcsJyk7XG52YXIgZnJlbmNoV29yZHMgPSBmcmVuY2guc3BsaXQoJywnKTtcblxuZXhwb3J0cy5FbmdsaXNoID0gZW5nbGlzaFdvcmRzO1xuZXhwb3J0cy5GcmVuY2ggPSBmcmVuY2hXb3JkcztcblxuXG5cblxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG52YXIgVGV4dEJpdG1hcCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY29udGV4dCA9IG51bGw7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG5cblx0dGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdHRoaXMuX2NhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggfHwgNjQwO1xuXHR0aGlzLl9jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgNDgwO1xuXHR0aGlzLl9jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG5cdH1cblxuXHR0aGlzLl9iaXRtYXAgPSBfLmNyZWF0ZUFycmF5KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jYW52YXMud2lkdGg7IGkrKykge1xuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHR0aGlzLl9iaXRtYXBbaV1bal0gPSBmYWxzZTtcblx0XHR9XG5cdH1cbn07XG5cblRleHRCaXRtYXAucHJvdG90eXBlID0gXy5leHRlbmQoVGV4dEJpdG1hcC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogQ3JlYXRlIGEgYml0bWFwIGZvciB0aGUgZ2l2ZW4gd29yZC9mb250IHBhaXIuICAgUmV0dXJuIGEgcmVuZGVySW5mbyBvYmplY3QgZm9yIHRoaXNcblx0ICogQHBhcmFtIHRleHQgLSBhIHN0cmluZyB0aGF0IHdlIHdhbnQgdG8gYml0bWFwIChpZS8gYSB3b3JkKVxuXHQgKiBAcGFyYW0gZm9udEhlaWdodCAtIHRoZSBoZWlnaHQgb2YgdGhlIGZvbnRcblx0ICogQHBhcmFtIGZvbnRGYW1pbHkgLSB0aGUgZm9udCBmYW1pbHlcblx0ICogQHJldHVybnMge3tiYjoge29mZnNldFg6IG51bWJlciwgb2Zmc2V0WTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcn0sIGJpdG1hcDogKiwgZm9udFNpemU6ICosIGZvbnRGYW1pbHk6ICp9fVxuXHQgKi9cblx0Y3JlYXRlIDogZnVuY3Rpb24odGV4dCxmb250SGVpZ2h0LGZvbnRGYW1pbHkpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY29udGV4dDtcblx0XHRjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcblx0XHRjdHguZmlsbFJlY3QoMCwwLHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdHZhciB0ZXh0UmVuZGVyWCA9IDU7XG5cdFx0dmFyIHRleHRSZW5kZXJZID0gTWF0aC5mbG9vcih0aGlzLl9jYW52YXMuaGVpZ2h0LzIpO1xuXG5cdFx0Ly8gRmlsbCB0aGUgZm9udFxuXHRcdGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGN0eC5mb250ID0gZm9udEhlaWdodCArICdweCAnICsgZm9udEZhbWlseTtcblx0XHRjdHguZmlsbFRleHQodGV4dCx0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSk7XG5cblx0XHR2YXIgd2lkdGggPSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGg7XG5cblx0XHQvLyBHZXQgYSByZWxheGVkIGJvdW5kaW5nIGJveCB0byBncmFiIGZyb20gdGhlIGNhbnZhc1xuXHRcdHZhciBzdGFydFggPSB0ZXh0UmVuZGVyWDtcblx0XHR2YXIgc3RhcnRZID0gdGV4dFJlbmRlclkgLSBmb250SGVpZ2h0IC0gMjtcblx0XHR2YXIgZW5kWCA9IHN0YXJ0WCArIHdpZHRoICsgdGV4dFJlbmRlclg7XG5cdFx0dmFyIGVuZFkgPSBzdGFydFkgKyBmb250SGVpZ2h0ICsgZm9udEhlaWdodCowLjU7XG5cblxuXG5cdFx0dmFyIGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoc3RhcnRYLHN0YXJ0WSxlbmRYIC0gc3RhcnRYLGVuZFkgLSBzdGFydFkpO1xuXG5cdFx0dmFyIGJvb2xlYW5CaXRtYXAgPSBfLmNyZWF0ZUFycmF5KGltYWdlRGF0YS53aWR0aCxpbWFnZURhdGEuaGVpZ2h0KTtcblx0XHR2YXIgeCA9IDA7XG5cdFx0dmFyIHkgPSAwO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VEYXRhLmRhdGEubGVuZ3RoOyBpKz00KSB7XG5cblx0XHRcdGJvb2xlYW5CaXRtYXBbeF1beV0gPSAgaW1hZ2VEYXRhLmRhdGFbaV0gIT09IDA7XG5cdFx0XHR4Kys7XG5cdFx0XHRpZiAoeCA9PT0gaW1hZ2VEYXRhLndpZHRoKSB7XG5cdFx0XHRcdHggPSAwO1xuXHRcdFx0XHR5Kys7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHR2YXIgbWluWCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1pblkgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhYID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFkgPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRmb3IgKHggPSAwOyB4IDwgYm9vbGVhbkJpdG1hcC5sZW5ndGg7IHgrKykge1xuXHRcdFx0Zm9yICh5ID0gMDsgeSA8IGJvb2xlYW5CaXRtYXBbeF0ubGVuZ3RoOyB5KyspIHtcblx0XHRcdFx0aWYgKGJvb2xlYW5CaXRtYXBbeF1beV0pIHtcblx0XHRcdFx0XHRtaW5YID0gTWF0aC5taW4obWluWCx4KTtcblx0XHRcdFx0XHRtaW5ZID0gTWF0aC5taW4obWluWSx5KTtcblx0XHRcdFx0XHRtYXhYID0gTWF0aC5tYXgobWF4WCx4KTtcblx0XHRcdFx0XHRtYXhZID0gTWF0aC5tYXgobWF4WSx5KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFRyaW0gdGhlIGJvdW5kaW5nIGJveCB0byBqdXN0IHBpeGVscyB0aGF0IGFyZSBmaWxsZWRcblx0XHR2YXIgdHJpbW1lZEJvb2xlYW5CaXRtYXAgPSBfLmNyZWF0ZUFycmF5KG1heFgtbWluWCxtYXhZLW1pblkpO1xuXHRcdGZvciAoeCA9IDA7IHggPCBtYXhYLW1pblg7IHgrKykge1xuXHRcdFx0Zm9yICh5ID0gMDsgeSA8IG1heFktbWluWTsgeSsrKSB7XG5cdFx0XHRcdHRyaW1tZWRCb29sZWFuQml0bWFwW3hdW3ldID0gYm9vbGVhbkJpdG1hcFttaW5YK3hdW21pblkreV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICd5ZWxsb3cnO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3Qoc3RhcnRYLHN0YXJ0WSxlbmRYLXN0YXJ0WCxlbmRZLXN0YXJ0WSk7XG5cdFx0fVxuXG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3JlZCc7XG5cdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclgsdGV4dFJlbmRlclksdGhpcy5fY2FudmFzLndpZHRoLCB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdHZhciBiYldpZHRoID0gbWF4WC1taW5YO1xuXHRcdHZhciBiYkhlaWdodCA9IG1heFktbWluWTtcblx0XHR2YXIgYmJPZmZzZXRYID0gLSh0ZXh0UmVuZGVyWCAtIChzdGFydFggKyBtaW5YICkpO1xuXHRcdHZhciBiYk9mZnNldFkgPSAtKHRleHRSZW5kZXJZIC0gKHN0YXJ0WSArIG1pblkpKTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0Y3R4LnN0cm9rZVJlY3QodGV4dFJlbmRlclggKyBiYk9mZnNldFgsIHRleHRSZW5kZXJZICsgYmJPZmZzZXRZLCBiYldpZHRoLCBiYkhlaWdodCk7XG5cdFx0fVxuXG5cdFx0dmFyIHJlbmRlckluZm8gPSB7XG5cdFx0XHRiYiA6IHtcblx0XHRcdFx0b2Zmc2V0WCA6IGJiT2Zmc2V0WCxcblx0XHRcdFx0b2Zmc2V0WSA6IGJiT2Zmc2V0WSxcblx0XHRcdFx0d2lkdGggOiBiYldpZHRoLFxuXHRcdFx0XHRoZWlnaHQgOiBiYkhlaWdodFxuXHRcdFx0fSxcblx0XHRcdGJpdG1hcCA6IHRyaW1tZWRCb29sZWFuQml0bWFwLFxuXHRcdFx0Zm9udFNpemUgOiBmb250SGVpZ2h0LFxuXHRcdFx0Zm9udEZhbWlseSA6IGZvbnRGYW1pbHlcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHJlbmRlckluZm87XG5cdH0sXG5cblx0LyoqXG5cdCAqIHRlc3RzIHdoZXRoZXIgYSByZW5kZXJJbmZvIG9iamVjdCBmaXRzIGludG8gYSBnbG9iYWwgYm9vbGVhbiBiaXRtYXBcblx0ICogQHBhcmFtIHJlbmRlckluZm8gLSByZW5kZXJJbmZvIGZvciBhIHdvcmQgKHJldHVybmVkIGZyb20gY3JlYXRlKVxuXHQgKiBAcGFyYW0gYml0bWFwIC0gc2NlbmUgYml0bWFwXG5cdCAqIEByZXR1cm5zIHtib29sZWFufSAtIHRydWUgaWYgd29yZCBmaXRzLCBmYWxzZSBvdGhlcndpc2Vcblx0ICovXG5cdGZpdHMgOiBmdW5jdGlvbihyZW5kZXJJbmZvLGJpdG1hcCkge1xuXHRcdHJlbmRlckluZm8ueCA9IE1hdGguZmxvb3IocmVuZGVySW5mby54KTtcblx0XHRyZW5kZXJJbmZvLnkgPSBNYXRoLmZsb29yKHJlbmRlckluZm8ueSk7XG5cblx0XHR2YXIgc3RhcnRYID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuXHRcdHZhciBzdGFydFkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG5cblx0XHR2YXIgYml0bWFwV2lkdGggPSBiaXRtYXAubGVuZ3RoO1xuXHRcdHZhciBiaXRtYXBIZWlnaHQgPSBiaXRtYXBbMF0ubGVuZ3RoO1xuXG5cdFx0dmFyIGhpdEVkZ2UgPSBzdGFydFggPCAwIHx8IHN0YXJ0WSA8IDA7XG5cdFx0dmFyIGhpdE90aGVyID0gZmFsc2U7XG5cdFx0dmFyIGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJlbmRlckluZm8uYmIud2lkdGggJiYgIWRvZXNudEZpdDsgaSsrKSB7XG5cdFx0XHR2YXIgdSA9IHN0YXJ0WCArIGk7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHJlbmRlckluZm8uYmIuaGVpZ2h0ICYmICFkb2VzbnRGaXQ7IGorKykge1xuXHRcdFx0XHR2YXIgdiA9IHN0YXJ0WSArIGo7XG5cdFx0XHRcdGlmICh1ID49IGJpdG1hcFdpZHRoIHx8IHYgPj0gYml0bWFwSGVpZ2h0KSB7XG5cdFx0XHRcdFx0aGl0RWRnZSA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoYml0bWFwW3VdW3ZdKSB7XG5cdFx0XHRcdFx0aGl0T3RoZXIgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiAhZG9lc250Rml0O1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0Qml0bWFwOyIsIlxudmFyIFV0aWwgPSB7XG5cblx0ZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG5cdFx0dmFyIGtleSwgaSwgc291cmNlO1xuXHRcdGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdCAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuXHRcdCAgZm9yIChrZXkgaW4gc291cmNlKSB7XG5cdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdCAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG5cdFx0XHR9XG5cdFx0ICB9XG5cdFx0fVxuXHRcdHJldHVybiBkZXN0O1xuXHR9LFxuXG5cdGxlcnAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gbWluICsgKHQqKG1heC1taW4pKTtcblx0fSxcblxuXHRzdGVwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIE1hdGgucm91bmQodGhpcy5sZXJwKG1pbixtYXgsdCkpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBIZWxwZXIgZm9yIGNyZWF0aW5nIGFuIGFycmF5XG5cdCAqIEBwYXJhbSBsZW5ndGhcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0Y3JlYXRlQXJyYXkgOiBmdW5jdGlvbihsZW5ndGgpIHtcblx0XHR2YXIgYXJyID0gbmV3IEFycmF5KGxlbmd0aCB8fCAwKSxcblx0XHRcdGkgPSBsZW5ndGg7XG5cblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHRcdHdoaWxlKGktLSkge1xuXHRcdFx0XHRhcnJbbGVuZ3RoLTEgLSBpXSA9IHRoaXMuY3JlYXRlQXJyYXkuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFycjtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(3)
});
