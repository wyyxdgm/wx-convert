import path from "path";
import { writeFileSync } from "../lib/util";
let { fetchUrl } = require('fetch');
import { promiseify } from '../lib/util'
fetchUrl = promiseify(fetchUrl);

const convertStr = (str: string, targetFile: string) => {
  const reg = /wx\.\w+/g
  let re = null;
  let startIndex = str.indexOf('<details')
  let endIndex = str.lastIndexOf('/details>');
  let bugIndex = str.indexOf('Bugs-Tips')
  let obj: any = {
    whitelist: {},
    buglist: {},
    ignorelist: {}
  };
  while (re = reg.exec(str)) {
    if (re.index > startIndex && re.index < endIndex) {
      // console.log(re[0]);
      obj.whitelist[re[0]] = true
    } else if (re.index > bugIndex) {
      // console.log('警告列表', re[0]);
      obj.buglist[re[0]] = true
    } else {
      // console.log('不在列表中', re[0]);
      obj.ignorelist[re[0]] = true
    }
  }
  // for (let key in obj) {
  //   obj[key] = Array.from(obj[key])
  // }
  console.log('limit==>', obj);

  writeFileSync(targetFile, 'module.exports = ' + JSON.stringify(obj));
}
const jsPath = path.join(__dirname, 'api-limit.js');
const htmlPath = path.join(__dirname, 'restrictions.html');

// const html2jsLocal = () => {
//   const str = readFileStr(htmlPath);
//   convertStr(str, jsPath);
// }

(async () => {
  let [_res, _body] = await fetchUrl('https://developers.weixin.qq.com/miniprogram/dev/framework/plugin/api-limit.html', {
    'userAgent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
  })
  const body = '' + _body;
  if (!body) return console.error('body为空')
  console.log('res==>', _res)
  console.log('body==>', body.slice(1, 30) + '...');
  writeFileSync(htmlPath, body)
  convertStr(body, jsPath)
})()
