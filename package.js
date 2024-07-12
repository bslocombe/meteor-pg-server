Package.describe({
  name: 'bslocombe:pg-server',
  // debugOnly: true,
  version: '1.0.6',
  summary: 'Run PostgreSQL server inside your Meteor app',
  git: 'https://github.com/bslocombe/meteor-pg-server.git',
  documentation: 'README.md'
});

function determinePlatformNpmPackage() {
  switch(process.platform + '_' + process.arch) {
    // case 'linux_x64': return 'pg-server-9.4-linux-x64';
    // case 'linux_ia32': return 'pg-server-9.4-linux-i386';
    case 'darwin_x64': return true;
    case 'darwin_arm64': return true;
    default: return null;
  }
}

// Force Meteor to recognize that this package has binary deps
// bcrypt is an npm package that
// has different binaries for different architectures.
Npm.depends({
  bcrypt: '5.1.1',
  "extend": "2.0.2",
  "spawn-sync": "1.0.15"
});

var npmPkg = determinePlatformNpmPackage();

if(npmPkg === null) {
  console.error('ERROR: Platform is not supported by slocombe:pg-server!');
  console.error('       Supports only and OSX (64 bit, arm64)');
} else {
  var depend = {
    // For initialization queries
    'pg': '8.0.3',
    'spawn-sync': '1.0.15'
  };
  // removing binary dependencies
  // platform dependent pg-server-xxx package
  // if(npmPkg == "darwin_arm64"){
    // depend[npmPkg] = 'https://github.com/bslocombe/pg-server-14.2-osx-arm64.git#master';
  // }else{
  //   depend[npmPkg] = '9.4.4'
  // }

  Package.registerBuildPlugin({
    name: 'pgServer',
    use: [ 'underscore@1.0.3'],
    sources: [
      'plugin/pgServer.js'
    ],
    npmDependencies: depend
  });
}

Package.onUse(function(api) {
  api.versionsFrom('2.5.1');
  // api.use('isobuild:compiler-plugin@1.0.0');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('bslocombe:pg-server');
  api.use('bslocombe:pg@1.0.4');
  api.addFiles('pg-server-tests.js', 'server');
});
