var POSTGRES_STARTUP_TIMEOUT = 10000;

var path = Npm.require("path");
var fs = Npm.require("fs");
var pg = Npm.require("pg");
var spawnSync = Npm.require("spawn-sync");
var spawn = Npm.require("child_process").spawn;
var extend = Npm.require("extend");
var defaultConfig = {
  port: 5432,
};

var postgres;
var outputStdErr = false;
var cleanedUp = false;
var serverReady = false;

var npmPkg = determinePlatformNpmPackage();
// Should not happen as package.js should have filtered already
if (npmPkg === null) return;

// Load pg-server-xxx NPM package
var startServer = function (dataDir, config) {
  var fullConfig = extend(defaultConfig, config || {});

  try {
    var dataDirStat = fs.statSync(dataDir);
  } catch (err) {
    // Data directory does not exist
    var initResult1 = spawnSync("brew", ["install postgresql@14"]);
    var initResult = spawnSync(
      // path.join(__dirname, 'server/bin/initdb'),
      "initdb",
      ["-D", dataDir, "--username=postgres"]
    );
    if (initResult.status !== 0) {
      process.stderr.write(initResult.stderr);
      process.exit(initResult.status);
    }
  }

  if (dataDirStat && !dataDirStat.isDirectory()) {
    throw new Error("DATA_DIRECTORY_UNAVAILABLE");
  }

  // Generate postgresql.conf from provided configuration
  var conf = Object.keys(fullConfig)
    .map(function (key) {
      if (fullConfig[key] === null) {
        return "";
      } else {
        return key + " = " + fullConfig[key];
      }
    })
    .join("\n");

  fs.writeFileSync(path.join(dataDir, "postgresql.conf"), conf);

  var child = spawn("postgres", ["-D", dataDir]);

  return child;
};

// Read settings from somefile.pg.json
Plugin.registerSourceHandler(
  "pg.json",
  {
    archMatching: "os",
  },
  function (compileStep) {
    var settings = loadJSONContent(compileStep, compileStep.read().toString("utf8"));

    // Paths inside the application directory where database is to be stored
    var dataDir = settings.datadir || ".meteor/local/postgresdb";
    var dataDirPath = path.join(process.cwd(), dataDir);

    if ("datadir" in settings) {
      // dataDir is specified as the first argument to startServer
      delete settings.datadir;
    }

    // Determine if data directory is going to be created
    // This is handled by the dependent NPM package inside startServer
    try {
      var dataDirStat = fs.statSync(dataDir);
    } catch (err) {
      initializeServer = true;
    }

    if (!postgres) {
      postgres = startServer(dataDirPath, settings);

      postgres.stderr.on("data", function (data) {
        // Data never used as Buffer
        data = data.toString();
        outputStdErr && console.log("[Postgres] ", data);

        // Check for any known errors
        var errors = [/could not bind IPv4 socket: Address already in use/, /FATAL: .+/];

        for (var i = 0; i < errors.length; i++) {
          var failure = data.match(errors[i]);
          if (failure !== null) {
            cleanedUp = true;
            console.log("[ERROR] " + failure[0]);
          }
        }

        var ready = data.match(/database system is ready to accept connections/);

        if (ready !== null) {
          serverReady = true;
          // Extra spaces for covering Meteor's status messages
          console.log("=> Started PostgreSQL.                        ");
        }
      });
    } else {
      console.log("Postgres already running on:");
    }
  }
);

function determinePlatformNpmPackage() {
  switch (process.platform + "_" + process.arch) {
    case "linux_x64":
      return "pg-server-9.4-linux-x64";
    case "linux_ia32":
      return "pg-server-9.4-linux-i386";
    case "darwin_x64":
      return "pg-server-9.4-osx-x64";
    case "darwin_arm64":
      return "pg-server-14.2-osx-arm64";
    default:
      return null;
  }
}

var loadJSONContent = function (compileStep, content) {
  try {
    return JSON.parse(content);
  } catch (e) {
    compileStep.error({
      message: "Syntax error in " + compileStep.inputPath,
      line: e.line,
      column: e.column,
    });
  }
};
