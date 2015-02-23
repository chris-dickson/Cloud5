/**
 * Created by chrisdickson on 15-02-16.
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