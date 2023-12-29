import { exec } from "child_process";
import { copyFileSync as fsCopyFileSync, writeFileSync as fsWriteFileSync, existsSync, mkdirSync, readFileSync } from "fs"
import path, { dirname } from "path";

export const readFileStr = (p: string) => {
  return readFileSync(p, { encoding: 'utf-8' })
}

/**
 * 获取存在的绝对路径
 * @param p 
 * @param ext .json|.js|.wxml|.wxss|.xxx
 * @returns 绝对路径或空
 */
export const exsitsJsPath = (p: string, ext?: string): string | boolean => {
  let extp = '';
  if (ext) { p += ext; return (existsSync(p) && p); }
  if (/\.(ts|js|json)/.test(p)) return existsSync(p) && p;
  return (
    ((extp = p + '.ts') && existsSync(extp)) ||
    ((extp = p + '.js') && existsSync(extp)) ||
    ((extp = p + '.json') && existsSync(extp))
  ) && extp;
}

/**
 * 获取存在的绝对路径
 * @param p 不带后缀的路径
 * @param ext .css|.less|.sass|.scss|.xxx
 * @returns 绝对路径或空
 */
export const exsitsCssPath = (p: string, ext?: string) => {
  let extp = '';
  if (ext) { p += ext; return (existsSync(p) && p); }
  if (/\.(wxss|css|less|sass|scss)/.test(p)) return existsSync(p) && p;
  return (
    ((extp = p + '.wxss') && existsSync(extp)) ||
    ((extp = p + '.css') && existsSync(extp)) ||
    ((extp = p + '.less') && existsSync(extp)) ||
    ((extp = p + '.sass') && existsSync(extp)) ||
    ((extp = p + '.scss') && existsSync(extp))
  ) && extp;
}

export const copyFileSync = (s: string, d: string) => {
  if (!existsSync(dirname(d))) mkdirSync(dirname(d), { recursive: true });
  fsCopyFileSync(s, d);
}
export const writeFileSync = (d: string, str: string,) => {
  if (!existsSync(dirname(d))) mkdirSync(dirname(d), { recursive: true });
  fsWriteFileSync(d, str);
}

export const promiseify = function (method: Function, callbackIndex?: any, errorIndex?: any) {
  if (!(method instanceof Function)) {
    throw new Error('promiseify: method need been function.');
  }
  let a = function (..._args: any) {
    const args = [].slice.call(arguments),
      // @ts-ignore
      cur = this,
      cbIndex = typeof callbackIndex === 'number' ?
        callbackIndex : args.length,
      erIndex = typeof errorIndex === 'number' ?
        errorIndex : 0;
    return new Promise((res, rej) => {
      args.splice(cbIndex, 0, <never> function aaa() {
        const err = arguments[erIndex];
        let result: any = [].filter.call(arguments,
          (_cur, i) => {
            return i !== erIndex;
          }
        );
        if (err) return rej(err);
        const len = result.length;
        result = len ?
          (len === 1 ? result[0] : result) :
          undefined;
        res(result);
      });
      method.call(cur, ...args);
    });
  };
  return a;
};

export const noExt = (str: string) => str.substring(0, str.lastIndexOf('.'))
export const relativeFilePath = (f: string, t: string) => path.relative(f + '/..', t)

export const execCmd = async (cmd: string, options?: any) => new Promise((resolve, reject) => {
  exec(cmd, options, function (error, stdout, stderr) {
    if (error) return reject(stderr || error);
    resolve(stdout);
  })
})
