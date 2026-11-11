# 从 GitHub 完整安装和部署 PocketSense

仓库保存了应用源码、图标、合成示例生成代码、测试图片、依赖锁文件、构建脚本和 GitHub Actions 配置。应用不依赖原开发电脑上的文件，也不需要后端、数据库、API 密钥或 `.env` 文件。

## 1. 在新电脑上获取完整代码

适用于 Windows、macOS 和 Linux。准备 Git、Node.js 22.12 或更新版本及随 Node 安装的 npm。支持 `.nvmrc` 的版本管理器可使用仓库中的 Node 22 配置。

仓库目前为私有仓库，请先使用有仓库权限的 GitHub 账号登录 GitHub Desktop 或 Git 的认证工具。每位协作者都需要仓库访问权限。

在 [PR #1](https://github.com/Neutralizer-0618/PocketSense/pull/1) 合并前，完整应用位于 `codex/pocketsense-v1` 分支：

```sh
git clone --branch codex/pocketsense-v1 https://github.com/Neutralizer-0618/PocketSense.git
cd PocketSense
npm ci
npm run dev
```

打开终端打印的地址，通常是 `http://127.0.0.1:5173/PocketSense/`。首次安装依赖需要连接 npm 包仓库。

PR 合并到 `main` 后，直接使用以下命令即可获得完整应用：

```sh
git clone https://github.com/Neutralizer-0618/PocketSense.git
cd PocketSense
npm ci
npm run dev
```

使用 GitHub Desktop 时，克隆后在 **Current Branch** 中选择 `codex/pocketsense-v1`；合并后也可选择 `main`。然后在该仓库目录执行相同的 npm 命令。

## 2. 构建并验证生产版

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

打开 `http://127.0.0.1:4173/PocketSense/`。生产构建的全部网页文件位于 `dist/`，包括应用 JavaScript、CSS、图标、PWA manifest 和生成的 service worker。

运行浏览器验收测试：

```sh
npx playwright install chromium
npm run test:e2e
```

Linux 环境如缺少浏览器系统依赖，可按 Playwright 提示执行 `npx playwright install --with-deps chromium`，这一步可能需要系统安装权限。

`node_modules/` 是由锁文件安装的机器相关依赖，`dist/` 是构建产物。它们由上述命令在目标电脑上生成；迁移时以 GitHub 中的源码和 `package-lock.json` 为准。

## 3. 通过 GitHub Pages 部署在线网站

1. 将 PR #1 合并到 `main`，让仓库默认分支包含完整应用。
2. 仓库管理员进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 确认仓库允许 Actions 运行。私有仓库的 Pages 可用性取决于仓库所有者的 GitHub 套餐；若设置页提示不支持，需要由所有者选择合适的托管方案。
4. `main` 更新时会执行 **Deploy GitHub Pages**。启用 Pages 后也可在 **Actions → Deploy GitHub Pages → Run workflow** 手动运行，分支选择 `main`。
5. 工作流成功后，打开 `https://Neutralizer-0618.github.io/PocketSense/`。

CI 同时配置了 Linux 的完整检查与浏览器验收，以及 Windows、macOS 的独立安装、构建和单元测试。配置存在不代表一次云端运行已经成功，请以 Actions 的实际结果为准。

## 4. 部署到其他静态服务器

执行 `npm run build` 后，将 `dist/` 中的内容完整放到服务器网站根目录下的 **`PocketSense/` 子目录**。例如 `dist/index.html` 对应线上 `/PocketSense/index.html`，`dist/assets/` 对应 `/PocketSense/assets/`。

当前 Vite 资源路径和 service worker 缓存路径统一为 `/PocketSense/`。直接放到域名根目录会造成资源路径不匹配。需要其他路径时，应一起调整 `vite.config.ts` 与 `scripts/build-sw.mjs` 的 base，再重新构建并验证离线缓存。

使用 HTTPS 托管。`npm run preview` 用于本机检查生产构建；正式部署由静态网站服务器或托管平台提供服务。直接双击 `index.html` 不能完整验证 PWA。

## 5. 离线与跨机器数据

首次在线打开生产网站，等待页头显示 **Offline ready**，随后可断网重新打开，并选择新的本地照片进行分析。

自定义参考色卡只保存在当前浏览器。换电脑时，在旧电脑的 pH Sense 中 **Export** 色卡 JSON，再在新电脑 **Import**。测量记录需要主动导出；照片不会随 GitHub 同步。浏览器清理站点数据后，需要重新缓存应用并重新导入需要保留的色卡。

## 已完成的可复现性检查

2026-11-11：从已提交的 Git 文件创建独立的全新克隆，不复制现有 `node_modules/` 或 `dist/`，使用新的 npm 缓存执行 `npm ci`、生产构建和全部 64 项单元测试，均通过。该检查在 macOS ARM64 执行；其他系统的云端结果见 Actions。
