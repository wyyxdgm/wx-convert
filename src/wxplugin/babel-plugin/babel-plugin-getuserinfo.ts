import { NodePath, template } from "@babel/core";

export default function ({ types: t }: any) {
  return {
    visitor: {
      Identifier(path: NodePath, state: any) {
        const functionName = state.opts?.$usage?.db?.['functionName'];
        if (!functionName) return;
        let functionNode = (path?.node as any);
        if (functionNode.name !== functionName) return;
        if (!path.parentPath?.parentPath?.isNodeType('ObjectExpression')) return;
        const wrapperFunctionName = state.opts?.$usage?.db?.['wrapperFunctionName'];
        const methodPath = path.parentPath?.parentPath;
        const buildFunction = template(`
              {
                wx.getUserInfo({
                  success(res){
                    this.%%functionName%%({
                      detail: res
                    })
                  }
                })
              }
            `);
        let functionAst = buildFunction({
          functionName: t.identifier(functionName)
        });
        // console.log(`functionAst`, functionAst, methodPath, wrapperFunctionName);
        let ast = t.objectMethod("method", t.identifier(wrapperFunctionName), [t.identifier('e')], functionAst);
        methodPath?.unshiftContainer('properties' as never, ast);
      }
    }
  };
};