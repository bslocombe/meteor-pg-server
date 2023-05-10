# numtel:pg-server [![Build Status](https://travis-ci.org/numtel/meteor-pg-server.svg?branch=master)](https://travis-ci.org/numtel/meteor-pg-server)

Package to run PostgreSQL server inside your Meteor app
Credits of this package go to numtel, i have just tweaked for my own projects. 

**This only works on OSX at the moment with brew** This new version uses the system libraries for postgres binaries. pulling these in via brew for you if they are not installed. 

> **Version 1.0.3 breaking change:** You must have a *.pg.json somewhere in your project or the postgres server only runs the first time you add the build plugin. This was not obvious to me so adding this here. I have removed the test.pg.json as this forced the build to run when installing which can result in a broken pgdir for some cases. I have also refactored to not need the binary npm depends, since getting these updated was proving to be too much work. Instead we are simply using binary version available on your PATH. This also calls brew install for the correct binarys (initdb and postgres)

> **Version 1.0.0 breaking change:** Default data directory has now changed. If you do not specify a data directory in your `.pg.json` file, you will need to now specify the old default data directory in order to migrate successfully without losing your current databases (or move your data directory to the new default location, see "Configuring the server" section below). Set the `datadir` key to `.meteor/postgresdb` to maintain the old default data directory.

## Installation

> Currently only supports Linux (32 and 64 bit) and Mac OSX (64 bit). Windows support is expected in the near future.

Add this package to your application to embed a PostgreSQL server:

```
meteor add numtel:pg-server
```

### Configuring the server

A settings file must be created with the extension of `.pg.json` in your application. A file name like `myapp.pg.json` is valid.

If a `datadir` setting is not specified, the PostgreSQL data will default to your application's `.meteor/local/postgresdb` directory. The directory will be created if it does not exist.

When specifying a `datadir` setting, the path is relative to your application root.

Optionally, set a boolean value for the `output_stderr` key to `true` in order to display full ouput of `STDERR` from the PostgreSQL server process.

#### Initialization queries

In your `.pg.json` file, you may specify a filename containing queries to perform on first installation of the database under the `initialize` key. These queries will be executed if the data directory is created when the Meteor application is started.

#### Example configuration

Create a pg.json file in the root, with something lik this as the contents:
```
{
  port: 12345
}
```

## Usage

With the start of you Meteor application, you will notice a new line output to the console:

```
=> Started PostgreSQL.
```

The PostgreSQL server is started on the local machine and may be used with the `bslocombe:pg` package by using the following connection string:

```javascript
var CONN_STR = 'postgres://'
  + process.env.USER + ':' // Default user is same as system user
  + 'numtel'               // From defaultpw file in NPM package
  + '@localhost:' + PORT   // Port as specified in .pg.json file (default: 5432)
  + '/postgres';           // Default database
```

## Resources

* [`numtel:pg` - Reactive PostgreSQL for Meteor](https://github.com/numtel/meteor-pg)
* [Leaderboard example modified to use PostgreSQL](https://github.com/numtel/meteor-pg-leaderboard)

## License

MIT
