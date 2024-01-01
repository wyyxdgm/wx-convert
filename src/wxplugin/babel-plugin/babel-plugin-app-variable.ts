import { NodePath, template } from "@babel/core";
import generate from "@babel/generator";
import { CallExpression, Statement, ObjectProperty } from "@babel/types";
import { isArray } from "lodash";
import { isComponentsLikeCallExpression, filterAstProp, getLifetimesAttach, getBody, getOnload } from "./helper";


export default function ({ types: _t }: any) {
  return {
    visitor: {
      "CallExpression": {
        exit: function (path: NodePath, state: any) {
          if (isComponentsLikeCallExpression(path)) {
            if (state.unshiftToBodyAsts?.length) {
              let poc = path as NodePath<CallExpression>;
              let ast = null;
              if (!state.i) state.i = 0;
              while (ast = state.unshiftToBodyAsts.pop()) {
                state.i++;
                unshiftToBody(poc, ast, _t);
              }
            }
          }
        }
      },
      Identifier(path: NodePath, state: any) {
        let hasFirstC = false;
        let hasFunctionParent = path.findParent((p: NodePath) => {
          if (hasFirstC) return false;
          if (isComponentsLikeCallExpression(p)) {
            hasFirstC = true; // 先遇到声明就返回
            return false;
          }
          if (p.isFunctionDeclaration() || p.isFunctionExpression() || p.isFunction()) return true;
          return false;
        });
        if (hasFunctionParent) return; // 方法内部，无需处理
        let dataKey = 'data'
        let dataProperty = path.findParent((p: NodePath) => {
          if (!p.isObjectProperty()) return false;
          let isD = p.get('key')?.isIdentifier({ name: 'data' })
          let isP = p.get('key')?.isIdentifier({ name: 'properties' })
          if (!isD && !isP) return false;
          if (isP) dataKey = 'properties';
          return isComponentsLikeCallExpression(p.parentPath.parentPath)
        });

        if (!dataProperty && !state.getAppVariables?.['getApp'] && (path.node as any).name === 'getApp') {
          let name = 'getApp';
          let vd = null;
          if (path.parentPath?.isCallExpression()) {
            // 记录变量名
            vd = path.findParent(p => p.isVariableDeclarator()) as any;
            if (!vd) { debugger } // getApp 还未注入，但是出现在data中
            name = vd?.get('id').node.name;
          } else if (vd = (path.find((p: NodePath<any>) => p.isImportSpecifier()) || path.find((p: NodePath<any>) => p.isImportDefaultSpecifier()))) {
            name = (vd.get('local') as any)?.node?.name
            if (!name) { debugger }
          } else {
            console.warn('其他情况未识别getApp的引入类型', state.filename + ':' + path.getPathLocation())
          }
          // logNode(vd, 1);
          // console.log('===>', state.filename);
          // logNode(path, 2);

          // console.log('-------------------');
          state.getAppVariables[name] = vd;
          return;
        }
        if (!state.getAppVariables) state.getAppVariables = { 'getApp': 1 }
        if (!state.getAppVariables || !state.getAppVariables[(path.node as any).name]) return; // 必须是依赖的调用者
        // console.log('===>', state.filename);
        // logNode(path, 3);

        if (!dataProperty) { // 处理顶部声明
          // 顶部 var
          let vdPath = path.findParent(p => p.isVariableDeclaration()) as any;
          if (state.resovledVariable?.has(vdPath)) return; // variable去重
          if (!vdPath?.node) {
            // logNode(vdPath, 4);
            let imported = path.find((p: NodePath<any>) => p.isImportSpecifier());
            if (imported) return;
            debugger; return;
          }

          // vdPath?.node && console.log('顶部var----', generate(vdPath?.node));
          let dec = vdPath.get('declarations') as any;
          if (isArray(dec) && dec.length) {
            (dec as Array<any>).forEach(de => {
              // logNode(de)
              let s = { assosiated: false };
              de.traverse({
                enter(_p: NodePath<any>, _state: any) {
                  if (_p.isIdentifier() && state.getAppVariables[_p.node.name]) {
                    _state.assosiated = true;
                    return;
                  }
                }
              }, s)
              if (s.assosiated) {
                let name = de?.get('id')?.node?.name;
                if (!name) { debugger }
                state.getAppVariables[name] = de;
              }
            })

          } else {
            let name = vdPath?.get('id')?.node?.name;
            if (!name) { debugger }
            state.getAppVariables[name] = vdPath;
          }
          if (vdPath?.node?.kind === 'const') vdPath.node.kind = 'let';
          let declareKind = vdPath.node.kind;
          let code = generate((vdPath as any).node).code as string;
          code = code.replace(new RegExp('^\s*' + declareKind + '\s*'), '');
          let ast = template(code)();
          if (!state.resovledVariable) state.resovledVariable = new Set();
          state.resovledVariable.add(vdPath)
          if (!state.unshiftToBodyAsts) state.unshiftToBodyAsts = [];
          state.unshiftToBodyAsts.push(ast);
          return;
        } else {
          if (dataKey === 'properties') {
            // todo 处理默认properties
            console.warn('properties中存在getApp的依赖未处理', '\n' + state.filename + ':' + dataProperty.getPathLocation());
            return;
          }
          if (state.__setDataInjected) return;
          let ast = dataProperty as NodePath<ObjectProperty>;
          // data
          const objexp = filterAstProp(ast, _t, (filterPath: NodePath<any>): boolean => {
            // let t = filterPath.scope.hasReference('wxapp') || path.scope.hasReference('app')
            let t2 = filterPath.isIdentifier() && state.getAppVariables[filterPath.node.name]
            // console.log(`t1,t2`, t, t2);
            return t2;
          }) as any
          let setData = template("this.setData(%%objexp%%)")
          let setDataast = setData({ objexp })
          // 添加lifetimes或load
          if (!state.unshiftToBodyAsts) state.unshiftToBodyAsts = [];
          state.unshiftToBodyAsts.push(setDataast)
          state.__setDataInjected = true;
        }

      }
    }
  }
};

function unshiftToBody(pc: NodePath<CallExpression>, ast: Statement | Statement[], _t: any, i?: number) {
  if (!i) i = 0;
  if (!pc.isCallExpression()) return;
  let calle = (pc && pc.get('callee') as any);
  if (!calle) return;
  // Component / Behavior
  if (calle.isIdentifier({ name: 'Component' }) || calle.isIdentifier({ name: 'Behavior' })) {
    let attached = getLifetimesAttach(pc, _t) as any;
    let b = getBody(attached) as any;
    if ((i as number) > 0) {
      b.node.body.splice(i - 1, 0, ast)
    } else {
      b.unshiftContainer('body' as never, ast);
    }
  }
  // Page
  if (calle.isIdentifier({ name: 'Page' })) {
    let onload = getOnload(pc, _t) as any;
    let b = getBody(onload) as any;
    if ((i as number) > 0) {
      b.node.body.splice(i - 1, 0, ast)
    } else {
      b.unshiftContainer('body' as never, ast);
    }
  }
}
