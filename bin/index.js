#!/usr/bin/env node

const stuart = require('../index');
const chalk = require('chalk');
const commander = require('commander');
const log = console.log;
const fs = require('fs');
const path = require('path');

commander
 .version('0.0.1')
 .option('-v, --version', 'show version')

 commander.on('--help', function () {
  log('  Examples:');
  log('');
  log('    $ stuart run [file] <task>');
});

commander.command('run [file] [task]')
  .description('  $ start stuart job')
  .action((file, task) => {
    file = file || '.banana.js';
    file = path.resolve(file);
    log('run task: ', chalk.bgGreen.bold(task));
    log('$use file:', chalk.underline(file));
    if (!fs.existsSync(file)) {
      log(chalk.red('Error: config file not found~!'));
      return;
    }

    let config = {};
    if (typeof file === 'string') {
      const extname = path.extname(file);
      if (extname === '.js') {
        config = require(file);
      } else if (extname === '.json') {
        const jsonstring = fs.readFileSync(file);
        config = JSON.parse(jsonstring);
      } else if (extname === 'yaml' || extname === 'yml') {
        config = yaml.safeLoad(fs.readFileSync(file, 'utf8'));
      }
    }

    stuart.run(config, task);
  });

commander.parse(process.argv);
