!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Cloud5=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*
 The MIT License (MIT)

 Copyright (c) 2015 Chris Dickson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

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
                        that._onWordOut(overWord,e);
                    }
                    overWord = null;
                }

				if (that._onWordOver) {
					that._onWordOver(word,e);
				}
				overWord = word;
			} else {
                if (that._onWordOut) {
                    that._onWordOut(overWord,e);
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
                    that._onWordClick(word,e);
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
/*
 The MIT License (MIT)

 Copyright (c) 2015 Chris Dickson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

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
/*
 The MIT License (MIT)

 Copyright (c) 2015 Chris Dickson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

var _ = _dereq_('./util');
var Layout = _dereq_('./layout');
var Stopwords = _dereq_('./stopwords');
var Logger = _dereq_('./logger');

var perfLog = false;

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
    this._layouter = null;
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

    wordMap : function(wordMap) {
        if (wordMap) {
            var that = this;
            Object.keys(wordMap).forEach(function(raw) {
                var word = raw.trim().toLowerCase();
                if (that._stopWords[word] || word === '') {
                    return;
                }
                var count = wordMap[word] ? wordMap[word] : 1;
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
        if (!words) {
            this._highlightedWords = {};
        } else {
            if (words instanceof Array === false) {
                words = [words];
            }
            var that = this;
            words.forEach(function (word) {
                delete that._highlightedWords[word]
            });
        }
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
        this._layouter = handler;
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
            .layouter(this._layouter)
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
						clr = that._color(wordRenderInfo,word);
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
/*
 The MIT License (MIT)

 Copyright (c) 2015 Chris Dickson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

var english = "a, about, above, across, after, again, against, all, almost, alone, along, already, also, although, always, am, among, an, and, another, any, anybody, anyone, anything, anywhere, are, area, areas, aren't, around, as, ask, asked, asking, asks, at, away, b, back, backed, backing, backs, be, became, because, become, becomes, been, before, began, behind, being, beings, below, best, better, between, big, both, but, by, c, came, can, cannot, can't, case, cases, certain, certainly, clear, clearly, come, could, couldn't, d, did, didn't, differ, different, differently, do, does, doesn't, doing, done, don't, down, downed, downing, downs, during, e, each, early, either, end, ended, ending, ends, enough, even, evenly, ever, every, everybody, everyone, everything, everywhere, f, face, faces, fact, facts, far, felt, few, find, finds, first, for, four, from, full, fully, further, furthered, furthering, furthers, g, gave, general, generally, get, gets, give, given, gives, go, going, good, goods, got, great, greater, greatest, group, grouped, grouping, groups, h, had, hadn't, has, hasn't, have, haven't, having, he, he'd, he'll, her, here, here's, hers, herself, he's, high, higher, highest, him, himself, his, how, however, how's, i, i'd, if, i'll, i'm, important, in, interest, interested, interesting, interests, into, is, isn't, it, its, it's, itself, i've, j, just, k, keep, keeps, kind, knew, know, known, knows, l, large, largely, last, later, latest, least, less, let, lets, let's, like, likely, long, longer, longest, m, made, make, making, man, many, may, me, member, members, men, might, more, most, mostly, mr, mrs, much, must, mustn't, my, myself, n, necessary, need, needed, needing, needs, never, new, newer, newest, next, no, nobody, non, noone, nor, not, nothing, now, nowhere, number, numbers, o, of, off, often, old, older, oldest, on, once, one, only, open, opened, opening, opens, or, order, ordered, ordering, orders, other, others, ought, our, ours, ourselves, out, over, own, p, part, parted, parting, parts, per, perhaps, place, places, point, pointed, pointing, points, possible, present, presented, presenting, presents, problem, problems, put, puts, q, quite, r, rather, really, right, room, rooms, s, said, same, saw, say, says, second, seconds, see, seem, seemed, seeming, seems, sees, several, shall, shan't, she, she'd, she'll, she's, should, shouldn't, show, showed, showing, shows, side, sides, since, small, smaller, smallest, so, some, somebody, someone, something, somewhere, state, states, still, such, sure, t, take, taken, than, that, that's, the, their, theirs, them, themselves, then, there, therefore, there's, these, they, they'd, they'll, they're, they've, thing, things, think, thinks, this, those, though, thought, thoughts, three, through, thus, to, today, together, too, took, toward, turn, turned, turning, turns, two, u, under, until, up, upon, us, use, used, uses, v, very, w, want, wanted, wanting, wants, was, wasn't, way, ways, we, we'd, well, we'll, wells, went, were, we're, weren't, we've, what, what's, when, when's, where, where's, whether, which, while, who, whole, whom, who's, whose, why, why's, will, with, within, without, won't, work, worked, working, works, would, wouldn't, x, y, year, years, yes, yet, you, you'd, you'll, young, younger, youngest, your, you're, yours, yourself, yourselves, you've, z";
var french = "alors,au,aucuns,aussi,autre,avant,avec,avoir,bon,car,ce,cela,ces,ceux,chaque,ci,comme,comment,dans,des,du,dedans,dehors,depuis,devrait,doit,donc,dos,début,elle,elles,en,encore,essai,est,et,eu,fait,faites,fois,font,hors,ici,il,ils,je,juste,la,le,les,leur,là,ma,maintenant,mais,mes,mine,moins,mon,mot,même,ni,nommés,notre,nous,ou,où,par,parce,pas,peut,peu,plupart,pour,pourquoi,quand,que,quel,quelle,quelles,quels,qui,sa,sans,ses,seulement,si,sien,son,sont,sous,soyez, sujet,sur,ta,tandis,tellement,tels,tes,ton,tous,tout,trop,très,tu,voient,vont,votre,vous,vu,ça,étaient,état,étions,été,être,de,un,i,qu,d,l,ne,se,une,n,s,m,plus,à,'un,'il,'est,lui,mme,avait,c,-,--,---,me,j,?";
var englishWords = english.split(',');
var frenchWords = french.split(',');

exports.English = englishWords;
exports.French = frenchWords;





},{}],5:[function(_dereq_,module,exports){
/*
 The MIT License (MIT)

 Copyright (c) 2015 Chris Dickson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

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
/*
 The MIT License (MIT)

 Copyright (c) 2015 Chris Dickson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */


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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9DbG91ZDUvc3JjL2xvZ2dlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL0Nsb3VkNS9zcmMvc3RvcHdvcmRzLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvQ2xvdWQ1L3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypcbiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuIENvcHlyaWdodCAoYykgMjAxNSBDaHJpcyBEaWNrc29uXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cbiovXG5cbnZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVGV4dEJpdG1hcCA9IHJlcXVpcmUoJy4vdGV4dGJpdG1hcCcpO1xuXG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gYXR0cmlidXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX3dvcmRzID0gbnVsbDtcblx0dGhpcy5fYml0bWFwID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHRleHQgYml0bWFwcGVyIGFuZCBjcmVhdGUgb3VyIGJvb2xlYW4gYml0bWFwIG9mIHRoZSBzY2VuZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2luaXRpYWxpemUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMgPSB7XG5cdFx0XHR3aWR0aCA6IHRoaXMuX2NhbnZhcy53aWR0aCxcblx0XHRcdGhlaWdodCA6IHRoaXMuX2NhbnZhcy5oZWlnaHRcblx0XHR9O1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHR0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcy5kZWJ1ZyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0dGhpcy5fdGV4dEJpdG1hcHBlciA9IG5ldyBUZXh0Qml0bWFwKHRleHRCaXRtYXBwZXJBdHRyaWJ1dGVzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVySW5mbyA9IHt9O1xuXHRcdHRoaXMuX2JpdG1hcCA9IF8uY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuICAgIC8qKlxuICAgICAqIEhpdCB0ZXN0IGEgcG9zaXRpb24geCx5IGZvciBhIHdvcmQuICBUT0RPOiAgbWFrZSB0aGlzIHdheSBmYXN0ZXIuICAgQlNQIFRyZWU/XG4gICAgICogQHBhcmFtIHggLSB4IG9mZnNldCBpbnRvIGNhbnZhc1xuICAgICAqIEBwYXJhbSB5IC0geSBvZmZzZXQgaW50byBjYW52YXNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9oaXQgOiBmdW5jdGlvbih4LHkpIHtcbiAgICAgICAgdmFyIHdvcmQgPSBudWxsO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgLy8gR2V0IGEgbGlzdCBvZiBib3VuZGluZyBib3hlcyB0aGF0IHgseSBhcmUgaW5cbiAgICAgICAgdmFyIGNvbnRhaW5lZFdvcmRzID0gT2JqZWN0LmtleXModGhpcy5fcmVuZGVySW5mbykuZmlsdGVyKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIHZhciBtaW5YID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIG1pblkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgbWF4WCA9IG1pblggKyByZW5kZXJJbmZvLmJiLndpZHRoO1xuICAgICAgICAgICAgdmFyIG1heFkgPSBtaW5ZICsgcmVuZGVySW5mby5iYi5oZWlnaHQ7XG4gICAgICAgICAgICBpZiAobWluWCA8PSB4ICYmIHggPD0gbWF4WCAmJiBtaW5ZIDw9IHkgJiYgeSA8PSBtYXhZKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydCBieSBzaXplXG4gICAgICAgIGNvbnRhaW5lZFdvcmRzLnNvcnQoZnVuY3Rpb24odzEsdzIpIHtcbiAgICAgICAgICAgIHZhciBiMSA9IHRoYXQuX3JlbmRlckluZm9bdzFdLmJiO1xuICAgICAgICAgICAgdmFyIGIyID0gdGhhdC5fcmVuZGVySW5mb1t3Ml0uYmI7XG4gICAgICAgICAgICB2YXIgYjFBID0gYjEud2lkdGggKiBiMS5oZWlnaHQ7XG4gICAgICAgICAgICB2YXIgYjJBID0gYjIud2lkdGggKiBiMi5oZWlnaHQ7XG4gICAgICAgICAgICByZXR1cm4gYjFBIC0gYjJBO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIHdvcmQgd2l0aCB0aGUgc21hbGxlc3QgYm91bmRpbmcgYm94XG4gICAgICAgIGlmIChjb250YWluZWRXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3b3JkID0gY29udGFpbmVkV29yZHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdvcmQ7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3b3JkcyB0byBsYXlvdXRcblx0ICogQHBhcmFtIHdvcmRzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dGhpcy5fd29yZHMgPSB3b3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fd29yZHM7XG5cdFx0fVxuXHR9LFxuXG4gICAgbGF5b3V0ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2xheW91dGVyID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogU2V0IHdvcmRPdmVyIGhhbmRsZXJcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCB3b3JkT3V0IGhhbmRsZXJcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdG9uV29yZE91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHR0aGlzLl9vbldvcmRPdXQgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHdvcmRDbGljayBoYW5kbGVyXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiBAcmV0dXJucyB7TGF5b3V0fVxuICAgICAqL1xuICAgIG9uV29yZENsaWNrIDogZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9vbldvcmRDbGljayA9IGhhbmRsZXI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQbGFjZXMgYSB3b3JkIHdpdGggdGhlIGdpdmVuIHJlbmRlciBpbmZvIGludG8gdGhlIHNjZW5lLiAgVXBkYXRlIHRoZVxuICAgICAqIHNjZW5lIGJvb2xlYW4gYml0bWFwXG4gICAgICogQHBhcmFtIHdvcmQgLSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gcmVuZGVySW5mbyAtIHJlbmRlciBpbmZvIGZyb20gdGhlIHRleHQgYml0bWFwcGVyXG4gICAgICovXG4gICAgcGxhY2UgOiBmdW5jdGlvbih3b3JkLHJlbmRlckluZm8pIHtcbiAgICAgICAgdmFyIGJpdG1hcFdpZHRoID0gcmVuZGVySW5mby5iaXRtYXAubGVuZ3RoO1xuICAgICAgICB2YXIgYml0bWFwSGVpZ2h0ID0gcmVuZGVySW5mby5iaXRtYXBbMF0ubGVuZ3RoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYml0bWFwV2lkdGg7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBiaXRtYXBIZWlnaHQ7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciB1ID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYICsgaTtcbiAgICAgICAgICAgICAgICB2YXIgdiA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WSArIGo7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVuZGVySW5mby5iaXRtYXBbaV1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYml0bWFwW3VdW3ZdID0gd29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVuZGVySW5mb1xuICAgICAqIEByZXR1cm5zIHsqfGJvb2xlYW59XG4gICAgICovXG4gICAgZml0cyA6IGZ1bmN0aW9uKHJlbmRlckluZm8pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RleHRCaXRtYXBwZXIuZml0cyhyZW5kZXJJbmZvLHRoaXMuX2JpdG1hcClcbiAgICB9LFxuXG5cbiAgICByYW5kb21MYXlvdXQgOiBmdW5jdGlvbih3b3JkcyxyZW5kZXJJbmZvLHdpZHRoLGhlaWdodCkge1xuICAgICAgICAvLyBMYXlvdXQgZWFjaCB3b3JkXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB2YXIgcGxhY2VkID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYXR0ZW1wdHMgPSAxMDA7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5kZWJ1Z0RyYXdBbGwoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHdvcmRSZW5kZXJJbmZvID0gcmVuZGVySW5mb1t3b3JkXTtcblxuICAgICAgICAgICAgLy8gVHJ5IHBsYWNpbmcgdGhlIHdvcmQgYW5kIHNlZSBpZiBpdCBmaXRzL2hpdHMgYW55dGhpbmcgZWxzZSBhbHJlYWR5IHBsYWNlZFxuICAgICAgICAgICAgd2hpbGUgKCFwbGFjZWQgJiYgYXR0ZW1wdHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB3aWR0aCk7XG4gICAgICAgICAgICAgICAgdmFyIHkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBoZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgd29yZFJlbmRlckluZm8ueCA9IHg7XG4gICAgICAgICAgICAgICAgd29yZFJlbmRlckluZm8ueSA9IHk7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBpdCBmaXRzLCB1cGRhdGUgdGhlIGJpdG1hcCBmb3IgdGhlIGVudGlyZSBzY2VuZSB0byBzYXkgdGhvc2UgcGl4ZWxzIGFyZSBvY2N1cGllZFxuICAgICAgICAgICAgICAgIGlmICh0aGF0LmZpdHMod29yZFJlbmRlckluZm8pKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsYWNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQucGxhY2Uod29yZCwgd29yZFJlbmRlckluZm8pO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ZW1wdHMtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXBsYWNlZCkge1xuICAgICAgICAgICAgICAgIHdvcmRSZW5kZXJJbmZvLnggPSAtMTtcbiAgICAgICAgICAgICAgICB3b3JkUmVuZGVySW5mby55ID0gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWJ1ZyByb3V0aW5lIHRvIGRyYXcgb3VyIHdvcmRzIGFzIHdlIGxheSB0aGVtIG91dFxuICAgICAqIEBwYXJhbSBjdHggLSBjYW52YXMgY29udGV4dFxuICAgICAqIEBwYXJhbSB3IC0gd2lkdGhcbiAgICAgKiBAcGFyYW0gaCAtIGhlaWdodFxuICAgICAqL1xuICAgIGRlYnVnRHJhd0FsbCA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBjdHggPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHdvcmRSZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcbiAgICAgICAgICAgIGlmICh3b3JkUmVuZGVySW5mby54ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueCAhPT0gLTEgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gdW5kZWZpbmVkICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgY3R4LmZvbnQgPSB3b3JkUmVuZGVySW5mby5mb250U2l6ZSArICdweCAnICsgd29yZFJlbmRlckluZm8uZm9udEZhbWlseTtcbiAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcbiAgICAgICAgICAgICAgICBjdHguZmlsbFRleHQod29yZCx3b3JkUmVuZGVySW5mby54LHdvcmRSZW5kZXJJbmZvLnkpO1xuICAgICAgICAgICAgICAgIGN0eC5zdHJva2VSZWN0KHdvcmRSZW5kZXJJbmZvLnggKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRYLCB3b3JkUmVuZGVySW5mby55ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WSwgd29yZFJlbmRlckluZm8uYmIud2lkdGgsIHdvcmRSZW5kZXJJbmZvLmJiLmhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuXHQvKipcblx0ICogUGVyZm9ybSB0aGUgbGF5b3V0XG5cdCAqIEByZXR1cm5zIHt7fX1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2luaXRpYWxpemUoKTtcblx0XHR0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cblx0XHQvLyBHZXQgY291bnRzIGZvciBlYWNoIHdvcmQsIHRoZW4gZmlndXJlIG91dCB0aGUgZm9udCBzaXplIGZvciBlYWNoIHdvcmQuICAgQ3JlYXRlIGEgYm9vbGVhbiBiaXRtYXAgYW5kXG5cdFx0Ly8gYm91bmRpbmcgYm94IGZvciBlYWNoIHdvcmRcblx0XHRpZiAodGhpcy5fd29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0dmFyIG1pbkNvdW50ID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRcdHZhciBtYXhDb3VudCA9IDA7XG5cblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdFx0bWluQ291bnQgPSBNYXRoLm1pbih0aGF0Ll93b3Jkc1t3b3JkXSxtaW5Db3VudCk7XG5cdFx0XHRcdG1heENvdW50ID0gTWF0aC5tYXgodGhhdC5fd29yZHNbd29yZF0sbWF4Q291bnQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIFNvcnQgdGhlIHdvcmRzIGJ5IGZyZXF1ZW5jeVxuXHRcdFx0dmFyIHNvcnRlZFdvcmRBcnJheSA9IE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5zb3J0KGZ1bmN0aW9uKHcxLHcyKSB7XG5cdFx0XHRcdHJldHVybiB0aGF0Ll93b3Jkc1t3Ml0tdGhhdC5fd29yZHNbdzFdO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmICh0aGlzLm1heFdvcmRzID4gMCAmJiBzb3J0ZWRXb3JkQXJyYXkubGVuZ3RoID4gdGhpcy5tYXhXb3Jkcykge1xuXHRcdFx0XHRzb3J0ZWRXb3JkQXJyYXkgPSBzb3J0ZWRXb3JkQXJyYXkuc3BsaWNlKDAsdGhpcy5tYXhXb3Jkcyk7XG5cdFx0XHR9XG5cblxuXHRcdFx0dmFyIG1pbkZvbnRTaXplID0gdGhpcy5taW5Gb250U2l6ZSB8fCAxMDtcblx0XHRcdHZhciBtYXhGb250U2l6ZSA9IHRoaXMubWF4Rm9udFNpemUgfHwgMjAwO1xuXHRcdFx0c29ydGVkV29yZEFycmF5LmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXG5cdFx0XHRcdHZhciB0ID0gKHRoYXQuX3dvcmRzW3dvcmRdIC0gbWluQ291bnQpLyhtYXhDb3VudC1taW5Db3VudCk7XG5cdFx0XHRcdHZhciBmb250U2l6ZSA9Xy5zdGVwKG1pbkZvbnRTaXplLG1heEZvbnRTaXplLHQpO1xuXG5cdFx0XHRcdHZhciBiaXRtYXAgPSB0aGF0Ll90ZXh0Qml0bWFwcGVyLmNyZWF0ZSh3b3JkLGZvbnRTaXplLHRoYXQuZm9udCB8fCAnQ2FsaWJyaScpO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdID0gYml0bWFwO1xuXHRcdFx0XHR0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdLmNvdW50ID0gdGhhdC5fd29yZHNbd29yZF07XG5cdFx0XHRcdHRoYXQuX3JlbmRlckluZm9bd29yZF0ubWluQ291bnQgPSBtaW5Db3VudDtcblx0XHRcdFx0dGhhdC5fcmVuZGVySW5mb1t3b3JkXS5tYXhDb3VudCA9IG1heENvdW50O1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIG1hc2ssIHNldCB0aGUgYm9vbGVhbiBiaXRtYXAgdG8gcmVmbGVjdCBpdFxuXHRcdGlmICh0aGlzLm1hc2tDYW52YXMpIHtcblx0XHRcdHZhciBtYXNrV2lkdGggPSB0aGlzLm1hc2tDYW52YXMud2lkdGg7XG5cdFx0XHR2YXIgbWFza0hlaWdodCA9IHRoaXMubWFza0NhbnZhcy5oZWlnaHQ7XG5cdFx0XHR2YXIgbWFza0N0eCA9IHRoaXMubWFza0NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdFx0XHR2YXIgaW1hZ2VEYXRhID0gbWFza0N0eC5nZXRJbWFnZURhdGEoMCwwLG1hc2tXaWR0aCxtYXNrSGVpZ2h0KTtcblx0XHRcdHZhciBtYXNrWCA9IDA7XG5cdFx0XHR2YXIgbWFza1kgPSAwO1xuXG5cdFx0XHRmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMuX2NhbnZhcy53aWR0aDsgeCsrKSB7XG5cdFx0XHRcdGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5fY2FudmFzLmhlaWdodDsgeSsrKSB7XG5cdFx0XHRcdFx0dGhpcy5fYml0bWFwW3hdW3ldID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlRGF0YS5kYXRhLmxlbmd0aDsgaSs9NCkge1xuXHRcdFx0XHR2YXIgbWFzayA9IGltYWdlRGF0YS5kYXRhW2krM10gPiAwO1xuXHRcdFx0XHRpZiAobWFzayAmJiBtYXNrWCA8IHRoaXMuX2NhbnZhcy53aWR0aCAmJiBtYXNrWSA8IHRoaXMuX2NhbnZhcy5oZWlnaHQpIHtcblx0XHRcdFx0XHR0aGlzLl9iaXRtYXBbbWFza1hdW21hc2tZXSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG1hc2tYKys7XG5cdFx0XHRcdGlmIChtYXNrWCA9PT0gbWFza1dpZHRoKSB7XG5cdFx0XHRcdFx0bWFza1ggPSAwO1xuXHRcdFx0XHRcdG1hc2tZKys7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gbGF5b3V0ZXIgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHRoaXMuX2xheW91dGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9sYXlvdXRlci5jYWxsKHRoaXMsc29ydGVkV29yZEFycmF5LHRoYXQuX3JlbmRlckluZm8sdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQsdGhpcy5maXRzLHRoaXMucGxhY2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yYW5kb21MYXlvdXQoc29ydGVkV29yZEFycmF5LCB0aGF0Ll9yZW5kZXJJbmZvLHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuXG5cblx0XHQvLyBCaW5kIGhhbmRsZXJzXG5cdFx0dmFyIG92ZXJXb3JkID0gbnVsbDtcblx0XHRmdW5jdGlvbiBvbk1vdXNlTW92ZShlKSB7XG5cdFx0XHR2YXIgeCA9IGUub2Zmc2V0WDtcblx0XHRcdHZhciB5ID0gZS5vZmZzZXRZO1xuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgeCAqPSBkcHI7XG4gICAgICAgICAgICB5ICo9IGRwcjtcblxuXHRcdFx0dmFyIHdvcmQgPSB0aGF0Ll9oaXQoeCx5KTtcblx0XHRcdGlmICh3b3JkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG92ZXJXb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGF0Ll9vbldvcmRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX29uV29yZE91dChvdmVyV29yZCxlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdmVyV29yZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkLGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG92ZXJXb3JkID0gd29yZDtcblx0XHRcdH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX29uV29yZE91dCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9vbldvcmRPdXQob3ZlcldvcmQsZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG92ZXJXb3JkID0gbnVsbDtcbiAgICAgICAgICAgIH1cblx0XHR9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Nb3VzZUNsaWNrKGUpIHtcbiAgICAgICAgICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgICAgICAgICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB4ICo9IGRwcjtcbiAgICAgICAgICAgIHkgKj0gZHByO1xuXG4gICAgICAgICAgICB2YXIgd29yZCA9IHRoYXQuX2hpdCh4LHkpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fb25Xb3JkQ2xpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fb25Xb3JkQ2xpY2sod29yZCxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXHRcdHRoaXMuX2NhbnZhcy5vbm1vdXNlbW92ZSA9IG9uTW91c2VNb3ZlO1xuICAgICAgICB0aGlzLl9jYW52YXMub25jbGljayA9IG9uTW91c2VDbGljaztcblxuXG5cdFx0cmV0dXJuIHRoYXQuX3JlbmRlckluZm87XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDsiLCIvKlxuIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gQ29weXJpZ2h0IChjKSAyMDE1IENocmlzIERpY2tzb25cblxuIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gVEhFIFNPRlRXQVJFLlxuICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBMb2dnZXIgPSBmdW5jdGlvbih3cml0ZUxvZykge1xuXHR0aGlzLndyaXRlTG9nID0gd3JpdGVMb2c7XG5cdHRoaXMubG9ncyA9IFtdO1xufTtcblxuTG9nZ2VyLnByb3RvdHlwZSA9IF8uZXh0ZW5kKExvZ2dlci5wcm90b3R5cGUsIHtcblx0cHVzaCA6IGZ1bmN0aW9uKGxhYmVsKSB7XG5cdFx0aWYgKCF0aGlzLndyaXRlTG9nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMubG9ncy5wdXNoKHtcblx0XHRcdGxhYmVsIDogbGFiZWwsXG5cdFx0XHR0aW1lIDogRGF0ZS5ub3coKVxuXHRcdH0pO1xuXHR9LFxuXHRwb3AgOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMud3JpdGVMb2cpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHRhYnMgPSB0aGlzLmxvZ3MubGVuZ3RoO1xuXHRcdHZhciBsb2cgPSB0aGlzLmxvZ3MucG9wKCk7XG5cdFx0dmFyIHN0ciA9ICcnO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGFicy5sZW5ndGg7IGkrKykge1xuXHRcdFx0c3RyICs9ICdcXHQnO1xuXHRcdH1cblx0XHR2YXIgZW5kID0gRGF0ZS5ub3coKTtcblx0XHR2YXIgZWxhcHNlZCA9IGVuZCAtIGxvZy50aW1lO1xuXHRcdHN0ciArPSBsb2cubGFiZWwgKyAnOicgKyBlbGFwc2VkICsgJ21zJztcblx0XHRjb25zb2xlLmxvZyhzdHIpO1xuXHR9LFxuXG5cdF9taWxsaXNlY29uZHNUb1N0cmluZyA6IGZ1bmN0aW9uKG1pbGxpc2Vjb25kcykge1xuXHRcdHZhciBvbmVIb3VyID0gMzYwMDAwMDtcblx0XHR2YXIgb25lTWludXRlID0gNjAwMDA7XG5cdFx0dmFyIG9uZVNlY29uZCA9IDEwMDA7XG5cdFx0dmFyIHNlY29uZHMgPSAwO1xuXHRcdHZhciBtaW51dGVzID0gMDtcblx0XHR2YXIgaG91cnMgPSAwO1xuXHRcdHZhciByZXN1bHQ7XG5cblx0XHRpZiAobWlsbGlzZWNvbmRzID49IG9uZUhvdXIpIHtcblx0XHRcdGhvdXJzID0gTWF0aC5mbG9vcihtaWxsaXNlY29uZHMgLyBvbmVIb3VyKTtcblx0XHR9XG5cblx0XHRtaWxsaXNlY29uZHMgPSBob3VycyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gaG91cnMgKiBvbmVIb3VyKSA6IG1pbGxpc2Vjb25kcztcblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPj0gb25lTWludXRlKSB7XG5cdFx0XHRtaW51dGVzID0gTWF0aC5mbG9vcihtaWxsaXNlY29uZHMgLyBvbmVNaW51dGUpO1xuXHRcdH1cblxuXHRcdG1pbGxpc2Vjb25kcyA9IG1pbnV0ZXMgPiAwID8gKG1pbGxpc2Vjb25kcyAtIG1pbnV0ZXMgKiBvbmVNaW51dGUpIDogbWlsbGlzZWNvbmRzO1xuXG5cdFx0aWYgKG1pbGxpc2Vjb25kcyA+PSBvbmVTZWNvbmQpIHtcblx0XHRcdHNlY29uZHMgPSBNYXRoLmZsb29yKG1pbGxpc2Vjb25kcyAvIG9uZVNlY29uZCk7XG5cdFx0fVxuXG5cdFx0bWlsbGlzZWNvbmRzID0gc2Vjb25kcyA+IDAgPyAobWlsbGlzZWNvbmRzIC0gc2Vjb25kcyAqIG9uZVNlY29uZCkgOiBtaWxsaXNlY29uZHM7XG5cblx0XHRpZiAoaG91cnMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgPSAoaG91cnMgPiA5ID8gaG91cnMgOiAnMCcgKyBob3VycykgKyAnOic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCA9ICcwMDonO1xuXHRcdH1cblxuXHRcdGlmIChtaW51dGVzID4gMCkge1xuXHRcdFx0cmVzdWx0ICs9IChtaW51dGVzID4gOSA/IG1pbnV0ZXMgOiAnMCcgKyBtaW51dGVzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ICs9ICcwMDonO1xuXHRcdH1cblxuXHRcdGlmIChzZWNvbmRzID4gMCkge1xuXHRcdFx0cmVzdWx0ICs9IChzZWNvbmRzID4gOSA/IHNlY29uZHMgOiAnMCcgKyBzZWNvbmRzKSArICc6Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ICs9ICcwMDonO1xuXHRcdH1cblxuXHRcdGlmIChtaWxsaXNlY29uZHMgPiAwKSB7XG5cdFx0XHRyZXN1bHQgKz0gKG1pbGxpc2Vjb25kcyA+IDkgPyBtaWxsaXNlY29uZHMgOiAnMCcgKyBtaWxsaXNlY29uZHMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgKz0gJzAwJztcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7IiwiLypcbiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuIENvcHlyaWdodCAoYykgMjAxNSBDaHJpcyBEaWNrc29uXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG52YXIgU3RvcHdvcmRzID0gcmVxdWlyZSgnLi9zdG9wd29yZHMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGVyZkxvZyA9IGZhbHNlO1xuXG4vKipcbiAqIENsb3VkNSBjb25zdHJ1Y3RvclxuICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQ2xvdWQ1ID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXG5cdHRoaXMuX2xvZ2dlciA9IG5ldyBMb2dnZXIocGVyZkxvZyk7XG5cblx0dGhpcy5fd29yZHMgPSB7fTtcblx0dGhpcy5fc3RvcFdvcmRzID0ge307XG5cblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblxuICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcyA9IG51bGw7XG4gICAgdGhpcy5faGlnaGxpZ2h0ZWRXb3JkcyA9IG51bGw7XG5cblx0dGhpcy5fd2lkdGggPSBudWxsO1xuXHR0aGlzLl9oZWlnaHQgPSBudWxsO1xuXHR0aGlzLl9iYWNrZ3JvdW5kRmlsbCA9IG51bGw7XG5cdHRoaXMuX29uV29yZE92ZXIgPSBudWxsO1xuICAgIHRoaXMuX29uV29yZE91dCA9IG51bGw7XG4gICAgdGhpcy5fb25Xb3JkQ2xpY2sgPSBudWxsO1xuXHR0aGlzLl9sYXlvdXQgPSBudWxsO1xuICAgIHRoaXMuX2xheW91dGVyID0gbnVsbDtcbiAgICB0aGlzLl9yZW5kZXJJbmZvID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuQ2xvdWQ1LnByb3RvdHlwZSA9IF8uZXh0ZW5kKENsb3VkNS5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGNhbnZhcyAtIEhUTUw1IENhbnZhcyBlbGVtZW50XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXG4gICAgICAgICAgICBpZiAoY2FudmFzID09PSB0aGlzLl9jYW52YXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgdmFyIGNXaWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHZhciBjSGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBjc3NXaWR0aCA9IGNXaWR0aDtcbiAgICAgICAgICAgIHZhciBjc3NIZWlnaHQgPSBjSGVpZ2h0O1xuICAgICAgICAgICAgaWYgKGRwciA+IDEpIHtcbiAgICAgICAgICAgICAgICBjV2lkdGggKj0gZHByO1xuICAgICAgICAgICAgICAgIGNIZWlnaHQgKj0gZHByO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRlZFdvcmRzID0ge307XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJJbmZvID0ge307XG5cblxuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoID0gY1dpZHRoO1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCA9IGNIZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUud2lkdGggPSBjc3NXaWR0aCArICdweCc7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuaGVpZ2h0ID0gY3NzSGVpZ2h0ICsgJ3B4Oydcblx0XHRcdHRoaXMuX3dpZHRoID0gY1dpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY0hlaWdodDtcblxuXG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5oZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLndpZHRoID0gdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUudG9wID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS5sZWZ0ID0gdGhpcy5fY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQ7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5faGlnaGxpZ2h0Q2FudmFzLHRoaXMuX2NhbnZhcyk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzLiAgIElmIG5vdCBzZXQsIHVzZXMgdGhlIGluaGVyaXRlZCB3aWR0aCBmcm9tIGNhbnZhc1xuXHQgKiBAcGFyYW0gd2lkdGggLSB3aWR0aCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKHdpZHRoKSB7XG5cdFx0aWYgKHdpZHRoKSB7XG5cdFx0XHR0aGlzLnJlc2l6ZSh3aWR0aCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMud2lkdGg7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzLiAgSWYgbm90IHNldCwgdXNlcyB0aGUgaW5oZXJpdGVkIHdpZHRoIGZyb20gY2FudmFzXG5cdCAqIEBwYXJhbSBoZWlnaHQgLSBoZWlnaHQgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0aGVpZ2h0IDogZnVuY3Rpb24oaGVpZ2h0KSB7XG5cdFx0aWYgKGhlaWdodCkge1xuXHRcdFx0aWYgKHRoaXMuX2NhbnZhcykge1xuXHRcdFx0XHR0aGlzLnJlc2l6ZSh1bmRlZmluZWQsaGVpZ2h0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5faGVpZ2h0O1xuXHRcdH1cblx0fSxcblxuICAgIHJlc2l6ZSA6IGZ1bmN0aW9uKHcsaCkge1xuICAgICAgICB2YXIgZHByID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgIGlmICh3KSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSBkcHIgKiB3O1xuICAgICAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLndpZHRoID0gdyArICdweCc7XG4gICAgICAgICAgICB0aGlzLl93aWR0aCA9ICBkcHIgKiB3O1xuXG4gICAgICAgICAgICBpZiAodGhpcy5faGlnaGxpZ2h0Q2FudmFzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0Q2FudmFzLndpZHRoID0gdGhpcy5fY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodENhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMuX2NhbnZhcy5zdHlsZS53aWR0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIGlmIChoKSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0ID0gZHByICogaDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS5oZWlnaHQgPSBoICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IGRwciAqIGg7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9oaWdobGlnaHRDYW52YXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oaWdobGlnaHRDYW52YXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLnN0eWxlLmhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSB0ZXh0IGZvciB3b3JkIGNsb3VkIGdlbmVyYXRpb24gZnJvbSBhIGxhcmdlIHN0cmluZ1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nLiAgIEJ5IGRlZmF1bHQsIHdlIHJlbW92ZSBhbGwgcHVuY3R1YXRpb24uICAgQWRkaXRpb25hbCBydWxlcyBjYW4gYmUgYWRkZWQgYnlcblx0ICogY2FsbGluZyB0ZXh0RmlsdGVycyguLi4pXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyE/JCVcXF4mXFwqOzp7fT1cXC1fYH4oKV0vZywnJyk7XG5cdFx0aWYgKHRoaXMuX2ZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXIpIHtcblx0XHRcdFx0ZmlsdGVyZWQgPSB0ZXh0LnJlcGxhY2UoZmlsdGVyLCcnKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHR2YXIgd29yZHMgPSBmaWx0ZXJlZC5zcGxpdCgnICcpO1xuXHRcdHRoaXMud29yZHMod29yZHMpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdG1hc2sgOiBmdW5jdGlvbihtYXNrVXJsLGNhbGxiYWNrKSB7XG5cdFx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xuXHRcdGltZy5zcmMgPSBtYXNrVXJsO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpbWcub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd2lkdGggPSBpbWcud2lkdGg7XG5cdFx0XHR2YXIgaGVpZ2h0ID0gaW1nLmhlaWdodDtcblx0XHRcdHRoYXQucmVzaXplKHdpZHRoLGhlaWdodCk7XG5cblx0XHRcdHRoYXQuX21hc2tDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRcdHRoYXQuX21hc2tDYW52YXMud2lkdGggPSB3aWR0aDtcblx0XHRcdHRoYXQuX21hc2tDYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0XHR2YXIgY29udGV4dCA9IHRoYXQuX21hc2tDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoMCwwLDAsMCknO1xuXHRcdFx0Y29udGV4dC5maWxsUmVjdCgwLDAsdGhhdC5fbWFza0NhbnZhcy53aWR0aCx0aGF0Ll9tYXNrQ2FudmFzLmhlaWdodCk7XG5cdFx0XHRjb250ZXh0LmRyYXdJbWFnZShpbWcsMCwwKTtcblx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIGEgbGlzdCBvZiB0ZXh0IGZpbHRlcnMgKHJlZ3VsYXIgZXhwcmVzc2lvbnMpIHRvIGJlIGFwcGxpZWQuICAgUnVsZXMgdGhhdCBtYXRjaCB3aWxsIGJlIGRlbGV0ZWRcblx0ICogZnJvbSB0aGUgb3JpZ2luYWwgdGV4dCBzdHJpbmcuICBUaGV5J3JlIGFwcGxpZWQgaW4gdGhlIG9yZGVyIGdpdmVuIHRvIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIGZpbHRlcnMgLSBhbiBhcnJheSBvZiByZWd1bGFyIGV4cHJlc3Npb25zXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0dGV4dEZpbHRlcnMgOiBmdW5jdGlvbihmaWx0ZXJzKSB7XG5cdFx0aWYgKGZpbHRlcnMpIHtcblx0XHRcdHRoaXMuX2ZpbHRlcnMgPSBmaWx0ZXJzO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9maWx0ZXJzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgc3RvcCB3b3JkcyAod29yZHMgdG8gaWdub3JlKVxuXHQgKiBAcGFyYW0gd29yZHMgLSBhbiBhcnJheSBvZiBzdHJpbmdzIHRvIGlnbm9yZVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuX2JhY2tncm91bmRGaWxsIHx8ICd3aGl0ZSc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGJhY2tncm91bmQgZmlsbCBzdHlsZVxuXHQgKiBAcGFyYW0gZmlsbFN0eWxlIC0gYSB2YWxpZCBmaWxsU3R5bGUgc3RyaW5nXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgd29yZHMgZm9yIHRoZSB3b3JkIGNsb3VkXG5cdCAqIEBwYXJhbSB3b3JkcyAtIGFuIGFycmF5IG9mIHdvcmRzLlxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKHRoaXMuX3N0b3BXb3JkcykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRoaXMuc3RvcChTdG9wd29yZHMuRW5nbGlzaCk7XG5cdFx0XHR9XG5cblx0XHRcdHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJhdykge1xuXHRcdFx0XHR2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKHRoYXQuX3N0b3BXb3Jkc1t3b3JkXSB8fCB3b3JkID09PSAnJykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBjb3VudCA9IHRoYXQuX3dvcmRzW3dvcmRdO1xuXHRcdFx0XHRpZiAoIWNvdW50KSB7XG5cdFx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl93b3Jkcztcblx0XHR9XG5cdH0sXG5cbiAgICB3b3JkTWFwIDogZnVuY3Rpb24od29yZE1hcCkge1xuICAgICAgICBpZiAod29yZE1hcCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMod29yZE1hcCkuZm9yRWFjaChmdW5jdGlvbihyYXcpIHtcbiAgICAgICAgICAgICAgICB2YXIgd29yZCA9IHJhdy50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5fc3RvcFdvcmRzW3dvcmRdIHx8IHdvcmQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gd29yZE1hcFt3b3JkXSA/IHdvcmRNYXBbd29yZF0gOiAxO1xuICAgICAgICAgICAgICAgIHRoYXQuX3dvcmRzW3dvcmRdID0gY291bnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmRzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhpZ2hsaWdodCA6IGZ1bmN0aW9uKHdvcmRzLGNvbG9yKSB7XG4gICAgICAgIGlmICh3b3JkcyBpbnN0YW5jZW9mIEFycmF5ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgd29yZHMgPSBbd29yZHNdO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG4gICAgICAgICAgICB0aGF0Ll9oaWdobGlnaHRlZFdvcmRzW3dvcmRdID0gY29sb3I7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl91cGRhdGVIaWdodGxpZ2h0KCk7XG4gICAgfSxcblxuICAgIHVuaGlnaGxpZ2h0IDogZnVuY3Rpb24od29yZHMpIHtcbiAgICAgICAgaWYgKCF3b3Jkcykge1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0ZWRXb3JkcyA9IHt9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHdvcmRzIGluc3RhbmNlb2YgQXJyYXkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgd29yZHMgPSBbd29yZHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgd29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGF0Ll9oaWdobGlnaHRlZFdvcmRzW3dvcmRdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl91cGRhdGVIaWdodGxpZ2h0KCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIaWdodGxpZ2h0IDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIGhpZ2hsaWdodEN0eCA9IHRoaXMuX2hpZ2hsaWdodENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBoaWdobGlnaHRDdHguY2xlYXJSZWN0KDAsMCx0aGlzLl9oaWdobGlnaHRDYW52YXMud2lkdGgsdGhpcy5faGlnaGxpZ2h0Q2FudmFzLmhlaWdodCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX2hpZ2hsaWdodGVkV29yZHMpLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgdmFyIHJlbmRlckluZm8gPSB0aGF0Ll9yZW5kZXJJbmZvW3dvcmRdO1xuICAgICAgICAgICAgdmFyIGNsciA9IHRoYXQuX2hpZ2hsaWdodGVkV29yZHNbd29yZF07XG4gICAgICAgICAgICBpZiAocmVuZGVySW5mbykge1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodEN0eC5maWxsU3R5bGUgPSBjbHI7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0Q3R4LmZvbnQgPSByZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyByZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0Q3R4LmZpbGxUZXh0KHdvcmQscmVuZGVySW5mby54LHJlbmRlckluZm8ueSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3ZlciBhIHdvcmRcblx0ICogQHBhcmFtIGhhbmRsZXJcblx0ICogQHJldHVybnMge0Nsb3VkNX1cblx0ICovXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldCBhIGhhbmRsZXIgZm9yIG1vdXNpbmcgb3V0IG9mIGEgd29yZFxuXHQgKiBAcGFyYW0gaGFuZGxlclxuXHQgKiBAcmV0dXJucyB7Q2xvdWQ1fVxuXHQgKi9cblx0b25Xb3JkT3V0IDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE91dCA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYSBoYW5kbGVyIGZvciBjbGlja2luZyBvbiBhIHdvcmRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqIEByZXR1cm5zIHtDbG91ZDV9XG4gICAgICovXG4gICAgb25Xb3JkQ2xpY2sgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX29uV29yZENsaWNrID0gaGFuZGxlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGZhbWlseSBmb3Igd29yZHNcblx0ICogQHBhcmFtIGZvbnQgLSBmb250IGZhbWlseSAoaWUvICdIZWx2ZXRpY2EnKVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGZvbnQgOiBmdW5jdGlvbihmb250KSB7XG5cdFx0aWYgKGZvbnQpIHtcblx0XHRcdHRoaXMuX2ZvbnQgPSBmb250O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250O1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBtaW5pbXVtIGZvbnQgc2l6ZSBmb3Igd29yZHNcblx0ICogQHBhcmFtIG1pbkZvbnRTaXplIC0gaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bWluRm9udFNpemUgOiBmdW5jdGlvbihtaW5Gb250U2l6ZSkge1xuXHRcdGlmIChtaW5Gb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWluRm9udFNpemUgPSBtaW5Gb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG1heGltdW0gZm9udCBzaXplIGZvciB3b3Jkc1xuXHQgKiBAcGFyYW0gbWF4Rm9udFNpemUgLSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRtYXhGb250U2l6ZSA6IGZ1bmN0aW9uKG1heEZvbnRTaXplKSB7XG5cdFx0aWYgKG1heEZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9tYXhGb250U2l6ZSA9IG1heEZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9tYXhGb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbWF4aW11bSBudW1iZXIgb2Ygd29yZHMgdG8gYmUgcmVuZGVyZWQgaW4gdGhlIGNsb3VkXG5cdCAqIEBwYXJhbSBtYXhXb3Jkc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG1heFdvcmRzIDogZnVuY3Rpb24obWF4V29yZHMpIHtcblx0XHRpZiAobWF4V29yZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5fbWF4V29yZHMgPSBtYXhXb3Jkcztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4V29yZHM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgY29sb3JzXG5cdCAqIEBwYXJhbSBjb2xvciAtIGNhbiBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcblx0ICogXHRcdDEpICBBIGZpbGxTdHlsZSBzdHJpbmcgKGllLyAncmVkJywncmdiKDI1NSwyNTUsMCknLCBldGMpXG5cdCAqIFx0ICAgIDIpICBBbiBhcnJheSBvZiBmaWxsU3R5bGUgc3RyaW5nc1xuXHQgKiBcdCAgICAzKSAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBmaWxsU3R5bGUgc3RyaW5nIGdpdmVuIHRoZSByZW5kZXJJbmZvIGZvciB0aGUgd29yZC4gIGllL1xuXHQgKiBcdCAgICAgICAgICAgICBmdW5jdGlvbihyZW5kZXJJbmZvKSB7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgd29yZCA9IHJlbmRlckluZm8ud29yZDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IHJlbmRlckluZm8uY291bnQ7XG5cdCAqIFx0ICAgICAgICAgICAgICAgICB2YXIgeFBvcyA9IHJlbmRlckluZm8ueDtcblx0ICogXHQgICAgICAgICAgICAgICAgIHZhciB5UG9zdCA9IHJlbmRlckluZm8ueTtcblx0ICogXHQgICAgICAgICAgICAgICAgIHJldHVybiAvLyBhIGZpbGxTdHlsZSBkZXJpdmVkIGZyb20gYWJvdmUgcHJvcGVydGllc1xuXHQgKiBcdCAgICAgICAgICAgICAgfVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNvbG9yIDogZnVuY3Rpb24oY29sb3IpIHtcblx0XHRpZiAoY29sb3IpIHtcblx0XHRcdHRoaXMuX2NvbG9yID0gY29sb3I7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbG9yO1xuXHRcdH1cblx0fSxcblxuICAgIGxheW91dCA6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fbGF5b3V0ZXIgPSBoYW5kbGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cdC8qKlxuXHQgKiBMYXlvdXQgYW5kIHJlbmRlciB0aGUgd29yZCBjbG91ZCB0byB0aGUgY2FudmFzIHByb3ZpZGVkXG5cdCAqIEByZXR1cm5zIHtDbG91ZDV9XG5cdCAqL1xuXHRnZW5lcmF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYXlvdXRBdHRyaWJ1dGVzID0ge307XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fZm9udCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5mb250ID0gdGhpcy5fZm9udDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21pbkZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1pbkZvbnRTaXplID0gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhGb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhGb250U2l6ZSA9IHRoaXMuX21heEZvbnRTaXplO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWF4V29yZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhXb3JkcyA9IHRoaXMuX21heFdvcmRzO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbWFza0NhbnZhcykge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXNrQ2FudmFzID0gdGhpcy5fbWFza0NhbnZhcztcblx0XHR9XG5cblx0XHR0aGlzLl9sb2dnZXIucHVzaCgnTGF5b3V0Jyk7XG5cdFx0dGhpcy5fbGF5b3V0ID0gbmV3IExheW91dChsYXlvdXRBdHRyaWJ1dGVzKVxuXHRcdFx0LmNhbnZhcyh0aGlzLl9jYW52YXMpXG5cdFx0XHQud29yZHModGhpcy5fd29yZHMpXG4gICAgICAgICAgICAubGF5b3V0ZXIodGhpcy5fbGF5b3V0ZXIpXG5cdFx0XHQub25Xb3JkT3Zlcih0aGlzLl9vbldvcmRPdmVyKVxuXHRcdFx0Lm9uV29yZE91dCh0aGlzLl9vbldvcmRPdXQpXG4gICAgICAgICAgICAub25Xb3JkQ2xpY2sodGhpcy5fb25Xb3JkQ2xpY2spO1xuXHRcdHRoaXMuX2xvZ2dlci5wb3AoKTtcblxuXHRcdHRoaXMuX3JlbmRlckluZm8gPSB0aGlzLl9sYXlvdXQubGF5b3V0KCk7XG5cblx0XHR0aGlzLmNsZWFyKCk7XG5cbiAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cblx0XHR0aGlzLl9sb2dnZXIucHVzaCgnUmVuZGVyJyk7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuX3JlbmRlckluZm8pLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0dmFyIHdvcmRSZW5kZXJJbmZvID0gdGhhdC5fcmVuZGVySW5mb1t3b3JkXTtcblx0XHRcdGlmICh3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSAtMSkge1xuXHRcdFx0XHRjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuXG5cblx0XHRcdFx0dmFyIGNsciA9ICdibGFjayc7XG5cdFx0XHRcdGlmICh0aGF0Ll9jb2xvcikge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9jb2xvciBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHR2YXIgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY29sb3IubGVuZ3RoKTtcblx0XHRcdFx0XHRcdGNsciA9IHRoYXQuX2NvbG9yW2lkeF07XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGF0Ll9jb2xvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRcdFx0XHRjbHIgPSB0aGF0Ll9jb2xvcih3b3JkUmVuZGVySW5mbyx3b3JkKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xyID0gdGhhdC5fY29sb3I7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGN0eC5maWxsU3R5bGUgPSBjbHI7XG5cdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cblx0XHRcdFx0aWYgKHRoYXQuZGVidWcpIHtcblx0XHRcdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0XHRcdGN0eC5zdHJva2VSZWN0KHdvcmRSZW5kZXJJbmZvLnggKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRYLCB3b3JkUmVuZGVySW5mby55ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WSwgd29yZFJlbmRlckluZm8uYmIud2lkdGgsIHdvcmRSZW5kZXJJbmZvLmJiLmhlaWdodCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLl9sb2dnZXIucG9wKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlcyBpbWFnZSB0byBsb2NhbCBmaWxlc3lzdGVtIHdpdGggdGhlIGZvcm1hdC9maWxlbmFtZSBzcGVjaWZpZWRcbiAgICAgKiBAcGFyYW0gZm9ybWF0IChvcHRpb25hbCkgLSBUaGUgbWltZXR5cGUgdG8gc2F2ZSBhcy4gICBEZWZhdWx0ICdpbWFnZS9wbmcnXG4gICAgICogQHBhcmFtIGZpbGVuYW1lIChvcHRpb25hbCkgLSBUaGUgZmlsZW5hbWUgdG8gc2F2ZSBpdCBhcy4gICAnZG93bmxvYWQnIGJ5IGRlZmF1bHRcbiAgICAgKi9cbiAgICBzYXZlIDogZnVuY3Rpb24oZm9ybWF0LGZpbGVuYW1lKSB7XG4gICAgICAgIHZhciBkYXRhVVJJID0gdGhpcy5fY2FudmFzLnRvRGF0YVVSTChmb3JtYXQgfHwgJ2ltYWdlL3BuZycpO1xuICAgICAgICB2YXIgdXJpQ29udGVudCA9IGRhdGFVUkkuaW5kZXhPZignLCcpO1xuICAgICAgICBkYXRhVVJJID0gZGF0YVVSSS5zdWJzdHJpbmcodXJpQ29udGVudCk7XG4gICAgICAgIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBsaW5rLmhyZWYgPSAnZGF0YTphcHBsaWNhdGlvbi9vY3RldC1zdHJlYW07YmFzZTY0JyArIGRhdGFVUkk7XG4gICAgICAgIGlmIChmaWxlbmFtZSkge1xuICAgICAgICAgICAgbGluay5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGxpbmsuY2xpY2soKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbG91ZDU7XG5tb2R1bGUuZXhwb3J0cy5TdG9wd29yZHMgPSBTdG9wd29yZHM7IiwiLypcbiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuIENvcHlyaWdodCAoYykgMjAxNSBDaHJpcyBEaWNrc29uXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG52YXIgZW5nbGlzaCA9IFwiYSwgYWJvdXQsIGFib3ZlLCBhY3Jvc3MsIGFmdGVyLCBhZ2FpbiwgYWdhaW5zdCwgYWxsLCBhbG1vc3QsIGFsb25lLCBhbG9uZywgYWxyZWFkeSwgYWxzbywgYWx0aG91Z2gsIGFsd2F5cywgYW0sIGFtb25nLCBhbiwgYW5kLCBhbm90aGVyLCBhbnksIGFueWJvZHksIGFueW9uZSwgYW55dGhpbmcsIGFueXdoZXJlLCBhcmUsIGFyZWEsIGFyZWFzLCBhcmVuJ3QsIGFyb3VuZCwgYXMsIGFzaywgYXNrZWQsIGFza2luZywgYXNrcywgYXQsIGF3YXksIGIsIGJhY2ssIGJhY2tlZCwgYmFja2luZywgYmFja3MsIGJlLCBiZWNhbWUsIGJlY2F1c2UsIGJlY29tZSwgYmVjb21lcywgYmVlbiwgYmVmb3JlLCBiZWdhbiwgYmVoaW5kLCBiZWluZywgYmVpbmdzLCBiZWxvdywgYmVzdCwgYmV0dGVyLCBiZXR3ZWVuLCBiaWcsIGJvdGgsIGJ1dCwgYnksIGMsIGNhbWUsIGNhbiwgY2Fubm90LCBjYW4ndCwgY2FzZSwgY2FzZXMsIGNlcnRhaW4sIGNlcnRhaW5seSwgY2xlYXIsIGNsZWFybHksIGNvbWUsIGNvdWxkLCBjb3VsZG4ndCwgZCwgZGlkLCBkaWRuJ3QsIGRpZmZlciwgZGlmZmVyZW50LCBkaWZmZXJlbnRseSwgZG8sIGRvZXMsIGRvZXNuJ3QsIGRvaW5nLCBkb25lLCBkb24ndCwgZG93biwgZG93bmVkLCBkb3duaW5nLCBkb3ducywgZHVyaW5nLCBlLCBlYWNoLCBlYXJseSwgZWl0aGVyLCBlbmQsIGVuZGVkLCBlbmRpbmcsIGVuZHMsIGVub3VnaCwgZXZlbiwgZXZlbmx5LCBldmVyLCBldmVyeSwgZXZlcnlib2R5LCBldmVyeW9uZSwgZXZlcnl0aGluZywgZXZlcnl3aGVyZSwgZiwgZmFjZSwgZmFjZXMsIGZhY3QsIGZhY3RzLCBmYXIsIGZlbHQsIGZldywgZmluZCwgZmluZHMsIGZpcnN0LCBmb3IsIGZvdXIsIGZyb20sIGZ1bGwsIGZ1bGx5LCBmdXJ0aGVyLCBmdXJ0aGVyZWQsIGZ1cnRoZXJpbmcsIGZ1cnRoZXJzLCBnLCBnYXZlLCBnZW5lcmFsLCBnZW5lcmFsbHksIGdldCwgZ2V0cywgZ2l2ZSwgZ2l2ZW4sIGdpdmVzLCBnbywgZ29pbmcsIGdvb2QsIGdvb2RzLCBnb3QsIGdyZWF0LCBncmVhdGVyLCBncmVhdGVzdCwgZ3JvdXAsIGdyb3VwZWQsIGdyb3VwaW5nLCBncm91cHMsIGgsIGhhZCwgaGFkbid0LCBoYXMsIGhhc24ndCwgaGF2ZSwgaGF2ZW4ndCwgaGF2aW5nLCBoZSwgaGUnZCwgaGUnbGwsIGhlciwgaGVyZSwgaGVyZSdzLCBoZXJzLCBoZXJzZWxmLCBoZSdzLCBoaWdoLCBoaWdoZXIsIGhpZ2hlc3QsIGhpbSwgaGltc2VsZiwgaGlzLCBob3csIGhvd2V2ZXIsIGhvdydzLCBpLCBpJ2QsIGlmLCBpJ2xsLCBpJ20sIGltcG9ydGFudCwgaW4sIGludGVyZXN0LCBpbnRlcmVzdGVkLCBpbnRlcmVzdGluZywgaW50ZXJlc3RzLCBpbnRvLCBpcywgaXNuJ3QsIGl0LCBpdHMsIGl0J3MsIGl0c2VsZiwgaSd2ZSwgaiwganVzdCwgaywga2VlcCwga2VlcHMsIGtpbmQsIGtuZXcsIGtub3csIGtub3duLCBrbm93cywgbCwgbGFyZ2UsIGxhcmdlbHksIGxhc3QsIGxhdGVyLCBsYXRlc3QsIGxlYXN0LCBsZXNzLCBsZXQsIGxldHMsIGxldCdzLCBsaWtlLCBsaWtlbHksIGxvbmcsIGxvbmdlciwgbG9uZ2VzdCwgbSwgbWFkZSwgbWFrZSwgbWFraW5nLCBtYW4sIG1hbnksIG1heSwgbWUsIG1lbWJlciwgbWVtYmVycywgbWVuLCBtaWdodCwgbW9yZSwgbW9zdCwgbW9zdGx5LCBtciwgbXJzLCBtdWNoLCBtdXN0LCBtdXN0bid0LCBteSwgbXlzZWxmLCBuLCBuZWNlc3NhcnksIG5lZWQsIG5lZWRlZCwgbmVlZGluZywgbmVlZHMsIG5ldmVyLCBuZXcsIG5ld2VyLCBuZXdlc3QsIG5leHQsIG5vLCBub2JvZHksIG5vbiwgbm9vbmUsIG5vciwgbm90LCBub3RoaW5nLCBub3csIG5vd2hlcmUsIG51bWJlciwgbnVtYmVycywgbywgb2YsIG9mZiwgb2Z0ZW4sIG9sZCwgb2xkZXIsIG9sZGVzdCwgb24sIG9uY2UsIG9uZSwgb25seSwgb3Blbiwgb3BlbmVkLCBvcGVuaW5nLCBvcGVucywgb3IsIG9yZGVyLCBvcmRlcmVkLCBvcmRlcmluZywgb3JkZXJzLCBvdGhlciwgb3RoZXJzLCBvdWdodCwgb3VyLCBvdXJzLCBvdXJzZWx2ZXMsIG91dCwgb3Zlciwgb3duLCBwLCBwYXJ0LCBwYXJ0ZWQsIHBhcnRpbmcsIHBhcnRzLCBwZXIsIHBlcmhhcHMsIHBsYWNlLCBwbGFjZXMsIHBvaW50LCBwb2ludGVkLCBwb2ludGluZywgcG9pbnRzLCBwb3NzaWJsZSwgcHJlc2VudCwgcHJlc2VudGVkLCBwcmVzZW50aW5nLCBwcmVzZW50cywgcHJvYmxlbSwgcHJvYmxlbXMsIHB1dCwgcHV0cywgcSwgcXVpdGUsIHIsIHJhdGhlciwgcmVhbGx5LCByaWdodCwgcm9vbSwgcm9vbXMsIHMsIHNhaWQsIHNhbWUsIHNhdywgc2F5LCBzYXlzLCBzZWNvbmQsIHNlY29uZHMsIHNlZSwgc2VlbSwgc2VlbWVkLCBzZWVtaW5nLCBzZWVtcywgc2Vlcywgc2V2ZXJhbCwgc2hhbGwsIHNoYW4ndCwgc2hlLCBzaGUnZCwgc2hlJ2xsLCBzaGUncywgc2hvdWxkLCBzaG91bGRuJ3QsIHNob3csIHNob3dlZCwgc2hvd2luZywgc2hvd3MsIHNpZGUsIHNpZGVzLCBzaW5jZSwgc21hbGwsIHNtYWxsZXIsIHNtYWxsZXN0LCBzbywgc29tZSwgc29tZWJvZHksIHNvbWVvbmUsIHNvbWV0aGluZywgc29tZXdoZXJlLCBzdGF0ZSwgc3RhdGVzLCBzdGlsbCwgc3VjaCwgc3VyZSwgdCwgdGFrZSwgdGFrZW4sIHRoYW4sIHRoYXQsIHRoYXQncywgdGhlLCB0aGVpciwgdGhlaXJzLCB0aGVtLCB0aGVtc2VsdmVzLCB0aGVuLCB0aGVyZSwgdGhlcmVmb3JlLCB0aGVyZSdzLCB0aGVzZSwgdGhleSwgdGhleSdkLCB0aGV5J2xsLCB0aGV5J3JlLCB0aGV5J3ZlLCB0aGluZywgdGhpbmdzLCB0aGluaywgdGhpbmtzLCB0aGlzLCB0aG9zZSwgdGhvdWdoLCB0aG91Z2h0LCB0aG91Z2h0cywgdGhyZWUsIHRocm91Z2gsIHRodXMsIHRvLCB0b2RheSwgdG9nZXRoZXIsIHRvbywgdG9vaywgdG93YXJkLCB0dXJuLCB0dXJuZWQsIHR1cm5pbmcsIHR1cm5zLCB0d28sIHUsIHVuZGVyLCB1bnRpbCwgdXAsIHVwb24sIHVzLCB1c2UsIHVzZWQsIHVzZXMsIHYsIHZlcnksIHcsIHdhbnQsIHdhbnRlZCwgd2FudGluZywgd2FudHMsIHdhcywgd2Fzbid0LCB3YXksIHdheXMsIHdlLCB3ZSdkLCB3ZWxsLCB3ZSdsbCwgd2VsbHMsIHdlbnQsIHdlcmUsIHdlJ3JlLCB3ZXJlbid0LCB3ZSd2ZSwgd2hhdCwgd2hhdCdzLCB3aGVuLCB3aGVuJ3MsIHdoZXJlLCB3aGVyZSdzLCB3aGV0aGVyLCB3aGljaCwgd2hpbGUsIHdobywgd2hvbGUsIHdob20sIHdobydzLCB3aG9zZSwgd2h5LCB3aHkncywgd2lsbCwgd2l0aCwgd2l0aGluLCB3aXRob3V0LCB3b24ndCwgd29yaywgd29ya2VkLCB3b3JraW5nLCB3b3Jrcywgd291bGQsIHdvdWxkbid0LCB4LCB5LCB5ZWFyLCB5ZWFycywgeWVzLCB5ZXQsIHlvdSwgeW91J2QsIHlvdSdsbCwgeW91bmcsIHlvdW5nZXIsIHlvdW5nZXN0LCB5b3VyLCB5b3UncmUsIHlvdXJzLCB5b3Vyc2VsZiwgeW91cnNlbHZlcywgeW91J3ZlLCB6XCI7XG52YXIgZnJlbmNoID0gXCJhbG9ycyxhdSxhdWN1bnMsYXVzc2ksYXV0cmUsYXZhbnQsYXZlYyxhdm9pcixib24sY2FyLGNlLGNlbGEsY2VzLGNldXgsY2hhcXVlLGNpLGNvbW1lLGNvbW1lbnQsZGFucyxkZXMsZHUsZGVkYW5zLGRlaG9ycyxkZXB1aXMsZGV2cmFpdCxkb2l0LGRvbmMsZG9zLGTDqWJ1dCxlbGxlLGVsbGVzLGVuLGVuY29yZSxlc3NhaSxlc3QsZXQsZXUsZmFpdCxmYWl0ZXMsZm9pcyxmb250LGhvcnMsaWNpLGlsLGlscyxqZSxqdXN0ZSxsYSxsZSxsZXMsbGV1cixsw6AsbWEsbWFpbnRlbmFudCxtYWlzLG1lcyxtaW5lLG1vaW5zLG1vbixtb3QsbcOqbWUsbmksbm9tbcOpcyxub3RyZSxub3VzLG91LG/DuSxwYXIscGFyY2UscGFzLHBldXQscGV1LHBsdXBhcnQscG91cixwb3VycXVvaSxxdWFuZCxxdWUscXVlbCxxdWVsbGUscXVlbGxlcyxxdWVscyxxdWksc2Esc2FucyxzZXMsc2V1bGVtZW50LHNpLHNpZW4sc29uLHNvbnQsc291cyxzb3lleiwgc3VqZXQsc3VyLHRhLHRhbmRpcyx0ZWxsZW1lbnQsdGVscyx0ZXMsdG9uLHRvdXMsdG91dCx0cm9wLHRyw6hzLHR1LHZvaWVudCx2b250LHZvdHJlLHZvdXMsdnUsw6dhLMOpdGFpZW50LMOpdGF0LMOpdGlvbnMsw6l0w6ksw6p0cmUsZGUsdW4saSxxdSxkLGwsbmUsc2UsdW5lLG4scyxtLHBsdXMsw6AsJ3VuLCdpbCwnZXN0LGx1aSxtbWUsYXZhaXQsYywtLC0tLC0tLSxtZSxqLD9cIjtcbnZhciBlbmdsaXNoV29yZHMgPSBlbmdsaXNoLnNwbGl0KCcsJyk7XG52YXIgZnJlbmNoV29yZHMgPSBmcmVuY2guc3BsaXQoJywnKTtcblxuZXhwb3J0cy5FbmdsaXNoID0gZW5nbGlzaFdvcmRzO1xuZXhwb3J0cy5GcmVuY2ggPSBmcmVuY2hXb3JkcztcblxuXG5cblxuIiwiLypcbiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuIENvcHlyaWdodCAoYykgMjAxNSBDaHJpcyBEaWNrc29uXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5cbnZhciBUZXh0Qml0bWFwID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9jb250ZXh0ID0gbnVsbDtcblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcblxuXHR0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0dGhpcy5fY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCB8fCA2NDA7XG5cdHRoaXMuX2NhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCB8fCA0ODA7XG5cdHRoaXMuX2NvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5fY2FudmFzKTtcblx0fVxuXG5cdHRoaXMuX2JpdG1hcCA9IF8uY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuVGV4dEJpdG1hcC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0Qml0bWFwLnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBiaXRtYXAgZm9yIHRoZSBnaXZlbiB3b3JkL2ZvbnQgcGFpci4gICBSZXR1cm4gYSByZW5kZXJJbmZvIG9iamVjdCBmb3IgdGhpc1xuXHQgKiBAcGFyYW0gdGV4dCAtIGEgc3RyaW5nIHRoYXQgd2Ugd2FudCB0byBiaXRtYXAgKGllLyBhIHdvcmQpXG5cdCAqIEBwYXJhbSBmb250SGVpZ2h0IC0gdGhlIGhlaWdodCBvZiB0aGUgZm9udFxuXHQgKiBAcGFyYW0gZm9udEZhbWlseSAtIHRoZSBmb250IGZhbWlseVxuXHQgKiBAcmV0dXJucyB7e2JiOiB7b2Zmc2V0WDogbnVtYmVyLCBvZmZzZXRZOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyfSwgYml0bWFwOiAqLCBmb250U2l6ZTogKiwgZm9udEZhbWlseTogKn19XG5cdCAqL1xuXHRjcmVhdGUgOiBmdW5jdGlvbih0ZXh0LGZvbnRIZWlnaHQsZm9udEZhbWlseSkge1xuXHRcdHZhciBjdHggPSB0aGlzLl9jb250ZXh0O1xuXHRcdGN0eC5maWxsU3R5bGUgPSAnYmxhY2snO1xuXHRcdGN0eC5maWxsUmVjdCgwLDAsdGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIHRleHRSZW5kZXJYID0gNTtcblx0XHR2YXIgdGV4dFJlbmRlclkgPSBNYXRoLmZsb29yKHRoaXMuX2NhbnZhcy5oZWlnaHQvMik7XG5cblx0XHQvLyBGaWxsIHRoZSBmb250XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0Y3R4LmZvbnQgPSBmb250SGVpZ2h0ICsgJ3B4ICcgKyBmb250RmFtaWx5O1xuXHRcdGN0eC5maWxsVGV4dCh0ZXh0LHRleHRSZW5kZXJYLHRleHRSZW5kZXJZKTtcblxuXHRcdHZhciB3aWR0aCA9IGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcblxuXHRcdC8vIEdldCBhIHJlbGF4ZWQgYm91bmRpbmcgYm94IHRvIGdyYWIgZnJvbSB0aGUgY2FudmFzXG5cdFx0dmFyIHN0YXJ0WCA9IHRleHRSZW5kZXJYO1xuXHRcdHZhciBzdGFydFkgPSB0ZXh0UmVuZGVyWSAtIGZvbnRIZWlnaHQgLSAyO1xuXHRcdHZhciBlbmRYID0gc3RhcnRYICsgd2lkdGggKyB0ZXh0UmVuZGVyWDtcblx0XHR2YXIgZW5kWSA9IHN0YXJ0WSArIGZvbnRIZWlnaHQgKyBmb250SGVpZ2h0KjAuNTtcblxuXG5cblx0XHR2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YShzdGFydFgsc3RhcnRZLGVuZFggLSBzdGFydFgsZW5kWSAtIHN0YXJ0WSk7XG5cblx0XHR2YXIgYm9vbGVhbkJpdG1hcCA9IF8uY3JlYXRlQXJyYXkoaW1hZ2VEYXRhLndpZHRoLGltYWdlRGF0YS5oZWlnaHQpO1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkrPTQpIHtcblxuXHRcdFx0Ym9vbGVhbkJpdG1hcFt4XVt5XSA9ICBpbWFnZURhdGEuZGF0YVtpXSAhPT0gMDtcblx0XHRcdHgrKztcblx0XHRcdGlmICh4ID09PSBpbWFnZURhdGEud2lkdGgpIHtcblx0XHRcdFx0eCA9IDA7XG5cdFx0XHRcdHkrKztcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWluWSA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFggPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WSA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGZvciAoeCA9IDA7IHggPCBib29sZWFuQml0bWFwLmxlbmd0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgYm9vbGVhbkJpdG1hcFt4XS5sZW5ndGg7IHkrKykge1xuXHRcdFx0XHRpZiAoYm9vbGVhbkJpdG1hcFt4XVt5XSkge1xuXHRcdFx0XHRcdG1pblggPSBNYXRoLm1pbihtaW5YLHgpO1xuXHRcdFx0XHRcdG1pblkgPSBNYXRoLm1pbihtaW5ZLHkpO1xuXHRcdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLHgpO1xuXHRcdFx0XHRcdG1heFkgPSBNYXRoLm1heChtYXhZLHkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gVHJpbSB0aGUgYm91bmRpbmcgYm94IHRvIGp1c3QgcGl4ZWxzIHRoYXQgYXJlIGZpbGxlZFxuXHRcdHZhciB0cmltbWVkQm9vbGVhbkJpdG1hcCA9IF8uY3JlYXRlQXJyYXkobWF4WC1taW5YLG1heFktbWluWSk7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IG1heFgtbWluWDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgbWF4WS1taW5ZOyB5KyspIHtcblx0XHRcdFx0dHJpbW1lZEJvb2xlYW5CaXRtYXBbeF1beV0gPSBib29sZWFuQml0bWFwW21pblgreF1bbWluWSt5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3llbGxvdyc7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdChzdGFydFgsc3RhcnRZLGVuZFgtc3RhcnRYLGVuZFktc3RhcnRZKTtcblx0XHR9XG5cblx0XHRjdHguc3Ryb2tlU3R5bGUgPSAncmVkJztcblx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSx0aGlzLl9jYW52YXMud2lkdGgsIHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIGJiV2lkdGggPSBtYXhYLW1pblg7XG5cdFx0dmFyIGJiSGVpZ2h0ID0gbWF4WS1taW5ZO1xuXHRcdHZhciBiYk9mZnNldFggPSAtKHRleHRSZW5kZXJYIC0gKHN0YXJ0WCArIG1pblggKSk7XG5cdFx0dmFyIGJiT2Zmc2V0WSA9IC0odGV4dFJlbmRlclkgLSAoc3RhcnRZICsgbWluWSkpO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCArIGJiT2Zmc2V0WCwgdGV4dFJlbmRlclkgKyBiYk9mZnNldFksIGJiV2lkdGgsIGJiSGVpZ2h0KTtcblx0XHR9XG5cblx0XHR2YXIgcmVuZGVySW5mbyA9IHtcblx0XHRcdGJiIDoge1xuXHRcdFx0XHRvZmZzZXRYIDogYmJPZmZzZXRYLFxuXHRcdFx0XHRvZmZzZXRZIDogYmJPZmZzZXRZLFxuXHRcdFx0XHR3aWR0aCA6IGJiV2lkdGgsXG5cdFx0XHRcdGhlaWdodCA6IGJiSGVpZ2h0XG5cdFx0XHR9LFxuXHRcdFx0Yml0bWFwIDogdHJpbW1lZEJvb2xlYW5CaXRtYXAsXG5cdFx0XHRmb250U2l6ZSA6IGZvbnRIZWlnaHQsXG5cdFx0XHRmb250RmFtaWx5IDogZm9udEZhbWlseVxuXHRcdH07XG5cblx0XHRyZXR1cm4gcmVuZGVySW5mbztcblx0fSxcblxuXHQvKipcblx0ICogdGVzdHMgd2hldGhlciBhIHJlbmRlckluZm8gb2JqZWN0IGZpdHMgaW50byBhIGdsb2JhbCBib29sZWFuIGJpdG1hcFxuXHQgKiBAcGFyYW0gcmVuZGVySW5mbyAtIHJlbmRlckluZm8gZm9yIGEgd29yZCAocmV0dXJuZWQgZnJvbSBjcmVhdGUpXG5cdCAqIEBwYXJhbSBiaXRtYXAgLSBzY2VuZSBiaXRtYXBcblx0ICogQHJldHVybnMge2Jvb2xlYW59IC0gdHJ1ZSBpZiB3b3JkIGZpdHMsIGZhbHNlIG90aGVyd2lzZVxuXHQgKi9cblx0Zml0cyA6IGZ1bmN0aW9uKHJlbmRlckluZm8sYml0bWFwKSB7XG5cdFx0cmVuZGVySW5mby54ID0gTWF0aC5mbG9vcihyZW5kZXJJbmZvLngpO1xuXHRcdHJlbmRlckluZm8ueSA9IE1hdGguZmxvb3IocmVuZGVySW5mby55KTtcblxuXHRcdHZhciBzdGFydFggPSByZW5kZXJJbmZvLnggKyByZW5kZXJJbmZvLmJiLm9mZnNldFg7XG5cdFx0dmFyIHN0YXJ0WSA9IHJlbmRlckluZm8ueSArIHJlbmRlckluZm8uYmIub2Zmc2V0WTtcblxuXHRcdHZhciBiaXRtYXBXaWR0aCA9IGJpdG1hcC5sZW5ndGg7XG5cdFx0dmFyIGJpdG1hcEhlaWdodCA9IGJpdG1hcFswXS5sZW5ndGg7XG5cblx0XHR2YXIgaGl0RWRnZSA9IHN0YXJ0WCA8IDAgfHwgc3RhcnRZIDwgMDtcblx0XHR2YXIgaGl0T3RoZXIgPSBmYWxzZTtcblx0XHR2YXIgZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcmVuZGVySW5mby5iYi53aWR0aCAmJiAhZG9lc250Rml0OyBpKyspIHtcblx0XHRcdHZhciB1ID0gc3RhcnRYICsgaTtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgcmVuZGVySW5mby5iYi5oZWlnaHQgJiYgIWRvZXNudEZpdDsgaisrKSB7XG5cdFx0XHRcdHZhciB2ID0gc3RhcnRZICsgajtcblx0XHRcdFx0aWYgKHUgPj0gYml0bWFwV2lkdGggfHwgdiA+PSBiaXRtYXBIZWlnaHQpIHtcblx0XHRcdFx0XHRoaXRFZGdlID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmIChiaXRtYXBbdV1bdl0pIHtcblx0XHRcdFx0XHRoaXRPdGhlciA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9lc250Rml0ID0gaGl0RWRnZSB8fCBoaXRPdGhlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuICFkb2VzbnRGaXQ7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHRCaXRtYXA7IiwiLypcbiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuIENvcHlyaWdodCAoYykgMjAxNSBDaHJpcyBEaWNrc29uXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG5cbnZhciBVdGlsID0ge1xuXG5cdGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuXHRcdHZhciBrZXksIGksIHNvdXJjZTtcblx0XHRmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHQgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblx0XHQgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuXHRcdFx0aWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHQgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuXHRcdFx0fVxuXHRcdCAgfVxuXHRcdH1cblx0XHRyZXR1cm4gZGVzdDtcblx0fSxcblxuXHRsZXJwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIG1pbiArICh0KihtYXgtbWluKSk7XG5cdH0sXG5cblx0c3RlcCA6IGZ1bmN0aW9uKG1pbixtYXgsdCkge1xuXHRcdHJldHVybiBNYXRoLnJvdW5kKHRoaXMubGVycChtaW4sbWF4LHQpKTtcblx0fSxcblxuXHQvKipcblx0ICogSGVscGVyIGZvciBjcmVhdGluZyBhbiBhcnJheVxuXHQgKiBAcGFyYW0gbGVuZ3RoXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG5cdGNyZWF0ZUFycmF5IDogZnVuY3Rpb24obGVuZ3RoKSB7XG5cdFx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0XHRpID0gbGVuZ3RoO1xuXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0XHR3aGlsZShpLS0pIHtcblx0XHRcdFx0YXJyW2xlbmd0aC0xIC0gaV0gPSB0aGlzLmNyZWF0ZUFycmF5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnI7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(3)
});
