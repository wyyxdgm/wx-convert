import path from "path";
export const addOnTypes = [];
/**
 * 总过滤，过滤不需要处理的文件
 * @param p 
 * @param fromDir 
 * @returns 
 */
export const filterDir = (p, fromDir) => {
  p = p.substr(fromDir.length + 1);
  if (["node_modules", ".", ".git", "dist", "convert/", "convert.config.js", "plugin/node_modules"].find(
    (fnameStart) => p.indexOf(fnameStart) === 0
  )) return false;
  return true;
};

/**
 * 全局更新目标文件名称或路径
 * @param p 
 * @param fromDir 
 * @param targetDir 
 * @returns 
 */
export const renamePath = (p, fromDir, targetDir) => {
  p = p.replace(fromDir, targetDir);
  const ext = path.extname(p);
  if (ext === '.wxml') {
    return p.replace(/\.wxml$/, '.axml');
  }
  // if (ext === '.wxs') { }
  return p;
};
