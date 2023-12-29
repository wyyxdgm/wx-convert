import { RouteManager, routeManager } from "./build/convert/inner/RouteManager";
import { injectWx, setLogLevel, getLogLevel } from "./build/convert/inner/_wx";

function initApp(wx) {
  return require("./app");
}
module.exports = {
  RouteManager,
  routeManager,
  setLogLevel,
  getLogLevel,
  initApp,
  injectWx,
  sayHello() {
    console.log("Hello plugin!");
  }
};
