import { exec } from '../src/aplugin/index';
import path from 'path';
exec({
  config: path.join(__dirname, '../../convert-miniprogram/convert.config.js'),
  watch: true,
})