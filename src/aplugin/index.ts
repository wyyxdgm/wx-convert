import yargs from "yargs";
import { assign, formatCode, getChildrenFromFolder, readFileJSONSync, readFileStrSync, rersolvePathPlaceHolder, resolveProjectPath, setRoot } from "../utils";
import path from "path";
import { copyFile, copySync, mkdirSync, existsSync, writeFileSync, watchFile, removeSync, pathExistsSync } from "fs-extra";
import { isFunction, isRegExp, isString } from "lodash";
import { customFilters } from './filters/index';
import { filterDir, renamePath, addOnTypes } from "./config";
import * as core from "@babel/core";
import * as wxml from "wxml";
import * as csstree from 'css-tree';

/**
 * 支持处理的文件格式
 */
const VALIDATE_TYPE = new Set([...addOnTypes, 'axml', 'wxml', 'js', 'ts', 'map', 'yaml', 'acss', 'pdf', 'png', 'jpeg', 'json', 'less', 'wxss', 'scss', 'wxs', 'sjs', 'md', 'txt', 'json', ''])
process.on('uncaughtException', console.error);
class Content implements IConvert.Content {
  [x: string]: any;
  private str: string;
  /**
   * 目标文件类型，目前用于合适的格式化方法选择
   * 支持文件类型：null | 'axml' | 'js' | 'ts' | 'png' | 'jpeg' | 'json' | 'less' | 'scss' | 'wxs' | 'sjs'
   * 文件格式对应格式化方法：
   * 'axml' -- jsBeautify.html
   * 'json' -- JSON.stringify
   * 'less'|'scss' -- jsBeautify.css
   * 'js'|'ts'|'wxs'|'sjs' -- jsBeautify.js
   */
  type: IConvert.ContentType = null;
  /**
   * 源码目录
   */
  from: string = null;
  /**
   * 是否自动格式化
   */
  autoFormat: boolean = true;
  /**
   * 目标目录
   */
  to: string = null;
  /**
   * 全局Convert对象引用
   */
  ctx: IConvert.Convert;
  /**
   * {path.ParsedPath} 目标文件信息 
   */
  private _to: path.ParsedPath;
  constructor(_: { str: string, type: string, from: string, to: string, ctx: IConvert.Convert }) {
    if (!VALIDATE_TYPE.has(_.type)) console.warn(`类型[${_.type}]不支持!(${_.from})`);
    Object.assign(this, _);
    this._to = path.parse(this.to);
  }
  /**
   * 清除缓存中记录的文件内容，下次将重新从源文件读取内容
   */
  reload() {
    this.str = undefined;
    if (isFunction(this['onReload'])) this['onReload']?.();
  }
  /**
   * 读取缓存中的文件内容，没有缓存则从源文件读取
   */
  getStr(): string {
    if (!this.str) {
      this.str = readFileStrSync(this.from);
    }
    return this.str
  }
  /**
   * 更新缓存文件内容
   */
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
  /**
   * TODO
   * @returns null
   */
  getTree() {
    return null; // TODO
  }
  /**
   * 将源文件转换结果写到目标目录
   * @returns undefined
   */
  dump() {
    if (!existsSync(this._to.dir)) { mkdirSync(this._to.dir, { recursive: true }) }
    if (!this.str && !this.serialize) return copyFile(this.from, this.to);
    writeFileSync(this.to, this._serialize());
  }
}

class Convert implements IConvert.Convert {
  $: {
    core,
    wxml,
    csstree,
  } = {
      core,
      wxml,
      csstree,
    };
  /**
   * 全局缓存Map，分两层，建议：第一层存储关联数据的文件绝对路径，第二层对应具体功能存储，不限数据类型
   */
  store = new Map();
  /**
   * 文件过滤器，匹配规则及对应处理方法
   */
  filters: Array<IConvert.Filter>;
  /**
   * Map: key - 源文件绝对路径，value: Content对象，用于缓存源文件内容，并将源文件内容序列化后写入目标文件
   */
  contents: Map<string, Content> = new Map<string, Content>();
  /**
   * 存储源文件绝对路径以及关联到该文件上的所有过滤方法集合
   */
  matchedMap: Map<string, Array<IConvert.Parse>> = new Map();
  /**
   * 存储文件依赖关系，用于依赖关系的解析
   */
  triggerChangeMap: Map<string, Array<string>> = new Map();
  /**
   * 入口配置
   */
  config: IConvert.Option;
  constructor(config: IConvert.Option) {
    this.config = config;
    if (config.verbose) console.log(this.config);
    this.filters = config.customFilters?.filter(this.validateFilter) || [];
    if (config.addOnTypes) config.addOnTypes.forEach(t => VALIDATE_TYPE.add(t));
    const projectConfigPath = path.join(this.config.root, 'project.config.json');
    if (existsSync(projectConfigPath)) {
      let projectJson = readFileJSONSync(projectConfigPath);
      this.config.projectConfig = projectJson;
      this.config.miniprogramRoot = config.miniprogramRoot || projectJson.miniprogramRoot || '';
    } else {
      this.config.miniprogramRoot = config.miniprogramRoot || '';
    }
    this.config.miniprogramNpmPath = path.join(this.config.fromDir, this.config.miniprogramRoot, 'miniprogram_npm');
    this.config.targetMiniprogramNpmPath = path.join(this.config.targetDir, this.config.miniprogramRoot, 'miniprogram_npm');
    const packageJsonPath = path.join(this.config.root, this.config.miniprogramRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      let packageJson = readFileJSONSync(packageJsonPath);
      this.config.packageJson = packageJson;
      this.config.dependencies = config.dependencies || packageJson.dependencies;
      for (const pkgName in this.config.dependencies) {
        let pkgFolderPath = path.join(this.config.fromDir, this.config.miniprogramRoot, 'node_modules', pkgName);
        let pkgPath = path.join(pkgFolderPath, 'package.json');
        if (pathExistsSync(pkgPath)) {
          const pkgJson = require(pkgPath);
          if (pkgJson.miniprogram) {
            let pkgFromFilesPath = path.join(pkgFolderPath, pkgJson.miniprogram);
            let miniprogramNpmFilesPath = path.join(this.config.miniprogramNpmPath, pkgName); // 不拼接pkgJson.miniprogram，官方工具就是直接替换，cli则是导出js
            copySync(pkgFromFilesPath, miniprogramNpmFilesPath);
            this.config.dependencies[pkgName] = pkgName; // path.join(pkgName, pkgJson.miniprogram);
          }
        } else {
          if (!this.config.dependencies[pkgName]) this.config.dependencies[pkgName] = pkgName;
        }
      }
    } else {
      this.config.dependencies = config.dependencies || {};
    }
  }
  /**
   * 直接往目标文件写入文件内容
   * @param to 目标文件路径
   * @param content 文件内容
   * @param from 源文件路径，存在时将启用监听，和对应过滤规则
   */
  setStr(to, content, from) {
    if (from) {
      this.filters.forEach(filter => {
        if (!this.contents.has[from]) this.contents.set(from, new Content({ from, to, str: content, type: path.extname(from).substring(1), ctx: this }))
        if (this.isMatched(filter, from, to)) {
          if (!this.matchedMap.has(from)) this.matchedMap.set(from, []);
          this.matchedMap.get(from).push(filter.parse);
        }
        if (filter.deps) { this.addDeps(from, filter.deps); }
      })
      const fns = this.matchedMap.get(content.from);
      if (fns) this.excuteLayers(content, fns);
      this.contents.get(from)?.dump();
    } else {
      new Content({ str: content, type: path.extname(to).substring(1), from: to, to, ctx: this }).dump()
    }
  }
  /**
   * 校验过滤器有效性
   * @param filter 
   * @returns 返回过滤器是否有效;true: 有效;false: 无效;undefined: 无效;
   */
  validateFilter(filter: IConvert.Filter): boolean {
    if (!filter) return false;
    if (!filter.match) return;
    if (!filter.parse) return;
    return true;
  }
  /**
   * 初始化源目录下需要处理的所有文件关系
   * @param f 源文件路径
   * @param t 目标文件路径
   */
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
   * 添加文件依赖关系
   * @param f string 源文件
   * @param deps [] 依赖文件集合
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
  /**
   * 处理 convert.config.js中的rsync字段，仅同步文件
   * @returns undefined
   */
  resolveRsync() {
    let { config } = this;
    if (config.rsync) {
      for (let _from in config.rsync) {
        let from = resolveProjectPath(_from);
        const tos = config.rsync[_from].map(f => resolveProjectPath(f));
        tos.forEach(to => {
          if (this.config.verbose) console.log(`copied`, from, '-->', to);
          copySync(from, to);
        })
        if (!config.watch) return;
        watchFile(from, { interval: 3000 }, (c, p) => {
          // console.log(c, p)
          if (c.nlink === 0) {
            tos.forEach(to => {
              if (existsSync(to)) {
                if (!this.config.silence) console.log(`deleted`, from, '-->', to);
                removeSync(to);
              }
            })
          } else {
            tos.forEach(to => {
              if (!this.config.silence) console.log(`changed`, from, '-->', to);
              copySync(from, to);
            })
          }
        })
      }
    }
  }
  /**
   * 开启转换流程
   */
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
  /**
   * 文件解析顺序排序
   * @param transformList 待处理的源文件-目标文件列表
   * @returns 新的列表
   */
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
  /**
   * 处理模板文件同步
   * @param config 入口配置
   */
  resolveTemplate(config: IConvert.Option) {
    const absTemplateDir = resolveProjectPath(config.templateDir);
    let { files: pp, ignored } = getChildrenFromFolder(absTemplateDir, (fp) => true, 10);
    if (ignored.length && config.verbose) console.log(`ignored==>\n`, ignored.join('\n'));
    let transformList = pp.map(p1 => ([p1, resolveProjectPath((config.renamePath || renamePath)(p1, absTemplateDir, path.join(config.targetDir, config.miniprogramRoot)))]));
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
  /**
   * 转换执行
   * @param k 文件路径或Content
   * @param fns 匹配到的处理方法集
   */
  excuteLayers(k: string | IConvert.Content, fns: IConvert.Parse[]) {
    const content = isString(k) ? this.contents.get(k) : k;
    // console.log(`excuteLayers`, k, content);
    fns.forEach(fn => fn(content, this))
  }
  /**
   * 监听功能
   * @param content Content对象
   */
  watchContent(content: IConvert.Content) {
    if (this.config.verbose) console.log('watch', content.from);
    watchFile(content.from, { interval: 3000 }, (c, p) => {
      // console.log(c, p)
      if (c.nlink === 0) {
        if (existsSync(content.to)) {
          if (!this.config.silence) console.log(`deleted`, content.from, '-->', content.to);
          removeSync(content.to);
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
export function exec(argv: yargs.Arguments | {
  input?: string,
  output?: string,
  config?: string,
  root?: string,
  watch?: boolean,
  silence?: boolean,
  verbose?: boolean,
}) {
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
  let transformList = pp.map(p1 => ([p1, resolveProjectPath((config.renamePath || renamePath)(p1, config.fromDir, config.targetDir))]));
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