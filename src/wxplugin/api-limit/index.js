const limit = require("./api-limit");
const override = {
  _wxlist: {},
  whitelist: {
    "wx.redirectTo": false,
    "wx.switchTab": false,
    "wx.navigateTo": false,
    "wx.getUserProfile": true,
    "wx.isVKSupport": true
  }
};

let combinedObject = Object.assign({}, limit, override);

Object.keys(combinedObject).forEach((k) => {
  if ("object" === typeof combinedObject[k])
    combinedObject[k] = Object.assign({}, limit[k], override[k]);
});
// console.log(`wx_api config`, combinedObject);
module.exports = combinedObject;
