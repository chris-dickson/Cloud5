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

function testmain() {

	var canvas = document.getElementById('myCanvas');
	document.body.style.margin = '0 0 0 0';

	var cloud = new Cloud5()
		.canvas(canvas)
		.font('Helvetica')
		.minFontSize(10)
		.maxFontSize(250)
		.maxWords(1000)
		.background('#0055bb')
		.text(gatsby)
		.textFilters([/\[[0-9]*\]/g,/[\t+\[\]]/g])		// remove citations and special characters
		.color(['#44bbcc','#88dddd','#bbeeff']);

	var timeout = null;
	var generate = function() {
		timeout = null;
		cloud.width(window.innerWidth);
		cloud.height(window.innerHeight);
		cloud.clear();
		cloud.generate();
	};

	window.onresize = function(e) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		timeout = setTimeout(generate,750);
	};
	window.onresize();
}