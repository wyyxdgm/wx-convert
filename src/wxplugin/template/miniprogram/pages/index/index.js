const IS_DEVTOOLS = wx.getSystemInfoSync().platform === 'devtools';
const pluginName = "plugin://myPlugin";
Page({
  data: {},
  onLoad({ navTo = '' }) {
    //不从小程序的页面进入，navigateBack失效
    wx.showLoading();
    setTimeout(() => {
      wx.hideLoading();
      wx.navigateTo({
        url: '../../pluginsModule/pages/index/index?navTo=' + navTo
      })
    }, 1000)
    this.checkLocationAvalible('请打开GPS，AR体验效果更佳哦~');
  },
  checkLocationAvalible(msg) {
    if (IS_DEVTOOLS) return Promise.resolve();
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success(res) {
          console.log(res.authSetting)
          resolve();
          if (!res.authSetting["scope.userLocation"]) {
            wx.showToast({ title: msg, icon: 'none' });
            reject();
            return;
          }
        }
      })
    })
  },
  goHomepage() {
    wx.navigateTo({
      url: `${pluginName}/hello-page`,
    })
  }
})
