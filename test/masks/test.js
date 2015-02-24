/**
 * Created by chrisdickson on 15-02-16.
 */
function testmain() {

	var canvas = document.getElementById('myCanvas');

	var cloud = new Cloud5()

		.canvas(canvas)
        .text(canada)
		.font('Helvetica')
		.minFontSize(5)
		.color(['#ff0000','#ee0000','#dd0000','#cc0000','#bb0000','#aa0000','#990000'])
		.mask('./mask.png',function() {
			cloud.generate().save('image/png','canada.png');
		});
}