/**
 * Created by chrisdickson on 15-02-16.
 */
function testmain() {
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
		var li = $('<li/>');
		var colorElement = $('<input type="color" value="#000000" class="color">').appendTo(li);
		var removeBtn = $('<button>Remove</button>').appendTo(li);
		removeBtn.click(function() {
			colorElement.parent().remove();
		});
		$('#colorList').append(li);
	});

}