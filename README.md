# Cloud5

> A client-side Javascript library for rendering word clouds using HTML5 Canvas.

**Features:**
 - Entirely rendered client-side.   No server calls necessary.
 - Font and Colour customization.
 - Mouse events for words.
 - Easily extendable.


### Building

Requires [node, npm](http://nodejs.org/). Setup:
```bash
npm install
```

Cloud5 uses gulp for building.  To compile the project to `cloud5.js` and `cloud5.min.js` in the `dist/` directory:
```bash
gulp
```

####Dependencies

None!

####Basic usage
```javascript
	var text = // A big long block of text as a string
	var cloud = new Cloud5()
		.canvas(document.getElementById('myCanvas'))
		.width(800)
		.height(400)
		.text(text)
		.generate();
```


###Demos
 - Coming soon!

### To Do
 - Custom Layouts
