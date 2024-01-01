export const customFilters: IConvert.Filter[] = [
  // 顺序执行测试
  {
    match: "/path/to/file.js",
    parse(c: IConvert.Content, ctx: IConvert.Convert) {
      c.bbb = "//bbbb"; // 设置属性 c.bbb == '//bbbb'
      c.serialize = () => c.bbb; // 覆盖序列化方式，会将serialize方法返回的内容写入目标文件
    }
  },
  {
    match: "/path/to/file.js",
    parse(c: IConvert.Content, ctx: IConvert.Convert) {
      c.bbb += "\n//bbbb"; // 更新属性 c.bbb == '//bbbb\n//bbbb'
    }
  },
  {
    match: "/path/to/file.js",
    parse(c: IConvert.Content, ctx: IConvert.Convert) {
      c.setStr("//xxx"); // 直接设置匹配match条件的数据为 c.bbb == '//xxx'
    }
  },
  // wxml测试
  {
    match: /\.wxml/,
    parse(c: IConvert.Content, ctx: IConvert.Convert) {
      // 举例
      if (~c.getStr().indexOf('<a')) { // <a 替换为 <b
        c.setStr(c.getStr().replace('<a', '<b'));
      }
      const { wxml } = ctx.$;
      const parsed = wxml.parse(c.getStr());
      wxml.traverse(parsed, function visitor(node, parent) {
        if (node.tagName == "wxs") {
        }
      });
    }
  },
  // json测试
  {
    match: (f: string, t: string, ctx: IConvert.Convert) =>
      f.match(/\.json$/) &&
      !f.endsWith("/sitemap.json") &&
      !f.endsWith("/project.private.config.json") &&
      !f.endsWith("/project.project.json") &&
      !f.endsWith("/package-lock.json") &&
      !f.endsWith("/package.json"), // match 可以是函数、正则、字符
    parse(c: IConvert.Content, ctx: IConvert.Convert) {
      let sourceStr = c.getStr();
      let obj: any = {};
      try {
        obj = JSON.parse(sourceStr);
      } catch (error) {
        console.log(`非法json`, c.from);
        console.log(error);
        return;
      }
      // 设置someProp默认值为value
      if (undefined === obj.someProp) {
        obj.someProp = "value";
      }
    }
  }
  // 

]