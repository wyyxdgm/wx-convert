export class BaseEvent {

  $events = new Map<string, Function[]>();
  constructor() { }

  /**
   * 触发某事件
   * @param {*} event string
   */
  fire(event: string, context = null, data: any) {
    if (!event) return;
    let fns = this.$events.get(event);
    fns?.map(fn => fn.call(context, data));
  }

  /**
   * 绑定某事件
   * @param {*} event
   */
  on(event: string, handler: Function) {
    let fns = this.$events.get(event);
    fns ? fns.push(handler) : this.$events.set(event, [handler])
  }

  /**
   * 解绑某事件的处理函数
   * @param {*} event
   */
  off(event: string, handler?: Function) {
    let fns: any = this.$events.get(event);
    if (!fns) return;
    if (handler) {
      let idx = fns.indexOf(handler) || -1;
      if (idx > -1) fns.splice(idx, 1);
    } else {
      fns.splice(0, fns.length);
    }
  }
  clear() {
    this.$events.clear()
  }
}

export class OneEvent {

  $events = new Map<string, Function>();
  constructor() { }

  /**
   * 触发某事件
   * @param {*} event string
   */
  fire(event: string, context = null, data?: any) {
    if (!event) return;
    let fn = this.$events.get(event);
    return fn?.call(context, data);
  }

  /**
   * 绑定某事件
   * @param {*} event
   */
  on(event: string, handler: Function) {
    this.$events.set(event, handler)
  }

  /**
   * 解绑某事件的处理函数
   * @param {*} event
   */
  off(event: string) {
    this.$events.delete(event)
  }
  clear() {
    this.$events.clear()
  }
}

export class RouteManager extends OneEvent implements IPlugin.RouteManager {
  static ins: null | RouteManager = null;
  static getInstance(): RouteManager {
    if (!RouteManager.ins) RouteManager.ins = new RouteManager();
    return RouteManager.ins
  }
  preState: null | any[] = null;
  autoSetTitle: boolean = true;
  constructor() {
    super();
    this.bindAutoSetTitle();
  }
  bindAutoSetTitle() {
    this.on('page:_show', ({ title }: any) => {
      if (!this.autoSetTitle) return;
      // 这里如果遇到组合式的title需要再处理，目前按多数情况处理
      wx.setNavigationBarTitle({ title });
    });
  }
  onPageShow(handler: Function) {
    this.on('page:show', handler);
  }
  firePageShow(ctx: any, title?: string) {
    // let curState = this.getCurrentPages().map(p => p?.route);
    // if (!this.preState) {
    //   this.preState = curState;
    // } else { }
    if (this.autoSetTitle) this.fire('page:_show', ctx, { ctx: ctx, currentPage: this.getCurrentPages().slice(-1)[0], title, currentPages: this.getCurrentPages() })
    this.fire('page:show', ctx, { ctx: ctx, currentPage: this.getCurrentPages().slice(-1)[0], title, currentPages: this.getCurrentPages() })
  }
  getCurrentPages() {
    return getCurrentPages();
  }
  beforeRoute(handler: (_args: { type: 'navigateTo' | 'redirectTo' | 'switchTab', params: any, use: 'navigateTo' | 'redirectTo' }) => {}): void {
    return super.on('before:route', handler)
  }
  afterRoute(handler: (_args: { type: 'navigateTo' | 'redirectTo' | 'switchTab', params: any, use: 'navigateTo' | 'redirectTo' }) => {}) {
    return super.on('after:route', handler)
  }
  before(event: 'navigateTo' | 'redirectTo' | 'switchTab', context: null | undefined, data: any): boolean | undefined {
    return super.fire('before:route', context, { type: event, ...data });
  }
  after(event: 'navigateTo' | 'redirectTo' | 'switchTab', context: null | undefined, data: any): void {
    return super.fire('after:route', context, { type: event, ...data });
  }
}

export const routeManager = RouteManager.getInstance();