# vite-plugin-eslint

`Vite`的`ESLint`插件，支持`Vite v2~6`和`ESLint v8~9`，需要`nodejs`版本为`^18.18.0 || ^20.9.0 || >=21.1.0`。

## 1. 安装

```
npm install -D @vpsvl/vite-plugin-eslint
```

该插件不会安装`eslint`，需要自己安装。

```
// eslint9, 当前最新大版本
npm install -D eslint
// eslint8
npm install -D eslint@^8
```

## 2. 使用

```
// vite.config.ts
import { defineConfig } from 'vite';
import eslint from '@vpsvl/vite-plugin-eslint';

export default defineConfig({
  plugins: [
    eslint(),
  ],
});
```

## 3. 配置项

### exclude

排除的文件，优先级更高。

* 类型: `String | String[]`
* 默认值: `[/node_modules/, /virtual:/]`

### include

包含的文件。

* 类型: `String | String[]`
* 默认值: `/src\/.*\.(vue|jsx?|tsx?)$/`

### fix

是否自动修复可修复的代码。

* 类型: `Boolean`
* 默认值: `false`

### formatter

自定义错误格式化程序、内置格式化程序的名称或自定义格式化程序的路径。

* 类型: `Function<String> | Function<Promise<String>> | String`
* 默认值: `stylish`

### throwOnError

当`eslint`报告错误时，是否将错误抛出并退出进程。

* 类型: `Boolean`
* 默认值: `true`

### throwOnWarning

当`eslint`报告警告时，是否将警告抛出并退出进程。

* 类型: `Boolean`
* 默认值: `false`
