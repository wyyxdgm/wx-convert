const pluginName = "plugin://替换主小程序ID";
const { initApp, sayHello, routeManager } = requirePlugin("myPlugin");
const pluginApp = initApp(wx);
console.log(`pluginApp`, pluginApp);
sayHello();

Page({
  data: {
    items: [
      { key: "index_index", url: `${pluginName}/index_index` },
      {
        key: "personal_personal",
        url: `${pluginName}/personal_personal`
      }
      // 其他页面
    ]
  },
  onLoad({ navTo = "" }) {
    if (navTo) {
      const navObject = this.data.items.find((it) => it.key === navTo);
      if (navObject?.url) {
        wx.showToast({ title: `${navObject.url.substr(-14)}` });
        setTimeout(() => {
          wx.navigateTo({ url: navObject.url });
        }, 3000);
      }
    }
    // 默认 routeManager.autoSetTitle = true;
    routeManager.onPageShow(function ({ currentPage, currentPages, title }) {
      console.log(`onPageShow`, currentPage, currentPages, title);
      // let pages = routeManager.getCurrentPages();
      // console.log(`pages`, pages);
    });

    routeManager.beforeRoute((args) => {
      console.log("beforeRoute", args);
      // return false // 禁止跳转
    });
    routeManager.afterRoute((args) => {
      console.log("afterRoute-----", args);
      // args = {
      //   params: { url: "/packageMain/homepage/homepage" },
      //   res: { errMsg: "navigateTo:ok", eventChannel: {… } },
      //   type: "navigateTo",
      //   url: "plugin-private://wx7710a29f1fb62aa7/packageMain/homepage/homepage",
      //   use: "navigateTo"
      // }
    });
  }
});
