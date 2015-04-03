'use strict';

var fs = require('fs');
var del = require('del');
var path = require('path');
var verb = require('../../verb/verb');
var debug = require('debug')('update:tasks');
var gutil = require('gulp-util');
var parse = require('parse-copyright');
var plugins = require('./plugins')(verb);
var verbmd = require('./plugins/readme/verbmd');
var utils = require('./lib/utils');
var glob = require('glob');
var pkg = require(__dirname + '/package.json');
var logger = require('./lib/logging');
var log = logger({nocompare: true});


verb.transform('start', require('./transforms/start'));
verb.onLoad(/./, function (file, next) {
  file.render = false;
  file.readme = false;
  next();
});

verb.onLoad(/\.js$/, function (file, next) {
  file.data.copyright = parse(file.content);
  next();
});

verb.copy('.verbrc.md', function (file) {
  debug('copy .verbrc.md');
  file.path = '.verb.md';
  log.success('renamed', file.relative);
  return path.dirname(file.relative);
});

var hasOneTestfile = false;
if (verb.files('test{,*.js,/*.js').length) {
  hasOneTestfile = true;
  verb.set('hasOneTestfile', true);
  verb.copy('test/test.js', function (file) {
  debug('copy test.js');
    file.path = 'test.js';
    log.success('moved', file.path);
    return file.base;
  });
}

verb.copy('LICENSE-MIT', function (file) {
  debug('copy LICENSE-MIT');
  file.path = 'LICENSE';
  log.success('renamed', file.relative);
  return path.dirname(file.relative);
});

verb.task('banners', function () {
  debug('banners task');
  verb.src(['*.js', 'test/*.js', 'lib/*.js'], {render: false})
    .pipe(plugins.banners())
    .on('error', gutil.log)
    .pipe(verb.dest(function (file) {
      return path.dirname(file.path);
    }));
});

verb.task('jshint', function () {
  verb.src('.jshintrc', {render: false})
    .pipe(plugins.jshint())
    .on('error', gutil.log)
    .pipe(verb.dest(function (file) {
      file.path = '.jshintrc';
      return path.dirname(file.path);
    }));
});

verb.task('travis', function () {
  verb.src('.travis.yml', {render: false})
    .pipe(plugins.travis())
    .on('error', gutil.log)
    .pipe(verb.dest(function (file) {
      file.path = '.travis.yml';
      return path.dirname(file.path);
    }));
});

verb.task('tests', function () {
  verb.src(['test.js', 'test/*.js'], {render: false})
    .pipe(plugins.tests())
    .on('error', gutil.log)
    .pipe(verb.dest(function (file) {
      return path.dirname(file.path);
    }));
});

verb.task('license', function () {
  verb.src('LICENSE{,-MIT}', {render: false})
    // .pipe(plugins.license())
    .on('error', gutil.log)
    .pipe(verb.dest(function (file) {
      file.path = 'LICENSE';
      return path.dirname(file.path);
    }));
});

verb.task('dotfiles', function () {
  verb.src('.git*', {render: false, dot: true})
    .pipe(plugins.editorconfig())
    .pipe(plugins.gitignore())
    .pipe(plugins.dotfiles())
    .on('error', gutil.log)
    .pipe(verb.dest(function (file) {
      return path.dirname(file.path);
    }))
    .on('end', function (cb) {
      var files = ['.npmignore', 'test/mocha.opts', '.verbrc.md', 'LICENSE-MIT'];
      var res = utils.exists(files);

      var exists = res.EXISTS;
      if (verb.get('hasOneTestfile')) {
        exists.push('test');
      }

      if (exists.length) {
        del(exists, cb);
        log.deleted('deleted', exists.join(', '));
      }
    })
});

verb.task('json', function () {
  verb.src('{bower,package}.json', {render: false})
    .pipe(plugins.pkg())
    .pipe(plugins.bower())
    .on('error', gutil.log)
    .pipe(verb.dest('.'))
    .on('end', function () {
      log.success(true, 'updated package.json');
    });
});

verb.task('readme', function () {
  verb.src('.verb.md')
    .pipe(verb.dest('.'))
    .on('error', gutil.log)
    .on('end', function () {
      log.success(true, 'updated readme.');
    });
});

verb.task('default', [
  'banners',
  'tests',
  'dotfiles',
  'travis',
  'jshint',
  'license',
  'json',
  'readme'
]);

// verb.diff();
verb.run();
