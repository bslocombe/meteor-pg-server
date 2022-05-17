Package.describe({
  name: 'meteor-pg-server',
  version: '1.0.2',
  summary: 'Run PostgreSQL server inside your Meteor app',
  git: 'https://github.com/bslocombe/meteor-pg-server.git',
  documentation: 'README.md'
});

function determinePlatformNpmPackage() {
  switch(process.platform + '_' + process.arch) {
    case 'linux_x64': return 'pg-server-9.4-linux-x64';
    case 'linux_ia32': return 'pg-server-9.4-linux-i386';
    case 'darwin_x64': return 'pg-server-9.4-osx-x64';
    case 'darwin_arm64': return 'pg-server-14.2-osx-arm64';
    default: return null;
  }
}

// Force Meteor to recognize that this package has binary deps
// bcrypt is an npm package that
// has different binaries for differnet architectures.
Npm.depends({
  bcrypt: '5.0.0'
});

var npmPkg = determinePlatformNpmPackage();

if(npmPkg === null) {
  console.error('ERROR: Platform is not supported by slocombe:pg-server!');
  console.error('       Supports only Linux (32 and 64 bit) and OSX (64 bit, arm64)');
} else {
  var depend = {
    // For initialization queries
    'pg': '8.0.3',
  };
  // platform dependent pg-server-xxx package
  if(npmPkg == "darwin_arm64"){
    depend[npmPkg] = 'https://github.com/bslocombe/pg-server-14.2-osx-arm64.git#master';
  }else{
    depend[npmPkg] = '9.4.4'
  }

  Package.registerBuildPlugin({
    name: 'pgServer',
    use: [ 'underscore@1.0.3' ],
    sources: [
      'plugin/pgServer.js'
    ],
    npmDependencies: depend
  });
}

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('bslocombe:pg-server');
  api.use('bslocombe:pg@0.0.4');

  api.addFiles('test.pg.json', 'server');
  api.addFiles('pg-server-tests.js', 'server');
});
