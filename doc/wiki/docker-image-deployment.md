# Docker 镜像部署与使用

> 适用于 12.0.0 起的 Linux amd64 官方镜像：浏览器打开即可使用完整媒体库，不需要启动桌面端。
>
> 只想先跑起来看看：完成阶段 1 即可，大约 10 分钟。要让扫描、抓取、整理真正转起来，再完成阶段 2。

## 开始前

- 一台 Linux x86_64 主机或 NAS，已安装 Docker 和 Docker Compose v2。
- 想好两个位置：一个放运行数据（数据库、设置、日志），一个放你的影片。两者互相独立。
- 官方镜像由 GitHub Actions 在每次发布时自动构建并推送，版本号标签与 Release 完全一致。

## 阶段 1：部署

### 1. 准备目录

示例假设运行数据放在 `/srv/jvedio`，影片也在其中（路径随便换，保持三个目录互相独立即可）：

```text
/srv/jvedio
├── config/   # 数据库、设置、日志 —— 整个部署最需要备份的目录
├── cache/    # 预览、播放缓存 —— 删掉会自动重建
└── media/    # 你的影片（示例路径，也可以指向 NAS 已有挂载）
```

```sh
mkdir -p /srv/jvedio/config /srv/jvedio/cache /srv/jvedio/media
sudo chown -R 1000:1000 /srv/jvedio
```

| 宿主目录 | 容器内 | 作用 | 丢了会怎样 |
| --- | --- | --- | --- |
| `config` | `/config` | 数据库、设置、日志 | 媒体库与设置全丢，必须备份 |
| `cache` | `/cache` | 预览、播放缓存 | 可重建 |
| `media` | `/media` | 你的片源 | 只影响播放/扫描 |

> **⚠️ 属主必须是运行用户**
> 容器默认以 UID/GID `1000:1000` 运行（不用 root），`config` 与 `cache` 的属主不一致时启动即失败。换其他用户时，把 env 里的 `JVEDIO_UID` / `JVEDIO_GID` 一起改。

### 2. 拉取镜像

```sh
docker pull ghcr.io/spartawhy117/jvedionext:12.0.0
```

- 版本号标签与 [GitHub Release](https://github.com/spartawhy117/JvedioNext/releases/latest) 一一对应；`latest` 始终指向最新正式版本。
- 部署机无法直连 GHCR（离线环境）：到 Release 页下载 `JvedioDocker_<版本>_runtime_linux-amd64.tar.gz`，导入本机：

```sh
gunzip -c JvedioDocker_12.0.0_runtime_linux-amd64.tar.gz | docker load
# 导入后镜像名是 jvedio:12.0.0，下一步 env 里照这个名字填
```

- 坚持自行构建（需要源码，仅适用于参与开发的场景）：`docker build -f deployment/docker/Dockerfile --target runtime --build-arg APP_VERSION=12.0.0 -t jvedio:12.0.0 .`

镜像自带 FFmpeg / FFprobe：宿主机不需要另装，也不需要挂载 Docker socket。

### 3. 写 env 文件

在部署目录（按示例是 `/srv/jvedio`）新建 `jvedio.env`，照抄以下内容，改掉三个路径与镜像名：

```sh
JVEDIO_IMAGE=ghcr.io/spartawhy117/jvedionext:12.0.0
JVEDIO_CONFIG_DIR=/srv/jvedio/config
JVEDIO_CACHE_HOST_DIR=/srv/jvedio/cache
JVEDIO_MEDIA_DIR=/srv/jvedio/media
JVEDIO_AUTH_MODE=trusted
JVEDIO_ALLOWED_HOSTS=localhost,127.0.0.1
JVEDIO_BIND_ADDRESS=127.0.0.1
JVEDIO_PORT=8080
JVEDIO_UID=1000
JVEDIO_GID=1000
JVEDIO_MEDIA_ACCESS=ro
JVEDIO_METATUBE_SERVER_URL=
JVEDIO_STRM_ALLOWED_ORIGINS=[]
JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS=[]
```

> **⚠️ 保存前必须检查**
> - 三个目录路径换成你自己的**绝对路径**；离线导入的镜像把 `JVEDIO_IMAGE` 改成 `jvedio:12.0.0`。
> - 本机自用就保持 `trusted` + `127.0.0.1` 不动——这是最安全的默认，访问边界就是绑定地址。
> - 局域网共享、口令、反向代理的改法见下方「访问控制」。
> - 暂时不抓取资料可以不填 `JVEDIO_METATUBE_SERVER_URL`，阶段 2 再配。

### 4. 写 compose 文件

同目录新建 `compose.yaml`，内容如下（与仓库 `deployment/docker/compose.yaml` 保持一致，以仓库为准）：

```yaml
services:
  jvedio:
    image: ${JVEDIO_IMAGE:-jvedio:local}
    user: ${JVEDIO_UID:-1000}:${JVEDIO_GID:-1000}
    init: true
    read_only: true
    stop_grace_period: 45s
    ports:
      - '${JVEDIO_BIND_ADDRESS:-127.0.0.1}:${JVEDIO_PORT:-8080}:8080'
    environment:
      JVEDIO_HOST_MODE: server
      JVEDIO_DATA_DIR: /config
      JVEDIO_CACHE_DIR: /cache
      JVEDIO_LOG_DIR: /config/log
      JVEDIO_ALLOWED_HOSTS: ${JVEDIO_ALLOWED_HOSTS:-localhost,127.0.0.1}
      JVEDIO_PUBLIC_ORIGIN: ${JVEDIO_PUBLIC_ORIGIN:-}
      JVEDIO_TRUSTED_PROXIES: ${JVEDIO_TRUSTED_PROXIES:-}
      JVEDIO_MEDIA_ROOTS: '["/media"]'
      JVEDIO_STRM_ALLOWED_ORIGINS: ${JVEDIO_STRM_ALLOWED_ORIGINS:-[]}
      JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS: ${JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS:-[]}
      JVEDIO_AUTH_MODE: ${JVEDIO_AUTH_MODE:-trusted}
      JVEDIO_METATUBE_SERVER_URL: ${JVEDIO_METATUBE_SERVER_URL:-}
    volumes:
      - '${JVEDIO_CONFIG_DIR:?Set JVEDIO_CONFIG_DIR}:/config'
      - '${JVEDIO_CACHE_HOST_DIR:?Set JVEDIO_CACHE_HOST_DIR}:/cache'
      - '${JVEDIO_MEDIA_DIR:?Set JVEDIO_MEDIA_DIR}:/media:${JVEDIO_MEDIA_ACCESS:-ro}'
    tmpfs:
      - /tmp:size=1g,mode=1777
```

> **💡 提示**：compose 字段与开发仓库 `deployment/docker/compose.yaml` 完全一致，env 字段与 `.env.example` 一致（示例默认值按官方镜像预填）；照抄本文即可完成部署，不需要获取源码。

### 5. 启动并验证

```sh
cd /srv/jvedio
docker compose --env-file jvedio.env -f compose.yaml up -d
docker compose --env-file jvedio.env -f compose.yaml ps
docker compose --env-file jvedio.env -f compose.yaml logs -f
```

1. 首次启动等几秒，浏览器打开 `http://127.0.0.1:8080` —— 默认免登录，直接进入主界面。
2. 健康检查：`curl -f http://127.0.0.1:8080/health/ready` 有响应即就绪。
3. 打不开先查「排障」一节：最常见的三个原因是本机代理劫持了 127.0.0.1、目录属主不对、Host 白名单没填。

到这里部署就完成了。下面进入日常使用。

## 阶段 2：建库、挂片源、接抓取

### 1. 新建媒体库

在页面里新建媒体库时，路径选择**服务器上 `/media` 下的目录**——服务器模式不能选择浏览器这台设备的本地目录。已有影片不需要提前整理，直接选它们所在的目录。

媒体默认以只读（`ro`）挂载：浏览、播放、收藏都没有问题；要允许应用整理、写回或物理删除文件，把 env 里的 `JVEDIO_MEDIA_ACCESS` 改成 `rw` 后重启容器。

### 2. 配置 MetaTube 抓取

标准库的资料抓取依赖一个可访问的 MetaTube 服务。两种配法任选其一：

| 配法 | 做法 | 生效时机 |
| --- | --- | --- |
| env 注入（推荐） | `JVEDIO_METATUBE_SERVER_URL=http://<metatube地址>:8080` 写进 jvedio.env | 重启容器后 |
| 页面设置 | 在设置的 MetaTube 配置里填写服务地址 | 保存后 |

不配会怎样：建库、扫描、本地浏览和播放全部正常，但抓取任务会直接失败（提示 MetaTube 未配置）。地址可以之后随时补。

### 3. 验证

- 先选一个**小目录**建库扫描，跑通整个流程再加大批量；
- 打开一部影片确认能播放；
- 触发一次抓取，确认封面与资料能补上。

### 可选：从 Windows 桌面端迁移

1. 桌面端「导出用户数据」，得到数据包；
2. 网页端导入，逐项把原 Windows 媒体根映射到 `/media` 下的目录；
3. **先把片源挂进 `/media` 再导入**——数据包不含媒体文件，只含数据库、设置与演员头像；海报、缩略图与 NFO 都是媒体旁的 sidecar，片源不在就没有海报也不能播放。

## 访问控制

按你的使用场景选一种，改 env 后重启容器（`docker compose ... up -d`）生效。

| 场景 | 配置 | 说明 |
| --- | --- | --- |
| 本机自用（默认） | 什么都不改 | 只监听 `127.0.0.1`，免登录直接进入；访问边界就是绑定地址 |
| 局域网共享 | `JVEDIO_BIND_ADDRESS=0.0.0.0`，`JVEDIO_ALLOWED_HOSTS` 填浏览器实际访问的主机名或 IP（逗号分隔，不含协议，不支持通配符，可带端口） | 白名单没填对会得到 403 / Host 不匹配 |
| 口令（NAS、共享网络） | 建 12–1024 字符的口令文件，`JVEDIO_AUTH_MODE=password`，`JVEDIO_ADMIN_SECRET=</口令文件绝对路径>`，启动命令追加 `-f compose.password.yaml` | 登录时输入口令文件内容 |
| 反向代理 | `JVEDIO_PUBLIC_ORIGIN=https://<你的域名>`，`JVEDIO_TRUSTED_PROXIES=<代理IP>`，Host 白名单加上域名；代理转发 `X-Forwarded-*`、SSE 与 Range | 局域网直连是明文 HTTP，跨网段建议代理加 TLS |

口令模式的启动命令：

```sh
docker compose --env-file jvedio.env -f compose.yaml -f compose.password.yaml up -d
```

`compose.password.yaml` 与仓库同名文件一致：

```yaml
services:
  jvedio:
    environment:
      JVEDIO_AUTH_MODE: password
      JVEDIO_ADMIN_PASSWORD_FILE: /run/secrets/admin-password
    volumes:
      - '${JVEDIO_ADMIN_SECRET:?Set JVEDIO_ADMIN_SECRET}:/run/secrets/admin-password:ro'
```

STRM 远程索引默认拒绝未授权 origin：`JVEDIO_STRM_ALLOWED_ORIGINS` 填精确 HTTP(S) origin（不带路径）；访问内网服务还要填 `JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS`。

## 升级

1. 在页面「设置 → 关于 → 容器升级」检查版本、准备升级并下载备份；
2. 确认备份已保存到容器之外；
3. 改 env 里的 `JVEDIO_IMAGE` 为目标版本（如 `ghcr.io/spartawhy117/jvedionext:12.0.1`），然后：

```sh
docker compose --env-file jvedio.env -f compose.yaml pull
docker compose --env-file jvedio.env -f compose.yaml up -d
```

维护期间 `/health/ready` 返回 503，状态查询、登录、备份与取消维护仍可用。**数据被新版本初始化后旧镜像会拒绝打开**——不能靠改回旧标签继续用新数据，所以升级前的备份务必保存好。Docker 仓库不会主动推送新版本，每次都要主动 pull。

## 常用配置参考

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `JVEDIO_IMAGE` | `jvedio:local` | 镜像名与标签；官方镜像填 `ghcr.io/spartawhy117/jvedionext:<版本>` |
| `JVEDIO_PORT` | `8080` | 宿主机映射端口 |
| `JVEDIO_BIND_ADDRESS` | `127.0.0.1` | 绑定地址即访问边界 |
| `JVEDIO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | 允许的 Host 头 |
| `JVEDIO_MEDIA_ACCESS` | `ro` | `ro` 只读；整理/删除需改 `rw` |
| `JVEDIO_METATUBE_SERVER_URL` | 空 | **抓取必填**，不填任务会直接失败 |
| `JVEDIO_STRM_ALLOWED_ORIGINS` | `[]` | STRM 允许的远端 origin |
| `JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS` | `[]` | 允许的内网 STRM origin |
| `JVEDIO_UID` / `JVEDIO_GID` | `1000` | 与宿主目录属主保持一致 |

## 排障

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 页面「数据加载失败」 | 本机代理劫持了 127.0.0.1 | 让代理放行本地回环 |
| 403 / Host 不匹配 | `JVEDIO_ALLOWED_HOSTS` 缺当前域名或 IP | 补上后重启容器 |
| 启动即失败 | `config`/`cache` 不可写，或目录属主与 UID 不一致 | 修正属主，别用 root 跑 |
| 抓取全部失败 | 没配 MetaTube 地址 | 填设置或 `JVEDIO_METATUBE_SERVER_URL` |
| 有库无海报、不能播放 | `/media` 里没有对应片源 | 挂载片源，路径要与库记录一致 |
| 两个实例抢同一目录 | `config`/`cache` 被重复挂载 | 一个数据目录只跑一个容器 |

日志在 `config/log/runtime/`。排障时保留 `config`、日志与原镜像，不要覆盖现有数据库，也不要用全局 `docker prune`。

进阶内容（反向代理细节、灾备恢复、恢复脚本）见 [Docker 服务器部署与恢复](docker-server-deployment.md)。
