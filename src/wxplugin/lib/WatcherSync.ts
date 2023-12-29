import fsExtra from "fs-extra";
import path from "node:path";
import ProjectManager from "./ProjectManager";
// const { promiseify } = require('../util');
// const ci = require('miniprogram-ci');
// const readFile = promiseify(fs.readFile);
const watchSync = require("watch-sync");
// const readdir = promiseify(fs.readdir);

// const writeFile = promiseify(fs.writeFile);
// const exists = promiseify(fs.exists);
export class WatcherSync {
  listeners = [];
  includes: any = {};
  watch: boolean = true;
  constructor(watch?: boolean) {
    this.watch = watch ?? true
  }
  add(s: string, d: string, o: any) {
    if (this.watch)
      this.listeners.push(watchSync(s, d, o) as never)
    else fsExtra.copySync(s, d, o);
  }
  close() {
    this.listeners.forEach((w: any) => w.close());
  }
  include(arr: string[], dir: string, p: ProjectManager) {
    arr.forEach(s => {
      if (this.includes[s]) return;
      let d = path.join(dir, p.relativeProjectPath(s));
      if (this.watch) {
        this.includes[s] = watchSync(s, d)
      } else {
        fsExtra.copySync(s, d)
        this.includes[s] = true
      }
    });
  }
  exclude(arr: string[]) {
    arr.forEach(s => {
      this.includes[s]?.close();
    });
  }
}