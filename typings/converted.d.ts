/**
 * 核心转换流程控制
 */
declare namespace IConvert {
  // 转换配置
  type Option = {
    targetMiniprogramNpmPath?: string;
    miniprogramNpmPath?: string;
    renamePath?(p1: string, absTemplateDir: string, targetDir: string): string;
    projectConfig?: any;
    packageJson?:any;
    dependencies: { [key: string]: string };
    root: string,
    fromDir: string,
    targetDir: string,
    miniprogramRoot: string,
    silence?: Boolean,
    verbose?: Boolean,
    addOnTypes?: string[];
    rsync?: { [k: string]: Array<string> };
    watch?: boolean;
    templateDir?: string;
    customFilters?: Array<IConvert.Filter>
  };
  /**
   * 转换过程全局控制类，每个文件parse时会传入
   * {
   *    // f 源文件、 t 目标文件
   *    match: (f:string, t:string, ctx:Convert) => {},
   *    parse(c:Content, ctx:Convert) {}
   * }
   */
  class Convert {
    $: {
      core,
      wxml,
      csstree,
    };
    /**
     * 全局缓存Map，分两层，建议：第一层存储关联数据的文件绝对路径，第二层对应具体功能存储，不限数据类型
     */
    store: Map;
    /**
     * 文件过滤器，匹配规则及对应处理方法
     */
    filters: Array<IConvert.Filter>;
    /**
     * Map: key - 源文件绝对路径，value: Content对象，用于缓存源文件内容，并将源文件内容序列化后写入目标文件
     */
    contents: Map<string, Content>;
    /**
     * 存储源文件绝对路径以及关联到该文件上的所有过滤方法集合
     */
    matchedMap: Map<string, Array<IConvert.Parse>>;
    /**
     * 存储文件依赖关系，用于依赖关系的解析
     */
    triggerChangeMap: Map<string, Array<string>>;
    /**
     * 入口配置
     */
    config: IConvert.Option;
    constructor(o: Option);
    /**
     * 初始化源目录下需要处理的所有文件关系
     * @param f 源文件路径
     * @param t 目标文件路径
     */
    initMatchedFilters(f: string, t: string);
    /**
     * 生成匹配的方法列表
     * @param match 
     * @param f 
     * @param t 
     * @returns 
     */
    isMatched(fi: IConvert.Filter, f: string, t: string);
    /**
     * 添加文件依赖关系
     * @param f string 源文件
     * @param deps [] 依赖文件集合
     */
    addDeps(f: string, deps: IConvert.Depends);
    /**
     * 开启转换流程
     */
    startConvert();
  }
  type Depends = Array<((f: string, ctx: IConvert.Convert) => string) | string>
  type Match = string | RegExp | ((from: string, to: string, ctx: IConvert.Convert) => boolean);
  type Parse = (content: IConvert.Content, ctx: IConvert.Convert) => any;
  type Filter = { match: Match, parse: Parse, deps?: Depends }
  type ContentType = 'axml' | 'js' | 'ts' | 'png' | 'jpeg' | 'json' | 'less' | 'scss' | 'wxs' | 'sjs';
  /**
   * 对应每个独立解析源文件的管理类
   */
  interface Content {
    [key: string]: any;
    /**
     * 清除缓存中记录的文件内容，下次将重新从源文件读取内容
     */
    getStr(): string;
    /**
     * 读取缓存中的文件内容，没有缓存则从源文件读取
     */
    reload(): void;
    /**
     * 更新缓存文件内容
     */
    setStr(str: string)
    /**
     * reload后触发
     */
    onReload?: Function;
    /**
     * serialize之前，执行此函数
     */
    beforeSerialize?: Function;
    /**
     * 默认序列化方法，可以覆盖
     * @returns
     */
    serialize?(): string
    /**
     * TODO
     * @returns null
     */
    getTree(): any
    /**
     * 将源文件转换结果写到目标目录
     * @returns undefined
     */
    dump(): void
  }
}