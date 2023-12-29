### STEP

1. template/完善（**_template 目前手动编辑_**）

   - miniprogram/app.json
   - project.config.json
   - plugin/index.js
   - plugin/plugin.json

2. inner/\_wx.ts 核对需要覆盖的接口，并适配

3. 核对 `convert.config.js` 和 `build/convert/inner/config.ts` 中的配置是否符合需求，并更新

- `convert.config.js` 为编译时变量
- `build/convert/inner/config.ts` 为编译后运行时变量，通过 app.$convert 获取
