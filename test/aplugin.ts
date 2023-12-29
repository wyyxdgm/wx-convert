import { exec } from '../src/aplugin/index';
exec({
  _: [],
  /** The script name or node command */
  $0: '',
  /** All remaining options */
  // input: '/path/to/project',
  // output: '/path/to/project/dist/aprogram',
  config: '/path/to/project/convert.config.js',
  watch: true,
})