<h1 align="center">
  <img src="./doc/UI/preview/readme-icon.svg" alt="JvedioNext" width="128" />
  <br>
  JvedioNext
</h1>

<p align="center">
  次世代离线影片管理工具，标准番号库与非规则本地资源统一管理
</p>

<p align="center">
  <a href="./CHANGELOG.md">版本更新记录</a>
  ·
  <a href="https://github.com/spartawhy117/JvedioNext/releases/latest">最新版本下载</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/.NET-8.0-purple" alt=".NET" />
  <img src="https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white" alt="Tauri" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
  <a href="https://github.com/spartawhy117/JvedioNext/releases/latest">
    <img src="https://img.shields.io/github/downloads/spartawhy117/JvedioNext/latest/total.svg?label=latest%20downloads" alt="Latest Release Downloads" />
  </a>
  <a href="https://github.com/spartawhy117/JvedioNext">
    <img src="https://img.shields.io/github/stars/spartawhy117/JvedioNext?style=social" alt="Stars" />
  </a>
</p>

JvedioNext 把"标准番号片库"和"非规则本地资源"统一收进一个可维护的离线媒体库：

- **标准库**：通过 MetaTube 自动补齐海报、NFO、演员与详情，支持扫描整理与元数据抓取
- **非标准本地库**：不改原目录结构，通过合集目录列表与动态封面，让杂乱本地资源变得可浏览、可迁移
- **用户数据**：支持导入导出打包（含封面缓存），迁移无需重新抓取

---

## 核心特点

- 🧱 基于 `Tauri 2 + .NET 8 Worker` 的双层桌面架构，界面与任务执行分离。
- 🎬 标准库支持 MetaTube 抓取，可补齐海报、`NFO`、演员与详情数据。
- 📁 非标准本地库支持合集目录列表与动态封面，适合管理非规则目录。
- 📦 用户数据导入导出会打包当前用户目录中的配置、媒体库数据、缓存与工具文件。
- 🧾 支持 `VID` 索引导出，便于离线确认影片是否已入库。

---

## 预览

<p align="center">
  <img src="./doc/UI/preview/dark.png" alt="影片库暗色预览" width="49%" />
  <img src="./doc/UI/preview/light.png" alt="影片库亮色预览" width="49%" />
</p>

<p align="center">
  <img src="./doc/UI/preview/setting.png" alt="设置页预览" width="49%" />
  <img src="./doc/UI/preview/actors.png" alt="演员页预览" width="49%" />
</p>

<p align="center">
  <img src="./doc/UI/preview/favoritePag.png" alt="收藏页预览" width="49%" />
  <img src="./doc/UI/preview/tagPage.png" alt="标签页预览" width="49%" />
</p>

---

## 架构概览

程序分为两层：

- 前端层：Tauri 桌面壳，负责页面、设置、任务入口、播放器交互与窗口行为。
- Worker 层：.NET 8 后端，负责扫描目录、请求 MetaTube、维护数据库、生成缓存、执行导入导出和后台任务。

你真正接触的是前端页面，但媒体库同步、动态封面生成和元数据处理都由 Worker 完成。

---

## ⚠️ 首次启动前请先准备环境

默认推荐安装 `x64` 版本；如果你的系统是 `32` 位 Windows，请自行改装对应的 `x86` 版本。

### ✅ 必选

- `.NET 8 ASP.NET Core Runtime (Windows x64)`：
  [官方直达下载（v8.0.25 x64）](https://dotnet.microsoft.com/zh-cn/download/dotnet/thank-you/runtime-aspnetcore-8.0.25-windows-x64-installer)
- `.NET 8 Desktop Runtime (Windows x64)`：
  [官方直达下载（v8.0.25 x64）](https://dotnet.microsoft.com/zh-cn/download/dotnet/thank-you/runtime-desktop-8.0.25-windows-x64-installer)

缺少以上任一 `.NET 8` 运行时，`Jvedio.Worker.exe` 都可能无法正常启动，通常会看到：

```text
引擎启动失败
Worker process exited unexpectedly

请检查 Worker 是否可用后重启应用
```

应用启动后，如果你要使用标准库的元数据抓取功能，还需要准备 `MetaTube` 服务地址：

- `MetaTube`
  - `JvedioNext` 不内置公共 `MetaTube` 后端
  - 准备好后，把服务地址填到软件设置页中的 `MetaTube 服务地址`
  - 自己搭建：
    - 可以先看 MetaTube 官方文档和官方项目主页，再按文档部署后端服务
    - [MetaTube 官方文档](https://metatube-community.github.io/)
    - [MetaTube 官方 GitHub](https://github.com/metatube-community)
    - 也可以搜索：`Huggingface Space MetaTube 搭建`
  - 寻找公共接口：
    - 如果你不想自己搭建，可以自行搜索可用的公共接口服务
    - 建议搜索这些关键词：
      - `MetaTube 部署`
      - `MetaTube Docker`
      - `MetaTube 服务地址`
      - `MetaTube 公共节点`

### 🧩 可选

- `Microsoft Edge WebView2 Runtime` [微软官方 WebView2 下载页](https://developer.microsoft.com/en-us/microsoft-edge/webview2)
  - Windows 10 和 Windows 11 一般已经自带或通过系统更新带有 `WebView2 Runtime`
  - 多数情况下不需要单独安装
  - 只有在前端窗口打不开、白屏或界面无法渲染时，再到这里补装

- `FFmpeg` [FFmpeg 下载页](https://github.com/GyanD/codexffmpeg/releases)
  - 只在"非标准本地库生成动态封面"时需要，不影响软件启动，也不影响标准库抓取元数据
  - 建议下载最新的 `essentials_build.zip`
  - 解压后，把 `bin` 目录下这 3 个文件拷贝到软件目录中的 `data/<user>/tools/ffmpeg/`
    - `ffmpeg.exe`
    - `ffprobe.exe`
    - `ffplay.exe`
  - 如果你不确定目录位置，可以先打开软件设置页中的 `打开工具目录`，再把这 3 个文件拷进去

---

## 设置页概览

| 分组 | 说明 |
| --- | --- |
| 用户数据导入导出 | 迁移、备份、恢复用户环境，含封面缓存和 VID 列表导出 |
| 基本 | 主题、语言、关闭行为、调试模式 |
| 显示 | 影片卡大小、影片库和演员页默认排序 |
| 播放器设置 | 自定义播放器路径，未配置时回退系统默认 |
| MetaTube | 服务地址、请求超时、连通性测试 |
| 关于 | 查看版本，跳转 GitHub Releases 获取更新 |

---

## 收藏页概览

- 可以把影片、标签和演员统一加入收藏，集中管理常看内容
- 收藏首页会直接显示 `影片 / 标签 / 演员` 三类入口，方便按对象快速进入对应列表
- 收藏影片页支持搜索、排序、批量取消收藏和批量处理，适合整理常看片单
- 收藏标签页与收藏演员页支持查看收藏对象、快速取消收藏，并可继续按收藏对象回看关联影片

---

## 标签页浏览

- 可以按 `类型 / 系列 / 厂商` 三种维度浏览标准库中的标签内容
- 支持直接查看每个标签下的影片数量，快速定位高频题材和系列
- 可以从左侧导航进入标签页，也可以在影片详情页点击对应标签继续展开浏览
- 支持在“全部标准库”与单库范围内切换查看同类影片，方便按库筛选内容

---

## 两种库模式

| 模式 | 适合内容 | 元数据抓取 | 合集目录列表 |
| --- | --- | --- | --- |
| 标准库 | 标准番号影片库 | ✅ MetaTube | — |
| 非标准本地库 | 国产合集、散装目录、非规则目录 | — | ✅ |

### 扫描移动 / 保留规则速览

- **标准库**
  - 合法单文件与合法子集文件都会整理到同一数据源内的基准 `VID` 目录
  - 默认保留原影片，不会在扫描阶段自动删除同 `VID` 其他文件
- **非标准本地库**
  - `刷新目录` 只做同步，不移动、不重命名、不按 `VID` 整理原文件
  - 默认保留原目录、原文件和原命名，扫描阶段不做自动搬运

### 标准库子集 / 资源 / 显示规则速览

| 维度 | 当前规则 |
| --- | --- |
| 子集命名识别 | 当前会识别常见电影子集命名，例如 `ABC-123-1`、`ABC-123_2`、`ABC-123 CD1`、`ABC-123 PART2`、`ABC-123 FHD1`、`ABC-123A/B/C` |
| 非子集排除 | `ABC-123-C`、`ABC-123-CH` 这类中文字幕后缀不会当成子集；它们会继续作为独立影片文件存在 |
| 目录整理 | 标准库扫描后，同一影片的合法子集会收进同一个基准 `VID` 目录；非标准本地库不改原目录 |
| sidecar 放置 | `NFO`、`poster`、`thumb`、`fanart` 统一按基准 `VID` 写在该目录中，例如 `ABC-123.nfo`、`ABC-123-poster.jpg` |
| 列表显示 | 合法多子集在列表页聚合成 `1` 张主卡，卡面左上角显示 `N Parts` |
| 详情播放 | 多子集影片进入详情页后，通过独立的 `Part X` 子集条选择具体播放文件；单文件影片保持原播放方式 |
| 独立卡片保留 | `-C/-CH`、未命中子集规则的同 `VID` 文件、不同来源同 `VID` 文件，不会强行并成一张卡 |

### 🎬 标准库（MetaTube 数据源）

适合按番号管理的影片目录。推荐操作顺序：先 `扫描` 确认入库正确，再 `抓取元数据` 补齐详情。

- 支持用户配置多条扫描目录；扫描负责识别影片并入库，抓取负责补齐海报、`NFO`、演员与详情页
- 子集识别、目录整理、sidecar 放置和卡片显示规则以上表为准
- 新版本扫描阶段**不会自动删除用户磁盘上的原影片文件**
- 抓取后的 `NFO` 与三张主图会写回影片所在的基准 `VID` 目录

```text
平铺根目录:
  ABC-001.mp4
  ABC-001_2.mp4

扫描整理后:
  ABC-001/
    ABC-001.mp4
    ABC-001_2.mp4
    ABC-001.nfo
    ABC-001-poster.jpg
    ABC-001-thumb.jpg
    ABC-001-fanart.jpg
```

- 演员头像统一缓存在软件数据目录中，不写回影片目录

- `编辑` 可修改库名和扫描目录；`移除库` 只删除软件内引用，不删除原影片和 sidecar 文件

### 🎬 非标准本地库

适合合集盘、散装目录等非规则本地资源，不依赖任何搜刮源。推荐操作顺序：先 `刷新目录` 确认展示正确，再 `生成动态封面`。

- 配置 1 条扫描目录，刷新目录只同步文件变化，不会改造原目录结构
- 可选填"合集目录列表"，将指定路径显示为合集入口；未命中的影片默认平铺
- 支持勾选"下一层子目录按合集显示"，实现 合集 → 子合集 → 影片 的多级浏览
- 动态封面由 FFmpeg 生成（需提前配置），静态封面和悬停预览缓存在软件数据目录中，不改动原影片目录

- `编辑` 可修改库名、扫描目录和合集规则；`移除库` 只清理软件内数据和缓存，不删除原影片

**合集目录示例**

```text
磁盘:
aaa/
  bbb/
    c1/
      p1.mp4
    c2/
      p2.mp4

配置: 合集目录 = [{ path: "bbb", childrenAsCollections: true }]

库首页 → 合集入口 [bbb] → 子合集 [c1, c2] → 影片 [p1.mp4]
```

---

## 致谢

本项目在开发过程中参考了以下优秀开源项目，在此表示感谢：

- [clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev) — Tauri 2 桌面应用架构与前端工程实践参考
- [metatube-sdk-go](https://github.com/metatube-community/metatube-sdk-go) — 元数据搜刮能力支持
- [jvedio](https://github.com/hitchao/jvedio) — 原版 jvedio 提供了离线影片管理的核心理念参考

---

## 特别声明

本软件（JvedioNext）**仅用于管理用户个人本地影片**，所有数据处理均在本地离线运行。

本软件**不提供任何非法内容分享功能**，不内置任何影片资源，不具备上传、分发或传播影片内容的能力。用户须自行确保所管理的内容符合所在地区的法律法规，开发者对用户的使用行为不承担任何法律责任。

---

## 赞助开发者喝奶茶

<details>
<summary>点击展开收款码</summary>

如果这个项目帮你省下了一些整理和排错时间，欢迎扫码支持开发者继续维护。

<table>
  <tr>
    <th>微信支付</th>
    <th>支付宝</th>
  </tr>
  <tr>
    <td align="center">
      <img src="./doc/UI/preview/wechatpay.png" alt="微信支付收款码" width="280" />
    </td>
    <td align="center">
      <img src="./doc/UI/preview/alipay.jpg" alt="支付宝收款码" width="280" />
    </td>
  </tr>
</table>

</details>

---

<!-- repo-report:start -->
## 开发简报

> 自动更新：2026/04/19 01:34（Asia/Shanghai）

累计：版本发布数 36，已完成 Issue 17，未计划 Issue 3

当周（最近 7 天）：版本发布数 4，已完成 Issue 5，未计划 Issue 2
<!-- repo-report:end -->
