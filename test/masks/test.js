/**
 * Created by chrisdickson on 15-02-16.
 */
function testmain() {

	var canvas = document.getElementById('myCanvas');

	var cloud = new Cloud5()

		.canvas(canvas)
        .text(canada)
		.color(['#ff0000','#ee0000','#dd0000','#cc0000','#bb0000','#aa0000','#990000'])
		.mask('./mask.png',function() {
			cloud.generate();
		});
}