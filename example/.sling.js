module.exports = {
  playbook: {
    file: 'example/deploy.yml',
    hosts: 'example/hosts',
    tasks: ['build', 'ping'],
    debug: true,
  },
  scripts: ['npm run test'],
  slack: {
    project: 'test',
    webhook: 'https://hooks.slack.com/services/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',
    channel: 'general',
    username: 'bug-dog'
  },
  git: true,
};
