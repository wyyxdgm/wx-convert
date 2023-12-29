// 生成 <button open-type="getUserInfo" bindtap="xxx"></button>
module.exports = ({ f: _f, parsed: _parsed, node: _node, parent: _parent, wxml: _wxml }: any, opt: any) => {
  if (_node.type === _wxml.NODE_TYPES.ELEMENT && _node.tagName === 'button' && _node.attributes['open-type'] === 'getUserInfo') {
    opt.functionName = _node.attributes['bindgetuserinfo'];
    opt.wrapperFunctionName = opt.functionName + "$wrapper";
    delete _node.attributes['bindgetuserinfo'];
    delete _node.attributes['open-type'];
    _node.attributes['bindtap'] = opt.functionName;
    opt.$provider.db['functionName'] = opt.functionName;
    opt.$provider.db['wrapperFunctionName'] = opt.wrapperFunctionName;
    // console.log(opt);
  }
}