/**
 * Created by chrisdickson on 15-02-16.
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

		if (maxWords > 0) {
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