# ansiple

nodejs 开发的 ansible 快速部署工具。

### guide

`npm i start` or `npm i ansiple -g`

`ansiple --help`

`ansiple run deploy/demo.js ping`

### config

- `playbook`
  - `vars` extra-vars
  - `node` ansible-playbook host group
  - `hosts` hosts string or file path
  - `tasks` ansible-playbook available tags
  - `debug` show debug info
  - `file` playbook yaml file
  - `user` ssh users
  - `port` ssh port
- `scripts` array command run before deploy. For exansiple `"scripts": ["npm run build"]`
- `git` if set true, it will checkout to current git tag
- `slack`
  - `project` project name
  - `webhook` slack hook uri
  - `channel` slack channel
  - `username` username

### demo
