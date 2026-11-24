# Docker 服务器部署与恢复

> 本机 Linux amd64 容器已完成开发与运行镜像验证，证据见 `doc/testing/modules/docker-web.md`。官方镜像自 12.0.0 起由 GitHub Actions 在每次发布时自动构建并推送到 GHCR（`ghcr.io/spartawhy117/jvedionext`，见 [Docker 镜像部署与使用](docker-image-deployment.md)）；私有候选仍按 digest 拉取运行，示例也可使用本地构建。独立 Linux/NAS 实机未验证。

## 1. 准备目录和镜像

首轮使用 Linux amd64、Docker Compose、.NET 8 应用镜像。Windows 开发使用 Docker Desktop 的 Linux containers；浏览器与容器后端通信，不启动 Tauri。配置与 SQLite 放本机文件系统，媒体可以是服务器已有挂载目录。

建立彼此独立的 `config`、`cache`、`media` 目录。**默认 LAN 信任模式**：无需密码文件，浏览器打开即进入；访问边界就是绑定地址（默认只监听 `127.0.0.1`）。要在局域网共享时显式改 `JVEDIO_BIND_ADDRESS`。可选启用 **password 模式**（NAS / 共享网络）：创建 12–1024 个字符的管理员密码文件并限制宿主访问权限。Linux 上把 config/cache 的属主设为实际运行 UID/GID，默认 `1000:1000`；应用不以 root 运行。

从仓库根构建，产品版本应与 `tauri/package.json` 一致，源码版本取实际 Git revision，未提交工作区加 `-dirty`：

```sh
docker build -f deployment/docker/Dockerfile --target runtime --build-arg APP_VERSION=12.0.0 --build-arg SOURCE_REVISION=<实际revision> -t jvedio:local .
```

最终产物身份（ZIP SHA256、runtime/dev/升级实验镜像 ID）见 `docs/plan/archived/feature_cross-platform-final-acceptance.md` §四与 `docs/plan/archived/feature_test-coverage-and-cross-platform-acceptance.md` §4；有该私有包读取权限的账号登录GHCR后，可按完整 `镜像地址@sha256:...` 拉取并填写 `JVEDIO_IMAGE`。使用digest可固定已验证产物，不能将候选tag当作自动发现的最新版本。

复制 `deployment/docker/.env.example` 为服务器独立 env 文件，填写绝对宿主路径。`JVEDIO_CONFIG_DIR` 与 `JVEDIO_CACHE_HOST_DIR` 分别挂到 `/config`、`/cache`；`JVEDIO_MEDIA_DIR` 挂到 `/media`。`JVEDIO_AUTH_MODE` 默认 `trusted`（无需口令文件）；启用 `password` 时填 `JVEDIO_ADMIN_SECRET` 指向密码文件，并在启动命令叠加 `-f compose.password.yaml`。路径不要指向现有 Windows 客户端正在使用的数据库。

## 2. 启动和访问

```sh
docker compose --env-file /absolute/path/jvedio.env -f deployment/docker/compose.yaml up -d
docker compose --env-file /absolute/path/jvedio.env -f deployment/docker/compose.yaml logs -f
```

默认只监听宿主 `127.0.0.1:8080`。局域网访问时设置 `JVEDIO_BIND_ADDRESS`、`JVEDIO_PORT`，并在 `JVEDIO_ALLOWED_HOSTS` 填入浏览器实际使用的主机名/IP，不含协议、不使用通配符；需要限制端口时可填写 `host:port`。浏览器打开对应地址即可使用（trusted 模式无登录页）；本地开发容器同样默认无门禁（加 `-Password` 才启用密码）。；password 模式用密码文件内容登录。新建库时选择服务器 `/media` 下的授权目录，不能选择浏览器设备的本地目录。

媒体默认 `JVEDIO_MEDIA_ACCESS=ro`。库的媒体路径不是配置文件项：后端按挂载指纹把 `JVEDIO_MEDIA_ROOTS` 登记为授权根，页面建库时经 `/api/server/directories` 浏览并选中目录，路径随建库请求写入后端；换盘或重新挂载导致指纹不匹配时库标记离线，重新挂回原盘恢复。只读挂载允许浏览/播放、MDCX读取和应用内收藏等操作；整理、写回和物理删除需要明确设为 `rw`。MDCX来源即使卷可写，仍遵守本项目外部来源保护规则。修改挂载、授权根或（password 模式的）密码后按部署规则重启，不在页面任意授权服务器目录。

局域网直连为明文 HTTP：仅在自己信任的内网使用；跨网段 / 宿主共享时建议反向代理加 TLS。**本机浏览器访问 `127.0.0.1` 端口时若配置了系统代理，请确保代理放行或绕过本地回环**（部分代理工具默认劫持本机端口，表现为页面首载「数据加载失败 / 重试」）。反向代理部署时，配置精确 `JVEDIO_PUBLIC_ORIGIN`（例如 `https://media.example.test`）、`JVEDIO_TRUSTED_PROXIES`（实际代理IP）及Host白名单。代理须转发HTTP流和SSE，允许大文件上传与Range；HTTPS访问使用安全Cookie。不要将服务器 origin 配成 `localhost` 后要求远端浏览器使用。

STRM默认拒绝未授权远端origin；在env中填写JSON数组 `JVEDIO_STRM_ALLOWED_ORIGINS`。访问明确允许的内网服务还须额外填写 `JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS`，两者均为精确HTTP(S) origin，不带路径/密码。重定向和HLS子资源同样受校验，不因初始地址获准而隐式放开全部网络。

## 3. 更新和数据迁移

FFmpeg与运行时由镜像提供，应用不会替换容器内工具或访问Docker socket。先在实际镜像仓库/NAS核实目标tag/架构，保留原镜像，再在“设置→关于→容器升级”填写目标版本并确认。页面当前明确显示镜像可用性未自动核实；桌面Release不代表Docker镜像已发布。

等待后台任务完成，准备升级后下载完整备份。维护期间ready返回503，状态/登录/备份和取消仍可用。确认备份已保存在容器外，再修改env的 `JVEDIO_IMAGE`，由Compose/NAS拉取并替换精确目标镜像：

```sh
docker compose --env-file /absolute/path/jvedio.env -f deployment/docker/compose.yaml pull
docker compose --env-file /absolute/path/jvedio.env -f deployment/docker/compose.yaml up -d
```

本地构建镜像无需pull。重启后确认ready、登录、库数量、图片及播放。准备后放弃更新可在页面取消维护；不会自动删除已生成备份。应用数据一旦被较新产品完成初始化，旧镜像会拒绝打开；不能只换旧tag后继续写新数据。

从Windows迁移使用客户端的“用户数据导出”，在网页上传预检，逐项将原媒体根映射为授权服务器目录，再确认覆盖。原片不包含在数据包中，必须先安排媒体挂载。普通迁移包保留服务器管理员与部署根；它与含认证配置的完整灾备包用途不同。

## 4. 失败恢复和排障

停止失败部署，保留原配置目录、日志和原镜像；不要直接覆盖现有数据库。将可信的完整灾备ZIP解到隔离目录，使用PowerShell 7恢复脚本校验manifest、每项长度/SHA256及两库，并复制到一个尚不存在的新目录：

```powershell
pwsh scripts/restore-server-backup.ps1 -BackupDirectory /absolute/path/extracted-backup -RestoreDirectory /absolute/path/new-restored-config
```

脚本拒绝已有目标、路径越界、链接、重复路径和损坏文件，不删除旧目录。使用manifest记录的源镜像版本、恢复目录、独立缓存及测试端口启动隔离实例；核实登录、库ID/收藏、图片和播放后再切换正式部署。恢复包含认证与密钥，应按敏感数据管理。数据库恢复不能还原媒体重命名或sidecar覆盖，媒体另行备份。

启动失败先看Compose日志和 `config/log/runtime/`。常见原因包括目录不可写、密码/Host配置错误、另一个实例已持有config/cache锁、数据版本更新、迁移未完成或媒体挂载身份变化。`cache`可重建，`config`及完整备份需要保留；不使用全局prune排障。

开发、分层验证与证据入口：`doc/developer.md`、`doc/testing/modules/docker-web.md`；宿主及恢复合同：`doc/modules/server/50-docker-server-host-and-security-design.md`、`doc/modules/updates/51-docker-update-backup-and-recovery-design.md`。
