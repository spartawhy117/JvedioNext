# Docker 镜像部署与使用

> 适用于 12.1.0 起的 Linux amd64 官方镜像：浏览器打开即可使用完整媒体库，不需要启动桌面端。

## 本文结构

| 章节 | 看什么 |
| --- | --- |
| [容器镜像](#容器镜像) | 镜像地址与标签语义 |
| [安装前准备](#安装前准备) | 系统要求、两个目录怎么规划 |
| [快速试用](#快速试用可选) | 只想看一眼效果（可跳过） |
| [正式部署](#正式部署) | 长期使用的完整配置（5 步） |
| [验证安装](#验证安装) | 三层判断是否装好 |
| [首次配置向导](#首次配置向导) | 浏览器里建库、扫描、抓取（5 步） |
| [后续步骤](#后续步骤) | 按需求索引到对应进阶章节 |
| [访问控制](#访问控制) / [多个片源目录](#多个片源目录) / [媒体写权限](#媒体写权限) / [缓存位置](#缓存位置) / [反向代理与 STRM](#反向代理与-strm) / [升级](#升级) | 进阶配置 |

## 容器镜像

官方镜像托管在 GitHub Container Registry：

```text
ghcr.io/spartawhy117/jvedionext
```

目前只提供 `linux/amd64` 一种架构。镜像由 GitHub Actions 在每次正式发布时自动构建并推送。

可用的标签：

| 标签 | 含义 | 什么时候用 |
| --- | --- | --- |
| `latest` | 始终指向最新正式版本 | **推荐**，跟随版本更新 |
| `X.Y.Z`（如 `12.1.1`） | 固定到某个具体版本 | 需要冻结版本时 |
| `sha256:...`（digest） | 固定到字节级一致的产物 | 生产环境，绝对不可变 |

> **digest 是最稳的锁定方式**：版本号标签的语义是「这个 tag 当前指向什么」，tag 理论上可被重建；digest 不会变。

## 安装前准备

### 系统要求

- Linux x86_64 主机或 NAS（Windows / macOS 宿主机不在支持范围）
- 已安装 Docker 与 Docker Compose v2
- 一块存放运行数据的磁盘空间（数据库、设置、日志）

### 规划两个目录

Jvedio 需要两个宿主目录，作用完全不同：

| 用途 | 示例路径 | 要新建吗 | 说明 |
| --- | --- | --- | --- |
| 运行数据 | `/srv/jvedio/config` | **必须新建** | 数据库、设置、日志；必须备份 |
| 片源 | `/volume1/AV` | **通常不新建** | 你已有的视频目录，按实际替换 |

> **片源目录不要动它**。已有的视频文件夹直接拿来做挂载源即可，不要移动、不要重组。
> 只有完全没有视频、从零开始时，才需要建一个空目录（如 `mkdir -p /srv/jvedio/media`）。

缓存不用准备：镜像内已有匿名卷（`/cache`），删容器自动清理。

## 快速试用（可选）

只想先看一眼效果、不打算长期跑，用这一条命令即可：

```sh
mkdir -p /srv/jvedio/config && sudo chown -R 1000:1000 /srv/jvedio

docker run -d --name jvedio -p 8080:8080 \
  -v /srv/jvedio/config:/config \
  -v /volume1/AV:/media:ro \
  ghcr.io/spartawhy117/jvedionext:latest
```

打开 `http://127.0.0.1:8080` 就能看到界面。看完后清掉：

```sh
docker rm -f jvedio
```

> 长期使用请走下一节「正式部署」。**两者不要同时跑**，会抢同一个 8080 端口。
> 如果已经跑过本节，正式部署的第 2 步（建目录）可以跳过。

## 正式部署

以下是为长期运行准备的配置，装好后升级只需改一行。

**第 1 步：拉取镜像**

```sh
docker pull ghcr.io/spartawhy117/jvedionext:latest
```

**第 2 步：创建运行数据目录**

```sh
mkdir -p /srv/jvedio/config
sudo chown -R 1000:1000 /srv/jvedio
```

> **属主必须是运行用户**。容器默认以 UID/GID `1000:1000` 运行（不用 root），`config` 属主不一致会启动即失败。换用户时改 `JVEDIO_UID` / `JVEDIO_GID`。

**第 3 步：创建 `jvedio.env`**

在 `/srv/jvedio/` 下新建这个文件（和 config 同级，**不要放进 config 里面**）：

```sh
cd /srv/jvedio
nano jvedio.env
```

内容：

```sh
JVEDIO_IMAGE=ghcr.io/spartawhy117/jvedionext:latest
JVEDIO_CONFIG_DIR=/srv/jvedio/config
JVEDIO_MEDIA_DIR=/volume1/AV
```

> `JVEDIO_MEDIA_DIR` 填**你的片源实际目录**，不是新建的空目录。

**第 4 步：创建 `compose.yaml`**

**放在同一个目录**——`/srv/jvedio/compose.yaml`，和 `jvedio.env` 并排：

```sh
cd /srv/jvedio
nano compose.yaml
```

**整份照抄即可，不需要改动任何一行**——所有可变项都从第 3 步的 `jvedio.env` 读取：

```yaml
services:
  jvedio:
    image: ${JVEDIO_IMAGE:-jvedio:local}
    container_name: jvedio
    user: ${JVEDIO_UID:-1000}:${JVEDIO_GID:-1000}
    init: true
    read_only: true
    stop_grace_period: 45s
    restart: unless-stopped
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
      JVEDIO_AUTH_MODE: ${JVEDIO_AUTH_MODE:-}
      JVEDIO_METATUBE_SERVER_URL: ${JVEDIO_METATUBE_SERVER_URL:-}
    volumes:
      - '${JVEDIO_CONFIG_DIR:?Set JVEDIO_CONFIG_DIR}:/config'
      - '${JVEDIO_MEDIA_DIR:?Set JVEDIO_MEDIA_DIR}:/media:${JVEDIO_MEDIA_ACCESS:-ro}'
    tmpfs:
      - /tmp:size=1g,mode=1777
```

这份文件里没有需要手改的常量，但值得知道关键几行从哪来：

| compose 里的行 | 值从哪来 | 要改吗 |
| --- | --- | --- |
| `image:` | `jvedio.env` 的 `JVEDIO_IMAGE` | 不用 |
| `ports:` | `JVEDIO_BIND_ADDRESS` / `JVEDIO_PORT`（默认 0.0.0.0:8080） | 端口冲突时改 env |
| `volumes:` 的 `/config` | `JVEDIO_CONFIG_DIR` | 不用 |
| `volumes:` 的 `/media` | `JVEDIO_MEDIA_DIR` 与 `JVEDIO_MEDIA_ACCESS` | 要写权限时改 env |
| `user:` | `JVEDIO_UID` / `JVEDIO_GID`（默认 1000:1000） | 目录属主不是 1000 时改 env |
| `environment:` 其余项 | 全部留空或已内置默认 | 不用 |

> `read_only: true` 表示容器根文件系统只读，运行时需要的可写路径已由 `/tmp`（tmpfs）和两个挂载点覆盖。**保持原样即可**。

**第 5 步：启动**

到这里 `/srv/jvedio/` 应该是这样：

```text
/srv/jvedio/
├── config/          # 第 2 步建的运行数据目录
├── jvedio.env       # 第 3 步建的环境变量
└── compose.yaml     # 第 4 步建的编排文件
```

在 `/srv/jvedio/` 下执行（和两个文件同目录）：

```sh
cd /srv/jvedio
docker compose --env-file jvedio.env -f compose.yaml up -d
```

`-d` 表示后台运行。想去掉 `-d` 前台看日志也行。

## 验证安装

分三层判断，**不要只看一层**：

| 层次 | 检查命令 | 通过标准 | 不通过说明 |
| --- | --- | --- | --- |
| 1. 容器活着 | `docker ps --filter name=jvedio` | 状态是 `Up` | 容器启动失败，看下一节 |
| 2. 服务就绪 | `curl -f http://127.0.0.1:8080/health/ready` | 返回 200 | 应用还在初始化 |
| 3. **真的能用** | 浏览器打开 `http://127.0.0.1:8080` | 能看到主界面 | 网络 / Host 白名单问题 |

三层都通过才算装好了。默认免登录，打开直接进主界面。

## 首次配置向导

装好之后还在终端里的部分就结束了，接下来都在浏览器里点。

### 第 1 步：打开页面

浏览器访问 `http://127.0.0.1:8080`。局域网其他设备用 `http://<服务器IP>:8080`。

> **[图片插入位置 1]**
> 主界面首次打开的样子（空媒体库状态）

### 第 2 步：新建媒体库

点「新建媒体库」，在弹出的对话框里：

| 字段 | 怎么填 |
| --- | --- |
| 库名称 | 随意，比如「我的片库」 |
| 库类型 | **标准库**（有番号、需抓取资料）或**本地库**（无番号、仅本地浏览） |
| 目录 | 点目录选择器，选中片源目录 |

> **[图片插入位置 2]**
> 新建媒体库对话框（库类型下拉 + 目录选择器）

**看不到任何目录？** 说明片源没挂对——回到安装步骤检查 `volumes` 那段，确认宿主路径存在且容器内可读：

```sh
docker exec jvedio ls /media
```

这条命令应该列出你的影片文件。列不出来就是挂载问题，不是库配置问题。

> **[图片插入位置 3]**
> 目录选择器里能看到片源目录的样子

### 第 3 步：扫描

保存库之后触发扫描。首次扫描时间取决于片源数量，可以先选一个小目录试。

> **[图片插入位置 4]**
> 扫描任务进度界面

扫描完成后库列表里应出现影片卡片。如果扫出 0 个，按顺序查：

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 0 个影片 | 目录选择器里选错了层级 | 重选到影片直接所在的目录 |
| 0 个影片 | 文件名不符合命名规则 | 见 [标准库命名规则](Naming-Rules) |
| 有卡片但没封面 | 还没抓取 | 见第 4 步 |

### 第 4 步：配置资料抓取（可选）

标准库的封面与资料来自 MetaTube 服务。**不配也能用**——浏览、播放都正常，只是没有封面和演员信息。

两种配法任选：

| 配法 | 做法 | 生效时机 |
| --- | --- | --- |
| env 注入 | `JVEDIO_METATUBE_SERVER_URL=http://<地址>:8080` | 重启容器 |
| 页面设置 | 设置 → MetaTube 配置里填地址 | 保存即生效 |

> **[图片插入位置 5]**
> 设置页的 MetaTube 配置区块

配好后在库上触发「抓取」，封面与资料会补上。

> **[图片插入位置 6]**
> 抓取完成后的影片详情页（有封面、演员、标签）

### 第 5 步：确认能播放

点开一部影片，确认能播放。不能播放通常是片源路径与库记录不一致——按第 2 步的 `docker exec jvedio ls /media` 确认文件在容器里可见。

> **[图片插入位置 7]**
> 影片播放界面

## 后续步骤

装好之后按需求挑着看：

| 你的需求 | 看这里 |
| --- | --- |
| 想让手机 / 平板也能访问 | [访问控制](#访问控制) |
| 片源散在多块盘 | [多个片源目录](#多个片源目录) |
| 要让 Jvedio 整理、改名、删除文件 | [媒体写权限](#媒体写权限) |
| 不想每次手动升级 | [升级](#升级) |
| 要把 NAS 暴露到公网 | [反向代理](#反向代理与-strm) |

## 访问控制

默认已是「局域网可访问 + 免登录」。按场景调整，改 env 后重启容器生效：

| 场景 | 配置 |
| --- | --- |
| 局域网共享（**默认**） | 什么都不改 |
| 只允许本机 | `JVEDIO_BIND_ADDRESS=127.0.0.1` |
| 限定来源 | `JVEDIO_ALLOWED_HOSTS=192.168.1.10,media.lan` |
| 关闭自动白名单 | `JVEDIO_LAN_MODE=false`，此时必须显式填白名单 |
| 需要口令 | **页面「设置 → 安全」开启口令门**（12–1024 字符） |
| 口令（无人值守） | `JVEDIO_AUTH_MODE=password` + 口令文件 + 叠加 `-f compose.password.yaml` |

> **⚠️ 口令门开启或改密后，所有已登录会话立即失效**，需要重新进入。

口令模式的 headless 配置（`compose.password.yaml`）：

```yaml
services:
  jvedio:
    environment:
      JVEDIO_AUTH_MODE: password
      JVEDIO_ADMIN_PASSWORD_FILE: /run/secrets/admin-password
    volumes:
      - '${JVEDIO_ADMIN_SECRET:?Set JVEDIO_ADMIN_SECRET}:/run/secrets/admin-password:ro'
```

```sh
docker compose --env-file jvedio.env -f compose.yaml -f compose.password.yaml up -d
```

环境显式设置优先于页面开关。

## 多个片源目录

有多块盘时，每个片源一条挂载，挂到 `/media` 的子目录下。它们都会出现在建库的目录选择器里。

在 `compose.yaml` 的 `volumes` 下追加：

```yaml
    volumes:
      - '${JVEDIO_CONFIG_DIR:?Set JVEDIO_CONFIG_DIR}:/config'
      - '/volume1/AV:/media/av:ro'
      - '/volume2/Movies:/media/movies:ro'
```

> 主片源也可以继续用 env 里的 `JVEDIO_MEDIA_DIR`，其余盘按上面追加。改完 `docker compose ... up -d` 重建容器生效。

## 媒体写权限

片源默认以只读（`ro`）挂载：浏览、播放、收藏都正常。

要让应用**整理、改名、写回或物理删除**文件，改 env：

```sh
JVEDIO_MEDIA_ACCESS=rw
```

> **⚠️ 开 `rw` 意味着应用可以改动你的原始文件**。确认要这个能力再开。

## 缓存位置

默认缓存走镜像内匿名卷，删容器自动清理。想把缓存落到宿主盘便于观察，env 加路径并叠加 `compose.cache.yaml`：

```sh
JVEDIO_CACHE_HOST_DIR=/srv/jvedio/cache
```

```sh
docker compose --env-file jvedio.env -f compose.yaml -f compose.cache.yaml up -d
```

## 反向代理与 STRM

局域网直连是明文 HTTP。跨网段或要对公网提供服务时，建议前面加一层反代做 TLS。

反代除转发普通 HTTP 与 SSE，还要允许大文件上传与 `Range`：

```sh
JVEDIO_PUBLIC_ORIGIN=https://media.example.com
JVEDIO_TRUSTED_PROXIES=192.168.1.2
JVEDIO_ALLOWED_HOSTS=media.example.com
```

> **⚠️ 不要把服务器 origin 配成 `localhost` 后要求远端浏览器使用**。

STRM 远程索引默认拒绝未授权 origin：

- `JVEDIO_STRM_ALLOWED_ORIGINS` 填精确 HTTP(S) origin（不带路径）；
- 访问内网 STRM 服务还要填 `JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS`；
- 重定向与 HLS 子资源同样受校验，不因初始地址获准就放开全部网络。

## 升级

> **⚠️ 从 12.0.0 升级到 12.1.x 的行为变更**：默认绑定地址由 `127.0.0.1` 改为 `0.0.0.0`；`JVEDIO_CACHE_HOST_DIR` 不再必填；口令门改为页面开关。

1. 页面「设置 → 关于 → 容器升级」检查版本、准备升级并下载备份；
2. 确认备份已保存到**容器之外**；
3. 拉取新镜像并重建容器：

```sh
docker compose --env-file jvedio.env -f compose.yaml pull
docker compose --env-file jvedio.env -f compose.yaml up -d
```

> **⚠️ 不可回退**：数据被新版本初始化后，旧镜像会拒绝打开。升级前的备份务必保存好。

> **ℹ️ 镜像可用性不会自动核实**：页面只校验版本号。**桌面 Release 发布 ≠ Docker 镜像已推送**——升级前先确认能 `docker pull` 到目标 tag。
