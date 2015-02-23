/**
 * Created by chrisdickson on 15-02-16.
 */
function testmain() {

	var canvas = $('#myCanvas')[0];
	var canvasContainer = $('.canvas-container');

	$(window).resize(function() {
		canvas.width = canvasContainer.width();
	});
	$(window).resize();


	$('#generate').click(function() {
		var textArea = $('#myText');
		var text = textArea.val();
		var minFontSize = parseInt($('#minFontSize').val());
		var maxFontSize = parseInt($('#maxFontSize').val());
		var fontFamily = $('#fontFamily').val();
		var colors = [];
		$('.color').each(function(index,clrElement) {
			colors.push($(clrElement).val());
		});
		var background = $('#background').val();

		new Cloud5()
			.canvas($('#myCanvas')[0])
			.text(text)
			.minFontSize(minFontSize)
			.maxFontSize(maxFontSize)
			.font(fontFamily)
			.color(colors)
			.background(background)
			.generate();
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

}