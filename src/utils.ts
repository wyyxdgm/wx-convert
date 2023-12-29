import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'ncp';
import { readFileSync } from 'fs';
import * as jsBeautify from 'js-beautify';

export function formatCode(code: string, type: IConvert.ContentType, p?: string, indent = 2): string {
  // let xml = ['axml'];
  // let json = ['json'];
  // let css = ['less', 'scss'];
  // let js = ['js', 'ts', 'wxs', 'sjs'];
  switch (type) {
    case 'axml':
      code = jsBeautify.html(code, { indent_size: indent });
      break;
    case 'json':
      try {
        code = JSON.stringify(JSON.parse(code), null, '  ');
      } catch (error) {
        console.warn('非法json', p ?? '\n' + code);
      }
      break;
    case 'less':
    case 'scss':
      code = jsBeautify.css(code, { indent_size: indent });
      break;
    case 'js':
    case 'ts':
    case 'wxs':
    case 'sjs':
      code = jsBeautify.js(code, { indent_size: indent });
      break;
    default:
      break;
  }
  return code;
}

export function showError(msg: string) {
  console.error('\x1b[31m%s', `Error: ${msg}`);
  process.exit(0);
}

export function showWarn(msg: string) {
  console.error('\x1b[33m%s', `Warn: ${msg}`);
}

export function showInfo(msg: string) {
  console.info('\x1b[32m%s\x1b[0m', msg);
}

export function toSnakeCase(str: string) {
  const upperChars = str.match(/([A-Z])/g);
  if (!upperChars) {
    return str;
  }

  for (var i = 0, n = upperChars.length; i < n; i += 1) {
    str = str.replace(new RegExp(upperChars[i]), '-' + upperChars[i].toLowerCase());
  }

  if (str.slice(0, 1) === '-') {
    str = str.slice(1);
  }

  return str;
}

export function getChildrenFromFolder(dp: string, filter: (fp: string) => boolean, depth: number = 1): { files: string[], ignored: string[] } {
  const res: string[] = [];
  const ignored = [];

  function walk(dirPath: string, currentDepth: number) {
    if (currentDepth <= 0) {
      return;
    }

    const children = fs.readdirSync(dirPath);
    for (const child of children) {
      let p = path.join(dirPath, child);
      if (fs.statSync(p).isDirectory()) {
        if (filter(p)) {
          walk(p, currentDepth - 1);
        } else {
          ignored.push(p);
        }
        continue;
      }

      const fp = path.resolve(dirPath, child);
      if (filter(fp)) {
        res.push(fp);
      } else {
        ignored.push(fp);
      }
    }
  }

  walk(dp, depth);

  return { files: res, ignored };
}

export async function copyFile(from: string, to: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.copyFile(from, to, err => {
      if (err) {
        return reject(err);
      }

      resolve(to);
    })
  });
};

export async function readFileJson(filePath: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'utf8' }, (err, content: string) => {
      if (err) {
        reject(err)
      } else {
        resolve(JSON.parse(content));
      }
    })
  })
};

export async function readFileBuffer(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, content: Buffer) => {
      if (err) {
        reject(err)
      } else {
        resolve(content);
      }
    })
  })
};

export async function writeFile(filePath: string, buffer: Buffer | string): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = filePath.replace(path.basename(filePath), '');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFile(filePath, buffer, typeof buffer === 'string' ? { encoding: 'utf8' } : {}, err => {
      if (err) {
        reject(err);
      } else {
        resolve(filePath);
      }
    })
  });
};

export async function removeFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

cp.limit = 16;
cp.stopOnErr = true;
export async function copyDir(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cp(src, dest, err => {
      if (err) {
        console.error(err);
        return reject(err);
      }

      resolve();
    });
  });
}



export const readFileStrSync = (p: string) => {
  return readFileSync(p, { encoding: 'utf-8' })
}


export function rersolvePathPlaceHolder(deps: string, f: string): string {
  const pd = path.parse(f);
  if (deps.startsWith('.')) deps = path.resolve(pd.dir, deps);
  return deps.replace('$name', pd.name).replace('$base', pd.base).replace('$ext', pd.ext).replace('$dir', pd.dir)
}

export function assign(target, source) {
  for (let key in source) {
    if (source[key] === null) delete source[key];
  }
  return target = Object.assign(target, source)
}
let ROOT = process.cwd();
export function setRoot(r) {
  ROOT = r;
}
export function resolveProjectPath(p, root?) {
  return path.resolve(root || ROOT, p)
}