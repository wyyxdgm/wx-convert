
import { template, transformFileSync } from "@babel/core";
import { map, mapValues } from 'lodash'
import path from "path";
import { exsitsJsPath, noExt, readFileStr, relativeFilePath } from "../lib/util";
import * as wxml from "wxml";
import * as csstree from 'css-tree';

/**
 * 获取基于当个文件的依赖集合，以及相关节点替换
 * @param f 文件路径
 * @param independentsRes 总体依赖集合对象
 * @param insertImports 其他匹配条件的导入，支持id匹配
 * @param wxApiWhiteList 微信wx白名单 whitelist:{'wx.xxx':true,...},buglist:{},ignorelist:{}
 * @param parseOption 参考 @babel/core 中 transformFileSync option
 * @returns 依赖集合
 */
export const walkRelations = (f: string | any, { resolvePath, images, independentsRes, insertImports, wxAdapter, module }: any = { independentsRes: {} }, parseOption?: any) => {
  let relations = {};
  let _wxImportAst = null;
  if (!wxAdapter._wx) wxAdapter._wx = '_wx'
  let ignoreWxAdapter = wxAdapter._wxPath === f;
  if (!independentsRes) independentsRes = {};
  if (independentsRes[f]) return;
  independentsRes[f] = {};
  let _insertImports: any = {};
  let _images: any = {};
  if (insertImports) { // 针对当前文件的路径适配
    _insertImports = mapValues(insertImports, (v: any, key: string) => {
      // console.log(f, v);
      if (f === false) {
        debugger
      }
      let p = relativeFilePath(f, v);
      return (t: any) => {
        const buildRequire = template(`import { %%importName%% } from %%source%%;`);
        const ast = buildRequire({
          importName: t.identifier(key),
          source: t.stringLiteral(noExt(p)),
        });
        return ast
      }
    })
  }
  if (wxAdapter.api) {
    let p = relativeFilePath(f, wxAdapter._wxPath);
    _wxImportAst = (t: any) => {
      const buildRequire = template(`import %%importName%% from %%source%%;`);
      const ast = buildRequire({
        importName: t.identifier(wxAdapter._wx),
        source: t.stringLiteral(noExt(p)),
      });
      return ast
    }
  }

  try {
    independentsRes[f].transform = transformFileSync(f, {
      sourceType: 'module',
      presets: [
        ["@babel/preset-typescript", { onlyRemoveTypeImports: true }],
        // ["@babel/preset-env", {
        //   "modules": false,
        //   "targets": {
        //     "chrome": "60"
        //   },
        // }]
      ],
      plugins: [
        ...(parseOption?.plugins?.[f] || []),
        ['./build/convert/babel-plugin/babel-plugin-relation.ts', { images: _images, module, insertImports: _insertImports, relations, wxAdapter: { api: wxAdapter.api, _wxImportAst, _wx: wxAdapter._wx, ignoreWxAdapter } }],
        ['./build/convert/babel-plugin/babel-plugin-app-variable.ts', {}],
        ['./build/convert/babel-plugin/babel-plugin-methods.ts', {}],
      ],
    });
  } catch (error) {
    console.log(`transformFileSync err`, error);
    return independentsRes;
  }

  for (const src in _images) {
    images[resolvePath(f, src)] = 1;
  }
  // console.log('relations', relations);
  let recursive = parseOption?.recursive;
  if (recursive === false) return independentsRes;
  if ('number' === typeof recursive) {
    if (recursive > 0) recursive--;
    else return independentsRes;
  }
  const dir = path.dirname(f)
  independentsRes[f].relation = map(
    Object.keys(relations),
    (v, _k) => {
      let pa = exsitsJsPath(path.join(dir, v));
      if (pa === false) console.log('文件不存在', dir, v);
      return pa;
    }
  ).filter(p => !!p);
  for (let v of independentsRes[f].relation) {
    if (independentsRes[v]) continue;
    if (independentsRes[v] === false) {
      continue;
    }
    walkRelations(v, { resolvePath, images, independentsRes, insertImports, wxAdapter }, { ...parseOption, recursive: recursive });
  }
  return independentsRes;
}


export const walkWxss = (f: string, opt?: any) => {
  let css = readFileStr(f);
  let ast = csstree.parse(css);
  let hrefs: string[] = [];
  if (opt?.extra?.cloneAst) {
    opt.extra.ast = csstree.clone(ast)
  }
  csstree.walk(ast, function (node: csstree.CssNode) {
    if (node.type === 'Atrule' && node.name === 'import') {
      // console.log(`node`, node);
      let src = (node.prelude as any).children?.first?.value
      if (src) hrefs.push(src);
    }
  });
  if (opt?.extra?.unshiftAst) {
    if (opt.extra.ast && opt.extra.resolvePath) {
      let toUnshiftAst = csstree.clone(opt.extra.ast);
      csstree.walk(toUnshiftAst, function (node: csstree.CssNode) {
        if (node.type === 'Atrule' && node.name === 'import') {
          let target = (node.prelude as any).children?.first
          let p = relativeFilePath(f, opt.extra.resolvePath(f, target.value));
          if (target?.value) target.value = p
        }
      });
      opt.extra.transform = csstree.generate(toUnshiftAst) + csstree.generate(ast);
    }
  }
  return hrefs
}

export const walkWxml = (f: string, opt: any): { wxml: string[], wxs: string[], images: {}, transform: string } => {
  let relations: { transform: string, wxml: string[], wxs: string[], images: any } = { transform: '', wxml: [], wxs: [], images: {} };
  const parsed = wxml.parse(readFileStr(f));
  wxml.traverse(parsed, function visitor(node: any, parent: any) {
    const type = node.type;
    // const parentNode = node.parentNode;

    if (type === wxml.NODE_TYPES.ELEMENT) {
      // handle element node
      // const tagName = node.tagName;
      // const attributes = node.attributes; // an object represents the attributes
      // const childNodes = node.childNodes;
      // const selfClosing = node.selfClosing; // if a node is self closing, like `<tag />`
      // console.log(`tagName`, tagName, attributes, childNodes, selfClosing, parentNode, parent);
      if (node.tagName === 'import' || node.tagName === 'include') {
        relations.wxml.push(node.attributes.src)
        // console.log(`import-----s`, node.attributes.src);
      }
      if (opt.removeComponents?.[node.tagName]) {
        opt.removeComponents[node.tagName] = node;
        if (!parent?.childNodes && parsed.indexOf(node) > -1) {
          parsed.splice(parsed.indexOf(node), 1)
        } else {
          parent.childNodes.splice(parent.childNodes.indexOf(node), 1);
        }
      }
      if (node.tagName === 'wxs') {
        if (node.attributes.src) relations.wxs.push(node.attributes.src)
        else console.warn('wxs src 为空!', f)
        // console.log(`import-----s`, node.attributes.src);
      }
    }
    opt.wxmlFilter?.({ f, parsed, node, parent, wxml });
    let src = node.attributes?.src;
    if (src && !/^https?/ig.test(src) && src.indexOf('images/') >= 0) {
      relations.images[opt?.resolvePath(f, src)] = 1
    }
    //  else if (type === wxml.NODE_TYPES.TEXT) {
    //   // handle text node
    //   // const textContent = node.textContent;
    // } else if (type === wxml.NODE_TYPES.COMMENT) {
    //   // handle comment node
    //   const comment = node.comment;
    // }
  });
  relations.transform = wxml.serialize(parsed);
  return relations;
}
// export const transformApp = (f: string, { relativeAppPath }: { relativeAppPath: string }, parseOption?: any) => {
//   let re = transformFileSync(f, {
//     sourceType: 'module',
//     plugins: [
//       ['./build/convert/babel-plugin/babel-plugin-app.ts', { relativeAppPath }],
//       ...(parseOption?.plugins?.[f] || []),
//     ]
//   });
//   return re;
// }

export const getAppPlugin = ({ relativeAppPath }: { relativeAppPath: string }) => {
  return ['./build/convert/babel-plugin/babel-plugin-app.ts', { relativeAppPath }]
}