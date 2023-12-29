/**
 * 核心转换流程控制
 */
declare namespace IConvert {
  // 转换配置
  type Option = {
    fromDir: string,
    targetDir: string,
    silence?: Boolean, verbose?: Boolean,
    addOnTypes?: string[];
    rsync?: { [k: string]: Array<string> }; watch?: boolean; templateDir?: string; targetDir: string; customFilters?: Array<IConvert.Filter>
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
    store: Map;
    constructor(o: Option);
    initMatchedFilters(f: string, t: string);
    isMatched(fi: IConvert.Filter, f: string, t: string);
    addDeps(f: string, deps: IConvert.Depends);
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
    getStr(): string
    reload(): void;
    setStr(str: string)
    onReload?: Function;
    beforeSerialize?: Function;
    serialize?(): string
    getTree(): any
    dump(): void
  }
}