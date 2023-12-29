import fs from 'fs';
import { isEmpty, isString, keyBy, mapValues } from 'lodash';
import path from "node:path";
import { Cache } from '..';
import { getAppPlugin, walkRelations, walkWxml, walkWxss } from '../plugin/transform';
import { /* copyFileSync, */ exsitsCssPath, exsitsJsPath, readFileStr, relativeFilePath, writeFileSync } from './util';
import { WatcherSync } from './WatcherSync'
class ProjectManager {
  projectPath: any;
  _ps: any = {};
  projectConfig?: {
    miniprogramRoot?: string,
    packOptions?: any,
    setting?: {
      packNpmManually?: boolean,
      packNpmRelationList: Array<{ packageJsonPath: string, miniprogramNpmDistDir: string }>,
    },
    compileType?: string,
    appid: string,
    projectname: any
  } = undefined; // 主小程序的projectConfig
  convertConfig: {
    miniprogramRootPath: string;
    pluginRootPath: string;
    plugin?: {
      removeComponents: string[] | undefined | null,
      defaultNavigationStyle: 'custom',
      targetNavigationStyle: 'default' | 'custom',
      sync: Array<{
        // watch?: boolean,
        source: string,
        target: string
      }>,
      output: string,
      exclude?: [],
      plugins: Array<{
        test: string | RegExp,
        plugins: [string, any?] | string
      }>,
      projectConfig: { // 目标插件的projectConfig
        pluginRoot: string
      }
      pluginConifg: any,
      privateProjectConfig: any,
    },
    projectConfig: any,
    dist: string,
  };
  static CONVERT_CONFIG_PATH = './convert.config.js';
  convertPath: any;
  pages: string[] = []; // exclude后的页面
  sources: {
    componentWxss: any, // 所有页面和组件wxss
    wxml: any, // 所有页面wxml
    wxmlOption: any, // 所有页面wxml
    wxmlCode: any, // 所有wxml的code
    wxss: any, // 所有wxss
    pages: any, // 所有页面wxml
    images: any, // 所有用到的图片
    json: any, // 所有页面和组件json
    components: any, // 所有不引用插件的组件
    pluginJson: any, // 所有引用插件的组件
    wxsss: any, // 所有组件页面依赖的非本页wxss
    wxmls: any, // 所有组件页面依赖的非本页wxml
    wxs: any,
  } = { componentWxss: {}, wxml: {}, wxmlOption: {}, wxmlCode: {}, wxss: {}, pages: {}, images: {}, json: {}, components: {}, pluginJson: {}, wxsss: {}, wxmls: {}, wxs: [], };
  excludePaths: any[] = [];
  fileList: any;
  relations: any = {}; // 初始依赖集合
  appPath: string = '';
  appWxssPath: string = '';
  appWxssAst: null | undefined;
  appJsonPath: string = '';
  innerSources = {
    'App': path.join(__dirname, '../inner/_app.ts'),
    '_wx': path.join(__dirname, '../inner/_wx.ts'),
    'RouteManager': path.join(__dirname, '../inner/RouteManager.ts'),
  }
  DIST_PATH = {
    app: '',
    // projectConfig: '',
    // privateProjectConfig: '',
    // pluginConifg: '',
    // indexJs: '',
    // miniprogram: '',
  };
  iswat: any;
  watcherSync: WatcherSync;
  relationWatcher: any;
  isRelationWatched: any;
  _wxlist: any = {}; // 白名单
  excludeFilters: any;
  private _excludeFiltersFunc: ((f: string) => boolean) | undefined;
  originalPages: any[] | undefined; // app.json中声明的页面
  originalPlugins: any | undefined = { _: {} }; // app.json中声明的页面
  walkOptions: any;
  packageJson: any;
  packageJsonPath: string = '';
  packageDependencies: { [x: string]: string; } = {};
  filesWatcher: any = null;
  option: { watch?: boolean, logFile?: string | null, silence?: boolean } = {
    watch: false,
    logFile: null,
    silence: true,
  };
  constructor({ projectPath, convertPath, option = {} }:
    { projectPath: string, convertPath: string, option?: { watch?: boolean, logFile?: string | null, silence?: boolean } }) {
    this.option = Object.assign(this.option, option);
    this.watcherSync = new WatcherSync(this.option.watch);
    this.projectPath = projectPath;
    this.convertPath = convertPath || path.join(projectPath, ProjectManager.CONVERT_CONFIG_PATH);
    if (!fs.existsSync(this.convertPath)) throw new Error(`配置文件不存在：${this.convertPath}`);
    this.convertConfig = require(this.convertPath);
    if (!this.convertConfig) throw new Error("convert配置为空");
    if (!this.convertConfig.dist) this.convertConfig.dist = 'dist';
    this.filesWatcher = require('fs-watch-file')({ persistent: false });
    this.filesWatcher.on('error', (err: any) => {
      console.log('filesWatcher err', err);
    })

    this.exclude(['.DS_Store', '.eslintrc.js', '.gitignore', 'convert.config.js'].map(s => ({ type: 'file', value: s })))
    this.exclude(['.git', 'node_modules', 'dist', '.vscode', 'custom-tab-bar'].map(s => ({ type: 'folder', value: s })))
    this.exclude(this.convertConfig.plugin?.exclude?.map(c => { (c as any).byConvertConfig = 1; return c; }))
    this.getProjectConfig();
    this.exclude(this.projectConfig?.packOptions?.ignore) // 把 project配置为不打包的去除
    this.resolvePackageJson()
    this.resolveApp(); // 需要在所有exclude之后，解析文件列表才有效
  }

  startWatchSync() {
    if (this.convertConfig.plugin?.sync?.length) {
      this.convertConfig.plugin?.sync.forEach(s => this.watcherSync.add(s.source, s.target, { preserveTimestamps: true }));
    }
    if (Object.keys(this.packageDependencies).length) {
      Object.values(this.packageDependencies).forEach(p => {
        const t = path.join(this.convertConfig.pluginRootPath, this.relativeProjectPath(p));
        this.watcherSync.add(p, t, { preserveTimestamps: true, })
      })
    }
  }

  stopWatchSync() {
    this.watcherSync?.close();
  }

  exclude(paths: any[] | undefined) {
    if (!paths) return;
    this.excludePaths = this.excludePaths.concat(paths);
  }
  logStatusWxListTodo() {
    // TODO 从_wx中读取
    let o = ['getUpdateManager', 'getLaunchOptionsSync', 'setInnerAudioOption', 'reportPerformance', 'getStorageInfoSync', 'getMenuButtonBoundingClientRect', 'getUserProfile', 'navigateToMiniProgram', 'requestPayment', 'authorize', 'nextTick', 'openCard', 'addCard', 'canIUse', 'chooseMessageFile', 'getFileSystemManager', 'env',]
    let om = keyBy(o, it => 'wx.' + it);
    let todo = [];
    if (!this.option.silence) console.log(`om`, Object.keys(om).length, om);
    for (const key in this._wxlist) {
      if (!Object.prototype.hasOwnProperty.call(om, key)) {
        todo.push(key)
      }
    }
    if (!this.option.silence) console.log(`_wxlist --todo`, todo);
  }
  logStatus() {
    if (this.option.logFile) {
      writeFileSync(isString(this.option.logFile) ? this.option.logFile : path.join(__dirname, '../build.json'), JSON.stringify(this))
    }
    if (this.option.silence) return;
    console.log("pages", this.pages);
    console.log("originalPlugins", this.originalPlugins);
    console.log("sources", this.sources);
    console.log("projectConfig", this.projectConfig);
    console.log("convertConfig", this.convertConfig);
    console.log("exclude", this.excludePaths);
    console.log("fileList", this.fileList);
    console.log("_wxlist定制支持的列表", Object.keys(this._wxlist).length, this._wxlist);
    console.log("packageDependencies", this.packageDependencies);
    // console.log("package installed", this.walkOptions.module.installed);
    console.log("package used", this.walkOptions.module.used);
    // console.log('excludePaths ==>', `\n${this.excludePaths.map(e => JSON.stringify(e)).join('\n')}`);
  }
  /**
   * 递归解析和迁移文件
   * @param f 文件
   * @param recursive 是否递归、递归层级
   * @param independentsRes 递归结果收集，如果传入已存在的值会优先使用缓存，可能导致文件无法重新解析
   * @returns 递归收集结果
   */
  walkRelations(f?: string, recursive?: boolean | number, independentsRes?: any) {
    if (recursive === undefined) recursive = true
    if (!f) f = this.appPath;
    if (this.relations[f]) delete this.relations[f]; // 先删除、强制重新收集
    if (!this.walkOptions) this.walkOptions = {
      resolvePath: this.resolvePath.bind(this),
      images: {},
      module: { installed: this.packageDependencies, used: {} }, // used收集使用npm包
      insertImports: {
        'getApp': this.innerSources.App
      },
      independentsRes: independentsRes === undefined ? this.relations : independentsRes,
      wxAdapter: {
        _wx: '_wx', // id
        _wxPath: this.innerSources._wx, // 路径
        api: require('../api-limit'),
        _wxlist: {}, // 存放搜集到的_wx支持列表
      }
    };
    let plugins: any = { [this.appPath]: [] }
    plugins[this.appPath].push(getAppPlugin({ relativeAppPath: `./${this.relativeProjectPath(this.innerSources.App)}` }));
    if (!plugins[f]) plugins[f] = [];
    let jsonFile = f.replace(/\.ts|\.js/, '.json');
    if (this.sources.json[jsonFile]?.options?.removeComponents) {
      // todo 处理 navbar 的 title，使用js的noShow/onHide设置更新，或者通过Behavior更新
      plugins[f].push(['./build/convert/babel-plugin/babel-plugin-title-behavior.ts', { c: this.sources.json[jsonFile]?.options?.removeComponents, relativeRouteManagerPath: relativeFilePath(f, this.innerSources.RouteManager) }])
    }

    let externalPlugins = this.filterPlugins(f).map(p => 'string' == typeof p.plugins ? [p.plugins] : p.plugins)
    if (externalPlugins?.length) {
      if (!plugins[f as string]) plugins[f as string] = [];
      externalPlugins.forEach(ep => {
        ep.forEach(([_p, opt]: any[]) => {
          if (opt?.$usage?.name) opt.$usage.db = Cache.usage(opt.$usage.name)
        });
        plugins[f as string].push(...ep as Array<any>)
      })
    }
    let re = walkRelations(f, this.walkOptions, { recursive, plugins });
    if (Object.keys(this.walkOptions.wxAdapter.api._wxlist).length !== Object.keys(this._wxlist).length) {
      // console.log('_wx需要适配的列表==>', '\n' + Object.keys(this.walkOptions.wxAdapter.api._wxlist).join('\n'));
      this._wxlist = Object.assign({}, this.walkOptions.wxAdapter.api._wxlist)
    }
    Object.assign(this.relations, re); // 新收集的结果合并到集合中
    Object.assign(this.sources.images, this.walkOptions.images);
    return re;
  }

  filterPlugins(f: string): any[] {
    var globToRegExp = require('glob-to-regexp');
    return this.convertConfig.plugin?.plugins?.filter(p => {
      if ('string' === typeof p.test) {
        if (p.test.indexOf("*") >= 0) {
          return globToRegExp(p.test).test(f)
        } else {
          if (this.joinProjectPath(p.test) === f) return true;
        }
      } else if (p.test instanceof RegExp) {
        return p.test.test(f as string);
      }
      return false;
    }) || []
  }


  async walkPlugin() {
    // todo walkfiles
    console.log('<<<<=== start convert project ==============================>>>>',
      '\nfrom:', this.projectPath, '\nto:', this.convertConfig.plugin?.output, '\n----------------------------------------------------------------');
    // this.syncConfigs()
    this.startWatchSync();
    // app.js
    this.convertAppJsToPlugin();
    this.convertAppWxssToPlugin();
    this.convertAppJsonToPlugin();
    // page.js
    this.convertPagesToPlugin();
    // components.js
    // this.convertCompenentsToPlugin();
    this.syncSourcesFiles();

    // sync js
    this.writeRelationsSync(this.relations, this.convertConfig.pluginRootPath);

    this.startWatchFiles();
    this.logStatus();
  }

  /**
   * app.wxss全局样式同步到plugin/main.wxss中
   */
  convertAppWxssToPlugin() {
    const extra = {
      cloneAst: true,
      ast: null,
    };
    this.resolveWxss(this.appWxssPath, { extra })
    this.appWxssAst = extra.ast;
    this.watchFilesSync([this.appWxssPath, ...this.sources.wxss[this.appWxssPath]], this.convertConfig.pluginRootPath);
  }
  /**
   * app.json原来引入的插件列表和权限声明，同步到miniprogram/app.json
   */
  convertAppJsonToPlugin() {
    // 使用模板搞定
    // console.log('todo convertAppJsonToPlugin');
  }
  /**
   * pages和分包同步到plugin中
   * 1. pages.js 引入，编译&&替换 && 递归引入依赖
   * 2. pages.wxss 同步引入 && 递归引入依赖 + 引入全局
   * 3. pages.json 同步依赖组件引入&&路径完善
   */
  convertPagesToPlugin() {
    this.pages.forEach((p: string) => {
      const page = this.joinProjectPath(p);
      const js = exsitsJsPath(page) as string
      const json = exsitsJsPath(page, '.json') as string
      const wxml = exsitsJsPath(page, '.wxml') as string
      const wxss = exsitsCssPath(page) as string

      this.sources.pages[page] = { page, js, json, wxml, wxss, components: {} };
      this.walkCompoents(page, json)

      const wxmls = this.resolveWxml(wxml, undefined);
      this.walkRelations(js)
      const wxsss = this.resovleComponentWxss(wxss);
      Object.assign(this.sources.pages[page], { wxsss, wxmls })
      // this.watchFilesSync([wxml], this.convertConfig.pluginRootPath)
    })
  }

  resolvePath(currentPath: string, sourcePath: string) {
    if (sourcePath.startsWith('/')) return path.join(this.projectPath, '.' + sourcePath)
    else return path.resolve(path.dirname(currentPath), sourcePath)
  }
  /**
   * 解析wxss及其依赖
   * @param wxss 
   */
  resolveWxss(wxss: string, opt?: any): string[] {
    if (!wxss) return [];
    if (this.sources.wxss[wxss] && !opt.force) return this.sources.wxss[wxss];
    this.sources.wxss[wxss] = [];
    const wxssRelations = walkWxss(wxss, opt)
    wxssRelations.forEach(np => {
      np = this.resolvePath(wxss, np)
      this.sources.wxss[wxss].push(np);
      if (!this.sources.wxsss[np]) this.sources.wxsss[np] = this.resolveWxss(np);
      if (!isEmpty(this.sources.wxsss[np])) this.sources.wxsss[wxss].push(...this.sources.wxsss[np])
    });
    return this.sources.wxss[wxss];
    // console.log('relations', relations);
  }
  /**
   * 解析wxml及其依赖
   * @param wxml 
   */
  resolveWxml(wxml: string, force?: any, options?: any) {
    if (!wxml) return [];
    if (this.sources.wxml[wxml] && !force) return this.sources.wxml[wxml];
    this.sources.wxml[wxml] = [];
    let externalPlugins = this.filterPlugins(wxml).map(p => 'string' == typeof p.plugins ? [p.plugins] : p.plugins)
    const wxmlFilter = ((ctx: any) => externalPlugins.map(ep => {
      ep.map(([p, opt]: [string, any]) => {
        if (opt?.$provider?.name) { opt.$provider.db = Cache.provider(opt.$provider.name) }
        require(this.joinProjectPath(p))(ctx, opt)
      })
    }))
    const jsonFile = wxml.replace('.wxml', '.json');
    let _opt = this.sources.json[jsonFile]?.options;
    let opts = this.sources.wxmlOption[wxml] = Object.assign({}, _opt, this.sources.wxmlOption[wxml], options)
    const { wxml: wxmls, wxs, images, transform } = walkWxml(wxml, { ...opts, resolvePath: this.resolvePath.bind(this), wxmlFilter })
    if (this.sources.json[jsonFile]?.options && opts.removeComponents) Object.assign(this.sources.json[jsonFile].options, opts)
    this.sources.wxmlCode[wxml] = transform;
    Object.assign(this.sources.images, images); // 收集wxml中的到sources.images
    wxmls.forEach((np: string) => {
      np = this.resolvePath(wxml, np)
      this.sources.wxml[wxml].push(np);
      this.sources.wxmlOption[np] = Object.assign({}, this.sources.wxmlOption[np], opts);
      if (!this.sources.wxmls[np]) this.sources.wxmls[np] = this.resolveWxml(np, undefined, this.sources.wxmlOption[np]);
      if (!isEmpty(this.sources.wxmls[np])) this.sources.wxml[wxml].push(...this.sources.wxmls[np])
    });
    wxs.forEach(_wxs => {
      _wxs = this.resolvePath(wxml, _wxs)
      this.sources.wxml[wxml].push(_wxs);
      if (!this.sources.wxs[_wxs]) this.sources.wxs[_wxs] = [];
    });
    return this.sources.wxml[wxml];
  }
  resovleComponentWxss(wxss: string, force?: boolean) {
    if (!wxss || !this.appWxssAst) return;
    let p = {
      force,
      extra: {
        ast: this.appWxssAst,
        transform: '',
        unshiftAst: true,
        resolvePath: this.resolvePath.bind(this)
      }
    }
    const wxsss = this.resolveWxss(wxss, p);
    this.sources.componentWxss[wxss] = p.extra.transform;
    return wxsss;
  }
  /**
   * 收集组件依赖
   * @param page 属于哪个页面的依赖
   * @param json 外部组件或相对project的路径或相对当前文件的路径，以是否以'/'、'plugin://'开头判断
   * @param pwd 当前上下文绝对路径
   */
  walkCompoents(page: string, json: string) {
    // console.log('walkCompoents:'s, 'page', page, 'json', json);
    if (this.sources.json[json]) return;
    this.sources.json[json] = {};
    let j = require(json);
    // let collect = [];
    if (isEmpty(j.usingComponents)) return;
    for (let k in j.usingComponents) {
      let v = j.usingComponents[k];
      if (v.startsWith('plugin://')) { // 记录 当前文件到pluginJson
        this.addPluginJson(json, v, k)
      }
      else v = this.resolvePath(json, v)
      // 收集 pagep[p].components[c]
      if (!this.sources.pages[page]["components"]) this.sources.pages[page]["components"] = {};
      if (!this.sources.pages[page]["components"][v]) {
        this.sources.pages[page]["components"][v] = k;
      }
      let options: any = null;
      if (this.convertConfig.plugin?.removeComponents) {
        for (let relativeProjectPath of this.convertConfig.plugin?.removeComponents) {
          if (v === this.joinProjectPath(relativeProjectPath)) {
            if (!options?.removeComponents) options = { removeComponents: {} };
            options.removeComponents[k] = 1;
          }
        }
      }
      if (options?.removeComponents) {
        if (!this.sources.json[json].options) this.sources.json[json].options = {};
        if (!this.sources.json[json].options.removeComponents) this.sources.json[json].options.removeComponents = {};
        Object.assign(this.sources.json[json].options.removeComponents, options.removeComponents);
      }
      // 收集 sources.components[c]
      if (!this.sources.components[v]) {
        const js = exsitsJsPath(v) as string
        const json = exsitsJsPath(v, '.json') as string
        const wxml = exsitsJsPath(v, '.wxml') as string
        const wxss = exsitsCssPath(v) as string
        this.sources.components[v] = { json, wxml, wxss, js }
        if (!v.startsWith('plugin://')) {
          this.walkCompoents(page, v + '.json')
        }
        const wxmls = this.resolveWxml(wxml);
        this.walkRelations(js)
        const wxsss = this.resovleComponentWxss(wxss);
        Object.assign(this.sources.components[v], { wxmls, wxsss });
        // collect.push(v);
        // this.watchFilesSync([wxml].filter(t => !!t), this.convertConfig.pluginRootPath)
      }
    }
    // collect.map((v: string) => { // { page, js, json, wxml, wxss };
    //   if (v.startsWith('plugin://')) return;
    //   this.walkCompoents(page, v + '.json')
    // })
  }
  addPluginJson(json: string, v: string, k: string) {
    let result = /plugin\:\/\/([^/]+)\//.exec(v)
    if (!result) throw new Error(v + `无法识别plugin:${k}`)
    let pluginName = result[1];
    if (!this.sources.pluginJson[json]) this.sources.pluginJson[json] = [];
    this.sources.pluginJson[json].push(pluginName);
  }
  isInPluginJson(json: string) {
    return !!this.sources.pluginJson[json]?.length
  }
  syncSourcesFiles() {
    this.watchFilesSync([
      ...Object.keys(this.sources.wxsss),
      ...Object.keys(this.sources.wxs),
    ],
      this.convertConfig.pluginRootPath)
    // json / wxss
    this.watchFilesSync(Object.keys(this.sources.json).concat(Object.keys(this.sources.pluginJson)), (f: string) => {
      let json = require(f);
      const c = json.usingComponents;
      for (let k in c) {
        if (c[k].startsWith('/')) {// 处理相对于工程根目录的组件路径
          let v = this.relativeProjectPath(this.joinProjectPath('.' + c[k]), path.dirname(f));
          c[k] = v;
        }
      }
      if (this.convertConfig.plugin?.targetNavigationStyle && this.isPageJson(f)) {
        if (!json.navigationStyle) json.navigationStyle = this.convertConfig.plugin?.targetNavigationStyle;
      }
      let jsonStr = JSON.stringify(json)
      let plugins = this.sources.pluginJson[f];
      if (plugins?.length) {
        plugins.forEach((pluginName: string) => {
          let plugin = Object.values(this.originalPlugins).find((o: any) => o[pluginName]) as any;
          if (!plugin) return console.error('未找到插件配置', pluginName, Object.values(this.originalPlugins))
          jsonStr = jsonStr.replace(new RegExp(pluginName, 'g'), plugin[pluginName].provider)
        });
      }
      this.pipeFileSync(f, this.convertConfig.pluginRootPath, jsonStr);
    })
    // componentWxss
    this.watchFilesSync(Object.keys(this.sources.componentWxss), (f: string) => {
      /* const _wxsss =  */
      this.resovleComponentWxss(f, true);
      // todo 暂不更新pages/components中的wxsss
      // console.log(_wxsss);
      // ...
      this.pipeFileSync(f, this.convertConfig.pluginRootPath, this.sources.componentWxss[f]);
    })
    // wxml
    this.watchFilesSync(Object.keys(this.sources.wxmlCode), (f: string) => {
      this.resolveWxml(f, true);
      // console.log(`f`, f);
      // console.log(`code`, this.sources.wxmlCode[f]);
      this.pipeFileSync(f, this.convertConfig.pluginRootPath, this.sources.wxmlCode[f]);
    })
  }
  isPageJson(json: string) {
    return this.sources.pages[json.slice(0, - '.json'.length)]
  }
  convertCompenentsToPlugin() {
    mapValues(this.sources.pages, ({ page, json }: any) => { // { page, js, json, wxml, wxss };
      if (!this.sources.pages[page]["components"]) this.sources.pages[page]["components"] = {};
      this.walkCompoents(page, json)
    })
  }


  convertAppJsToPlugin() {
    const relations = this.walkRelations();
    console.log('app.js入口引用文件数量：', Object.keys(relations).length);
    // app
    // innerSources会自动根据依赖同步到目标目录
    // console.log(relations[this.appPath].transform?.code.split('\n').slice(10, 20).map((v: any, i: any) => `${i + 1}: ${v}`).join('\n'));
  }

  resolveScriptChange(f: string) {
    console.log(`js changed: ${f}`);
    if (!this.relations?.[f]) return;
    if (!fs.existsSync(f)) return;
    this.walkRelations(f, 1);
    this.writeRelationsSync({ [f]: this.relations[f] }, this.convertConfig.pluginRootPath);
  }

  startWatchFiles() {
    if (this.isRelationWatched) return;
    this.isRelationWatched = true;
    const watch = require('fs-watch-file');
    let relationWatcher: any = null;
    try {
      relationWatcher = watch({ persistent: false });
    } catch (error) {
      console.log('watch error', error);
    }

    // watch this.relations
    Object.keys(this.relations).forEach((f: any) => relationWatcher.add(f))

    // get notified on changes
    relationWatcher.on('change', ({ filepath: f }: any) => this.resolveScriptChange(f));
    relationWatcher.on('error', (err: any) => {
      if (err.code === 'UnexpectedEvent' && err.filepath) {
        console.log(`UnexpectedEvent`);
        this.resolveScriptChange(err.filepath);
      } else {
        console.log(`relationWatcher err`, err);
      }
    })
    this.relationWatcher = relationWatcher
  }

  stopWatchFiles() {
    this.relationWatcher?.stop();
  }
  // syncConfigs() {
  //   // const { pluginConifg, projectConfig, privateProjectConfig } = this.convertConfig.plugin || {};
  //   // writeFileSync(this.DIST_PATH.privateProjectConfig, JSON.stringify(privateProjectConfig));
  //   // writeFileSync(this.DIST_PATH.projectConfig, JSON.stringify(projectConfig));
  //   // writeFileSync(this.DIST_PATH.pluginConifg, JSON.stringify(pluginConifg));
  // }

  writeRelationsSync(relations: any, dir: string) {
    for (let p in relations) {
      if (relations[p]?.transform?.code === '') {
        console.warn(`文件内容为空！${p}`)
      }
      this.pipeFileSync(p.replace('.ts', '.js'), dir, relations[p]?.transform?.code);
    }
  }

  // cpFilesSync(paths: string[], dir: string) {
  //   return paths.map(p => {
  //     if (!p) return;
  //     let d = path.join(dir, this.relativeProjectPath(p));
  //     copyFileSync(p, d);
  //   })
  // }

  watchFilesSync(paths: string[], dirOrFn: string | Function) {
    if (!paths?.length) return;
    if (typeof dirOrFn === 'function') {
      if (!paths.forEach) {
        debugger
      }
      paths.forEach((f: any) => dirOrFn(f))
      if (this.option.watch) {
        this.watcherSync.exclude(paths);
        // add paths to already-known files
        paths.forEach((f: any) => {
          this.filesWatcher.add(f)
        })
        // get notified on changes
        let pMap = keyBy(paths);

        this.filesWatcher.on('change', (f: string) => {
          if ((f as any)?.filepath) f = (f as any)?.filepath;
          if (pMap[f]) dirOrFn(f);
        });
        return this.filesWatcher;
      }
      return null;
    } else {
      this.watcherSync.include(paths, dirOrFn, this);
    }
  }

  pipeFileSync(sourcePath: string, targetDir: string, code: any) {
    const t = path.join(targetDir, this.relativeProjectPath(sourcePath));
    writeFileSync(t, code)
  }

  joinProjectPath(...ps: string[]) {
    return path.join(this.projectPath, ...ps)
  }

  relativeProjectPath(p: string, pCurrent?: string) {
    return path.relative(pCurrent || this.projectPath, p)
  }

  async getReadykForPlugin() {
    if (!this.convertConfig.plugin) throw new Error("convert配置缺失plugin");
    if (!this.convertConfig.plugin.output) this.convertConfig.plugin.output = 'plugin';
    this.convertConfig.plugin.output = path.resolve(this.projectPath, this.convertConfig.dist, this.convertConfig.plugin.output);
    if (!(this.convertConfig as any).plugin.projectConfig.pluginRoot) (this.convertConfig as any).plugin.projectConfig.pluginRoot = 'plugin/'
    this.convertConfig.pluginRootPath = path.join(this.convertConfig.plugin.output, (this.convertConfig as any).plugin.projectConfig.pluginRoot)
    this.convertConfig.miniprogramRootPath = path.join(this.convertConfig.plugin.output, (this.convertConfig as any).plugin.projectConfig.miniprogramRoot)
    this.convertConfig.plugin?.sync?.forEach(s => {
      s.source = path.resolve(this.projectPath, s.source);
      s.target = path.resolve((this.convertConfig as any).plugin.output, s.target || this.convertConfig.plugin?.output || '.')
    })
    // this.DIST_PATH['projectConfig'] = path.join(this.convertConfig.plugin.output, 'project.config.json');
    // this.DIST_PATH['privateProjectConfig'] = path.join(this.convertConfig.plugin.output, 'project.private.config.json');
    this.DIST_PATH['app'] = path.join(this.convertConfig.pluginRootPath, this.relativeProjectPath(this.appPath));
    // this.DIST_PATH['pluginConifg'] = path.join(this.convertConfig.pluginRootPath, 'plugin.json');
    // this.DIST_PATH['indexJs'] = path.join(this.convertConfig.pluginRootPath, 'index.js');

    if (this.projectConfig?.compileType !== 'miniprogram') return new Error("当前仅支持小程序转插件");
    await this.getFilteredFileList()
    // 预留多个
    return true
  }

  getExcludeFilter(r?: boolean) {
    if (r === undefined) r = true;
    return (!r && this._excludeFiltersFunc) || (() => {
      var globToRegExp = require('glob-to-regexp');
      this.excludeFilters = this.excludePaths.reduce((p, { type, value }) => {
        if (type == 'file') p.kv[value] = 1;
        if (type == 'folder') p.regExps.push(globToRegExp(value + '**'))
        if (type == 'glob') p.regExps.push(globToRegExp(value))
        return p;
      }, { regExps: [], kv: {} });
      return this._excludeFiltersFunc = (f: string) => {
        if (f.charAt(0) === '/') f = this.relativeProjectPath(f)
        let v = !(this.excludeFilters.kv[f] || this.excludeFilters.regExps.find((r: RegExp) => r.test(f)))
        // console.log(f, v);
        return v;
      }
    })()
  }

  async getFilteredFileList() {
    var walk = require('walkdir');
    const filter = this.getExcludeFilter(false)
    let fileListLevel1 = await walk.async(this.projectPath, {
      max_depth: 1,
      filter: (_dir: any, files: any[]) => files.filter(filter)
    });
    const res = await Promise.all(fileListLevel1.map((f: string) => walk.async(f)))
    this.fileList = res.reduce((pre, p) => pre.concat(p.map((_p: string) => this.relativeProjectPath(_p))), []);
    // console.log('一级文件：', fileListLevel1.length);
    // console.log('按一级文件分组：', res.length);
    console.log('文件总计：', this.fileList.length);
    return this.fileList;
  }

  getProjectConfig(refresh?: boolean): any {
    return !refresh && (this.projectConfig || (() => {
      const p = this.joinProjectPath('project.config.json');
      const data = readFileStr(p);
      this.projectConfig = JSON.parse(data);
      return this.projectConfig;
    })())
  }

  resolveApp() {
    let projectConfig = this.projectConfig as any;
    projectConfig.miniprogramRoot = projectConfig.miniprogramRoot ?
      this.joinProjectPath(projectConfig.miniprogramRoot) :
      this.projectPath;
    this.appPath = exsitsJsPath(path.join(projectConfig.miniprogramRoot, 'app')) as string || '';
    this.appWxssPath = exsitsCssPath(path.join(projectConfig.miniprogramRoot, 'app')) as string || '';
    this.appJsonPath = exsitsJsPath(path.join(projectConfig.miniprogramRoot, 'app'), '.json') as string || '';
    const appJsonStr = readFileStr(this.appJsonPath);
    const app = JSON.parse(appJsonStr);
    let pages = [...app.pages];
    if (app.subpackages) {
      app.subpackages.map((c: { plugins?: any, pages: Array<string>, root: string }) => {
        pages = pages.concat(c.pages.map(p => path.join(c.root, p)))
        if (c.plugins) {
          this.originalPlugins[c.root] = c.plugins;
        }
      });
    }
    if (app.plugins) {
      this.originalPlugins._ = app.plugins;
    }
    // provider 为key
    this.originalPlugins.__ = Object.values(this.originalPlugins).reduce((p: any, c: any) => {
      for (let pluginName in c) {
        p[c[pluginName].provider] = { pluginName, ...c[pluginName] }
        return p;
      }
    }, {})
    this.originalPages = pages;
    const filter = this.getExcludeFilter(false)
    this.pages = this.originalPages.filter(filter);
    return this.pages;
  }

  getTypeCompileType(compileType: convert.CompileType | undefined) {
    let type = '';
    switch (compileType) {
      case 'plugin':
        type = "miniProgramPlugin"
        break;
      default:
        type = "miniProgram"
        break;
    }
    return type
  }

  resolvePackageJson() {
    this.packageJsonPath = this.joinProjectPath('package.json');
    if (fs.existsSync(this.packageJsonPath)) {
      this.packageJson = require(this.packageJsonPath)
    } else {
      this.packageJsonPath = ''
    }
    let dependencies = mapValues(this.packageJson.dependencies || {}, (_v, k) => {
      return path.join(this.projectPath, 'miniprogram_npm', k)
    });
    if (this.projectConfig?.setting?.packNpmManually) {
      let packNpmRelationList = this.projectConfig?.setting?.packNpmRelationList || [];
      packNpmRelationList.map(({ packageJsonPath, miniprogramNpmDistDir }) => {
        let pkg = require(this.joinProjectPath(packageJsonPath))
        // ！！运行子包依赖覆盖全局配置的依赖，可能引发相关问题
        Object.assign(dependencies, mapValues(pkg.dependencies || {}, (_v, k) => {
          return path.join(this.projectPath, miniprogramNpmDistDir, 'miniprogram_npm', k)
        }))
      });
    }
    this.packageDependencies = dependencies;
  }
}

export default ProjectManager;