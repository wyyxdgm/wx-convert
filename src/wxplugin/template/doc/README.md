# 视+AR 文旅插件版

## 使用方式

1. 全局`app.json`配置

- 主包引入两个依赖的插件、permission、requiredPrivateInfos

```json
{
  "plugins": {
    "xxxx": {
      "version": "1.0.0",
      "provider": "xxxxxxxxxxxxxxxxxx"
    }
  },
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于小程序位置接口的效果展示"
    }
  },
  "requiredPrivateInfos": ["getLocation", "onLocationChange", "startLocationUpdate"],
  "functionalPages": {
    "independent": true
  }
}
```

- 在分包中引入插件

```json
{
  "subPackages": [
    {
      "root": "pluginsModule",
      "pages": ["pages/index/index"],
      "plugins": {
        "myPlugin": {
          "version": "{pluginVersion}", // 开发版插件引用填：dev-{id}、体验版和正式版使用：{pluginVersion}
          "provider": "xxxxxxxxxxxxxxxxxx" // 提供插件的主小程序id
        }
      },
      "independent": true
    }
  ]
}
```

2. 分包页面初始化

- `initApp(wx)`初始化插件，推荐在具体跳转插件的分包页面首部调用调用

```js
const { initApp, sayHello } = requirePlugin("myPlugin");
const pluginApp = initApp(wx); // 使用wx初始化插件app
console.log(`pluginApp`, pluginApp); // pluginApp - 插件app实例
```

3. 页面跳转

```js
const pluginName = "plugin://xxxxxxxxxxxxxxxxxx";
wx.navigateTo({ url: `${pluginName}/path/to/page` });
```

4. 路由托管 - (可选，使用系统的`navbar`时用)

```js
const { routeManager } = requirePlugin("myPlugin");
// 默认 routeManager.autoSetTitle = true;
routeManager.onPageShow(function ({ currentPage, ctx, currentPages }) {
  console.log(`onPageShow`, currentPage, ctx, currentPages);
  // let pages = routeManager.getCurrentPages();
  // console.log(`pages`, pages);
});
routeManager.beforeRoute((args) => {
  console.log('beforeRoute', args);
  // return false
  // return的值分类： false:禁止跳转；{...object}:作为参数附加到跳转参数，具体参数可参考：https://developers.weixin.qq.com/miniprogram/dev/api/route/wx.navigateTo.html
});
routeManager.afterRoute((args) => {
  console.log('afterRoute-----', args)
  // args = {
  //   params: { url: "/path/to/page" },
  //   res: { errMsg: "navigateTo:ok", eventChannel: {… } },
  //   type: "navigateTo",
  //   url: "plugin-private://xxxxxxxxxxxxxxxxxx/path/to/page",
  //   use: "navigateTo"
  // }
```

## 导出的内容

| key          | 说明                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| RouteManager | RouteManager 类                                                             |
| routeManager | RouteManager 对象、全局唯一，可以通过 RouteManager.getInstance()拿到        |
| getLogLevel  | 设置插件 log 等级、0-6，0 关闭、数值越大、log 越详细                        |
| getLogLevel  | 获取 log 等级                                                               |
| initApp      | 初始化插件内部 app，进入插件页面之前调用                                    |
| injectWx     | 初始化注入 wx,如果提前调用了，initApp 时可以不传入 wx，建议直接调用 initApp |

- `RouteManager`类

```js
class RouteManager {
  static getInstance(): RouteManager
  beforeRoute(handler: (_args: { type: 'navigateTo' | 'redirectTo' | 'switchTab', params: any, use: 'navigateTo' | 'redirectTo' }) => {}): void
  afterRoute(handler: Function): void
}
```

## 手动改

- plugin/plugin.json 完善page，需要导出的页面

```json
  "pages": {
    "index_index": "pages/index/index"
  },
```

- template中搜索 `替换主小程序ID` 替换为主小程序ID