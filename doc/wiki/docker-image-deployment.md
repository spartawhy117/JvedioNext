# Docker 镜像部署与使用

> 适用于 12.0.0 起的 Linux amd64 运行时镜像：浏览器访问完整媒体库功能，不需要启动桌面端。

## 1. 获取镜像

三种方式任选其一。

**① 拉取官方镜像（推荐）**

```sh
docker pull ghcr.io/spartawhy117/jvedionext:12.0.0
```

镜像由 GitHub Actions 在每次正式发布时自动构建并推送，版本号标签与 Release 一致；`latest` 始终指向最新正式版本。

**② 使用发布页的镜像包（离线部署）**

从 GitHub Release 下载 `JvedioDocker_12.0.0_runtime_linux-amd64.tar.gz`，导入本机：

```sh
gunzip -c JvedioDocker_12.0.0_runtime_linux-amd64.tar.gz | docker load
docker images | grep jvedio
# 得到 jvedio:12.0.0
```

**③ 从源码构建**

```sh
docker build -f deployment/docker/Dockerfile --target runtime \
  --build-arg APP_VERSION=12.0.0 -t jvedio:12.0.0 .
```

镜像自带 FFmpeg / FFprobe，不需要宿主机另装，也不需要挂载 Docker socket。

## 2. 三个目录

先建三个彼此独立的宿主目录，权限与 `JVEDIO_UID:JVEDIO_GID`（默认 1000:1000）一致：

```sh
mkdir -p /srv/jvedio/config /srv/jvedio/cache /srv/jvedio/media
sudo chown -R 1000:1000 /srv/jvedio
```

| 宿主目录 | 容器内 | 作用 | 丢了会怎样 |
| --- | --- | --- | --- |
| `config` | `/config` | 数据库、设置、日志 | 媒体库与设置全丢，必须备份 |
| `cache` | `/cache` | 预览、播放缓存 | 可重建 |
| `media` | `/media` | 你的片源 | 只影响播放/扫描 |

## 3. 启动

复制 `deployment/docker/.env.example` 为自己的 env 文件，至少改三个路径与镜像名：

```sh
JVEDIO_IMAGE=ghcr.io/spartawhy117/jvedionext:12.0.0
JVEDIO_CONFIG_DIR=/srv/jvedio/config
JVEDIO_CACHE_HOST_DIR=/srv/jvedio/cache
JVEDIO_MEDIA_DIR=/srv/jvedio/media
```

然后：

```sh
docker compose --env-file /srv/jvedio/jvedio.env -f deployment/docker/compose.yaml up -d
docker compose --env-file /srv/jvedio/jvedio.env -f deployment/docker/compose.yaml logs -f
```

打开 `http://127.0.0.1:8080`。健康检查：`curl -f http://127.0.0.1:8080/health/ready`。

## 4. 访问控制

- **默认免登录（trusted）**：把访问交给绑定地址，默认只监听 `127.0.0.1`，只有本机可访问。
- **局域网共享**：`JVEDIO_BIND_ADDRESS=0.0.0.0`，并在 `JVEDIO_ALLOWED_HOSTS` 填入浏览器实际使用的主机名或 IP（逗号分隔、不含协议、不支持通配符），否则请求会被拒。
- **需要口令**（NAS、共享网络）：`JVEDIO_AUTH_MODE=password`，建一个 12–1024 字符的口令文件，填 `JVEDIO_ADMIN_SECRET=/绝对路径/口令文件`，启动时叠加 `-f deployment/docker/compose.password.yaml`。
- **反向代理**：设置 `JVEDIO_PUBLIC_ORIGIN` 与 `JVEDIO_TRUSTED_PROXIES`，并让代理传递 `X-Forwarded-*`。

## 5. 常用配置

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `JVEDIO_IMAGE` | `jvedio:local` | 镜像名与标签；官方镜像填 `ghcr.io/spartawhy117/jvedionext:<版本>` |
| `JVEDIO_PORT` | `8080` | 宿主机映射端口 |
| `JVEDIO_BIND_ADDRESS` | `127.0.0.1` | 绑定地址即访问边界 |
| `JVEDIO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | 允许的 Host 头 |
| `JVEDIO_MEDIA_ACCESS` | `ro` | `ro` 只读，整理/删除需改 `rw` |
| `JVEDIO_METATUBE_SERVER_URL` | 空 | **抓取必填**，不填任务会直接失败 |
| `JVEDIO_STRM_ALLOWED_ORIGINS` | `[]` | STRM 允许的远端 origin |
| `JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS` | `[]` | 允许的内网 STRM origin |
| `JVEDIO_UID` / `JVEDIO_GID` | `1000` | 与宿主目录属主保持一致 |

抓取需要在设置里填写 MetaTube 服务地址，或直接用上面的环境变量注入。

## 6. 升级

1. 在页面「设置 → 关于 → 容器升级」检查版本、准备升级并下载备份；
2. 确认备份已保存到容器之外；
3. 改 env 里的 `JVEDIO_IMAGE` 为目标版本（官方镜像如 `ghcr.io/spartawhy117/jvedionext:12.0.1`；仓库不会主动推送新版本，必须拉取），然后：

```sh
docker compose --env-file /srv/jvedio/jvedio.env -f deployment/docker/compose.yaml pull
docker compose --env-file /srv/jvedio/jvedio.env -f deployment/docker/compose.yaml up -d
```

维护期间 `/health/ready` 返回 503，状态查询、登录、备份与取消维护仍可用。数据被新版本初始化后旧镜像会拒绝打开，不能靠回退标签继续用旧数据。

## 7. 从 Windows 桌面端迁移

1. 桌面端导出用户数据，得到数据包；
2. 网页端导入，逐项把原 Windows 媒体根映射到 `/media` 下的目录；
3. **先把片源挂进 `/media`**——数据包不含媒体文件，只含数据库、设置与演员头像；海报、缩略图与 NFO 都是媒体旁的 sidecar，片源不在就没有海报也不能播放。

## 8. 排障

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 页面「数据加载失败」 | 本机代理劫持了 127.0.0.1 | 让代理放行本地回环 |
| 403 / Host 不匹配 | `JVEDIO_ALLOWED_HOSTS` 缺当前域名或 IP | 补上后重启容器 |
| 启动即失败 | `config`/`cache` 不可写，或目录属主与 UID 不一致 | 修正属主，别用 root 跑 |
| 抓取全部失败 | 没配 MetaTube 地址 | 填设置或 `JVEDIO_METATUBE_SERVER_URL` |
| 有库无海报、不能播放 | `/media` 里没有对应片源 | 挂载片源，路径要与库记录一致 |
| 两个实例抢同一目录 | `config`/`cache` 被重复挂载 | 一个数据目录只跑一个容器 |

日志在 `config/log/runtime/`。排障时保留 `config`、日志与原镜像，不要覆盖现有数据库，也不要用全局 `docker prune`。
