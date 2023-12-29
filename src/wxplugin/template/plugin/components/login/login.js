// plugin/components/hello-component.js
Component({
  properties: {},
  data: {
    args: {
      withCredentials: true,
      lang: "zh_CN"
    },
    version: "release"
  },
  lifetimes: {
    attached() {
      let accInfo = wx.getAccountInfoSync();
      if (accInfo.miniProgram.envVersion === "develop") {
        this.setData({ version: "develop" });
      }
    }
  },
  methods: {
    loginSuccess: function (res) {
      console.log(res.detail);
    },
    loginFail: function (res) {
      console.log(res);
    }
  }
});
