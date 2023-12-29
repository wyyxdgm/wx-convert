#!/usr/bin/env node

import * as Yargs from 'yargs';

import { showError } from './utils';
import aPlugin from './aplugin';
import wxPlugin from './wxplugin/index';
import * as fs from 'fs';
import * as path from 'path';

const json = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), { encoding: 'utf8' }));

const { argv } = Yargs
  .command('$0', 'wx-convert相关脚手架，使用 `wx-convert -h` 查看所有有效指令。')
  .usage('Usage: $0 [command] [options]')
  .command(
    'aplugin',
    '微信插件转支付宝插件',
    yargs => yargs
      .example('$0 aplugin [[-c] configpath]', '使用configpath配置，默认使用项目根目录的convert.config.js')
      .example('$0 aplugin -i src -o dist', '将src文件夹的项目，生成到dist文件夹中')
      .alias('w', 'watch')
      .describe('w', '指定开发模式下的监听')
      .alias('c', 'config')
      .describe('c', '指定配置文件路径')
      .alias('i', 'input')
      .describe('i', '指定输入项目文件夹')
      .alias('o', 'output')
      .describe('o', '指定输出项目文件夹')
      .alias('s', 'silence')
      .describe('s', '简化日志输出')
      .alias('v', 'verbose')
      .describe('v', '输出详细日志')
  )
  .command(
    'wxplugin',
    '微信小程序转微信插件',
    yargs => yargs
      .example('$0 wxplugin -i src -o dist', '将src文件夹的项目，生成到dist文件夹中')
      .example('$0 wxplugin -i src -o dist -w', '开发模式，监听文件变化')
      .example('$0 wxplugin -i src -o dist -w -l=/path/to.log', '开发模式，监听文件变化，日志输出到/path/to.log')
      .example('$0 wxplugin -i src -o dist -w -s', '不输出详细日志')
      .alias('i', 'input')
      .describe('i', '指定输入项目文件夹')
      .alias('o', 'output')
      .describe('o', '指定输出项目文件夹')
      .alias('w', 'watch')
      .describe('w', '开发模式')
      .alias('l', 'log')
      .describe('l', '日志路径')
      .alias('s', 'silence')
      .describe('s', '简化日志输出')
      .alias('v', 'verbose')
      .describe('v', '输出详细日志')
  )
  .help('h')
  .alias('h', 'help')
  .version(json.version)
  .alias('V', 'version');

if (argv._[0]) {
  if (['aplugin', 'wxplugin'].indexOf(argv._[0]) < 0) {
    showError('无此指令, 使用 `wx-convert -h` 查看所有有效指令。');
  }
} else {
  argv._[0] = 'aplugin';
}

if (argv._[0] === 'aplugin') {
  process["on"]("uncaughtException", (function (error) {
    console.error(error);
    showError(`处理失败！`);
  }));
  aPlugin.exec(argv);
}

if (argv._[0] === 'wxplugin') {
  process["on"]("uncaughtException", (function (error) {
    console.error(error);
    showError(`处理失败！`);
  }));
  wxPlugin.exec(argv);
}
