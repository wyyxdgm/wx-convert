import { exec } from '../src/aplugin/index';
import path from 'path';
exec({
  config: path.join(__dirname, '../../convert-miniprogram-to-aliminiprogram-template/convert.config.js'),
  watch: true,
})