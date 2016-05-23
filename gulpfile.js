var gulp = require('gulp');
var ghPages = require('gulp-gh-pages');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var del = require('del');
var source = require('vinyl-source-stream');
var _ = require('lodash');

var config = {
  entryFile: './js/main.js',
  outputDir: './dist/',
  outputFile: 'js/app.js'
};

var browserSyncConfig = {
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
}

gulp.task('clean', function () {
  return del(['dist']);
});

var bundler;
function getBundler() {
  if (!bundler) {
    bundler = watchify(browserify(config.entryFile, _.extend({ debug: true }, watchify.args)));
  }
  return bundler;
};

function bundle() {
  return getBundler()
    .transform(babelify)
    .bundle()
    .on('error', function(err) { console.log('Error: ' + err.message); })
    .pipe(source(config.outputFile))
    .pipe(gulp.dest(config.outputDir))
    .pipe(reload({ stream: true }));
}

gulp.task('build-persistent', ['clean'], function() {
  return bundle();
});

gulp.task('build', ['build-persistent'], function() {
  process.exit(0);
});

gulp.task('watch', ['build-persistent'], function () {
  browserSync(browserSyncConfig);

  getBundler().on('update', function () {
    gulp.start('build-persistent')
  });
});

gulp.task('deploy', function () {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});

gulp.task('serve', function () {
  browserSync(browserSyncConfig);
});
