import filterWxml from './wxml'
import testFilter from './test'

export const customFilters: IConvert.Filter[] = [
  filterWxml,
  ...testFilter
]