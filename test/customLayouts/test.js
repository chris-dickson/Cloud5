/**
 * Created by chrisdickson on 15-02-16.
 */
function testmain() {

	var cbcCanvas = document.getElementById('cbcCanvas');
	var petCanvas = document.getElementById('petCanvas');

	/**
	 * Perform a custom radial layout by expanding the search radius around the center at each attempt.
	 */
    var customLayouter = function(words,renderInfo,width,height) {
        var that = this;
		var startX = width/2;
		var startY = height/2;
		var maxRadius = Math.min(width,height) * 0.5;

        words.forEach(function(word) {

			var placed = false;
			for (var i = 10; i > 0 && !placed; i--) {
				var minRadius = maxRadius * (1/i);

				for (var t = 0; t <= 1 && !placed; t+= (1/50)) {
					var searchRadius = minRadius + (maxRadius-minRadius)*t;
					var theta = Math.random() * Math.PI * 2;
					var r = Math.random() * searchRadius;

					var shiftX = -(Math.random() * renderInfo[word].bb.width);
					var shiftY = -(Math.random() * renderInfo[word].bb.height);


					renderInfo[word].x = startX + r * Math.sin(theta) + shiftX;
					renderInfo[word].y = startY + r * Math.cos(theta) + shiftY;

					if (that.fits(renderInfo[word])) {
						placed = true;
						that.place(word,renderInfo[word]);
					}
				}

			}

			if (!placed) {
				renderInfo[word].x = -1;
				renderInfo[word].y = -1;
			}
        });
    };

	var font = 'Helvetica';
	var minFontSize = 10;
	var maxFontSize = 80;
	var radius = 800;
	var background = '#eeeeee';
	var stopwords = Cloud5.Stopwords.English.concat('people','protect');
	var colors = ['#443333','#995555','#ee8833','#ff5522'];



	var CBCCloud = new Cloud5()
		.canvas(cbcCanvas)
        .layout(customLayouter)
		.stop(stopwords)
		.width(radius)
		.height(radius)
		.font(font)
		.minFontSize(minFontSize)
		.maxFontSize(maxFontSize)
		.background(background)
		.text(CBC)
		.color(colors);
	CBCCloud.generate().save('image/png','cbc.png');

	var PETCloud = new Cloud5()
		.canvas(petCanvas)
		.layout(customLayouter)
		.stop(stopwords)
		.width(radius)
		.height(radius)
		.font(font)
		.minFontSize(minFontSize)
		.maxFontSize(maxFontSize)
		.background(background)
		.text(PET)
		.color(colors);

	PETCloud.generate().save('image/png','pet.png');

}