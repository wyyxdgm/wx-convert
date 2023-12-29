import { NodePath } from "@babel/core";

export default function ({ types: _t }: any) {
  return {
    visitor: {
      ImportDeclaration(path: NodePath, state: any) {
        // import 依赖
        if (!state.opts?.relations) return;
        let name = (path?.node as any)?.source?.value;
        if (state.opts.module?.installed?.[name]) {
          if (!state.opts.module.used[`${name}`]) state.opts.module.used[`${name}`] = {};
          state.opts.module.used[`${name}`][state.filename] = 1;
          return
        }
        state.opts.relations[name] = 1
        // console.log('ImportDeclaration', Object.keys(state.opts).length);
      },
      CallExpression(path: NodePath, state: any) {
        // require 依赖
        if (!state.opts?.relations) return;
        if ((path.node as any).callee?.name === 'require') {
          let name = (path?.node as any)?.arguments[0].value;
          if (state.opts.module?.installed?.[name]) {
            if (!state.opts.module.used[`${name}`]) state.opts.module.used[`${name}`] = {};
            state.opts.module.used[`${name}`][state.filename] = 1;
            return
          }
          state.opts.relations[name] = 1
          // console.log('CallExpression - require', Object.keys(state.opts).length);
        }
      },
      Identifier(path: NodePath, state: any) {
        // getApp 覆盖引用
        if (!state.opts?.insertImports) return;
        if (!path.parentPath?.isCallExpression()) return; // 必须是调用者
        let ast = state.opts.insertImports.hasOwnProperty((path.node as any).name) && state.opts.insertImports[(path.node as any).name]?.(_t);
        if (!ast) return;
        let rootP = (path.findParent(p => p.isProgram()) as any)
        try {
          rootP.unshiftContainer("body", ast);
        } catch (error) {
          debugger
        }
        // 防止反复处理 getApp
        delete state.opts.insertImports[(path.node as any).name];
        if (!Object.keys(state.opts.insertImports)) state.opts.insertImports = null;
      },
      StringLiteral(path: NodePath, state: any) {
        if (!state.opts?.images) return;
        let imageSrc = (path.node as any).value;
        if (state.opts.images[imageSrc]) return;
        if (imageSrc && imageSrc.indexOf('http') < 0 && imageSrc.indexOf('/images') >= 0) {
          // console.log(`imageSrc`, imageSrc);
          state.opts.images[imageSrc] = 1
        }
      },
      MemberExpression(path: NodePath, state: any) {
        // wx 接口兼容处理和收集； _wxlist：已使用，但官方未支持的接口列表
        if (state.opts?.wxAdapter?.ignoreWxAdapter) return path.skip();
        if ('wx' != (path.node as any).object.name) return;
        let support = state.opts.wxAdapter.api?.whitelist['wx.' + (path.node as any).property.name];
        if (support) return;
        (path.node as any).object.name = state.opts._wx || '_wx' // 使用_wx替换
        // console.log('unspport', 'wx.' + (path.node as any).property.name);
        if (!state.opts.wxAdapter.api?._wxlist) state.opts.wxAdapter.api._wxlist = {};
        state.opts.wxAdapter.api._wxlist['wx.' + (path.node as any).property.name] = true;
        // 插入引用
        if (!state.opts?.wxAdapter._wxImportAst_done) {
          let ast = state.opts.wxAdapter?._wxImportAst?.(_t);
          if (!ast) return;
          let rootP = (path.findParent(p => p.isProgram()) as any)
          try {
            rootP.unshiftContainer("body", ast);
          } catch (error) {
            debugger
          }
          state.opts.wxAdapter._wxImportAst_done = true;
        }
      },
    }
  };
};