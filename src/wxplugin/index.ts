import { assignWith } from 'lodash'
import path from 'node:path'
import yargs from 'yargs'
import { convert as convertPlugin } from './plugin/convert-plugin'
export const CONVET_TYPE = {
  plugin: 'plugin',
}

export const convert = async (type: any = CONVET_TYPE.plugin, options: any): Promise<any> => {
  options = assignWith({ projectPath: path.join(__dirname, '../../') }, options, (objectValue: any, sourceValue: any, _key?: string, _object?: {}, _source?: {}) => {
    if (sourceValue === undefined) return objectValue
  })
  switch (type) {
    case CONVET_TYPE.plugin:
      return await convertPlugin(options)
    default:
      return Promise.reject(`convert error：不支持类型 ${type} `)
  }
}

export class Cache {
  private static db: any = {}
  static provider(provider: any) {
    if (!Cache.db[provider]) Cache.db[provider] = {};
    return Cache.db[provider];
  }
  static usage(usage: any) {
    if (!Cache.db[usage]) throw new Error(`${usage}暂无提供对象`);
    return Cache.db[usage];
  }
}

export function exec(argv: yargs.Arguments) {
  return convertPlugin({
    projectPath: argv.input,
    convertPath: argv.output,
    option: {
      watch: argv.watch,
      logFile: argv.log,
      silence: argv.silence,
    }
  })
}

export default {
  convert,
  exec
}