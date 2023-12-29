import { routeManager } from "./RouteManager";
// import RouteBehavior from "./RouteBehavior";
// RouteBehavior;
const CTX: any = {
  appWx: null,
  logLevel: 0,
}
export function setLogLevel(level: number) {
  CTX.logLevel = level;
}
export function getLogLevel() {
  return CTX.logLevel;
}

export function getUpdateManager() {
  return new class UpdateManager {
    /**
     * 强制小程序重启并使用新版本。在小程序新版本下载完成后（即收到 onUpdateReady 回调）调用。
     */
    applyUpdate() { }
    /**
     * 监听向微信后台请求检查更新结果事件。微信在小程序每次启动（包括热启动）时自动检查更新，不需由开发者主动触发。
     */
    onCheckForUpdate() { }
    /**
     * 监听小程序有版本更新事件。客户端主动触发下载（无需开发者触发），下载成功后回调
     */
    onUpdateFailed() { }
    /**
     * 监听小程序更新失败事件。小程序有新版本，客户端主动触发下载（无需开发者触发），下载失败（可能是网络原因等）后回调
     */
    onUpdateReady() { }
  }
}
/**
 * getLaunchOptionsSync
 * https://developers.weixin.qq.com/miniprogram/dev/api/base/app/life-cycle/wx.getLaunchOptionsSync.html
 * @returns 
 */
export function getLaunchOptionsSync() {
  return { scene: 1037 }
}

export function setInnerAudioOption(args?: any) { CTX.logLevel > 5 && console.log('todo support setInnerAudioOption', args) }
export function reportPerformance(args?: any) {
  // CTX.logLevel>5 && console.log('todo support reportPerformance', args)
}
export function getStorageInfoSync(args?: any) { CTX.logLevel > 5 && console.log('todo support getStorageInfoSync', args) }

/**
 * getMenuButtonBoundingClientRect
 * https://developers.weixin.qq.com/miniprogram/dev/api/ui/menu/wx.getMenuButtonBoundingClientRect.html
 * @returns 
 */
export function getMenuButtonBoundingClientRect() {
  const re = CTX.appWx?.getMenuButtonBoundingClientRect()
  CTX.logLevel > 5 && console.log('proxy-- appWx.getMenuButtonBoundingClientRect', re);
  return re;
}

export function getUserProfile(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- getUserProfile -> wx.getUserInfo', args);
  return wx.getUserInfo(args);
}

export function navigateToMiniProgram(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.navigateToMiniProgram', args);
  return CTX.appWx?.navigateToMiniProgram(args)
}

export function requestPayment(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.requestPayment', args);
  return CTX.appWx?.requestPayment(args);
}

export function authorize(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.authorize', args);
  return CTX.appWx?.authorize(args);
}

export function nextTick(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.nextTick', args);
  return CTX.appWx?.nextTick(args);
}

export function openCard(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.openCard', args);
  return CTX.appWx?.openCard(args);
}

export function addCard(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.addCard', args);
  return CTX.appWx?.addCard(args);
}

export function canIUse(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.canIUse', args);
  return CTX.appWx?.canIUse(args);
}

export function chooseMessageFile(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.chooseMessageFile', args);
  return CTX.appWx?.chooseMessageFile(args);
}

export function getFileSystemManager(args?: any) {
  CTX.logLevel > 5 && console.log('proxy-- appWx.getFileSystemManager', args);
  return CTX.appWx?.getFileSystemManager(args);
}

const env = {};

const acc = wx.getAccountInfoSync();
const pre = `plugin-private://${acc.plugin.appId}`;

export function navigateTo(args?: any) {
  let { url, success, ...extra } = args;
  if (url.charAt(0) === '/') url = pre + url;
  CTX.logLevel > 4 && console.log(`proxy navigateTo:`, { url })
  CTX.logLevel > 5 && console.log('original:', args);
  const canNav = routeManager.before('navigateTo', null, { params: args, url, use: 'navigateTo' });
  if (false === canNav) {
    CTX.logLevel > 3 && console.log('proxy navigateTo refused by miniprogram')
    return;
  }
  if ('object' === typeof canNav) Object.assign(extra, canNav)
  return wx.navigateTo({
    ...extra, url, success(res: any) {
      success?.(res)
      routeManager.after('navigateTo', null, { res, params: args, url, use: 'navigateTo' });
    }
  });
}

export function redirectTo(args?: any) {
  let { url, success, ...extra } = args;
  if (url.charAt(0) === '/') url = pre + url;
  CTX.logLevel > 4 && console.log(`proxy redirectTo:`, { url })
  CTX.logLevel > 5 && console.log('original:', args);
  const canNav = routeManager.before('redirectTo', null, { params: args, url, use: 'redirectTo' });
  if (false === canNav) {
    CTX.logLevel > 3 && console.log('proxy redirectTo refused by miniprogram')
    return;
  }
  if ('object' === typeof canNav) Object.assign(extra, canNav)
  return wx.redirectTo({
    ...extra, url, success(res: any) {
      success?.(res)
      routeManager.after('redirectTo', null, { res, params: args, url, use: 'redirectTo' });
    }
  });
}

export function switchTab(args?: any) {
  let { url, success, ...extra } = args;
  if (url.charAt(0) === '/') url = pre + url;
  CTX.logLevel > 4 && console.log(`proxy switchTab:`, { url })
  CTX.logLevel > 5 && console.log('original:', args);
  const canNav = routeManager.before('switchTab', null, { params: args, url, use: 'redirectTo' });
  if (false === canNav) {
    CTX.logLevel > 3 && console.log('proxy switchTab refused by miniprogram')
    return;
  }
  if ('object' === typeof canNav) Object.assign(extra, canNav)
  return wx.redirectTo({
    ...extra, url, success(res: any) {
      success?.(res)
      routeManager.after('switchTab', null, { res, params: args, url, use: 'redirectTo' });
    }
  });
}

export function injectWx(wx: any) {
  CTX.appWx = wx;
  CTX.logLevel > 5 && console.log(`injectWx`, CTX.appWx);
}

export function getWx() {
  return CTX.appWx;
}

export default {
  routeManager,
  navigateTo,
  redirectTo,
  switchTab,
  injectWx,
  getWx,
  getUpdateManager,
  getLaunchOptionsSync,
  setInnerAudioOption,
  reportPerformance,
  getStorageInfoSync,
  getMenuButtonBoundingClientRect,
  getUserProfile,
  navigateToMiniProgram,
  requestPayment,
  authorize,
  nextTick,
  openCard,
  addCard,
  canIUse,
  chooseMessageFile,
  getFileSystemManager,
  env,
};
