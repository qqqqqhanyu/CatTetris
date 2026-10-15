# 猫咪方块 · CatTetris

用七种猫咪造型玩俄罗斯方块，支持 iPhone Safari 和电脑浏览器。

**游戏网址：[qqqqqhanyu.github.io/CatTetris](https://qqqqqhanyu.github.io/CatTetris/)**

## 在 iPhone 上玩

1. 用 Safari 打开上面的游戏网址，在顶部选择「坚果」或「元宵」皮肤，点「开始游戏」。
2. 用底部按钮左右移动、双向旋转、加速或直接落下；长按移动和加速按钮可连续操作。
3. 点击右侧「暂存一只」交换方块，棋盘下方可以暂停或重新开始。
4. 可在 Safari 的分享菜单中选择「添加到主屏幕」，从桌面图标打开。

右上角「♪」开启音效，开启时会试听一声猫叫。每次消行播放选定的 B 版短促猫叫（约 0.534 秒），一次消除多行也只叫一声。关闭音效会立即停止声音，开关状态会在刷新后保留。

建议竖屏操作。切换应用或锁屏后会自动暂停，返回时点「继续游戏」。随时切换皮肤会同时更新棋盘、下一只和暂存的小猫，保留当前棋局。网站目前没有 Service Worker 离线缓存，首次打开和刷新需要网络。最高分和皮肤选择保存在当前设备的浏览器中，不在不同设备间同步。

## 电脑键盘

| 按键 | 操作 |
| --- | --- |
| Enter | 开始 / 继续 |
| ← / → | 左右移动 |
| ↑ / X | 顺时针旋转 |
| Z | 逆时针旋转 |
| ↓ | 加速下落 |
| Space | 直接落下 |
| C / Shift | 暂存 |
| P / Esc | 暂停 / 继续 |

## 如何实现

游戏是一个无需打包的静态网站：HTML 提供页面，CSS 适配屏幕，JavaScript 处理游戏逻辑和 Canvas 绘图，PNG 提供猫咪素材。GitHub Pages 托管这些文件，手机通过 HTTPS 网址访问。游戏计算在浏览器里完成，不需要后端、数据库或 App Store 上架。

- `engine.js`：10×20 棋盘、七袋随机、SRS 旋转、碰撞、消行、计分和等级。
- `game.js`：游戏界面、皮肤切换、键盘与触摸、音效触发和本地最高分。
- `audio.js`：B 版消行猫叫、其他操作音效、静音和 iPhone 手势解锁。
- `skins.js`：两套猫咪素材、带边缘余量的贴图切片、旋转和 Canvas 绘图。
- `style.css`：基础及电脑布局。
- `mobile.css`：手机布局、触摸按钮和 iPhone 安全区。
- `manifest.webmanifest`、`assets/icon.svg`、`assets/apple-touch-icon.png`：添加到主屏幕的名称与图标。
- `.github/workflows/pages.yml`：测试并部署到 GitHub Pages。

所有资源路径均为相对路径，因此能在 GitHub Pages 的 `/CatTetris/` 子路径下正常加载。没有外部字体、脚本 CDN 或分析服务。

猫咪素材由项目所有者提供设计，再整理为透明贴图。坚果使用 `assets/cats-transparent.png`，元宵使用 `assets/cats2-transparent.png`，两套均包含更新的倒立 T 字造型。原图保留在 `assets/cats.png` 和 `assets/cats2.png`，处理记录见 [assets/skin-sources.md](assets/skin-sources.md)。猫叫来源与处理说明见 [assets/audio/README.md](assets/audio/README.md)。

绘制前会按不透明轮廓收紧取图范围，减少素材留白，再适当放大猫咪。猫耳朵、脸颊和毛发可以略微伸出方格，J/L 造型保持连续完整。实际碰撞始终按四格网格计算。伸出的图案附属于对应方格，消行时随方格一起消失或下移。

## 首次配置 GitHub Pages

在仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

推送到 `main` 后，工作流会：

1. 检查 JavaScript 语法并运行 `tests/*.test.cjs` 中的游戏规则、皮肤几何和音效测试。
2. 将网页需要的文件整理到 `_site/`。
3. 上传构建产物并部署到 `github-pages` 环境。

Pull request 只运行检查，不发布。可以在 **Actions → Test and deploy CatTetris** 查看结果，或点 **Run workflow** 手动重试。网站网址显示在 **Settings → Pages**。首次发布通常需要等待几分钟。

## 后续更新

在本地修改这个网页版仓库中的文件，完成检查后提交并推送：

```sh
node --test tests/*.test.cjs
git add index.html style.css mobile.css engine.js game.js skins.js audio.js assets
git commit -m "Update cat Tetris"
git push origin main
```

如果修改的是其他文件，也应一并 `git add`。工作流通过后，线上网页会自动更新；手机刷新页面即可看到新版本。

## 本地预览

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

电脑浏览器打开 `http://127.0.0.1:8765/`。预览结束后用 Ctrl+C 关闭服务器。

## 规则

每个方块占 4 格，填满横行就会消除。每消除 10 行升一级，下落逐渐加快。包含落点预览、暂存、0.5 秒锁定延迟，以及连击、T-spin 和全清加分。猫咪按原始设计姿态出生，旋转与碰撞使用同一套标准矩阵；部分姿态的出生方向与常见商业俄罗斯方块版本不同。

## 验证

36 项自动测试，包括 21 项游戏规则测试、8 项皮肤几何测试和 7 项音效测试，含 25,000 次带固定种子的随机操作检查。网页另做两套皮肤的旋转显示、换肤与刷新记忆、实际消行音频播放、静音和手机尺寸下的布局检查；真实 iPhone 的 Safari 手感仍以实机试玩为准。

参考：[GitHub Pages 配置文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[Apple 主屏幕快捷入口说明](https://support.apple.com/guide/iphone/iph42ab2f3a7/ios)。
