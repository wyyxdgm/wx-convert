import yargs from "yargs";
import { assign, formatCode, getChildrenFromFolder, readFileStrSync, rersolvePathPlaceHolder, resolveProjectPath, setRoot } from "../utils";
import path from "path";
import { copyFile, copySync, mkdirSync, writeFileSync, watchFile, unlinkSync } from "fs-extra";
import { isFunction, isRegExp, isString } from "lodash";
import { customFilters } from './filters/index';
import { filterDir, renamePath, addOnTypes } from "./config";
import { copyFileSync, existsSync } from "fs";
import * as core from "@babel/core";
import * as wxml from "wxml";
import * as csstree from 'css-tree';

const VALIDATE_TYPE = new Set([...addOnTypes, 'axml', 'wxml', 'js', 'ts', 'map', 'yaml', 'acss', 'pdf', 'png', 'jpeg', 'json', 'less', 'wxss', 'scss', 'wxs', 'sjs', 'md', 'txt', 'json', ''])
process.on('uncaughtException', console.error);
class Content implements IConvert.Content {
  [x: string]: any;
  private str: string;
  type: IConvert.ContentType = null;
  from: string = null;
  autoFormat: boolean = true;
  to: string = null;
  ctx: IConvert.Convert;
  private _to: path.ParsedPath;
  constructor(_: { str: string, type: string, from: string, to: string, ctx: IConvert.Convert }) {
    if (!VALIDATE_TYPE.has(_.type)) console.warn(`类型[${_.type}]不支持!(${_.from})`);
    Object.assign(this, _);
    this._to = path.parse(this.to);
  }
  reload() {
    this.str = undefined;
    if (isFunction(this['onReload'])) this['onReload']?.();
  }
  getStr(): string {
    if (!this.str) {
      this.str = readFileStrSync(this.from);
    }
    return this.str
  }

  setStr(str: string) {
    this.str = str;
  }

  /**
   * 默认序列化方法，可以覆盖
   * @returns
   */
  _serialize() {
    if (isFunction(this['beforeSerialize'])) this['beforeSerialize']?.();
    let output = this.serialize?.() || this.getStr();
    if (this.autoFormat) output = formatCode(output, this.type, this.from);
    return output;
  }

  getTree() {
    return null; // TODO
  }
  dump() {
    if (!existsSync(this._to.dir)) { mkdirSync(this._to.dir, { recursive: true }) }
    if (!this.str && !this.serialize) return copyFile(this.from, this.to);
    writeFileSync(this.to, this._serialize());
  }
}

class Convert implements IConvert.Convert {
  $ = {
    core,
    wxml,
    csstree,
  };
  store = new Map();
  filters: Array<IConvert.Filter>;
  contents: Map<string, Content> = new Map();
  matchedMap: Map<string, Array<IConvert.Parse>> = new Map();
  triggerChangeMap: Map<string, Array<string>> = new Map();
  config: IConvert.Option;
  constructor(config: IConvert.Option) {
    this.config = config;
    if (config.verbose) console.log(this.config);
    this.filters = config.customFilters?.filter(this.validateFilter) || [];
    if (config.addOnTypes) config.addOnTypes.forEach(t => VALIDATE_TYPE.add(t));
  }
  setStr(to, content) {
    new Content({ str: content, type: path.extname(to).substring(1), from: to, to, ctx: this }).dump()
  }
  validateFilter(filter: IConvert.Filter): boolean {
    if (!filter) return false;
    if (!filter.match) return;
    if (!filter.parse) return;
    return true;
  }
  initMatchedFilters(f: string, t: string) {
    this.filters.forEach(filter => {
      if (!this.contents.has[f]) this.contents.set(f, new Content({ from: f, to: t, str: readFileStrSync(f), type: path.extname(f).substring(1), ctx: this }))
      if (this.isMatched(filter, f, t)) {
        if (!this.matchedMap.has(f)) this.matchedMap.set(f, []);
        this.matchedMap.get(f).push(filter.parse);
      }
      if (filter.deps) { this.addDeps(f, filter.deps); }
    })
  }

  /**
   * 生成匹配的方法列表
   * @param match 
   * @param f 
   * @param t 
   * @returns 
   */
  isMatched(fi: IConvert.Filter, f: string, t: string): boolean {
    if (isString(fi.match)) {
      return fi.match.startsWith('/') ?
        (fi.match === f) :
        (f === resolveProjectPath(fi.match));
    } else if (isFunction(fi.match)) {
      return fi.match(f, t, this);
    } else if (isRegExp(fi.match)) {
      return fi.match.test(f);
    } else {
      throw new Error('暂不支持');
    }
    return false;
  }

  /**
   * 添加依赖
   * @param f string
   * @param deps []
   */
  addDeps(f: string, deps: IConvert.Depends) {
    deps.forEach(dep => {
      if (isString(dep)) {
        if (!this.triggerChangeMap.has(dep)) this.triggerChangeMap.set(dep, []);
        this.triggerChangeMap.get(rersolvePathPlaceHolder(dep, f)).push(f);
      } else if (isFunction(dep)) {
        let dfile = dep(f, this);
        this.triggerChangeMap.get(rersolvePathPlaceHolder(dfile, f)).push(f);
      }
    });
  }
  resolveRsync() {
    let { config } = this;
    if (config.rsync) {
      for (let _from in config.rsync) {
        let from = resolveProjectPath(_from);
        const tos = config.rsync[_from].map(f => resolveProjectPath(f));
        tos.forEach(to => {
          if (this.config.verbose) console.log(`copied`, from, '-->', to);
          copyFileSync(from, to);
        })
        if (!config.watch) return;
        watchFile(from, { interval: 3000 }, (c, p) => {
          // console.log(c, p)
          if (c.nlink === 0) {
            tos.forEach(to => {
              if (existsSync(to)) {
                if (!this.config.silence) console.log(`deleted`, from, '-->', to);
                unlinkSync(to);
              }
            })
          } else {
            tos.forEach(to => {
              if (!this.config.silence) console.log(`changed`, from, '-->', to);
              copyFile(from, to);
            })
          }
        })
      }
    }
  }
  startConvert() {
    console.log(`startConvert...`);
    // templateDir
    if (this.config.templateDir) {
      this.resolveTemplate(this.config);
    }
    Array.from(this.matchedMap.entries()).forEach(([k, fns]) => {
      this.excuteLayers(k, fns);
    })
    Array.from(this.contents.values()).forEach(c => {
      c.dump();
      if (this.config.watch) {
        this.watchContent(c);
      }
    })
    console.log(`convert done!`);
  }
  sort(transformList) {
    // wxss优先于wxml
    // json最先
    let order = {
      'json': 40,
      'wxss': 30,
      'less': 30,
      'js': 20,
      'ts': 20,
      'wxml': 10,
    }
    transformList = transformList.map(t => ([...t, path.extname(t[0]).substring(1)])).sort((a, b) => (order[b[2]] || 0) - (order[a[2]] || 0))
    if (this.config.verbose) console.log(`文件解析顺序=========>\n`, transformList.map(t => t[0].replace(this.config.fromDir, '')).join('\n'));
    return transformList;
  }
  resolveTemplate(config: any) {
    const absTemplateDir = resolveProjectPath(config.templateDir);
    let { files: pp, ignored } = getChildrenFromFolder(absTemplateDir, (fp) => true, 10);
    if (ignored.length && config.verbose) console.log(`ignored==>\n`, ignored.join('\n'));
    let transformList = pp.map(p1 => ([p1, resolveProjectPath(config.renamePath(p1, absTemplateDir, config.targetDir))]));
    // todo 抽取出来
    transformList = this.sort(transformList);
    transformList.forEach(([f, t, type]) => {
      if (!this.contents.has(f)) {
        let c = new Content({ from: f, to: t, str: readFileStrSync(f), type, ctx: this });
        this.contents.set(f, c)
        if (config.watch) this.watchContent(c);
        c.dump();
      }
    })
  }
  excuteLayers(k: string | IConvert.Content, fns: IConvert.Parse[]) {
    const content = isString(k) ? this.contents.get(k) : k;
    // console.log(`excuteLayers`, k, content);
    fns.forEach(fn => fn(content, this))
  }
  watchContent(content: IConvert.Content) {
    if (this.config.verbose) console.log('watch', content.from);
    watchFile(content.from, { interval: 3000 }, (c, p) => {
      // console.log(c, p)
      if (c.nlink === 0) {
        if (existsSync(content.to)) {
          if (!this.config.silence) console.log(`deleted`, content.from, '-->', content.to);
          unlinkSync(content.to);
        }
      } else {
        if (!this.config.silence) console.log(`changed`, content.from, '-->', content.to);
        content.reload();
        const fns = this.matchedMap.get(content.from);
        if (fns) this.excuteLayers(content, fns);
        content.dump();
      }
    })
  }
}


/**
 * 执行编译
 * @argument argv 参数
 */
export function exec(argv: yargs.Arguments) {
  let { input: fromDir, output: targetDir, config: configPath, root, watch, silence, verbose } = argv;
  let c = path.resolve(process.cwd(), (configPath || 'convert.config.js'));
  if (!root && c) root = path.dirname(c)
  let config: any = { filterDir, renamePath, addOnTypes, fromDir, targetDir, customFilters, watch, silence, verbose }; // default
  if (existsSync(c)) config = assign(config, require(c)); // 覆盖
  if (!config.fromDir) throw new Error('fromDir 为空')
  if (!config.targetDir) throw new Error('targetDir 为空')
  config.root = root;
  setRoot(config.root)
  config.fromDir = resolveProjectPath(config.fromDir, config.root);
  config.targetDir = resolveProjectPath(config.targetDir, config.root);
  let { files: pp, ignored } = getChildrenFromFolder(config.fromDir, (fp) => config.filterDir(fp, config.fromDir), 10);
  if (ignored.length && config.verbose) console.log(`ignored==>\n`, ignored.join('\n'));
  if (config.verbose) console.log(`customFilters==>`, config.customFilters);
  console.log(`fromDir==>`, config.fromDir);
  console.log(`targetDir==>`, config.targetDir);
  const CONVERT = new Convert(config);
  CONVERT.resolveRsync();
  let transformList = pp.map(p1 => ([p1, resolveProjectPath(config.renamePath(p1, config.fromDir, config.targetDir))]));
  transformList = CONVERT.sort(transformList);
  transformList.forEach(([f, t]) => {
    // console.log(`-->`, f, t);
    CONVERT.initMatchedFilters(f, t)
  })
  CONVERT.startConvert();
  if (config.watch) console.log('start watching...');
}

export default {
  exec,
}