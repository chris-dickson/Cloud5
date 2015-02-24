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
function livedemo() {

    var cloud = new Cloud5();
	var canvas = $('#myCanvas')[0];
	var canvasContainer = $('.canvas-container');

	$(window).resize(function() {
		canvas.width = canvasContainer.width();
	});
	$(window).resize();

	$('#sample').click(function() {
		$('#myText').val(gatsby);
	});


	$('#generate').click(function() {
		var textArea = $('#myText');
		var text = textArea.val();
		var minFontSize = parseInt($('#minFontSize').val());
		var maxFontSize = parseInt($('#maxFontSize').val());
		var fontFamily = $('#fontFamily').val();
		var maxWords = $('#maxWords').val();
		var colors = [];
		$('.color').each(function(index,clrElement) {
			colors.push($(clrElement).val());
		});
		var background = $('#background').val();

		cloud.canvas($('#myCanvas')[0])
			.text(text)
			.minFontSize(minFontSize)
			.maxFontSize(maxFontSize)
			.font(fontFamily)
			.color(colors)
			.background(background)
            .onWordOver(function(word) {
                $('#mouseOverWord').html(word);
            })
            .onWordOut(function() {
                $('#mouseOverWord').html('');
            })
            .onWordClick(function(word) {
                $('#mouseClickWord').html(word);
            });

		if (maxWords >= 0) {
			cloud.maxWords(maxWords);
		}

		cloud.generate();
	});

	$('#addColor').click(function() {
		var colorsContainer = $('#colorsContainer');

		var colorElement = $('<input type="color" value="#000000" class="color">').appendTo(colorsContainer);
		var removeBtn = $('<button>x</button>').appendTo(colorsContainer);
		removeBtn.click(function() {
			colorElement.remove();
			removeBtn.remove();
		});
	});

    $('#download').click(function() {
        if (cloud) {
            cloud.save('image/png','wordcloud.png');
        }
    })

}