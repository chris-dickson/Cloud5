var _ = require('./util');

var WordCloudCanvas = function(attributes) {
	_.extend(this,attributes);
};

WordCloudCanvas.prototype = _.extend(WordCloudCanvas.prototype, {
	text : function(text) {
		// TODO:  analyze text and set words
		return this;
	},

	words : function(stringArray) {
		// TODO:
		return this;
	},

	generate : function() {
		// TODO:
		return this;
	}
});


exports.Extend = _.extend;
exports.WordCloudCanvas = WordCloudCanvas;