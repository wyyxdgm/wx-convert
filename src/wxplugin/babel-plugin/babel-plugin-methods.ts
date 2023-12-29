import { NodePath } from "@babel/core";

export default function ({ types: _t }: any) {
  return {
    visitor: {
      Identifier(path: NodePath, _state: any) {
        if ((path.node as any).name === 'authSetting') (path.node as any).name = 'miniprogramAuthSetting';
      }
    }
  }
};
