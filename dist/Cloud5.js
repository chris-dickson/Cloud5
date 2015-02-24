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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9zdG9wd29yZHMuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBUZXh0Qml0bWFwID0gcmVxdWlyZSgnLi90ZXh0Yml0bWFwJyk7XG5cblxuLyoqXG4gKiBMYXlvdXQgY29uc3RydWN0b3JcbiAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fd29yZHMgPSBudWxsO1xuXHR0aGlzLl9iaXRtYXAgPSBudWxsO1xuICAgIHRoaXMuX3JlbmRlckluZm8gPSBudWxsO1xuXHR0aGlzLl90ZXh0Qml0bWFwcGVyID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSB0aGUgdGV4dCBiaXRtYXBwZXIgYW5kIGNyZWF0ZSBvdXIgYm9vbGVhbiBiaXRtYXAgb2YgdGhlIHNjZW5lXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcyA9IHtcblx0XHRcdHdpZHRoIDogdGhpcy5fY2FudmFzLndpZHRoLFxuXHRcdFx0aGVpZ2h0IDogdGhpcy5fY2FudmFzLmhlaWdodFxuXHRcdH07XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzLmRlYnVnID0gdHJ1ZTtcblx0XHR9XG5cblx0XHR0aGlzLl90ZXh0Qml0bWFwcGVyID0gbmV3IFRleHRCaXRtYXAodGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cdFx0dGhpcy5fYml0bWFwID0gXy5jcmVhdGVBcnJheSh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jYW52YXMud2lkdGg7IGkrKykge1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdFx0dGhpcy5fYml0bWFwW2ldW2pdID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG4gICAgLyoqXG4gICAgICogSGl0IHRlc3QgYSBwb3NpdGlvbiB4LHkgZm9yIGEgd29yZC4gIFRPRE86ICBtYWtlIHRoaXMgd2F5IGZhc3Rlci4gICBCU1AgVHJlZT9cbiAgICAgKiBAcGFyYW0geCAtIHggb2Zmc2V0IGludG8gY2FudmFzXG4gICAgICogQHBhcmFtIHkgLSB5IG9mZnNldCBpbnRvIGNhbnZhc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2hpdCA6IGZ1bmN0aW9uKHgseSkge1xuICAgICAgICB2YXIgd29yZCA9IG51bGw7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgICAvLyBHZXQgYSBsaXN0IG9mIGJvdW5kaW5nIGJveGVzIHRoYXQgeCx5IGFyZSBpblxuICAgICAgICB2YXIgY29udGFpbmVkV29yZHMgPSBPYmplY3Qua2V5cyh0aGlzLl9yZW5kZXJJbmZvKS5maWx0ZXIoZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuICAgICAgICAgICAgdmFyIG1pblggPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFg7XG4gICAgICAgICAgICB2YXIgbWluWSA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WTtcbiAgICAgICAgICAgIHZhciBtYXhYID0gbWluWCArIHJlbmRlckluZm8uYmIud2lkdGg7XG4gICAgICAgICAgICB2YXIgbWF4WSA9IG1pblkgKyByZW5kZXJJbmZvLmJiLmhlaWdodDtcbiAgICAgICAgICAgIGlmIChtaW5YIDw9IHggJiYgeCA8PSBtYXhYICYmIG1pblkgPD0geSAmJiB5IDw9IG1heFkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTb3J0IGJ5IHNpemVcbiAgICAgICAgY29udGFpbmVkV29yZHMuc29ydChmdW5jdGlvbih3MSx3Mikge1xuICAgICAgICAgICAgdmFyIGIxID0gdGhhdC5fcmVuZGVySW5mb1t3MV0uYmI7XG4gICAgICAgICAgICB2YXIgYjIgPSB0aGF0Ll9yZW5kZXJJbmZvW3cyXS5iYjtcbiAgICAgICAgICAgIHZhciBiMUEgPSBiMS53aWR0aCAqIGIxLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBiMkEgPSBiMi53aWR0aCAqIGIyLmhlaWdodDtcbiAgICAgICAgICAgIHJldHVybiBiMUEgLSBiMkE7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgd29yZCB3aXRoIHRoZSBzbWFsbGVzdCBib3VuZGluZyBib3hcbiAgICAgICAgaWYgKGNvbnRhaW5lZFdvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHdvcmQgPSBjb250YWluZWRXb3Jkc1swXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd29yZDtcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGNhbnZhcyBmb3IgdGhlIGxheW91dFxuXHQgKiBAcGFyYW0gY2FudmFzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIHdvcmRzIHRvIGxheW91dFxuXHQgKiBAcGFyYW0gd29yZHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3b3JkcyA6IGZ1bmN0aW9uKHdvcmRzKSB7XG5cdFx0aWYgKHdvcmRzKSB7XG5cdFx0XHR0aGlzLl93b3JkcyA9IHdvcmRzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cbiAgICBsYXlvdXRlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fbGF5b3V0ZXIgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXQgd29yZE92ZXIgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3ZlciA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdmVyID0gaGFuZGxlcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdXQgaGFuZGxlclxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgd29yZENsaWNrIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtMYXlvdXR9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBsYWNlcyBhIHdvcmQgd2l0aCB0aGUgZ2l2ZW4gcmVuZGVyIGluZm8gaW50byB0aGUgc2NlbmUuICBVcGRhdGUgdGhlXG4gICAgICogc2NlbmUgYm9vbGVhbiBiaXRtYXBcbiAgICAgKiBAcGFyYW0gd29yZCAtIHN0cmluZ1xuICAgICAqIEBwYXJhbSByZW5kZXJJbmZvIC0gcmVuZGVyIGluZm8gZnJvbSB0aGUgdGV4dCBiaXRtYXBwZXJcbiAgICAgKi9cbiAgICBwbGFjZSA6IGZ1bmN0aW9uKHdvcmQscmVuZGVySW5mbykge1xuICAgICAgICB2YXIgYml0bWFwV2lkdGggPSByZW5kZXJJbmZvLmJpdG1hcC5sZW5ndGg7XG4gICAgICAgIHZhciBiaXRtYXBIZWlnaHQgPSByZW5kZXJJbmZvLmJpdG1hcFswXS5sZW5ndGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBiaXRtYXBXaWR0aDsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGJpdG1hcEhlaWdodDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHUgPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFggKyBpO1xuICAgICAgICAgICAgICAgIHZhciB2ID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZICsgajtcblxuICAgICAgICAgICAgICAgIGlmIChyZW5kZXJJbmZvLmJpdG1hcFtpXVtqXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaXRtYXBbdV1bdl0gPSB3b3JkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZW5kZXJJbmZvXG4gICAgICogQHJldHVybnMgeyp8Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmaXRzIDogZnVuY3Rpb24ocmVuZGVySW5mbykge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGV4dEJpdG1hcHBlci5maXRzKHJlbmRlckluZm8sdGhpcy5fYml0bWFwKVxuICAgIH0sXG5cblxuICAgIHJhbmRvbUxheW91dCA6IGZ1bmN0aW9uKHdvcmRzLHJlbmRlckluZm8sd2lkdGgsaGVpZ2h0KSB7XG4gICAgICAgIC8vIExheW91dCBlYWNoIHdvcmRcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciBwbGFjZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBhdHRlbXB0cyA9IDEwMDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgICAgICAgICAgICB0aGF0LmRlYnVnRHJhd0FsbCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgd29yZFJlbmRlckluZm8gPSByZW5kZXJJbmZvW3dvcmRdO1xuXG4gICAgICAgICAgICAvLyBUcnkgcGxhY2luZyB0aGUgd29yZCBhbmQgc2VlIGlmIGl0IGZpdHMvaGl0cyBhbnl0aGluZyBlbHNlIGFscmVhZHkgcGxhY2VkXG4gICAgICAgICAgICB3aGlsZSAoIXBsYWNlZCAmJiBhdHRlbXB0cyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHdpZHRoKTtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICB3b3JkUmVuZGVySW5mby54ID0geDtcbiAgICAgICAgICAgICAgICB3b3JkUmVuZGVySW5mby55ID0geTtcblxuICAgICAgICAgICAgICAgIC8vIElmIGl0IGZpdHMsIHVwZGF0ZSB0aGUgYml0bWFwIGZvciB0aGUgZW50aXJlIHNjZW5lIHRvIHNheSB0aG9zZSBwaXhlbHMgYXJlIG9jY3VwaWVkXG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuZml0cyh3b3JkUmVuZGVySW5mbykpIHtcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wbGFjZSh3b3JkLCB3b3JkUmVuZGVySW5mbyk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhdHRlbXB0cy0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghcGxhY2VkKSB7XG4gICAgICAgICAgICAgICAgd29yZFJlbmRlckluZm8ueCA9IC0xO1xuICAgICAgICAgICAgICAgIHdvcmRSZW5kZXJJbmZvLnkgPSAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlYnVnIHJvdXRpbmUgdG8gZHJhdyBvdXIgd29yZHMgYXMgd2UgbGF5IHRoZW0gb3V0XG4gICAgICogQHBhcmFtIGN0eCAtIGNhbnZhcyBjb250ZXh0XG4gICAgICogQHBhcmFtIHcgLSB3aWR0aFxuICAgICAqIEBwYXJhbSBoIC0gaGVpZ2h0XG4gICAgICovXG4gICAgZGVidWdEcmF3QWxsIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjdHguY2xlYXJSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgd29yZFJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuICAgICAgICAgICAgaWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG4gICAgICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIHRoZSBsYXlvdXRcblx0ICogQHJldHVybnMge3t9fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW5pdGlhbGl6ZSgpO1xuXHRcdHRoaXMuX3JlbmRlckluZm8gPSB7fTtcblxuXHRcdC8vIEdldCBjb3VudHMgZm9yIGVhY2ggd29yZCwgdGhlbiBmaWd1cmUgb3V0IHRoZSBmb250IHNpemUgZm9yIGVhY2ggd29yZC4gICBDcmVhdGUgYSBib29sZWFuIGJpdG1hcCBhbmRcblx0XHQvLyBib3VuZGluZyBib3ggZm9yIGVhY2ggd29yZFxuXHRcdGlmICh0aGlzLl93b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdFx0dmFyIG1heENvdW50ID0gMDtcblxuXHRcdFx0T2JqZWN0LmtleXModGhpcy5fd29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKHRoYXQuX3dvcmRzW3dvcmRdLG1pbkNvdW50KTtcblx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heCh0aGF0Ll93b3Jkc1t3b3JkXSxtYXhDb3VudCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gU29ydCB0aGUgd29yZHMgYnkgZnJlcXVlbmN5XG5cdFx0XHR2YXIgc29ydGVkV29yZEFycmF5ID0gT2JqZWN0LmtleXModGhpcy5fd29yZHMpLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcblx0XHRcdFx0cmV0dXJuIHRoYXQuX3dvcmRzW3cyXS10aGF0Ll93b3Jkc1t3MV07XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKHRoaXMubWF4V29yZHMgPiAwICYmIHNvcnRlZFdvcmRBcnJheS5sZW5ndGggPiB0aGlzLm1heFdvcmRzKSB7XG5cdFx0XHRcdHNvcnRlZFdvcmRBcnJheSA9IHNvcnRlZFdvcmRBcnJheS5zcGxpY2UoMCx0aGlzLm1heFdvcmRzKTtcblx0XHRcdH1cblxuXG5cdFx0XHR2YXIgbWluRm9udFNpemUgPSB0aGlzLm1pbkZvbnRTaXplIHx8IDEwO1xuXHRcdFx0dmFyIG1heEZvbnRTaXplID0gdGhpcy5tYXhGb250U2l6ZSB8fCAyMDA7XG5cdFx0XHRzb3J0ZWRXb3JkQXJyYXkuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cblx0XHRcdFx0dmFyIHQgPSAodGhhdC5fd29yZHNbd29yZF0gLSBtaW5Db3VudCkvKG1heENvdW50LW1pbkNvdW50KTtcblx0XHRcdFx0dmFyIGZvbnRTaXplID1fLnN0ZXAobWluRm9udFNpemUsbWF4Rm9udFNpemUsdCk7XG5cblx0XHRcdFx0dmFyIGJpdG1hcCA9IHRoYXQuX3RleHRCaXRtYXBwZXIuY3JlYXRlKHdvcmQsZm9udFNpemUsdGhhdC5mb250IHx8ICdDYWxpYnJpJyk7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0gPSBiaXRtYXA7XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0uY291bnQgPSB0aGF0Ll93b3Jkc1t3b3JkXTtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5taW5Db3VudCA9IG1pbkNvdW50O1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLm1heENvdW50ID0gbWF4Q291bnQ7XG5cdFx0XHR9KTtcblx0XHR9XG5cbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gbGF5b3V0ZXIgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHRoaXMuX2xheW91dGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9sYXlvdXRlci5jYWxsKHRoaXMsc29ydGVkV29yZEFycmF5LHRoYXQuX3JlbmRlckluZm8sdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQsdGhpcy5maXRzLHRoaXMucGxhY2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yYW5kb21MYXlvdXQoc29ydGVkV29yZEFycmF5LCB0aGF0Ll9yZW5kZXJJbmZvLHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuXG5cblx0XHQvLyBCaW5kIGhhbmRsZXJzXG5cdFx0dmFyIG92ZXJXb3JkID0gbnVsbDtcblx0XHRmdW5jdGlvbiBvbk1vdXNlTW92ZShlKSB7XG5cdFx0XHR2YXIgeCA9IGUub2Zmc2V0WDtcblx0XHRcdHZhciB5ID0gZS5vZmZzZXRZO1xuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgeCAqPSBkcHI7XG4gICAgICAgICAgICB5ICo9IGRwcjtcblxuXHRcdFx0dmFyIHdvcmQgPSB0aGF0Ll9oaXQoeCx5KTtcblx0XHRcdGlmICh3b3JkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG92ZXJXb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX29uV29yZE91dChvdmVyV29yZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3ZlcldvcmQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cblxuXHRcdFx0XHRpZiAodGhhdC5fb25Xb3JkT3Zlcikge1xuXHRcdFx0XHRcdHRoYXQuX29uV29yZE92ZXIod29yZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0b3ZlcldvcmQgPSB3b3JkO1xuXHRcdFx0fSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX29uV29yZE91dChvdmVyV29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG92ZXJXb3JkID0gbnVsbDtcbiAgICAgICAgICAgIH1cblx0XHR9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Nb3VzZUNsaWNrKGUpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB4ICo9IGRwcjtcbiAgICAgICAgICAgIHkgKj0gZHByO1xuXG4gICAgICAgICAgICB2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkQ2xpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkQ2xpY2sod29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblx0XHR0aGlzLl9jYW52YXMub25tb3VzZW1vdmUgPSBvbk1vdXNlTW92ZTtcbiAgICAgICAgdGhpcy5fY2FudmFzLm9uY2xpY2sgPSBvbk1vdXNlQ2xpY2s7XG5cblxuXHRcdHJldHVybiB0aGF0Ll9yZW5kZXJJbmZvO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIExvZ2dlciA9IGZ1bmN0aW9uKHdyaXRlTG9nKSB7XG5cdHRoaXMud3JpdGVMb2cgPSB3cml0ZUxvZztcblx0dGhpcy5sb2dzID0gW107XG59O1xuXG5Mb2dnZXIucHJvdG90eXBlID0gXy5leHRlbmQoTG9nZ2VyLnByb3RvdHlwZSwge1xuXHRwdXNoIDogZnVuY3Rpb24obGFiZWwpIHtcblx0XHRpZiAoIXRoaXMud3JpdGVMb2cpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5sb2dzLnB1c2goe1xuXHRcdFx0bGFiZWwgOiBsYWJlbCxcblx0XHRcdHRpbWUgOiBEYXRlLm5vdygpXG5cdFx0fSk7XG5cdH0sXG5cdHBvcCA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy53cml0ZUxvZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgdGFicyA9IHRoaXMubG9ncy5sZW5ndGg7XG5cdFx0dmFyIGxvZyA9IHRoaXMubG9ncy5wb3AoKTtcblx0XHR2YXIgc3RyID0gJyc7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0YWJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRzdHIgKz0gJ1xcdCc7XG5cdFx0fVxuXHRcdHZhciBlbmQgPSBEYXRlLm5vdygpO1xuXHRcdHZhciBlbGFwc2VkID0gZW5kIC0gbG9nLnRpbWU7XG5cdFx0c3RyICs9IGxvZy5sYWJlbCArICc6JyArIGVsYXBzZWQgKyAnbXMnO1xuXHRcdGNvbnNvbGUubG9nKHN0cik7XG5cdH0sXG5cblx0X21pbGxpc2Vjb25kc1RvU3RyaW5nIDogZnVuY3Rpb24obWlsbGlzZWNvbmRzKSB7XG5cdFx0dmFyIG9uZUhvdXIgPSAzNjAwMDAwO1xuXHRcdHZhciBvbmVNaW51dGUgPSA2MDAwMDtcblx0XHR2YXIgb25lU2Vjb25kID0gMTAwMDtcblx0XHR2YXIgc2Vjb25kcyA9IDA7XG5cdFx0dmFyIG1pbnV0ZXMgPSAwO1xuXHRcdHZhciBob3VycyA9IDA7XG5cdFx0dmFyIHJlc3VsdDtcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lSG91cikge1xuXHRcdFx0aG91cnMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZUhvdXIpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IGhvdXJzID4gMCA/IChtaWxsaXNlY29uZHMgLSBob3VycyAqIG9uZUhvdXIpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVNaW51dGUpIHtcblx0XHRcdG1pbnV0ZXMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZU1pbnV0ZSk7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gbWludXRlcyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gbWludXRlcyAqIG9uZU1pbnV0ZSkgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZVNlY29uZCkge1xuXHRcdFx0c2Vjb25kcyA9IE1hdGguZmxvb3IobWlsbGlzZWNvbmRzIC8gb25lU2Vjb25kKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBzZWNvbmRzID4gMCA/IChtaWxsaXNlY29uZHMgLSBzZWNvbmRzICogb25lU2Vjb25kKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChob3VycyA+IDApIHtcblx0XHRcdHJlc3VsdCA9IChob3VycyA+IDkgPyBob3VycyA6ICcwJyArIGhvdXJzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ID0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbnV0ZXMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKG1pbnV0ZXMgPiA5ID8gbWludXRlcyA6ICcwJyArIG1pbnV0ZXMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKHNlY29uZHMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKHNlY29uZHMgPiA5ID8gc2Vjb25kcyA6ICcwJyArIHNlY29uZHMpICsgJzonO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwOic7XG5cdFx0fVxuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+IDApIHtcblx0XHRcdHJlc3VsdCArPSAobWlsbGlzZWNvbmRzID4gOSA/IG1pbGxpc2Vjb25kcyA6ICcwJyArIG1pbGxpc2Vjb25kcyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCArPSAnMDAnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG52YXIgU3RvcHdvcmRzID0gcmVxdWlyZSgnLi9zdG9wd29yZHMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGVyZkxvZyA9IHRydWU7XG5cbi8qKlxuICogQ2xvdWQ1IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBDbG91ZDUgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cblx0dGhpcy5fbG9nZ2VyID0gbmV3IExvZ2dlcihwZXJmTG9nKTtcblxuXHR0aGlzLl93b3JkcyA9IHt9O1xuXHR0aGlzLl9zdG9wV29yZHMgPSB7fTtcblxuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXG4gICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzID0gbnVsbDtcbiAgICB0aGlzLl9oaWdobGlnaHRlZFdvcmRzID0gbnVsbDtcblxuXHR0aGlzLl93aWR0aCA9IG51bGw7XG5cdHRoaXMuX2hlaWdodCA9IG51bGw7XG5cdHRoaXMuX2JhY2tncm91bmRGaWxsID0gbnVsbDtcblx0dGhpcy5fb25Xb3JkT3ZlciA9IG51bGw7XG4gICAgdGhpcy5fb25Xb3JkT3V0ID0gbnVsbDtcbiAgICB0aGlzLl9vbldvcmRDbGljayA9IG51bGw7XG5cdHRoaXMuX2xheW91dCA9IG51bGw7XG4gICAgdGhpcy5fcmVuZGVySW5mbyA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkNsb3VkNS5wcm90b3R5cGUgPSBfLmV4dGVuZChDbG91ZDUucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBIVE1MNSBDYW52YXMgZWxlbWVudFxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblxuICAgICAgICAgICAgaWYgKGNhbnZhcyA9PT0gdGhpcy5fY2FudmFzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBkcHIgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHZhciBjV2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICAgICAgICB2YXIgY0hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICB2YXIgY3NzV2lkdGggPSBjV2lkdGg7XG4gICAgICAgICAgICB2YXIgY3NzSGVpZ2h0ID0gY0hlaWdodDtcbiAgICAgICAgICAgIGlmIChkcHIgPiAxKSB7XG4gICAgICAgICAgICAgICAgY1dpZHRoICo9IGRwcjtcbiAgICAgICAgICAgICAgICBjSGVpZ2h0ICo9IGRwcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0ZWRXb3JkcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXG5cblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy53aWR0aCA9IGNXaWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQgPSBjSGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoID0gY3NzV2lkdGggKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodCA9IGNzc0hlaWdodCArICdweDsnXG5cdFx0XHR0aGlzLl93aWR0aCA9IGNXaWR0aDtcblx0XHRcdHRoaXMuX2hlaWdodCA9IGNIZWlnaHQ7XG5cblxuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMud2lkdGggPSB0aGlzLl9jYW52YXMud2lkdGg7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5oZWlnaHQgPSB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnRvcCA9IHRoaXMuX2NhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUubGVmdCA9IHRoaXMuX2NhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuX2hpZ2hsaWdodENhbnZhcyx0aGlzLl9jYW52YXMpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcy4gICBJZiBub3Qgc2V0LCB1c2VzIHRoZSBpbmhlcml0ZWQgd2lkdGggZnJvbSBjYW52YXNcblx0ICogQHBhcmFtIHdpZHRoIC0gd2lkdGggaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d2lkdGggOiBmdW5jdGlvbih3aWR0aCkge1xuXHRcdGlmICh3aWR0aCkge1xuXHRcdFx0dGhpcy5yZXNpemUod2lkdGgpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLndpZHRoO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcy4gIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gaGVpZ2h0IC0gaGVpZ2h0IGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGhlaWdodCA6IGZ1bmN0aW9uKGhlaWdodCkge1xuXHRcdGlmIChoZWlnaHQpIHtcblx0XHRcdGlmICh0aGlzLl9jYW52YXMpIHtcblx0XHRcdFx0dGhpcy5yZXNpemUodW5kZWZpbmVkLGhlaWdodCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2hlaWdodDtcblx0XHR9XG5cdH0sXG5cbiAgICByZXNpemUgOiBmdW5jdGlvbih3LGgpIHtcbiAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICBpZiAodykge1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoID0gZHByICogdztcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aCA9IHcgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5fd2lkdGggPSAgZHByICogdztcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2hpZ2hsaWdodENhbnZhcykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUud2lkdGggPSB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICBpZiAoaCkge1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCA9IGRwciAqIGg7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0ID0gaCArICdweCc7XG4gICAgICAgICAgICB0aGlzLl9oZWlnaHQgPSBkcHIgKiBoO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5faGlnaGxpZ2h0Q2FudmFzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgdGV4dCBmb3Igd29yZCBjbG91ZCBnZW5lcmF0aW9uIGZyb20gYSBsYXJnZSBzdHJpbmdcblx0ICogQHBhcmFtIHRleHQgLSBhIHN0cmluZy4gICBCeSBkZWZhdWx0LCB3ZSByZW1vdmUgYWxsIHB1bmN0dWF0aW9uLiAgIEFkZGl0aW9uYWwgcnVsZXMgY2FuIGJlIGFkZGVkIGJ5XG5cdCAqIGNhbGxpbmcgdGV4dEZpbHRlcnMoLi4uKVxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0dGV4dCA6IGZ1bmN0aW9uKHRleHQpIHtcblx0XHR2YXIgZmlsdGVyZWQgPSB0ZXh0LnJlcGxhY2UoL1tcXC4sLVxcLyMhPyQlXFxeJlxcKjs6e309XFwtX2B+KCldL2csJycpO1xuXHRcdGlmICh0aGlzLl9maWx0ZXJzKSB7XG5cdFx0XHR0aGlzLl9maWx0ZXJzLmZvckVhY2goZnVuY3Rpb24oZmlsdGVyKSB7XG5cdFx0XHRcdGZpbHRlcmVkID0gdGV4dC5yZXBsYWNlKGZpbHRlciwnJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0dmFyIHdvcmRzID0gZmlsdGVyZWQuc3BsaXQoJyAnKTtcblx0XHR0aGlzLndvcmRzKHdvcmRzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGEgbGlzdCBvZiB0ZXh0IGZpbHRlcnMgKHJlZ3VsYXIgZXhwcmVzc2lvbnMpIHRvIGJlIGFwcGxpZWQuICAgUnVsZXMgdGhhdCBtYXRjaCB3aWxsIGJlIGRlbGV0ZWRcblx0ICogZnJvbSB0aGUgb3JpZ2luYWwgdGV4dCBzdHJpbmcuICBUaGV5J3JlIGFwcGxpZWQgaW4gdGhlIG9yZGVyIGdpdmVuIHRvIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIGZpbHRlcnMgLSBhbiBhcnJheSBvZiByZWd1bGFyIGV4cHJlc3Npb25zXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0dGV4dEZpbHRlcnMgOiBmdW5jdGlvbihmaWx0ZXJzKSB7XG5cdFx0aWYgKGZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMgPSBmaWx0ZXJzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9maWx0ZXJzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgc3RvcCB3b3JkcyAod29yZHMgdG8gaWdub3JlKVxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiBzdHJpbmdzIHRvIGlnbm9yZVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuX2JhY2tncm91bmRGaWxsIHx8ICd3aGl0ZSc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGJhY2tncm91bmQgZmlsbCBzdHlsZVxuXHQgKiBAcGFyYW0gZmlsbFN0eWxlIC0gYSB2YWxpZCBmaWxsU3R5bGUgc3RyaW5nXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgZm9yIHRoZSB3b3JkIGNsb3VkXG5cdCAqIEBwYXJhbSB3b3JkcyAtIGFuIGFycmF5IG9mIHdvcmRzLlxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMuX3N0b3BXb3JkcykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRoaXMuc3RvcChTdG9wd29yZHMuRW5nbGlzaCk7XG5cdFx0XHR9XG5cblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJhdykge1xuXHRcdFx0XHR2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKHRoYXQuX3N0b3BXb3Jkc1t3b3JkXSB8fCB3b3JkID09PSAnJykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBjb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHRpZiAoIWNvdW50KSB7XG5cdFx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cbiAgICBoaWdobGlnaHQgOiBmdW5jdGlvbih3b3Jkcyxjb2xvcikge1xuICAgICAgICBpZiAod29yZHMgaW5zdGFuY2VvZiBBcnJheSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdvcmRzID0gW3dvcmRzXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHdvcmRzLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXSA9IGNvbG9yO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGlnaHRsaWdodCgpO1xuICAgIH0sXG5cbiAgICB1bmhpZ2hsaWdodCA6IGZ1bmN0aW9uKHdvcmRzKSB7XG4gICAgICAgIGlmICh3b3JkcyBpbnN0YW5jZW9mIEFycmF5ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgd29yZHMgPSBbd29yZHNdO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhhdC5faGlnaGxpZ2h0ZWRXb3Jkc1t3b3JkXVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGlnaHRsaWdodCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGlnaHRsaWdodCA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciBoaWdobGlnaHRDdHggPSB0aGlzLl9oaWdobGlnaHRDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgaGlnaGxpZ2h0Q3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoLHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQpO1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9oaWdobGlnaHRlZFdvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIHZhciBjbHIgPSB0aGF0Ll9oaWdobGlnaHRlZFdvcmRzW3dvcmRdO1xuICAgICAgICAgICAgaWYgKHJlbmRlckluZm8pIHtcbiAgICAgICAgICAgICAgICBoaWdobGlnaHRDdHguZmlsbFN0eWxlID0gY2xyO1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5mb250ID0gcmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgcmVuZGVySW5mby5mb250RmFtaWx5O1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5maWxsVGV4dCh3b3JkLHJlbmRlckluZm8ueCxyZW5kZXJJbmZvLnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXQgYSBoYW5kbGVyIGZvciBtb3VzaW5nIG92ZXIgYSB3b3JkXG5cdCAqIEBwYXJhbSBoYW5kbGVyXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRvbldvcmRPdmVyIDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE92ZXIgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXQgYSBoYW5kbGVyIGZvciBtb3VzaW5nIG91dCBvZiBhIHdvcmRcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdG9uV29yZE91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdXQgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGEgaGFuZGxlciBmb3IgY2xpY2tpbmcgb24gYSB3b3JkXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuICAgICAqL1xuICAgIG9uV29yZENsaWNrIDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9vbldvcmRDbGljayA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBmYW1pbHkgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBmb250IC0gZm9udCBmYW1pbHkgKGllLyAnSGVsdmV0aWNhJylcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRmb250IDogZnVuY3Rpb24oZm9udCkge1xuXHRcdGlmIChmb250KSB7XG5cdFx0XHR0aGlzLl9mb250ID0gZm9udDtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWluaW11bSBmb250IHNpemUgZm9yIHdvcmRzXG5cdCAqIEBwYXJhbSBtaW5Gb250U2l6ZSAtIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1pbkZvbnRTaXplIDogZnVuY3Rpb24obWluRm9udFNpemUpIHtcblx0XHRpZiAobWluRm9udFNpemUpIHtcblx0XHRcdHRoaXMuX21pbkZvbnRTaXplID0gbWluRm9udFNpemU7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21pbkZvbnRTaXplO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtYXhpbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1heEZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWF4Rm9udFNpemUgOiBmdW5jdGlvbihtYXhGb250U2l6ZSkge1xuXHRcdGlmIChtYXhGb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWF4Rm9udFNpemUgPSBtYXhGb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4Rm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gbnVtYmVyIG9mIHdvcmRzIHRvIGJlIHJlbmRlcmVkIGluIHRoZSBjbG91ZFxuXHQgKiBAcGFyYW0gbWF4V29yZHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhXb3JkcyA6IGZ1bmN0aW9uKG1heFdvcmRzKSB7XG5cdFx0aWYgKG1heFdvcmRzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuX21heFdvcmRzID0gbWF4V29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX21heFdvcmRzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGNvbG9yc1xuXHQgKiBAcGFyYW0gY29sb3IgLSBjYW4gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG5cdCAqIFx0XHQxKSAgQSBmaWxsU3R5bGUgc3RyaW5nIChpZS8gJ3JlZCcsJ3JnYigyNTUsMjU1LDApJywgZXRjKVxuXHQgKiBcdCAgICAyKSAgQW4gYXJyYXkgb2YgZmlsbFN0eWxlIHN0cmluZ3Ncblx0ICogXHQgICAgMykgIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgZmlsbFN0eWxlIHN0cmluZyBnaXZlbiB0aGUgcmVuZGVySW5mbyBmb3IgdGhlIHdvcmQuICBpZS9cblx0ICogXHQgICAgICAgICAgICAgZnVuY3Rpb24ocmVuZGVySW5mbykge1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHdvcmQgPSByZW5kZXJJbmZvLndvcmQ7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgY291bnQgPSByZW5kZXJJbmZvLmNvdW50O1xuXHQgKiBcdCAgICAgICAgICAgICAgICAgdmFyIHhQb3MgPSByZW5kZXJJbmZvLng7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgeVBvc3QgPSByZW5kZXJJbmZvLnk7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICByZXR1cm4gLy8gYSBmaWxsU3R5bGUgZGVyaXZlZCBmcm9tIGFib3ZlIHByb3BlcnRpZXNcblx0ICogXHQgICAgICAgICAgICAgIH1cblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjb2xvciA6IGZ1bmN0aW9uKGNvbG9yKSB7XG5cdFx0aWYgKGNvbG9yKSB7XG5cdFx0XHR0aGlzLl9jb2xvciA9IGNvbG9yO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb2xvcjtcblx0XHR9XG5cdH0sXG5cbiAgICBsYXlvdXQgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2xheW91dCA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIExheW91dCBhbmQgcmVuZGVyIHRoZSB3b3JkIGNsb3VkIHRvIHRoZSBjYW52YXMgcHJvdmlkZWRcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdGdlbmVyYXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGxheW91dEF0dHJpYnV0ZXMgPSB7fTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9mb250KSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLmZvbnQgPSB0aGlzLl9mb250O1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWluRm9udFNpemUpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMubWluRm9udFNpemUgPSB0aGlzLl9taW5Gb250U2l6ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21heEZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1heEZvbnRTaXplID0gdGhpcy5fbWF4Rm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhXb3JkcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1heFdvcmRzID0gdGhpcy5fbWF4V29yZHM7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbG9nZ2VyLnB1c2goJ0xheW91dCcpO1xuXHRcdHRoaXMuX2xheW91dCA9IG5ldyBMYXlvdXQobGF5b3V0QXR0cmlidXRlcylcblx0XHRcdC5jYW52YXModGhpcy5fY2FudmFzKVxuXHRcdFx0LndvcmRzKHRoaXMuX3dvcmRzKVxuICAgICAgICAgICAgLmxheW91dGVyKHRoaXMuX2xheW91dClcblx0XHRcdC5vbldvcmRPdmVyKHRoaXMuX29uV29yZE92ZXIpXG5cdFx0XHQub25Xb3JkT3V0KHRoaXMuX29uV29yZE91dClcbiAgICAgICAgICAgIC5vbldvcmRDbGljayh0aGlzLl9vbldvcmRDbGljayk7XG5cdFx0dGhpcy5fbG9nZ2VyLnBvcCgpO1xuXG5cdFx0dGhpcy5fcmVuZGVySW5mbyA9IHRoaXMuX2xheW91dC5sYXlvdXQoKTtcblxuXHRcdHRoaXMuY2xlYXIoKTtcblxuICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblxuXHRcdHRoaXMuX2xvZ2dlci5wdXNoKCdSZW5kZXInKTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0T2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHR2YXIgd29yZFJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuXHRcdFx0aWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IC0xKSB7XG5cdFx0XHRcdGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG5cblxuXHRcdFx0XHR2YXIgY2xyID0gJ2JsYWNrJztcblx0XHRcdFx0aWYgKHRoYXQuX2NvbG9yKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2NvbG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdHZhciBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGF0Ll9jb2xvci5sZW5ndGgpO1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3JbaWR4XTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuX2NvbG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yKHdvcmRSZW5kZXJJbmZvKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3I7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5maWxsU3R5bGUgPSBjbHI7XG5cdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cblx0XHRcdFx0aWYgKHRoYXQuZGVidWcpIHtcblx0XHRcdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VSZWN0KHdvcmRSZW5kZXJJbmZvLnggKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRYLCB3b3JkUmVuZGVySW5mby55ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WSwgd29yZFJlbmRlckluZm8uYmIud2lkdGgsIHdvcmRSZW5kZXJJbmZvLmJiLmhlaWdodCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLl9sb2dnZXIucG9wKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlcyBpbWFnZSB0byBsb2NhbCBmaWxlc3lzdGVtIHdpdGggdGhlIGZvcm1hdC9maWxlbmFtZSBzcGVjaWZpZWRcbiAgICAgKiBAcGFyYW0gZm9ybWF0IChvcHRpb25hbCkgLSBUaGUgbWltZXR5cGUgdG8gc2F2ZSBhcy4gICBEZWZhdWx0ICdpbWFnZS9wbmcnXG4gICAgICogQHBhcmFtIGZpbGVuYW1lIChvcHRpb25hbCkgLSBUaGUgZmlsZW5hbWUgdG8gc2F2ZSBpdCBhcy4gICAnZG93bmxvYWQnIGJ5IGRlZmF1bHRcbiAgICAgKi9cbiAgICBzYXZlIDogZnVuY3Rpb24oZm9ybWF0LGZpbGVuYW1lKSB7XG4gICAgICAgIHZhciBkYXRhVVJJID0gdGhpcy5fY2FudmFzLnRvRGF0YVVSTChmb3JtYXQgfHwgJ2ltYWdlL3BuZycpO1xuICAgICAgICB2YXIgdXJpQ29udGVudCA9IGRhdGFVUkkuaW5kZXhPZignLCcpO1xuICAgICAgICBkYXRhVVJJID0gZGF0YVVSSS5zdWJzdHJpbmcodXJpQ29udGVudCk7XG4gICAgICAgIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBsaW5rLmhyZWYgPSAnZGF0YTphcHBsaWNhdGlvbi9vY3RldC1zdHJlYW07YmFzZTY0JyArIGRhdGFVUkk7XG4gICAgICAgIGlmIChmaWxlbmFtZSkge1xuICAgICAgICAgICAgbGluay5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGxpbmsuY2xpY2soKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbG91ZDU7XG5tb2R1bGUuZXhwb3J0cy5TdG9wd29yZHMgPSBTdG9wd29yZHM7IiwidmFyIGVuZ2xpc2ggPSBcImEsIGFib3V0LCBhYm92ZSwgYWNyb3NzLCBhZnRlciwgYWdhaW4sIGFnYWluc3QsIGFsbCwgYWxtb3N0LCBhbG9uZSwgYWxvbmcsIGFscmVhZHksIGFsc28sIGFsdGhvdWdoLCBhbHdheXMsIGFtLCBhbW9uZywgYW4sIGFuZCwgYW5vdGhlciwgYW55LCBhbnlib2R5LCBhbnlvbmUsIGFueXRoaW5nLCBhbnl3aGVyZSwgYXJlLCBhcmVhLCBhcmVhcywgYXJlbid0LCBhcm91bmQsIGFzLCBhc2ssIGFza2VkLCBhc2tpbmcsIGFza3MsIGF0LCBhd2F5LCBiLCBiYWNrLCBiYWNrZWQsIGJhY2tpbmcsIGJhY2tzLCBiZSwgYmVjYW1lLCBiZWNhdXNlLCBiZWNvbWUsIGJlY29tZXMsIGJlZW4sIGJlZm9yZSwgYmVnYW4sIGJlaGluZCwgYmVpbmcsIGJlaW5ncywgYmVsb3csIGJlc3QsIGJldHRlciwgYmV0d2VlbiwgYmlnLCBib3RoLCBidXQsIGJ5LCBjLCBjYW1lLCBjYW4sIGNhbm5vdCwgY2FuJ3QsIGNhc2UsIGNhc2VzLCBjZXJ0YWluLCBjZXJ0YWlubHksIGNsZWFyLCBjbGVhcmx5LCBjb21lLCBjb3VsZCwgY291bGRuJ3QsIGQsIGRpZCwgZGlkbid0LCBkaWZmZXIsIGRpZmZlcmVudCwgZGlmZmVyZW50bHksIGRvLCBkb2VzLCBkb2Vzbid0LCBkb2luZywgZG9uZSwgZG9uJ3QsIGRvd24sIGRvd25lZCwgZG93bmluZywgZG93bnMsIGR1cmluZywgZSwgZWFjaCwgZWFybHksIGVpdGhlciwgZW5kLCBlbmRlZCwgZW5kaW5nLCBlbmRzLCBlbm91Z2gsIGV2ZW4sIGV2ZW5seSwgZXZlciwgZXZlcnksIGV2ZXJ5Ym9keSwgZXZlcnlvbmUsIGV2ZXJ5dGhpbmcsIGV2ZXJ5d2hlcmUsIGYsIGZhY2UsIGZhY2VzLCBmYWN0LCBmYWN0cywgZmFyLCBmZWx0LCBmZXcsIGZpbmQsIGZpbmRzLCBmaXJzdCwgZm9yLCBmb3VyLCBmcm9tLCBmdWxsLCBmdWxseSwgZnVydGhlciwgZnVydGhlcmVkLCBmdXJ0aGVyaW5nLCBmdXJ0aGVycywgZywgZ2F2ZSwgZ2VuZXJhbCwgZ2VuZXJhbGx5LCBnZXQsIGdldHMsIGdpdmUsIGdpdmVuLCBnaXZlcywgZ28sIGdvaW5nLCBnb29kLCBnb29kcywgZ290LCBncmVhdCwgZ3JlYXRlciwgZ3JlYXRlc3QsIGdyb3VwLCBncm91cGVkLCBncm91cGluZywgZ3JvdXBzLCBoLCBoYWQsIGhhZG4ndCwgaGFzLCBoYXNuJ3QsIGhhdmUsIGhhdmVuJ3QsIGhhdmluZywgaGUsIGhlJ2QsIGhlJ2xsLCBoZXIsIGhlcmUsIGhlcmUncywgaGVycywgaGVyc2VsZiwgaGUncywgaGlnaCwgaGlnaGVyLCBoaWdoZXN0LCBoaW0sIGhpbXNlbGYsIGhpcywgaG93LCBob3dldmVyLCBob3cncywgaSwgaSdkLCBpZiwgaSdsbCwgaSdtLCBpbXBvcnRhbnQsIGluLCBpbnRlcmVzdCwgaW50ZXJlc3RlZCwgaW50ZXJlc3RpbmcsIGludGVyZXN0cywgaW50bywgaXMsIGlzbid0LCBpdCwgaXRzLCBpdCdzLCBpdHNlbGYsIGkndmUsIGosIGp1c3QsIGssIGtlZXAsIGtlZXBzLCBraW5kLCBrbmV3LCBrbm93LCBrbm93biwga25vd3MsIGwsIGxhcmdlLCBsYXJnZWx5LCBsYXN0LCBsYXRlciwgbGF0ZXN0LCBsZWFzdCwgbGVzcywgbGV0LCBsZXRzLCBsZXQncywgbGlrZSwgbGlrZWx5LCBsb25nLCBsb25nZXIsIGxvbmdlc3QsIG0sIG1hZGUsIG1ha2UsIG1ha2luZywgbWFuLCBtYW55LCBtYXksIG1lLCBtZW1iZXIsIG1lbWJlcnMsIG1lbiwgbWlnaHQsIG1vcmUsIG1vc3QsIG1vc3RseSwgbXIsIG1ycywgbXVjaCwgbXVzdCwgbXVzdG4ndCwgbXksIG15c2VsZiwgbiwgbmVjZXNzYXJ5LCBuZWVkLCBuZWVkZWQsIG5lZWRpbmcsIG5lZWRzLCBuZXZlciwgbmV3LCBuZXdlciwgbmV3ZXN0LCBuZXh0LCBubywgbm9ib2R5LCBub24sIG5vb25lLCBub3IsIG5vdCwgbm90aGluZywgbm93LCBub3doZXJlLCBudW1iZXIsIG51bWJlcnMsIG8sIG9mLCBvZmYsIG9mdGVuLCBvbGQsIG9sZGVyLCBvbGRlc3QsIG9uLCBvbmNlLCBvbmUsIG9ubHksIG9wZW4sIG9wZW5lZCwgb3BlbmluZywgb3BlbnMsIG9yLCBvcmRlciwgb3JkZXJlZCwgb3JkZXJpbmcsIG9yZGVycywgb3RoZXIsIG90aGVycywgb3VnaHQsIG91ciwgb3Vycywgb3Vyc2VsdmVzLCBvdXQsIG92ZXIsIG93biwgcCwgcGFydCwgcGFydGVkLCBwYXJ0aW5nLCBwYXJ0cywgcGVyLCBwZXJoYXBzLCBwbGFjZSwgcGxhY2VzLCBwb2ludCwgcG9pbnRlZCwgcG9pbnRpbmcsIHBvaW50cywgcG9zc2libGUsIHByZXNlbnQsIHByZXNlbnRlZCwgcHJlc2VudGluZywgcHJlc2VudHMsIHByb2JsZW0sIHByb2JsZW1zLCBwdXQsIHB1dHMsIHEsIHF1aXRlLCByLCByYXRoZXIsIHJlYWxseSwgcmlnaHQsIHJvb20sIHJvb21zLCBzLCBzYWlkLCBzYW1lLCBzYXcsIHNheSwgc2F5cywgc2Vjb25kLCBzZWNvbmRzLCBzZWUsIHNlZW0sIHNlZW1lZCwgc2VlbWluZywgc2VlbXMsIHNlZXMsIHNldmVyYWwsIHNoYWxsLCBzaGFuJ3QsIHNoZSwgc2hlJ2QsIHNoZSdsbCwgc2hlJ3MsIHNob3VsZCwgc2hvdWxkbid0LCBzaG93LCBzaG93ZWQsIHNob3dpbmcsIHNob3dzLCBzaWRlLCBzaWRlcywgc2luY2UsIHNtYWxsLCBzbWFsbGVyLCBzbWFsbGVzdCwgc28sIHNvbWUsIHNvbWVib2R5LCBzb21lb25lLCBzb21ldGhpbmcsIHNvbWV3aGVyZSwgc3RhdGUsIHN0YXRlcywgc3RpbGwsIHN1Y2gsIHN1cmUsIHQsIHRha2UsIHRha2VuLCB0aGFuLCB0aGF0LCB0aGF0J3MsIHRoZSwgdGhlaXIsIHRoZWlycywgdGhlbSwgdGhlbXNlbHZlcywgdGhlbiwgdGhlcmUsIHRoZXJlZm9yZSwgdGhlcmUncywgdGhlc2UsIHRoZXksIHRoZXknZCwgdGhleSdsbCwgdGhleSdyZSwgdGhleSd2ZSwgdGhpbmcsIHRoaW5ncywgdGhpbmssIHRoaW5rcywgdGhpcywgdGhvc2UsIHRob3VnaCwgdGhvdWdodCwgdGhvdWdodHMsIHRocmVlLCB0aHJvdWdoLCB0aHVzLCB0bywgdG9kYXksIHRvZ2V0aGVyLCB0b28sIHRvb2ssIHRvd2FyZCwgdHVybiwgdHVybmVkLCB0dXJuaW5nLCB0dXJucywgdHdvLCB1LCB1bmRlciwgdW50aWwsIHVwLCB1cG9uLCB1cywgdXNlLCB1c2VkLCB1c2VzLCB2LCB2ZXJ5LCB3LCB3YW50LCB3YW50ZWQsIHdhbnRpbmcsIHdhbnRzLCB3YXMsIHdhc24ndCwgd2F5LCB3YXlzLCB3ZSwgd2UnZCwgd2VsbCwgd2UnbGwsIHdlbGxzLCB3ZW50LCB3ZXJlLCB3ZSdyZSwgd2VyZW4ndCwgd2UndmUsIHdoYXQsIHdoYXQncywgd2hlbiwgd2hlbidzLCB3aGVyZSwgd2hlcmUncywgd2hldGhlciwgd2hpY2gsIHdoaWxlLCB3aG8sIHdob2xlLCB3aG9tLCB3aG8ncywgd2hvc2UsIHdoeSwgd2h5J3MsIHdpbGwsIHdpdGgsIHdpdGhpbiwgd2l0aG91dCwgd29uJ3QsIHdvcmssIHdvcmtlZCwgd29ya2luZywgd29ya3MsIHdvdWxkLCB3b3VsZG4ndCwgeCwgeSwgeWVhciwgeWVhcnMsIHllcywgeWV0LCB5b3UsIHlvdSdkLCB5b3UnbGwsIHlvdW5nLCB5b3VuZ2VyLCB5b3VuZ2VzdCwgeW91ciwgeW91J3JlLCB5b3VycywgeW91cnNlbGYsIHlvdXJzZWx2ZXMsIHlvdSd2ZSwgelwiO1xudmFyIGZyZW5jaCA9IFwiYWxvcnMsYXUsYXVjdW5zLGF1c3NpLGF1dHJlLGF2YW50LGF2ZWMsYXZvaXIsYm9uLGNhcixjZSxjZWxhLGNlcyxjZXV4LGNoYXF1ZSxjaSxjb21tZSxjb21tZW50LGRhbnMsZGVzLGR1LGRlZGFucyxkZWhvcnMsZGVwdWlzLGRldnJhaXQsZG9pdCxkb25jLGRvcyxkw6lidXQsZWxsZSxlbGxlcyxlbixlbmNvcmUsZXNzYWksZXN0LGV0LGV1LGZhaXQsZmFpdGVzLGZvaXMsZm9udCxob3JzLGljaSxpbCxpbHMsamUsanVzdGUsbGEsbGUsbGVzLGxldXIsbMOgLG1hLG1haW50ZW5hbnQsbWFpcyxtZXMsbWluZSxtb2lucyxtb24sbW90LG3Dqm1lLG5pLG5vbW3DqXMsbm90cmUsbm91cyxvdSxvw7kscGFyLHBhcmNlLHBhcyxwZXV0LHBldSxwbHVwYXJ0LHBvdXIscG91cnF1b2kscXVhbmQscXVlLHF1ZWwscXVlbGxlLHF1ZWxsZXMscXVlbHMscXVpLHNhLHNhbnMsc2VzLHNldWxlbWVudCxzaSxzaWVuLHNvbixzb250LHNvdXMsc295ZXosIHN1amV0LHN1cix0YSx0YW5kaXMsdGVsbGVtZW50LHRlbHMsdGVzLHRvbix0b3VzLHRvdXQsdHJvcCx0csOocyx0dSx2b2llbnQsdm9udCx2b3RyZSx2b3VzLHZ1LMOnYSzDqXRhaWVudCzDqXRhdCzDqXRpb25zLMOpdMOpLMOqdHJlLGRlLHVuLGkscXUsZCxsLG5lLHNlLHVuZSxuLHMsbSxwbHVzLMOgLCd1biwnaWwsJ2VzdCxsdWksbW1lLGF2YWl0LGMsLSwtLSwtLS0sbWUsaiw/XCI7XG52YXIgZW5nbGlzaFdvcmRzID0gZW5nbGlzaC5zcGxpdCgnLCcpO1xudmFyIGZyZW5jaFdvcmRzID0gZnJlbmNoLnNwbGl0KCcsJyk7XG5cbmV4cG9ydHMuRW5nbGlzaCA9IGVuZ2xpc2hXb3JkcztcbmV4cG9ydHMuRnJlbmNoID0gZnJlbmNoV29yZHM7XG5cblxuXG5cbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxudmFyIFRleHRCaXRtYXAgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NvbnRleHQgPSBudWxsO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xuXG5cdHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHR0aGlzLl9jYW52YXMud2lkdGggPSB0aGlzLndpZHRoIHx8IDY0MDtcblx0dGhpcy5fY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0IHx8IDQ4MDtcblx0dGhpcy5fY29udGV4dCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuXHR9XG5cblx0dGhpcy5fYml0bWFwID0gXy5jcmVhdGVBcnJheSh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuX2NhbnZhcy5oZWlnaHQ7IGorKykge1xuXHRcdFx0dGhpcy5fYml0bWFwW2ldW2pdID0gZmFsc2U7XG5cdFx0fVxuXHR9XG59O1xuXG5UZXh0Qml0bWFwLnByb3RvdHlwZSA9IF8uZXh0ZW5kKFRleHRCaXRtYXAucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhIGJpdG1hcCBmb3IgdGhlIGdpdmVuIHdvcmQvZm9udCBwYWlyLiAgIFJldHVybiBhIHJlbmRlckluZm8gb2JqZWN0IGZvciB0aGlzXG5cdCAqIEBwYXJhbSB0ZXh0IC0gYSBzdHJpbmcgdGhhdCB3ZSB3YW50IHRvIGJpdG1hcCAoaWUvIGEgd29yZClcblx0ICogQHBhcmFtIGZvbnRIZWlnaHQgLSB0aGUgaGVpZ2h0IG9mIHRoZSBmb250XG5cdCAqIEBwYXJhbSBmb250RmFtaWx5IC0gdGhlIGZvbnQgZmFtaWx5XG5cdCAqIEByZXR1cm5zIHt7YmI6IHtvZmZzZXRYOiBudW1iZXIsIG9mZnNldFk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9LCBiaXRtYXA6ICosIGZvbnRTaXplOiAqLCBmb250RmFtaWx5OiAqfX1cblx0ICovXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uKHRleHQsZm9udEhlaWdodCxmb250RmFtaWx5KSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NvbnRleHQ7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgdGV4dFJlbmRlclggPSA1O1xuXHRcdHZhciB0ZXh0UmVuZGVyWSA9IE1hdGguZmxvb3IodGhpcy5fY2FudmFzLmhlaWdodC8yKTtcblxuXHRcdC8vIEZpbGwgdGhlIGZvbnRcblx0XHRjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRjdHguZm9udCA9IGZvbnRIZWlnaHQgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cdFx0Y3R4LmZpbGxUZXh0KHRleHQsdGV4dFJlbmRlclgsdGV4dFJlbmRlclkpO1xuXG5cdFx0dmFyIHdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuXG5cdFx0Ly8gR2V0IGEgcmVsYXhlZCBib3VuZGluZyBib3ggdG8gZ3JhYiBmcm9tIHRoZSBjYW52YXNcblx0XHR2YXIgc3RhcnRYID0gdGV4dFJlbmRlclg7XG5cdFx0dmFyIHN0YXJ0WSA9IHRleHRSZW5kZXJZIC0gZm9udEhlaWdodCAtIDI7XG5cdFx0dmFyIGVuZFggPSBzdGFydFggKyB3aWR0aCArIHRleHRSZW5kZXJYO1xuXHRcdHZhciBlbmRZID0gc3RhcnRZICsgZm9udEhlaWdodCArIGZvbnRIZWlnaHQqMC41O1xuXG5cblxuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKHN0YXJ0WCxzdGFydFksZW5kWCAtIHN0YXJ0WCxlbmRZIC0gc3RhcnRZKTtcblxuXHRcdHZhciBib29sZWFuQml0bWFwID0gXy5jcmVhdGVBcnJheShpbWFnZURhdGEud2lkdGgsaW1hZ2VEYXRhLmhlaWdodCk7XG5cdFx0dmFyIHggPSAwO1xuXHRcdHZhciB5ID0gMDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlRGF0YS5kYXRhLmxlbmd0aDsgaSs9NCkge1xuXG5cdFx0XHRib29sZWFuQml0bWFwW3hdW3ldID0gIGltYWdlRGF0YS5kYXRhW2ldICE9PSAwO1xuXHRcdFx0eCsrO1xuXHRcdFx0aWYgKHggPT09IGltYWdlRGF0YS53aWR0aCkge1xuXHRcdFx0XHR4ID0gMDtcblx0XHRcdFx0eSsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0dmFyIG1pblggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtaW5ZID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WCA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhZID0gLU51bWJlci5NQVhfVkFMVUU7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IGJvb2xlYW5CaXRtYXAubGVuZ3RoOyB4KyspIHtcblx0XHRcdGZvciAoeSA9IDA7IHkgPCBib29sZWFuQml0bWFwW3hdLmxlbmd0aDsgeSsrKSB7XG5cdFx0XHRcdGlmIChib29sZWFuQml0bWFwW3hdW3ldKSB7XG5cdFx0XHRcdFx0bWluWCA9IE1hdGgubWluKG1pblgseCk7XG5cdFx0XHRcdFx0bWluWSA9IE1hdGgubWluKG1pblkseSk7XG5cdFx0XHRcdFx0bWF4WCA9IE1hdGgubWF4KG1heFgseCk7XG5cdFx0XHRcdFx0bWF4WSA9IE1hdGgubWF4KG1heFkseSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBUcmltIHRoZSBib3VuZGluZyBib3ggdG8ganVzdCBwaXhlbHMgdGhhdCBhcmUgZmlsbGVkXG5cdFx0dmFyIHRyaW1tZWRCb29sZWFuQml0bWFwID0gXy5jcmVhdGVBcnJheShtYXhYLW1pblgsbWF4WS1taW5ZKTtcblx0XHRmb3IgKHggPSAwOyB4IDwgbWF4WC1taW5YOyB4KyspIHtcblx0XHRcdGZvciAoeSA9IDA7IHkgPCBtYXhZLW1pblk7IHkrKykge1xuXHRcdFx0XHR0cmltbWVkQm9vbGVhbkJpdG1hcFt4XVt5XSA9IGJvb2xlYW5CaXRtYXBbbWluWCt4XVttaW5ZK3ldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAneWVsbG93Jztcblx0XHRcdGN0eC5zdHJva2VSZWN0KHN0YXJ0WCxzdGFydFksZW5kWC1zdGFydFgsZW5kWS1zdGFydFkpO1xuXHRcdH1cblxuXHRcdGN0eC5zdHJva2VTdHlsZSA9ICdyZWQnO1xuXHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYLHRleHRSZW5kZXJZLHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblx0XHR2YXIgYmJXaWR0aCA9IG1heFgtbWluWDtcblx0XHR2YXIgYmJIZWlnaHQgPSBtYXhZLW1pblk7XG5cdFx0dmFyIGJiT2Zmc2V0WCA9IC0odGV4dFJlbmRlclggLSAoc3RhcnRYICsgbWluWCApKTtcblx0XHR2YXIgYmJPZmZzZXRZID0gLSh0ZXh0UmVuZGVyWSAtIChzdGFydFkgKyBtaW5ZKSk7XG5cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdGN0eC5zdHJva2VSZWN0KHRleHRSZW5kZXJYICsgYmJPZmZzZXRYLCB0ZXh0UmVuZGVyWSArIGJiT2Zmc2V0WSwgYmJXaWR0aCwgYmJIZWlnaHQpO1xuXHRcdH1cblxuXHRcdHZhciByZW5kZXJJbmZvID0ge1xuXHRcdFx0YmIgOiB7XG5cdFx0XHRcdG9mZnNldFggOiBiYk9mZnNldFgsXG5cdFx0XHRcdG9mZnNldFkgOiBiYk9mZnNldFksXG5cdFx0XHRcdHdpZHRoIDogYmJXaWR0aCxcblx0XHRcdFx0aGVpZ2h0IDogYmJIZWlnaHRcblx0XHRcdH0sXG5cdFx0XHRiaXRtYXAgOiB0cmltbWVkQm9vbGVhbkJpdG1hcCxcblx0XHRcdGZvbnRTaXplIDogZm9udEhlaWdodCxcblx0XHRcdGZvbnRGYW1pbHkgOiBmb250RmFtaWx5XG5cdFx0fTtcblxuXHRcdHJldHVybiByZW5kZXJJbmZvO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiB0ZXN0cyB3aGV0aGVyIGEgcmVuZGVySW5mbyBvYmplY3QgZml0cyBpbnRvIGEgZ2xvYmFsIGJvb2xlYW4gYml0bWFwXG5cdCAqIEBwYXJhbSByZW5kZXJJbmZvIC0gcmVuZGVySW5mbyBmb3IgYSB3b3JkIChyZXR1cm5lZCBmcm9tIGNyZWF0ZSlcblx0ICogQHBhcmFtIGJpdG1hcCAtIHNjZW5lIGJpdG1hcFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSB0cnVlIGlmIHdvcmQgZml0cywgZmFsc2Ugb3RoZXJ3aXNlXG5cdCAqL1xuXHRmaXRzIDogZnVuY3Rpb24ocmVuZGVySW5mbyxiaXRtYXApIHtcblx0XHRyZW5kZXJJbmZvLnggPSBNYXRoLmZsb29yKHJlbmRlckluZm8ueCk7XG5cdFx0cmVuZGVySW5mby55ID0gTWF0aC5mbG9vcihyZW5kZXJJbmZvLnkpO1xuXG5cdFx0dmFyIHN0YXJ0WCA9IHJlbmRlckluZm8ueCArIHJlbmRlckluZm8uYmIub2Zmc2V0WDtcblx0XHR2YXIgc3RhcnRZID0gcmVuZGVySW5mby55ICsgcmVuZGVySW5mby5iYi5vZmZzZXRZO1xuXG5cdFx0dmFyIGJpdG1hcFdpZHRoID0gYml0bWFwLmxlbmd0aDtcblx0XHR2YXIgYml0bWFwSGVpZ2h0ID0gYml0bWFwWzBdLmxlbmd0aDtcblxuXHRcdHZhciBoaXRFZGdlID0gc3RhcnRYIDwgMCB8fCBzdGFydFkgPCAwO1xuXHRcdHZhciBoaXRPdGhlciA9IGZhbHNlO1xuXHRcdHZhciBkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByZW5kZXJJbmZvLmJiLndpZHRoICYmICFkb2VzbnRGaXQ7IGkrKykge1xuXHRcdFx0dmFyIHUgPSBzdGFydFggKyBpO1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCByZW5kZXJJbmZvLmJiLmhlaWdodCAmJiAhZG9lc250Rml0OyBqKyspIHtcblx0XHRcdFx0dmFyIHYgPSBzdGFydFkgKyBqO1xuXHRcdFx0XHRpZiAodSA+PSBiaXRtYXBXaWR0aCB8fCB2ID49IGJpdG1hcEhlaWdodCkge1xuXHRcdFx0XHRcdGhpdEVkZ2UgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGJpdG1hcFt1XVt2XSkge1xuXHRcdFx0XHRcdGhpdE90aGVyID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb2VzbnRGaXQgPSBoaXRFZGdlIHx8IGhpdE90aGVyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gIWRvZXNudEZpdDtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dEJpdG1hcDsiLCJcbnZhciBVdGlsID0ge1xuXG5cdGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuXHRcdHZhciBrZXksIGksIHNvdXJjZTtcblx0XHRmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHQgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblx0XHQgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuXHRcdFx0aWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHQgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuXHRcdFx0fVxuXHRcdCAgfVxuXHRcdH1cblx0XHRyZXR1cm4gZGVzdDtcblx0fSxcblxuXHRsZXJwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIG1pbiArICh0KihtYXgtbWluKSk7XG5cdH0sXG5cblx0c3RlcCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBNYXRoLnJvdW5kKHRoaXMubGVycChtaW4sbWF4LHQpKTtcblx0fSxcblxuXHQvKipcblx0ICogSGVscGVyIGZvciBjcmVhdGluZyBhbiBhcnJheVxuXHQgKiBAcGFyYW0gbGVuZ3RoXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG5cdGNyZWF0ZUFycmF5IDogZnVuY3Rpb24obGVuZ3RoKSB7XG5cdFx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0XHRpID0gbGVuZ3RoO1xuXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0XHR3aGlsZShpLS0pIHtcblx0XHRcdFx0YXJyW2xlbmd0aC0xIC0gaV0gPSB0aGlzLmNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnI7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(3)
});
