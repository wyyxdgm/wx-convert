import { Node, NodePath, template } from "@babel/core";
import { getBody, getLifetimesAttach, getOnload, isComponentsLikeCallExpression } from "./helper";
import { CallExpression, Program, memberExpression, thisExpression, identifier, stringLiteral, nullLiteral } from "@babel/types";
import { noExt } from "../lib/util";

function buildInsertAst(_state: any, _t: any): Node {
  let insertCode = template("routeManager.firePageShow(this, %%title%%)")
  let k = Object.keys(_state.opts.c)[0];
  let e = _state.opts.c[k];
  let title = e?.attributes?.title
  let titleProp = '';
  if (title && title.indexOf('{{') >= 0) {
    titleProp = title.replace('{{', '').replace('}}', '')?.trim?.();
    title = '';
  } else if (!title) {
    console.warn('配置了navbar但没有title', _state.filename)
    title = ''
  }
  let ast = insertCode({
    title: titleProp ?
      memberExpression(memberExpression(thisExpression(), identifier('data')), identifier(titleProp)) :
      (title ? stringLiteral(title) : nullLiteral())
  }) as any; // 会被encodeURIComponent()，后续要decode回来
  return ast;
}

export default function ({ types: _t }: any) {
  return {
    visitor: {
      CallExpression(path: NodePath, _state: any) {
        if (!_state.opts.c) return;
        if (!isComponentsLikeCallExpression(path)) return;
        if ((path.get('callee') as any)?.isIdentifier({ name: 'Component' })) {
          _state.opts.needInsertRouteManager = true;
          let showPath = getLifetimesAttach(path as NodePath<CallExpression>, _t, 'show', 'pageLifetimes');
          // console.log(`showPath`, showPath);
          // 固定key值，这种实现不好，最好预留给开发层面控制

          let ast = buildInsertAst(_state, _t)

          let b = getBody(showPath);
          b.unshiftContainer('body', ast)
        } else if ((path.get('callee') as any)?.isIdentifier({ name: 'Page' })) {
          _state.opts.needInsertRouteManager = true;
          let onLoadPath = getOnload(path as NodePath<CallExpression>, _t, 'onShow');
          // console.log(`onLoadPath`, onLoadPath);

          let ast = buildInsertAst(_state, _t)

          let b = getBody(onLoadPath);
          b.unshiftContainer('body', ast)
        } else {
          debugger
          console.warn('未处理情况');
        }
      },
      Program: {
        exit(path: NodePath, _state: any) {
          if (!_state.opts.needInsertRouteManager || _state.opts.needInsertRouteManager_done) return;
          const buildRequire = template(`import {%%importName%%} from %%source%%;`);
          const ast = buildRequire({
            importName: _t.identifier("routeManager"),
            source: _t.stringLiteral(noExt(_state.opts.relativeRouteManagerPath)),
          });
          (path as NodePath<Program>).unshiftContainer('body', ast);
          _state.opts.needInsertRouteManager_done = true;
        }
      }
    }
  }
};
