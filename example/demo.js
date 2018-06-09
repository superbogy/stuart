module.exports = {
  playbook: {
    file: 'example/deploy.yml',
    // hosts: 'example/hosts',
    hosts: ['ip'],
    tasks: ['ping', 'sync'],
    node: 'test',
    user: 'root',
    port: '22',
    debug: true,
    vars: {
      node: 'test'
    }
  },
  scripts: ['npm run test'],
  slack: {
    project: 'test',
    webhook: 'https://hooks.slack.com/services/T2AV0RV8E/B2UQU57HU/*****',
    channel: 'general',
    username: 'bug-dog'
  },
  git: true,
  debug: true,
};
