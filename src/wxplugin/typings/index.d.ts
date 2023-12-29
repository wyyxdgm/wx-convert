declare namespace convert {
  enum CompileType {
    plugin = 'plugin', miniProgram = 'miniProgram'
  }

  type ProjectDotConfig = {
    appid: string | undefined
    compileType: CompileType
    packOptions: {
      ignore: Array<{ type: string, value: string }>
    }
  }

  enum ProjectType {
    plugin = "plugin",
    app = "app"
  }

  interface IProjectManager {
    preview(arg0: { pagePath: string; searchQuery: string }): any
    getPages(): Promise<Array<string>>,
    getId(): number,
    getAllBranchByCmd(): Promise<string[]>
    checkout(branchNameOrCommitId: string, _isCommitId: boolean, autoConfig?: boolean): void
    getGulpTasks(): Promise<string[]>
    execGulpTasks(tasks: string[]): Promise<string>
  }
}
declare module "wxml" {
  function parse(wxml: string): any
  function traverse(parsed: any, visitor: Function): void
  function serialize(parsed: any): string
  const NODE_TYPES: any;
}


declare module IPlugin {
  class RouteManager {
    autoSetTitle: boolean; // 是否自动设置标题，默认 true
    onPageShow(handler: Function): void;
    getCurrentPages(): Array<any>;
    firePageShow(ctx: any, title?: string): void;
    static getInstance(): RouteManager
    beforeRoute(handler: (_args: { type: 'navigateTo' | 'redirectTo' | 'switchTab', params: any, use: 'navigateTo' | 'redirectTo' }) => {}): void
    afterRoute(handler: Function): void
  }
}