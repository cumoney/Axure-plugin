# Axure Plugin

一个用于同步 Axure 预览原型到远程目录并生成分享链接的 Chrome 扩展。

## 功能

- 在 Axure 预览页右上角工具栏插入上传入口
- 上传 Axure 导出的原始文件到远程服务器
- 生成可直接访问的分享链接
- 支持项目管理、项目删除、分享链接复制
- 支持上传并发设置

## 目录结构

- `manifest.json`：Chrome 扩展配置
- `content/`：注入 Axure 预览页的脚本
- `popup/`：插件 UI
- `background/`：后台脚本
- `server/`：示例上传服务

## 安装扩展

1. 打开 Chrome
2. 进入 `chrome://extensions`
3. 打开右上角“开发者模式”
4. 点击“加载已解压的扩展程序”
5. 选择当前项目目录

加载成功后，打开 Axure 导出的 HTML 预览页，右上角工具栏会出现上传入口。

## 启动服务端

先进入服务端目录：

```bash
cd server
```

安装依赖：

```bash
npm install
```

启动服务：

```bash
node server.js
```

默认配置在 [server/server.js](/Users/cone/Documents/宏智/Ai/axure/chajian/server/server.js)：

- 端口：`2580`
- 上传目录：`D:\\nginx-1.16.1\\html\\eis`
- Token：`112233`

你可以按自己的环境修改：

- `const port`
- `const UPLOAD_BASE_DIR`
- `/api/upload` 和 `/api/delete` 里的 token 校验

## 使用方式

1. 打开 Axure 导出的预览页
2. 点击右上角工具栏里的上传图标
3. 在弹窗里配置：
   - 服务器地址，例如 `http://127.0.0.1:2580`
   - 访问令牌
   - 上传并发
4. 新建或选择一个项目
5. 点击“同步并生成链接”

同步完成后，可以直接复制分享链接。

## 开发说明

修改前端文件后：

- 重新加载 Chrome 扩展
- 刷新 Axure 预览页

常改文件：

- [content/content.js](/Users/cone/Documents/宏智/Ai/axure/chajian/content/content.js)
- [popup/popup.html](/Users/cone/Documents/宏智/Ai/axure/chajian/popup/popup.html)
- [popup/popup.css](/Users/cone/Documents/宏智/Ai/axure/chajian/popup/popup.css)
- [popup/popup.js](/Users/cone/Documents/宏智/Ai/axure/chajian/popup/popup.js)

## 注意事项

- 当前扩展主要面向 Axure 导出的 HTML 预览页
- 如果 GitHub 推送失败，先确认终端代理是否可用
- 如果服务端部署在局域网机器上，浏览器需要能访问对应地址和端口
