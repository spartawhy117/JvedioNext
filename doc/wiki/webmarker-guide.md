# WebMarker 油猴插件使用说明

WebMarker 由 Tampermonkey 油猴插件和 Portable 包内的独立小程序组成，用于在 JavDB 与 JavBus 的支持列表页上标记已存在于本地 Jvedio 数据库中的影片。不需要启动 Jvedio 主程序或 `Jvedio.Worker.exe`。

它只向网页脚本返回“某个番号是否已入库”，不会返回影片路径、标题、演员、库名或数据库内容。

## 1. 开始前准备

- 请先完整解压 JvedioNext Portable 包，不要直接在 ZIP 内运行。
- 使用支持 Tampermonkey 的浏览器，并先安装 Tampermonkey 扩展。
- Portable 包中应包含以下目录和文件：

```text
{JvedioNext 安装目录}/
├─ WebMarker/
│  ├─ WebMarker.exe
│  └─ jvedio-library-marker.user.js
└─ data/
   └─ {Windows用户名}/
      └─ app_datas.sqlite
```

首次升级后通常只需照常导入旧用户数据；WebMarker 会优先读取当前安装目录的 `data\<Windows用户名>\app_datas.sqlite`。

## 2. 安装 WebMarker 油猴插件

1. 打开 `{JvedioNext 安装目录}\WebMarker`。
2. 在浏览器打开 Tampermonkey 管理页面。
3. **直接将 `jvedio-library-marker.user.js` 从文件夹拖到 Tampermonkey 管理页面中**；浏览器会打开脚本安装确认页。
4. 点击安装，并在脚本列表中检查名称为 `JvedioNextWebMarker`，且处于启用状态。

如果浏览器没有响应拖放，可以直接打开 `.user.js` 文件；出现 Tampermonkey 安装页后点击安装。仍无法安装时，再在 Tampermonkey 的 `实用工具 / Utilities` 中选择从文件导入脚本。

脚本只匹配 `javdb.com` 与 `www.javbus.com`，并且只访问本机 `127.0.0.1:12121`。

## 3. 启动 WebMarker 与选择数据库

1. 双击 `WebMarker.exe`。
2. 如果安装目录中只有一份有效数据库，WebMarker 会自动进入 Windows 通知区域（系统托盘）。
3. 如果未找到数据库、数据库无效，或找到多份可用数据库，按原生提示选择自己的 `app_datas.sqlite`。提示中的常见默认位置是：

```text
{JvedioNext 安装目录}\data\<Windows用户名>\app_datas.sqlite
```

4. 选择成功后，浏览器刷新 JavDB 或 JavBus 的支持页面即可开始标记。

WebMarker 会记住一次有效的手工选择；当安装目录再次出现唯一有效数据库时，安装目录中的数据库始终优先。

### 托盘菜单

在 Windows 通知区域找到 WebMarker 图标，可以：

- 查看当前是否已就绪。
- 重新检测安装目录数据库。
- 选择其他数据库。
- 打开 `WebMarker` 文件夹。
- 退出网页入库标记。

退出 WebMarker 会停止本地标记服务，但不会关闭 Jvedio 主程序或 Worker。Windows 可能把托盘图标收进“隐藏的图标”区域。

## 4. 哪些页面会显示标记

已入库影片会在卡片右上角显示“已入库”。未入库影片不会显示负面提示。

| 站点 | 支持页面 | 不支持页面示例 |
| --- | --- | --- |
| JavDB | 首页影片列表与分页、搜索、影片列表、单个演员的影片列表（含分页） | 演员目录、影片详情、排行、收藏及其他未知路由 |
| JavBus | 首页影片瀑布流、搜索、演员影片列表 | 影片详情、磁力页及其他未知路由 |

页面需要含有对应的影片结果容器；WebMarker 不会在详情页、账户页面或没有影片卡片的页面注入任何内容。

## 5. 升级与脚本版本

`jvedio-library-marker.user.js` 的 Tampermonkey `@version` 会随 JvedioNext 包版本自动生成。升级后，可以在 Tampermonkey 脚本列表确认 `JvedioNextWebMarker` 的版本与新包版本一致。

最可靠的更新方式是：

1. 解压新的 Portable 包。
2. 打开 Tampermonkey 管理页面，将新包 `WebMarker` 文件夹中的 `jvedio-library-marker.user.js` 直接拖入该页面。
3. Tampermonkey 提示覆盖或更新同名脚本时确认更新。
4. 退出旧 WebMarker，再启动新包内的 `WebMarker.exe`。

不要从旧 Portable 目录继续启动 WebMarker，否则它可能仍读取旧目录下的用户数据库。

## 6. 常见问题

### 页面没有“已入库”标记

依次检查：

1. WebMarker 是否仍在系统托盘中显示“状态：已就绪”。
2. Tampermonkey 中 `JvedioNextWebMarker` 是否已启用，版本是否来自当前 Portable 包。
3. 当前页面是否属于上表中的支持页面；影片详情页不会显示标记。
4. WebMarker 选择的 `app_datas.sqlite` 是否就是你正在使用的 Jvedio 用户数据库。升级后在新目录启动 WebMarker，或从托盘选择正确数据库。
5. `127.0.0.1:12121` 是否被其他 WebMarker 或其他程序占用。先退出旧 WebMarker，再启动要使用的那一份。

如果同一页面只有部分影片显示“已入库”，说明脚本和本机服务正常运行；未显示的影片是当前所选数据库中没有相同 `VID` 的记录。脚本只按番号及受控的 `-C` / `-CH` 变体判断，不会按标题或演员名称模糊猜测。

### 选完数据库仍提示无效

请确认选择的是 `app_datas.sqlite` 文件，而不是 `-wal`、`-shm`、备份 ZIP 或其他 SQLite 文件。WebMarker 只读检查 Jvedio 必需的数据表，不会创建或修改数据库。

### 关闭 WebMarker 后页面仍有旧标记

刷新网页即可。已经插入当前页面的 badge 会随页面重新加载消失；WebMarker 停止后，新页面不会再获得新的标记。

## 7. 隐私与边界

- WebMarker 只监听本机回环地址 `127.0.0.1`，不提供局域网访问。
- 网页脚本只发送页面提取的番号，并只接收“是否已入库”的结果。
- WebMarker 不会写入、迁移、修复或 checkpoint 你的数据库，也不会启动 Jvedio 或 Worker。
- 若需要改用其他数据库，请只通过 WebMarker 托盘菜单选择，不需要编辑 JSON、输入端口或手工配置 Worker 地址。

## 相关文档

- [JvedioNext 使用指南](https://github.com/spartawhy117/JvedioNext/wiki/User-Guide)
- [标准库命名规则](https://github.com/spartawhy117/JvedioNext/blob/master/doc/wiki/standard-library-naming-rules.md)
