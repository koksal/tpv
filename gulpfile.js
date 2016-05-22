var gulp = require('gulp');
var ghPages = require('gulp-gh-pages');
var browserSync = require('browser-sync');
var browserify = require('browserify');
var babelify = require('babelify');
var del = require('del');

var config = {
  entryFile: './src/main.js',
  outputDir: './dist/',
  outputFile: 'js/app.js'
};

gulp.task('clean', function () {
  return del(['dist']);
});

gulp.task('default', function () {

});

gulp.task('deploy', function () {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});

gulp.task('serve', function () {
  browserSync({
    server: {
      baseDir: './'
    },
    port: 8000,
    ui: {
      port: 8001,
      weinre: {
        port: 8002
      }
    }
  });
});
