// import { RouteManager } from "./RouteManager"
// const routeManager = RouteManager.getInstance();
import { RouteManager } from "./RouteManager";
const routeManager = RouteManager.getInstance();
export default Behavior({
  behaviors: [],
  properties: {},
  data: {},
  pageLifetimes: {
    show: function () {
      // routeManager.firePageShow((this as any).route, this);
    }
  }
});