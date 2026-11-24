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

示例假设运行数据放在 `/srv/jvedio`（路径随便换，保持目录互相独立即可）。**media 不是要新建的目录**——它就是你 NAS 上片源已经存在的位置：

```text
/srv/jvedio
├── config/   # 数据库、设置、日志 —— 整个部署最需要备份的目录
├── cache/    # 预览、播放缓存 —— 删掉会自动重建
└── media/    # 你的片源——直接用 NAS 上已有的目录，不必新建
```

```sh
# config 是唯一必须新建的目录（应用要往里写数据）
mkdir -p /srv/jvedio/config /srv/jvedio/cache
sudo chown -R 1000:1000 /srv/jvedio
# media 不 mkdir：已有片源就把 JVEDIO_MEDIA_DIR 指向它（如 /volume1/AV）；
# 从零开始的全新部署才建一个空 media 目录，之后往里放片。
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

在部署目录（按示例是 `/srv/jvedio`）新建 `jvedio.env`。**必改只有三行**：

```sh
JVEDIO_IMAGE=ghcr.io/spartawhy117/jvedionext:12.0.0
JVEDIO_CONFIG_DIR=/srv/jvedio/config
JVEDIO_MEDIA_DIR=/srv/jvedio/media
```

其余全部有默认值，不写也能跑。需要时按需追加：

| 变量 | 什么时候才需要 |
| --- | --- |
| `JVEDIO_PORT` / `JVEDIO_UID` / `JVEDIO_GID` | 端口冲突；目录属主不是 1000 |
| `JVEDIO_MEDIA_ACCESS=rw` | 要让应用整理、写回或物理删除文件 |
| `JVEDIO_METATUBE_SERVER_URL` | 要抓取资料（不填只是抓取不可用） |
| `JVEDIO_BIND_ADDRESS=127.0.0.1` | **默认已监听全部网卡**；只想本机访问时改成这个 |
| `JVEDIO_ALLOWED_HOSTS` | 想限定只接受特定域名/IP（不填则由 LAN 模式自动纳入本机地址） |
| `JVEDIO_CACHE_HOST_DIR` | 想把缓存落到宿主盘（同时叠加 `-f compose.cache.yaml`） |
| `JVEDIO_AUTH_MODE=password` + `JVEDIO_ADMIN_SECRET` | headless 环境的固定口令（页面口令门见「访问控制」） |

> **⚠️ 保存前必须检查**
> - 两个目录路径换成你自己的**绝对路径**；离线导入的镜像把 `JVEDIO_IMAGE` 改成 `jvedio:12.0.0`。
> - 默认已是「局域网可访问 + 免登录」：绑定全部网卡，Host 白名单由 LAN 模式自动纳入本机地址。
> - 只想本机使用：加 `JVEDIO_BIND_ADDRESS=127.0.0.1`。需要口令：页面「设置 → 安全」开启。
> - 暂时不抓取资料可以不填 `JVEDIO_METATUBE_SERVER_URL`，阶段 2 再配。

### 4. 启动：compose 或 docker run 任选

**不想建文件？一条命令也能跑**（实测最小集——镜像已内置服务器模式与目录约定，只需补 Host 白名单和授权根两个变量）：

```sh
docker run -d --name jvedio \
  --user 1000:1000 -p 8080:8080 \
  -v /srv/jvedio/config:/config \
  -v /srv/jvedio/cache:/cache \
  -v /srv/jvedio/media:/media:ro \
  -e JVEDIO_ALLOWED_HOSTS=localhost,127.0.0.1 \
  -e JVEDIO_MEDIA_ROOTS='["/media"]' \
  ghcr.io/spartawhy117/jvedionext:12.0.0
```

- `JVEDIO_ALLOWED_HOSTS` 不带会启动即退出（安全校验硬要求）；局域网访问时把浏览器实际用的 IP 或主机名加进去（逗号分隔、可带端口）。
- `JVEDIO_MEDIA_ROOTS` 是页面目录选择器的授权根，不写则建库时看不到任何目录。
- 两个变量在 compose 流程里都由模板代填了，所以 compose 用户无感。

**推荐长期使用 compose**（便于升级与叠加口令等配置）。同目录新建 `compose.yaml`，内容如下（与仓库 `deployment/docker/compose.yaml` 保持一致，以仓库为准）：

```yaml
services:
  jvedio:
    image: ${JVEDIO_IMAGE:-jvedio:local}
    user: ${JVEDIO_UID:-1000}:${JVEDIO_GID:-1000}
    init: true
    read_only: true
    stop_grace_period: 45s
    ports:
      - '${JVEDIO_BIND_ADDRESS:-0.0.0.0}:${JVEDIO_PORT:-8080}:8080'
    environment:
      JVEDIO_HOST_MODE: server
      JVEDIO_DATA_DIR: /config
      JVEDIO_CACHE_DIR: /cache
      JVEDIO_LOG_DIR: /config/log
      JVEDIO_ALLOWED_HOSTS: ${JVEDIO_ALLOWED_HOSTS:-}
      JVEDIO_PUBLIC_ORIGIN: ${JVEDIO_PUBLIC_ORIGIN:-}
      JVEDIO_TRUSTED_PROXIES: ${JVEDIO_TRUSTED_PROXIES:-}
      JVEDIO_MEDIA_ROOTS: '["/media"]'
      JVEDIO_STRM_ALLOWED_ORIGINS: ${JVEDIO_STRM_ALLOWED_ORIGINS:-[]}
      JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS: ${JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS:-[]}
      JVEDIO_AUTH_MODE: ${JVEDIO_AUTH_MODE:-trusted}
      JVEDIO_METATUBE_SERVER_URL: ${JVEDIO_METATUBE_SERVER_URL:-}
    volumes:
      - '${JVEDIO_CONFIG_DIR:?Set JVEDIO_CONFIG_DIR}:/config'
      # 缓存默认走镜像内匿名卷；要落到宿主盘时叠加 -f compose.cache.yaml
      - '${JVEDIO_MEDIA_DIR:?Set JVEDIO_MEDIA_DIR}:/media:${JVEDIO_MEDIA_ACCESS:-ro}'
      # 多片源：取消下一行注释并按需复制
      # - /volume2/AV:/media/av:ro
    tmpfs:
      - /tmp:size=1g,mode=1777
```

> **💡 提示**：compose 字段与开发仓库 `deployment/docker/compose.yaml` 完全一致，env 就是仓库 `.env.example` 的精简版——必改的只有开头 3 行（镜像 + 两个目录），其余全部有默认值；照抄本文即可完成部署，不需要获取源码。

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

媒体路径**不需要写进任何配置文件**：阶段 1 把片源挂到容器 `/media` 后，后端会按挂载指纹把 `/media` 登记为授权根；页面新建媒体库时弹出目录选择器，浏览并选中服务器上的目录，确认后路径随建库请求写入后端。env 里的 `JVEDIO_MEDIA_DIR` 只决定「宿主机哪个目录挂进容器」，不是库的路径配置。

- 已有影片不需要提前整理，直接选它们所在的目录。
- 多块盘：把多个目录挂到 `/media/<名字>` 下（每个一条 `-v` 行），它们都会出现在目录选择器里。
- 换盘或重新挂载后，库会标记为**离线**，直到后端确认挂载指纹与登记时一致——这是防串盘设计，重新挂回原盘即恢复。

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
| 局域网共享（**默认**） | 什么都不改 | 绑定全部网卡；Host 白名单由 LAN 模式自动纳入本机网卡地址与主机名，局域网设备可直接打开 |
| 只允许本机 | `JVEDIO_BIND_ADDRESS=127.0.0.1` | 锁回回环地址，只有本机可访问 |
| 限定来源 | `JVEDIO_ALLOWED_HOSTS=192.168.1.10,media.lan` | 显式白名单优先于自动纳入（逗号分隔、不含协议、不支持通配符、可带端口） |
| 关闭自动白名单 | `JVEDIO_LAN_MODE=false` | 此时必须显式填 `JVEDIO_ALLOWED_HOSTS`，否则启动即失败 |
| 需要口令（NAS、共享网络） | **页面「设置 → 安全」开启口令门** | 12–1024 字符；开启与改密后所有已登录会话立即失效 |
| 口令（headless 固定） | `JVEDIO_AUTH_MODE=password` + 口令文件 + 叠加 `-f compose.password.yaml` | 环境显式设置优先于页面开关，适合无人值守部署 |
| 反向代理 | `JVEDIO_PUBLIC_ORIGIN=https://<你的域名>`，`JVEDIO_TRUSTED_PROXIES=<代理IP>`，白名单加上域名；代理转发 `X-Forwarded-*`、SSE 与 Range | 局域网直连是明文 HTTP，跨网段建议代理加 TLS |

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

> **⚠️ 从 12.0.0 升级时的行为变更**：默认绑定地址由 `127.0.0.1` 改为 `0.0.0.0`，升级后局域网设备可直接访问。不想要这个暴露就加 `JVEDIO_BIND_ADDRESS=127.0.0.1`。同理，`JVEDIO_CACHE_HOST_DIR` 已不再必填（缓存走镜像内匿名卷）。

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
| `JVEDIO_BIND_ADDRESS` | `0.0.0.0` | 绑定地址即访问边界；要只允许本机就设 `127.0.0.1` |
| `JVEDIO_LAN_MODE` | `true` | 白名单留空时自动纳入本机网卡地址；`false` 则必须显式填白名单 |
| `JVEDIO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | 允许的 Host 头 |
| `JVEDIO_MEDIA_DIR` | （必填） | 宿主机片源目录，挂到容器 `/media`；库的路径在页面建库时选择并写入后端，不在此配置 |
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
