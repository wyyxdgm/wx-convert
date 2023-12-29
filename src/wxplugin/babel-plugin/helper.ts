import { NodePath } from "@babel/core";
import generate from "@babel/generator";
import { CallExpression, ObjectExpression, ObjectProperty, BlockStatement, ObjectMethod, FunctionExpression } from "@babel/types";

export function getLifetimes(path: NodePath<ObjectExpression>, t: any, propName?: string): NodePath<ObjectProperty> {
  if (!propName) propName = 'lifetimes';
  let props = path.get('properties') as NodePath<ObjectProperty>[]
  let lifetimes: NodePath<ObjectProperty> | undefined = props.find(p => (p.get('key') as NodePath)?.isIdentifier({ name: propName }));
  if (lifetimes) return lifetimes;
  path.unshiftContainer('properties', t.objectProperty(
    t.identifier(propName), t.objectExpression([])
  ))
  props = path.get('properties') as NodePath<ObjectProperty>[]
  let n = props.find(p => (p.get('key') as NodePath).isIdentifier({ name: propName })) as NodePath<ObjectProperty>;
  if (!n) { debugger }
  return n;
}

export function getLifetimesAttach(path: NodePath<CallExpression>, t: any, attachKey?: string, lifetimesKey?: string): NodePath<ObjectProperty> {
  if (!attachKey) attachKey = 'attached';
  if (!lifetimesKey) lifetimesKey = 'lifetimes';
  if (!path.isCallExpression()) { debugger }
  let args = path.get('arguments') as NodePath<ObjectExpression>[];
  let _path = args[0] as NodePath<ObjectExpression>
  if (!_path.isObjectExpression()) { debugger; }
  // 先尝试确认是否有根节点的attached
  let props = _path?.get('properties') as NodePath<any>[]
  if (!props?.length) { debugger }
  let attached = props.find(p => (p?.get('key') as any)?.isIdentifier({ name: attachKey })) as any;
  if (attached) return attached;
  // lifetimes.attached中获取或生成
  let lifetimes = getLifetimes(_path, t, lifetimesKey);
  attached = getAttachByProp(lifetimes, t, attachKey);
  return attached
}

export function getAttachByProp(path: NodePath<ObjectProperty>, t: any, attachKey?: string): NodePath<ObjectProperty> {
  if (!attachKey) attachKey = 'attached';
  let props = (path.get('value') as NodePath)?.get('properties') as NodePath<ObjectProperty>[]
  let attached: NodePath<ObjectProperty> | undefined = props.find(p => (p?.get('key') as NodePath)?.isIdentifier({ name: attachKey }));
  if (attached) return attached;
  if (!(path.node as any)?.value?.properties) { debugger }
  (path.get('value') as NodePath)?.unshiftContainer('properties' as never,
    t.objectProperty(
      t.identifier(attachKey), t.functionExpression(null, [t.identifier('e')], t.blockStatement([]))
    )
  )
  props = (path.get('value') as NodePath)?.get('properties') as NodePath<ObjectProperty>[]
  return props.find(p => (p.get('key') as NodePath).isIdentifier({ name: attachKey })) as NodePath<ObjectProperty>;
}

export function getOnloadProp(path: NodePath<ObjectExpression>, t: any, onLoadKey?: string): NodePath<ObjectProperty> {
  if (!onLoadKey) onLoadKey = 'onLoad';
  let props = path.get('properties') as NodePath<ObjectProperty>[]
  let lifetimes: NodePath<ObjectProperty> | undefined = props.find(p => (p.get('key') as NodePath)?.isIdentifier({ name: onLoadKey }));
  if (lifetimes) return lifetimes;
  path.unshiftContainer('properties', t.objectProperty(
    t.identifier(onLoadKey), t.functionExpression(null, [], t.blockStatement([]))
  ))
  props = path.get('properties') as NodePath<ObjectProperty>[]
  let n = props.find(p => (p.get('key') as NodePath).isIdentifier({ name: onLoadKey })) as NodePath<ObjectProperty>;
  if (!n) { debugger }
  return n;
}
export function getOnload(path: NodePath<CallExpression>, t: any, onLoadKey?: string): NodePath<ObjectProperty> {
  if (!onLoadKey) onLoadKey = 'onLoad';
  let args = path.get('arguments') as NodePath<ObjectExpression>[];
  let onloadProp = getOnloadProp(args[0], t, onLoadKey);
  return onloadProp
}

export function isComponentsLikeCallExpression(path: any): boolean {
  if (!path) return false;
  if (!path.isCallExpression()) return false;
  let c = path?.get('callee') as any;
  return c?.isIdentifier({ name: 'Component' }) || c?.isIdentifier({ name: 'Page' }) || c?.isIdentifier({ name: 'Behavior' });
}

export function getBody(path: NodePath<ObjectProperty | ObjectMethod | FunctionExpression>): NodePath<BlockStatement> {
  let b: any = null;
  if (path.isObjectProperty()) {
    path = (path as NodePath<ObjectProperty>).get('value') as NodePath<FunctionExpression>;
  }
  if (path.isObjectMethod() || path.isFunctionExpression()) {
    b = path.get('body') as NodePath<BlockStatement>;
  } else {
    // logNode(path, 3)
    path?.node && console.warn('未处理解析：', generate(path.node))
  }
  if (!b) { debugger }
  return b;
}

export function filterAstProp(_path: NodePath<any>, _t: any, filter: Function) {
  if (!_path.isObjectProperty()) return;
  let properties: any = [];
  _path.traverse({
    enter(path: NodePath<any>, _state: any) {
      if (filter(path)) {
        let p = path.findParent(p => p?.isObjectProperty() && p?.parentPath == _path.get('value'));
        if (!p) return console.log(`!p`);
        if (_state.properties.indexOf(p.node) < 0) _state.properties.push(p.node);
      }
    },
  }, { props: {}, properties })
  let ast = _t.objectExpression(properties);
  return ast;
}
