import ProjectManager from "../lib/ProjectManager";

/**
 * convert to plugin
 * @param {string} projectPath 项目路径，路径下配置有 convert.config.js
 * @returns convert * to wxplugin
 */
export const convert = async ({ projectPath, convertPath, option }:
  { projectPath: string, convertPath: string, option?: { watch?: boolean, logFile?: string | null, silence?: boolean } }) => {
  const projectManager = new ProjectManager({ projectPath, convertPath, option });
  await projectManager.getReadykForPlugin()
  // projectManager.logStatus();
  await projectManager.walkPlugin();
  return Promise.resolve();
}
