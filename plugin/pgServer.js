var POSTGRES_STARTUP_TIMEOUT = 10000;

// In Meteor 1.2, the paths to the required tool files has changed,
// if an error occurs loading the file, try the next set.
var TOOL_PATHS = [
  {
    // Meteor < 1.2
    fiberHelpers: 'fiber-helpers.js',
    cleanup: 'cleanup.js'
  },
  {
    // Meteor >= 1.2
    fiberHelpers: 'utils/fiber-helpers.js',
    cleanup: 'tool-env/cleanup.js'
  }
];

var path = Npm.require('path');
var fs = Npm.require('fs');
var Future = Npm.require('fibers/future');
var pg = Npm.require('pg');
var spawnSync = Npm.require('spawn-sync');
var spawn = Npm.require('child_process').spawn;
var extend = Npm.require('extend');
var defaultConfig = {
  port: 5432
}

var postgres;
var outputStdErr = false;
var cleanedUp = false;
var serverReady = false;

function loadMeteorTool(whichTool, index) {
  var dependency;
  index = index || 0;
  try {
    dependency = Npm.require(path.join(relToolDir, TOOL_PATHS[index][whichTool]));
  } catch (err) {
    dependency = loadMeteorTool(whichTool, index + 1);
  }
  return dependency;
}

// With the pg-server-xxx NPM dependency, cannot simply require files from
//  meteor/tools directory because the Npm.require root directory has changed
var toolDir = path.dirname(process.mainModule.filename);
// Assume never more than 100 directories deep
var rootRelPath = _.range(100).map(function() { return '..' }).join('/');
// Determine meteor/tools relative directory path
var relToolDir = path.join(rootRelPath, toolDir);

// For bindEnvironment()
var fiberHelpers = loadMeteorTool('fiberHelpers');
var MBE = fiberHelpers.bindEnvironment;

var npmPkg = determinePlatformNpmPackage();
// Should not happen as package.js should have filtered already
if(npmPkg === null) return;

// Load pg-server-xxx NPM package
var startServer = function(dataDir, config) {
  var fullConfig = extend(defaultConfig, config || {});

  try {
    var dataDirStat = fs.statSync(dataDir);
  } catch(err) {
    // Data directory does not exist
    var initResult1 = spawnSync('brew', ['install postgresql@14'])
    var initResult = spawnSync(
      // path.join(__dirname, 'server/bin/initdb'),
      'initdb',
      [ '-D', dataDir, '--username=postgres' ]);
      if (initResult.status !== 0) {
        process.stderr.write(initResult.stderr);
        process.exit(initResult.status);
      }
  }

  if(dataDirStat && !dataDirStat.isDirectory()) {
    throw new Error('DATA_DIRECTORY_UNAVAILABLE');
  }

  // Generate postgresql.conf from provided configuration
  var conf = Object.keys(fullConfig).map(function(key) {
      if(fullConfig[key] === null) {
        return ''
      } else {
        return key + ' = ' + fullConfig[key]
      }
    }).join('\n');
  
  fs.writeFileSync(path.join(dataDir, 'postgresql.conf'), conf);

  var child = spawn(
    'postgres', [ '-D', dataDir ]);
  
  return child
}

// var startServer = Npm.require(npmPkg);

// Read settings from somefile.pg.json
Plugin.registerSourceHandler('pg.json', {
  archMatching: 'os'
}, function (compileStep) {
  var settings =
    loadJSONContent(compileStep, compileStep.read().toString('utf8'));

  // Paths inside the application directory where database is to be stored
  var dataDir = settings.datadir || '.meteor/local/postgresdb';
  var dataDirPath = path.join(process.cwd(), dataDir);

  if('datadir' in settings) {
    // dataDir is specified as the first argument to startServer
    delete settings.datadir;
  }

  // Determine if data directory is going to be created
  // This is handled by the dependent NPM package inside startServer
  try {
    var dataDirStat = fs.statSync(dataDir)
  } catch(err) {
    initializeServer = true;
  }

  // Start server, but only once, wait for it to be ready (or not)
  console.log(postgres)

  if(!postgres) {
    var fut = new Future;
    postgres = startServer(dataDirPath, settings);
    // After preset timeout, give up waiting for MySQL to start or fail
    setTimeout(MBE(function() {
      if(!fut.isResolved()) {
        console.log('[ERROR] PostgreSQL startup timeout!             ');
        fut['return']();
      }
    }), POSTGRES_STARTUP_TIMEOUT);

    postgres.stderr.on('data', MBE(function (data) {
      // Data never used as Buffer
      data = data.toString();
      outputStdErr && console.log('[Postgres] ', data);

      // No need to check more if server started already
      if(fut.isResolved()) return;

      // Check for any known errors
      var errors = [
        /could not bind IPv4 socket: Address already in use/,
        /FATAL: .+/
      ];

      for(var i = 0; i < errors.length; i++) {
        var failure = data.match(errors[i]);
        if(failure !== null) {
          cleanedUp = true;
          console.log('[ERROR] ' + failure[0]);
          return fut['return']();
        }
      }

      var ready = data.match(
        /database system is ready to accept connections/);

      if(ready !== null) {
        serverReady = true;
        // Extra spaces for covering Meteor's status messages
        console.log('=> Started PostgreSQL.                        ');
        fut['return']();
      }
    }));

    return fut.wait();
  }else{
    console.log('Postgres already running on:')
  }

});

// Stop Postgres server on Meteor exit
loadMeteorTool('cleanup').onExit(function StopPgServer() {
  if(cleanedUp === false && postgres) {
    // Only cleanup once!
    cleanedUp = true;

    try {
      postgres.kill();
    } catch(err) {
      console.log('[ERROR] Unable to stop PostgreSQL server');
    }
  }
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


// Begin code borrowed from mquandalle:bower/plugin/handler.js
var loadJSONContent = function (compileStep, content) {
  try {
    return JSON.parse(content);
  }
  catch (e) {
    compileStep.error({
      message: "Syntax error in " + compileStep.inputPath,
      line: e.line,
      column: e.column
    });
  }
};
// End code from mquandalle:bower
