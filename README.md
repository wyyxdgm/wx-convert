# wx-convert

这是一个用来实现代码跨端的 CLI 框架。内部主要通过语法树解析源代码实现到目标代码的转换。框架主要用于控制主体执行流程，可配合内置规则[convert](https://github.com/wyyxdgm/convert)实现微信小程序的跨端，也可以基于此扩展自定义转换规则。

- 本框架适用于以下场景:

1. 微信小程序转微信插件
2. 微信小程序插件转支付宝小程序插件
3. 微信小程序转支付宝小程序

- <strong style="color:red">目前解析模板仅支持“微信小程序转支付宝小程序”</strong>

### 基础环境

- nodejs `v16.15.0`
- git `2.28.0`

### 安装

```sh
npm i wx-convert -D
```

### 使用步骤

1. 准备入口配置文件`convert.config.js`

```sh
# 下载配置文件`convert.config.js`到项目根目录
wget https://raw.githubusercontent.com/wyyxdgm/convert-miniprogram-to-aliminiprogram-template/master/convert.config.js
```

2. 克隆子项目[convert](https://github.com/wyyxdgm/convert)，位于微信项目根目录

```sh
# convert.config.js中的customFilters会引用这个项目
git clone https://github.com/wyyxdgm/convert.git
```

3. 转换

```sh
npx wx-convert aplugin -wv # -w监听文件变化 -v开启日志
```

### 命令帮助

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
<!--
### 微信小程序转支付宝小程序

分两种模式

- 克隆子项目到自有项目中，并配置入口文件，相对轻量
- 克隆模板项目，复杂模板项目中的文件到自有项目

#### 自有项目使用步骤

1. 克隆子项目[convert](https://github.com/wyyxdgm/convert)，位于微信项目根目录

```sh
# cd wx-project-root
git clone https://github.com/wyyxdgm/convert.git
```

2. 下载入口配置文件`convert.config.js`到根目录

```sh
wget https://raw.githubusercontent.com/wyyxdgm/convert-miniprogram-to-aliminiprogram-template/master/convert.config.js
```
-->
- convert.config.js 举例

```js
const path = require("path");
const fs = require("fs");
module.exports = {
  // 微信小程序 -> 支付宝小程序
  fromDir: "./", // 小程序代码根目录
  targetDir: "./dist/aprogram", // 生成代码根目录
  templateDir: "./convert/template", // 模板文件目录，将被同步到`targetDir/${miniprogramRoot}`下
  // miniprogramRoot: "miniprogram", // 默认同project.config.json中的miniprogramRoot
  rsync: {
    // 支持文件和目录
    // 将文件直接同步到多个目标文件
    // "miniprogram/miniprogram_npm": ["./dist/aprogram/miniprogram/miniprogram_npm"],
    // "convert/template_sync/$my.js": ["convert/template/$my.js"],
    // "convert/template_sync/enhance.js": ["convert/template/enhance.js"]
  },
  filterDir: (p, fromDir) => {
    // 文件过滤器，过滤需要被解析的文件。针对路径p,返回Boolean值，true:需要处理;false:无需处理
    p = p.substr(fromDir.length + 1);
    // whitelist - 必须处理
    if ([".gitignore"].find((fnameStart) => p.indexOf(fnameStart) === 0)) return true;
    // blacklist - 无需处理
    if (
      [
        "node_modules",
        "plugin/node_modules",
        "miniprogram/node_modules",
        ".gitmodules",
        ".git",
        "build",
        "dist",
        "packagePlugin",
        "convert/",
        "typings/",
        "convert.config.js",
        ".vscode/",
        "plugin/.git",
      ].find((fnameStart) => p.indexOf(fnameStart) === 0)
    ) {
      return false;
    }
    if ([".d.ts"].find((m) => p.endsWith(m))) return false;
    // 部分页面既有less又有wxss，在支付宝中不支持
    if (p.endsWith(".less")) {
      if (fs.existsSync(path.join(fromDir, p.replace(".less", ".wxss")))) {
        console.warn(`[删除less文件]存在同名wxss：${p}`);
        return false;
      }
    }
    // other - 处理
    return true;
  },
  renamePath: (p, fromDir, targetDir) => {
    // 全局更新目标文件名称或路径
    p = p.replace(fromDir, targetDir);
    const parsed = path.parse(p);
    if (~parsed.dir.indexOf("custom-tab-bar")) {
      // 换目录
      p = p.replace("custom-tab-bar", "customize-tab-bar");
    }
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
  customFilters: require("./convert"), // 面向所有文件的ast过滤器，主要用于端到端的代码更新适配
};
```

- customFilters 举例

  由多个过滤器组成的过滤器数组，参考如下

```js
module.exports = [
  // match 可以是函数、正则、字符
  match: (f, t, ctx) => f.endsWith("project.config.json"),
  parse(c, ctx) {
    // c.getStr 获取当前内容
    // c.setStr 设置内容
    // c.xxx 挂属性
    // c.serialize = ()=> 'bbb'; // 重写最终写入目标文件的内容，默认为c.getStr(),也就是原文件读取到的内容
    obj = require(c.from);
    // "项目配置文件，详见文档：https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html",
    // 微信：https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html
    // 转
    // 支付宝：https://opendocs.alipay.com/mini/03dbc3
    let newObj = {
      enableAppxNg: true,
      format: 2,
      miniprogramRoot: obj.miniprogramRoot,
      pluginRoot: obj.pluginRoot,
      compileType: obj.compileType,
      compileOptions: {
        component2: true,
        typescript: true,
        less: true,
        globalObjectMode: "enable",
      },
      uploadExclude: obj.packOptions.ignore.map((item) => {
        return item.value;
      }),
      assetsInclude: "",
      developOptions: {
        hotReload: true,
      },
      pluginResolution: "",
      scripts: "",
    };
    c.setStr(JSON.stringify(newObj));
  }
];
```
<!--
3. 微信项目根目录执行转换命令

```bash
wx-convert aplugin
# 开发模式
# wx-convert aplugin -wv
```

#### 模板项目使用步骤

1. 克隆[convert-miniprogram-to-aliminiprogram-template](https://github.com/wyyxdgm/convert-miniprogram-to-aliminiprogram-template) 项目。

```sh
git clone https://github.com/wyyxdgm/convert-miniprogram-to-aliminiprogram-template.git
```

2. 确保子项目已被克隆[convert](https://github.com/wyyxdgm/convert)，并处于上述项目根目录，如果不存在:

```sh
git submodule init
git submodule udpate
```

3. 拷贝`convert`目录和`convert.config.js`到自有项目中

```sh
cp convert /to/my/wx-project-root
cp convert.config.js /to/my/wx-project-root
```

4. 自由项目的根目录中执行

```
wx-convert aplugin
```
-->
### 微信小程序插件转支付宝小程序插件

- TODO：待整理文档

此模式和[微信小程序转支付宝小程序](#微信小程序转支付宝小程序)的区别在于 `convert.config.js`(尤其过滤器 `filters`)差异，其他基本复用

#### 运行

```sh
wx-convert aplugin
```

### 微信小程序转插件

- TODO 待文档补充

运行：

```sh
wx-convert wxplugin -h
```

## 脚本方式使用

```js
const { exec } = require("wx-convert");
exec({
  // input: '/path/to/project', // 此模式,将尝试解析/path/to/project/convert.config.js作为主配置入口
  // output: '/path/to/project/dist/aprogram',
  config: "./path/to/project/convert.config.js",
  watch: true,
});
```

## TODO

- 微信小程序转插件 - 文档补充
