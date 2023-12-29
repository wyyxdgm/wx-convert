import { convert, CONVET_TYPE } from './index';
var minimist = require("minimist");
(async () => {
  const opt = minimist(process.argv.slice(2), { boolean: ['watch'], default: { watch: false } });
  console.log(`opt`, opt);
  await convert(CONVET_TYPE.plugin, { projectPath: undefined, convertPath: undefined, option: { watch: opt.watch, logFile: null, silence: true } })
  console.log('done！');
})()