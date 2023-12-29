import { NodePath, template } from "@babel/core";
import { noExt } from '../lib/util'

export default function ({ types: t }: any) {
  return {
    visitor: {
      // Program(path: NodePath, _state: any) {
      //   console.log('start', path.node.type);
      // },
      ExpressionStatement(path: NodePath, _state: any) {
        if ((path.node as any).expression?.callee?.name === 'App') {
          // console.log('当前节点App');
          const buildRequire = template(`import %%importName%% from %%source%%;`);
          const ast = buildRequire({
            importName: t.identifier("App"),
            source: t.stringLiteral(noExt(_state.opts.relativeAppPath)),
          });
          path.insertBefore(ast);
          path.replaceWith(t.exportDefaultDeclaration(t.newExpression(t.identifier('App'), (path as any).node.expression.arguments)))
        }
      }
    }
  };
};