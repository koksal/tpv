var gulp = require('gulp');
var ghPages = require('gulp-gh-pages');
var browserSync = require('browser-sync');

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
    ui: {
      port: 8001,
      weinre: {
        port: 8002
      }
    },
    port: 8000
  });
});
