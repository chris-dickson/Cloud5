var gulp = require('gulp'),
    browserify = require('browserify'),
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    rename = require('gulp-rename'),
	connect = require('connect'),
	http = require('http'),
	livereload = require('gulp-livereload'),
	connectreload = require('connect-livereload'),
	serveStatic = require('serve-static');


var config = {
  	src: 'src',
  	dist: 'dist',
	port : 8081,
  	externalLibs: []
};

gulp.task('server', function() {
	var app = connect()
		.use(connectreload({ port: config.livereloadPort }))
		.use('/dist', serveStatic('dist'))
		.use('/test', serveStatic('test'))
		.use('/examples', serveStatic('examples'))
		.use('/vendor', serveStatic('node_modules'));

	http.createServer(app)
		.listen(config.port)
		.on('listening', function () {
			console.log('Started connect web server on http://localhost:' + config.port);
		});
});

gulp.task('build', function() {
  return browserify('./'+config.src+'/main.js')
    .external(config.externalLibs)
    .bundle({
      debug : 'true',
      standalone: 'Cloud5'
    })
    .pipe(source('Cloud5.js'))
    .pipe(gulp.dest(config.dist))
    .pipe(rename({suffix: '.min'}))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(config.dist))
});

gulp.task('watch', ['build','server'], function () {
    gulp.watch('src/**/*', ['build']);
});

gulp.task('default', ['build', 'watch']);