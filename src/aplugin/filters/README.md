# filters

用于过滤对应文件，过滤器会依次执行，执行完毕后，会自动存储到目标目录

## filters 配置

- 属性+serialize 举例

```js
export default [
  {
    match: "/Users/damo/workspace/sightp.com/SPMinaARPlugin/plugin/recognizer.js",
    parse(c: IConvert.Content, ctx: IConvert.Convert) {
      c.bbb = "//bbbb"; // 直接设置匹配match条件的数据为 "//xxx"
      c.serialize = () => c.bbb; // 覆盖序列化方式
    }
  },
  {
    match: "/Users/damo/workspace/sightp.com/SPMinaARPlugin/plugin/recognizer.js",
    parse(c: IConvert.Content, ctx: IConvert.Convert) {
      c.bbb += "\n//bbbb"; // 直接设置匹配match条件的数据为 "//xxx"
    }
  }
];
```

- setStr 举例

```js
export default {
  match: "/Users/damo/workspace/sightp.com/SPMinaARPlugin/plugin/recognizer.js",
  parse(c: IConvert.Content, ctx: IConvert.Convert) {
    c.setStr("//xxx"); // 直接设置匹配match条件的数据为 "//xxx"
  }
};
```

## config 配置

修改 test 中的项目目录

```js
import { exec } from "../src/aplugin/index";
exec({
  _: [],
  /** The script name or node command */
  $0: "",
  /** All remaining options */
  input: "/Users/damo/workspace/sightp.com/SPMinaARPlugin",
  output: "/Users/damo/workspace/sightp.com/aprogram/SPMinaARPlugin"
});
```

## 执行转换

```js
yarn ca
```
