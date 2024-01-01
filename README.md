# convert

用于转换微信小程序

1. 小程序转插件
2. 小程序插件转支付宝小程序插件

## 使用

首先安装：

```sh
npm i wx-convert -g
```

之后可以使用下列指令：

### aplugin

运行：

```sh
wx-convert aplugin -h
```

输出：

```
微信插件转支付宝插件

选项：
  -h, --help     显示帮助信息                                             [布尔]
  -w, --watch    指定开发模式下的监听
  -c, --config   指定配置文件路径
  -i, --input    指定输入项目文件夹
  -o, --output   指定输出项目文件夹
  -s, --silence  简化日志输出
  -v, --verbose  输出详细日志
  -V, --version  显示版本号                                               [布尔]

示例：
  wx-convert aplugin [[-c] configpath]  使用configpath配置，默认使用项目根目录的convert.config.js
  wx-convert aplugin -i src -o dist     将src文件夹的项目，生成到dist文件夹中
```
#### 工程使用参考

- 模板工程 [convert-miniprogram-to-aliminiprogram-template](https://github.com/wyyxdgm/convert-miniprogram-to-aliminiprogram-template) 包含微信官方小程序和cli以及convert目录解析，用于总体模板工程结构参考
-[cli](https://github.com/wyyxdgm/wx-convert) cli工程，用于根据[convert](https://github.com/wyyxdgm/convert)规则转换模板工程
- [convert](https://github.com/wyyxdgm/convert) 是[convert-miniprogram-to-aliminiprogram-template](https://github.com/wyyxdgm/convert-miniprogram-to-aliminiprogram-template)内部子仓库，包含convert规则，用于迭代代码转换规则，可自定义扩展

#### convert.config.js

```js
const customFilters = require("./convert/index");
const path = require("path");

module.exports = {
  fromDir: "./",
  targetDir: "./dist/aplugin",
  templateDir: "./convert/template",
  rsync: {
    "convert/template_sync/$my.js": ["convert/template/miniprogram/$my.js", "convert/template/plugin/$my.js"],
    "convert/template_sync/enhance.js": [
      "convert/template/miniprogram/enhance.js",
      "convert/template/plugin/enhance.js",
    ],
  },
  filterDir: (p, fromDir) => {
    // 总过滤，过滤不需要处理的文件
    p = p.substr(fromDir.length + 1);
    if (
      ["node_modules", ".", "dist", "convert/", "convert.config.js", "plugin/node_modules", "plugin/.git"].find(
        (fnameStart) => p.indexOf(fnameStart) === 0
      )
    )
      return false;
    return true;
  },
  renamePath: (p, fromDir, targetDir) => {
    // 全局更新目标文件名称或路径
    p = p.replace(fromDir, targetDir);
    const parsed = path.parse(p);
    if (parsed.ext === ".wxml") {
      return p.replace(/\.wxml$/, ".axml");
    }
    if (parsed.ext === ".wxss") {
      return p.replace(/\.wxss$/, ".acss");
    }
    if (parsed.ext === ".ts") {
      return p.replace(/ts$/, "js");
    }
    if (parsed.name == "project.config" && parsed.ext == ".json") {
      return p.replace("project.config", "mini.project");
    }
    if (parsed.ext === ".wxs") {
      return p.replace(/\.wxs$/, ".sjs");
    }
    return p;
  },
  customFilters,
};
```

- customFilters 举例

  由多个过滤器组成的过滤器数组，参考如下

```js
module.exports = [
  {
    // match 可以是函数、正则、字符
    match: "project.config.json",
    parse(c, ctx) {
      // c.getStr 设置内容
      // c.setStr 获取当前内容
      // c.xxx 挂属性
      // c.serialize = ()=> 'bbb'; // 重写最终写入目标文件的内容，默认为c.getStr(),也就是原文件读取到的内容
      obj = require(c.from);
      let newObj = {
        enableAppxNg: true,
        format: 2,
        miniprogramRoot: "miniprogram",
        pluginRoot: obj.pluginRoot,
        compileType: obj.compileType,
        compileOptions: {
          component2: true,
          typescript: true,
          less: true,
        },
        uploadExclude: obj.packOptions.ignore.map((item) => item.value),
        assetsInclude: "",
        developOptions: "",
        pluginResolution: "",
        scripts: "",
      };
      c.setStr(JSON.stringify(newObj));
    },
  },
  // 此处可以继续添加其他过滤器
];
```

### wxplugin

待支持

运行：

```sh
wx-convert wxplugin -h
```
