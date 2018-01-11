const inquirer = require('inquirer');
const shell = require('shelljs');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const os = require('os');
const slack = require('slack');
const rq = require('request-promise');

const log = console.log;
const setting = {};

const stuart= {
  async run (config, task) {
    try {
      let cursor = process.cwd();
      log(chalk.gray('current working directory:$'), chalk.blue(cursor));
      config = config ||  {};
      if (!Object.keys(config).length) {
        log(chalk.yellow('empty config'));
        return;
      }

      const {scripts, playbook, ansible, git} = config;
      if (git) {
        const showTags = shell.exec('git describe --tags --abbrev=0');
        const gitTag = showTags.stdout.replace(/\s/ig, '');
        if (!gitTag) {
          log(chalk.red('git tag not found~!'));
          return;
        }
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'tag',
            message: 'git will checkout to tag ' + gitTag,
            choices: ['YES', 'NO']
          }
        ]);
        if (answers.tag) {
          const checkout = shell.exec('git checkout ' + gitTag);
          if (checkout.stdout) {
            log(chalk.red(`git checkout ${gitTag} with error: ` + checkout.stderr));
            return;
          }
        }
      }

      if (scripts) {
        for (const item of scripts) {
          shell.exec(item);
        }
      }

      if (playbook) {
        if (Array.isArray(playbook)) {
          for (const play of playbook) {
            await this.playbook(play, task);
          }
        } else {
          await this.playbook(playbook, task);
        }

        return true;
      }

      if (ansible) {
        await this.ansible(ansible);
      }
    } catch (err) {
      log('ERROR:', chalk.red(err.message), err.stack);
    } finally {
      log(chalk.yellow('---------bye----------~!'))
      process.exit(0);
    }
  },
  /**
   * use playbook deploy
   * @param {Object} config 
   */
  async playbook(config, task) {
    let tmpdir = os.tmpdir() + '/.stuart';
    try {
      if (!config) {
        log(chalk.red('error: playbook config not found'));
        return;
      }

      if (!config.file) {
        return log(chalk.yellow('warn: playbook file not found'));
      }

      let hostsPath = '';
      if (Array.isArray(config.hosts)) {
        hostPath = this.genHost(config, tmpdir);
      } else {
        hostPath = config.hosts;
      }

      const cursor = shell.pwd().stdout;
      let deploy = path.isAbsolute(config.file) ? config.file : path.resolve(config.file);
      let command = 'ansible-playbook -i ' + config.hosts + ' ' + deploy;
      if (config.vars) {
        let vars = JSON.stringify(config.vars);
        vars = vars.replace(/\"/g, '\\"');
        command += ` --extra-vars "${vars}"`;
      }

      log(chalk.gray('current work directory:'), chalk.blue(cursor));
      const tasks = [];
      if (config.tasks.length && !task) {
        let output = [];
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'tasks',
            message: 'choose tasks,use comma split$ ' + chalk.bgGreen(config.tasks.join(', ')) + ' :',
            validate: (value) => {
              value = value.split(',');
              const tags = value.filter(tag => {
                return config.tasks.includes(tag);
              });
              if (tags.length) {
                return true;
              }

              return 'Invalide input~!';
            },
          },
        ]);
        
        command += ' -t ' + answers.tasks;
      } else if (task) {
        command += ' -t ' + task;
      }


      if (config.debug) {
        command += ' -vv';
      }

      log(chalk.gray('ansible-playbook start job:'), chalk.green(command));
      const input = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'continue or No',
        choices: ['YES', 'NO']
      }]);
      if (input.confirm !== true) {
        return;
      }

      shell.exec(command);
      await this.notify(config.slack);
      return true;
    } catch (err) {
      throw err;
    }
  },
  /**
   * ansible module
   * @param {Object} config 
   */
  async ansible(config) {
    let command = '';
    const {group, src, dest, hosts} = config;
    const tasks = config.tasks || [];
    let job = '';
    if (config.command) {
      command = config.command;
    } else {
      command = ['ansible']
      if (hosts) {
        if (Array.isArray(hosts)) {
          command.push('-i');
          command.push(hosts.join(','));
        } else {
          command.push('-i');
          command.push(hosts);
        }
      }

      if (group) {
        command.push(group);
      }

      if (src && dest) {
        let target = `src=${src} dest=${dest} delete=yes`;
        if (config.rsyncOpt) {
          target += ' rsync_opt=' + config.rsyncOpt;
        }
        command = command.join(' ');
        const task = {
          synchronize: target
        };

        tasks.unshift(task);
      }
    }

    if (Array.isArray(tasks)) {
      for (let task of tasks) {
        for (const module in task) {
          let action = task[module];
          log(action.search(/@dest/));
          if (module === 'shell' && action.search(/@dest/) !== -1) {
            action = action.replace(/@dest/, 'cd ' + dest + ';');
          }

          job = command + ' -m ' + module + ' -a ' + `"${action}"`;
          log(chalk.gray('command will execute:'), chalk.green(job));
          const input = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'continue or No',
            choices: ['YES', 'NO']
          }]);

          if (input.confirm !== true) {
            continue;
          }

          shell.exec(job);
        }
      }
    }
  },
  rmdir (dir) {
    const list = fs.readdirSync(dir);
    for(let i = 0; i < list.length; i++) {
      let filename = path.join(dir, list[i]);
      let stat = fs.statSync(filename);
      if(filename === "." || filename === "..") {
      } else if(stat.isDirectory()) {
        this.rmdir(filename);
      } else {
        fs.unlinkSync(filename);
      }
    }
    fs.rmdirSync(dir);
  },
  async notify(cfg) {
    if (!cfg) return;
    const payload = {
      text: (new Date).toString() + '#project [' + cfg.project + '] had been deploy',
      channel: cfg.channel,
      link_names: 1,
      username: cfg.username,
      icon_emoji: ':monkey_face:'
    };
    const res = await rq({
      uri: cfg.webhook,
      method: 'POST',
      body: payload,
      json: true,
    });
  },
  genHost (config, tmpdir) {
    if (fs.existsSync(tmpdir)) {
      this.rmdir(tmpdir);
    }

    fs.mkdirSync(tmpdir);
    log(chalk.gray('$make tmp dir: ',  tmpdir));
    let hosts = `cat>"${tmpdir}/hosts"<<EOF`;
        hosts += `
[${config.node}]
    `;
    for (const host of config.hosts) {
      hosts += `
ansible_ssh_host=${host} ansible_ssh_user=${config.user} ansible_ssh_port=${config.port}
      `;
    }
    shell.exec(hosts);

    return tmpdir + '/hosts';
}
};

module.exports = stuart;
