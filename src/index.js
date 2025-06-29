import {ESLint} from 'eslint';
import {relative, resolve} from 'path';

/**
 * 创建一个路径过滤器函数
 * @param {RegExp|string|(RegExp|string)[]|null|undefined} include - 要包含的路径模式
 * @param {RegExp|string|(RegExp|string)[]|null|undefined} exclude - 要排除的路径模式
 * @returns {(id: string) => boolean} - 返回一个过滤函数，用于判断路径是否匹配
 */
function createFilter(include, exclude) {
  // 编译所有模式为正则表达式
  const compiledInclude = handlePath(include)
  const compiledExclude = handlePath(exclude);

  /**
   * 过滤函数，判断路径是否匹配
   * @param {string} id - 要检查的路径
   * @returns {boolean} - 如果路径匹配include且不匹配exclude，则返回true
   */
  return function filter(id) {
    // 如果有排除模式且匹配任何排除模式，则返回false
    if (compiledExclude.some(regex => regex.test(id))) {
      return false;
    }

    // 如果没有包含模式，则默认匹配
    if (compiledInclude.length === 0) {
      return true;
    }

    // 否则，检查是否匹配任何包含模式
    return compiledInclude.some(regex => regex.test(id));
  };
}

/**
 * 将模式编译为正则表达式
 * @param {RegExp|string} pattern - 要编译的模式
 * @returns {RegExp} - 编译后的正则表达式
 */
function compilePattern(pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  // 将字符串模式转换为正则表达式
  // 处理glob模式，例如：*.js 转换为 /^.*\.js$/
  const escaped = pattern
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // 转义特殊字符
    .replace(/\*\*/g, '.*') // 处理 ** 通配符
    .replace(/\*/g, '[^/]*'); // 处理 * 通配符

  return new RegExp(`^${escaped}$`);
}

/**
 * 格式化路径为数组并编译为正则表达式
 * @param {RegExp|string|(RegExp|string)[]|null|undefined} path - 要处理的路径
 * @returns {RegExp[]}
 */
function handlePath(path) {
  if (path === undefined || path === null) {
    return [];
  }
  const pathArr = Array.isArray(path) ? path : [path];
  return pathArr.map(pattern => compilePattern(pattern));
}

/**
 * Vite 插件
 * @param {Object} options - 配置选项
 * @param {string|string[]} [options.include] - 包含的文件路径模式
 * @param {string|string[]} [options.exclude] - 排除的文件路径模式
 * @param {boolean} [options.fix] - 是否自动修复
 * @param {boolean} [options.throwOnError] - 发现错误时是否抛出异常
 * @param {boolean} [options.throwOnWarning] - 发现警告时是否抛出异常
 * @param {string|function} [options.formatter] - 格式化器
 * @param {string} [options.configFile] - ESLint 配置文件路径
 */
export default function vitePluginEslint(options = {}) {
  const defaultOptions = {
    include: /src\/.*\.(vue|jsx?|tsx?)$/,
    exclude: [/node_modules/, /virtual:/],
    fix: false,
    throwOnError: true,
    throwOnWarning: false,
    formatter: 'stylish',
  };

  const pluginOptions = {...defaultOptions, ...options};
  const filter = createFilter(pluginOptions.include, pluginOptions.exclude);

  let eslint;

  return {
    name: 'vite-plugin-eslint',
    enforce: 'pre',

    async configResolved() {
      // 初始化 ESLint 实例
      const eslintOptions = {
        fix: pluginOptions.fix,
      };

      // 如果指定了配置文件，则使用该配置
      if (pluginOptions.configFile) {
        eslintOptions.overrideConfigFile = resolve(process.cwd(), pluginOptions.configFile);
      }

      try {
        eslint = new ESLint(eslintOptions);
      } catch (error) {
        console.error('Failed to initialize ESLint:', error);
        throw error;
      }
    },

    async transform(code, id) {
      // 过滤文件
      if (!filter(id)) {
        return null;
      }

      try {
        // 检查文件是否被忽略
        const isIgnored = await eslint.isPathIgnored(id);
        if (isIgnored) {
          return null;
        }

        // 执行 ESLint 检查
        const results = await eslint.lintText(code, {filePath: id});

        // 应用自动修复
        if (pluginOptions.fix && results.length > 0) {
          await ESLint.outputFixes(results);
        }

        // 处理检查结果
        if (results.length > 0) {
          const result = results[0];

          // 格式化错误信息
          const formatter = await eslint.loadFormatter(pluginOptions.formatter);
          const output = formatter.format(results);

          // 打印错误信息
          if (output) {
            console.log(output);
          }

          // 处理错误和警告
          const hasErrors = result.errorCount > 0;
          const hasWarnings = result.warningCount > 0;

          if ((hasErrors && pluginOptions.throwOnError) || (hasWarnings && pluginOptions.throwOnWarning)) {
            const relativePath = relative(process.cwd(), id);
            const errors = hasErrors ? `${result.errorCount} error${result.errorCount > 1 ? 's' : ''}` : '';
            const warnings = hasWarnings ? `${result.warningCount} warning${result.warningCount > 1 ? 's' : ''}` : '';
            const messageParts = [];

            if (errors) {
              messageParts.push(errors);
            }
            if (warnings) {
              messageParts.push(warnings);
            }

            throw new Error(`ESLint validation failed for ${relativePath}: ${messageParts.join(' and ')}`);
          }
        }
      } catch (error) {
        // 处理非 ESLint 错误（如配置错误）
        if (!error.message.includes('ESLint validation failed')) {
          console.error(`Error running ESLint on ${id}:`, error);
          if (pluginOptions.throwOnError) {
            throw new Error(`ESLint plugin error: ${error.message}`);
          }
        } else {
          throw error;
        }
      }

      return null;
    },
  };
}