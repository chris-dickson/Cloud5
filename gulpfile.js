var gulp = require('gulp'),
    browserify = require('browserify'),
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    rename = require('gulp-rename');

var config = {
  src: 'src',
  dist: 'dist',
  externalLibs: []
};

gulp.task('build', function() {
  return browserify('./'+config.src+'/main.js')
    .external(config.externalLibs)
    .bundle({
      debug : 'true',
      standalone: 'WordCloudCanvas'
    })
    .pipe(source('wordcloudcanvas.js'))
    .pipe(gulp.dest(config.dist))
    .pipe(rename({suffix: '.min'}))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(config.dist))
});

gulp.task('watch', ['build'], function () {
    gulp.watch('src/**/*', ['build']);
});

gulp.task('default', ['build', 'watch']);