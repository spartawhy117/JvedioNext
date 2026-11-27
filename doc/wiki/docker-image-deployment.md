# Docker 镜像部署与使用

> 适用于 12.2.0 起的 Linux amd64 官方镜像：浏览器打开即可使用完整媒体库，不需要启动桌面端。
> 零必填配置：数据默认存命名卷、片源默认 `./media`，照抄 compose 即可启动；**不需要 env 文件**。
>
> **从旧版本升级的用户**：不要直接照抄本文替换现有部署。建议先导出数据包备份，再把本文档和你现有的 `compose.yaml` / `jvedio.env` 一起交给 AI 助手，让它按文末「从旧版本迁移」「从变量模式迁移」两节逐行给出改动，确认无误后再执行。

## 快速开始

### 前置条件

- Linux x86_64 主机或 NAS（Windows / macOS 宿主机不在支持范围）。
- 已安装 Docker 与 Docker Compose v2。
- 一块存放运行数据的磁盘空间（数据库、设置、日志）。
- 你已有的片源目录（没有也能先启动空库，之后把片源挂进来再建库）。

### 镜像地址与标签

官方镜像托管在 GitHub Container Registry：

```text
ghcr.io/spartawhy117/jvedionext
```

目前只提供 `linux/amd64` 一种架构，由 GitHub Actions 在每次正式发布时自动构建并推送。

| 标签 | 含义 | 什么时候用 |
| --- | --- | --- |
| `latest` | 始终指向最新正式版本 | **默认且推荐**，跟随版本更新 |
| `X.Y.Z`（如 `12.2.0`） | 固定到某个具体版本 | 需要冻结版本时 |
| `sha256:...`（digest） | 固定到字节级一致的产物 | 生产环境，绝对不可变 |

> **digest 是最稳的锁定方式**：版本号标签的语义是「这个 tag 当前指向什么」，tag 理论上可被重建；digest 不会变。

### compose.yaml

在任意目录（例如 `/srv/jvedio`）新建 `compose.yaml`，整份照抄下面内容。**默认只需改片源挂载那一行**：

也可以直接下载（该文件随正式发布同步到 public 仓，下载后无需改名）：

```sh
mkdir -p /srv/jvedio && cd /srv/jvedio
curl -fL -o compose.yaml https://raw.githubusercontent.com/spartawhy117/JvedioNext/master/docker/compose.yaml
```

```yaml
# Jvedio Docker 主模板：零必填、零环境变量文件，照抄即可启动。
# 进阶配置（反代 / STRM / MetaTube / 口令门）见部署文档：直接在本文件加 environment 字面值。
services:
  jvedio:
    image: ghcr.io/spartawhy117/jvedionext:latest  # 锁定版本时改成 :x.y.z
    init: true
    read_only: true
    stop_grace_period: 45s
    # restart: unless-stopped      # 长期托管可打开（默认不带，避免干扰测试收尾与恢复用例）
    # user: '1000:1000'            # 绑定宿主目录且属主与镜像默认 1000:1000 不同时修改
    ports:
      - '8080:8080'                # 左侧是宿主端口；只允许本机访问时改成 '127.0.0.1:8080:8080'
    volumes:
      - jvedionext-data:/config    # 运行数据；落到宿主目录就把左侧改成 ./ 或 / 开头的路径（属主需为运行用户）
      - ./media:/media:rw          # 改成你的片源目录；只想浏览、不许程序改动原片时改成 :ro
      # - /volume2/AV:/media/av:rw # 多片源：按需复制，挂成 /media 子目录（每盘可分别设置 rw / ro）
      # - /srv/jvedio/cache:/cache # 可选：播放 / 转码缓存落宿主盘（默认匿名卷，属主需为运行用户）
    # devices:                     # 可选：硬件解码透传（仅转码档生效，无设备自动回退软解）
    #   - /dev/dri:/dev/dri
    tmpfs:
      - /tmp:size=1g,mode=1777

volumes:
  # compose 短语法引用的命名卷必须在此声明；被 bind 路径覆盖时不会创建、无残留。
  jvedionext-data:
```

> `read_only: true` 表示容器根文件系统只读，运行时需要的可写路径已由 `/tmp`（tmpfs）与数据卷覆盖，**保持原样即可**。

进阶项直接在 `compose.yaml` 里加 `environment:` 填字面值即可（各配置节都有片段），不需要额外的 env 文件或叠加文件。

### 启动与验证

```sh
cd /srv/jvedio
docker compose up -d
```

`-d` 表示后台运行；想去掉 `-d` 前台看日志也行。启动后分三层判断，**不要只看一层**：

| 层次 | 检查命令 | 通过标准 | 不通过说明 |
| --- | --- | --- | --- |
| 1. 容器活着 | `docker compose ps` | 状态是 `Up` | 容器启动失败，看日志 |
| 2. 服务就绪 | `curl -f http://127.0.0.1:8080/health/ready` | 返回 200 | 应用还在初始化 |
| 3. **真的能用** | 浏览器打开 `http://127.0.0.1:8080` | 能看到主界面 | 网络 / Host 白名单问题 |

三层都通过才算装好了。默认免登录，打开直接进主界面；局域网其他设备用 `http://<服务器IP>:8080` 访问。建库、扫描、抓取等页面操作见 [软件使用指南](software-user-guide.md)。

> 命令都在 `compose.yaml` 所在目录执行。容器内命令统一用 `docker compose exec jvedio ...` 形式（service 名是 `jvedio`，改过 service 名就同步替换），不依赖容器名。

### 修改配置后如何生效

| 改动 | 生效方式 |
| --- | --- |
| `compose.yaml` 任何行（挂载、端口、`environment`） | `docker compose up -d` 重建容器；**`restart` 不重读 `environment`** |
| 页面设置 | 保存即生效 |
| `environment` 与页面同时设置同一项 | 环境变量优先（口令门被环境固定时页面开关不可改） |

建库时如果目录选择器里看不到任何目录，说明片源没挂对——确认宿主路径存在且容器内可读：

```sh
docker compose exec jvedio ls /media
```

这条命令应该列出你的影片文件。列不出来就是挂载问题，不是库配置问题。

## 配置说明

### 片源可写（rw）与只读（ro）

片源默认以可写（`rw`）挂载：标准库抓取的封面图与 NFO 能写回影片目录，扫描整理、改名、删除也能正常执行。**只想浏览播放、不希望程序改动原片时改成 `:ro`**——此时页面上的封面读不到新抓的图（封面只读取影片目录里的 sidecar 图片），抓取只能把文字资料与演员头像存进数据库，影片卡会一直没有封面。

| 能力 | `:rw`（默认） | `:ro` |
| --- | --- | --- |
| 浏览、播放、收藏、评分 | ✅ | ✅ |
| 抓取：影片资料、演员、标签入库 | ✅ | ✅ |
| 抓取：演员头像、悬停预览（写 `/config`，与片源挂载无关） | ✅ | ✅ |
| 抓取：封面图与 NFO 写回影片目录（sidecar） | ✅ | ❌ 页面缺封面，任务标记 sidecar 写入失败 |
| 扫描整理、改名、物理删除 | ✅ | ❌（整理自动跳过） |
| 读取已有 sidecar 的目录（如 MDCX 输出） | ✅ | ✅ |

**片源已由 MDCX 等外部工具生成好 sidecar、或只想保证原片绝对不被改动时，把挂载行改成 `:ro`**：

```yaml
      - '/volume1/AV:/media:ro'
```

> **⚠️ `rw` 意味着应用可以改动你的原始文件**（整理、改名、写 sidecar、物理删除）。不需要这些能力时改 `:ro`。
> `rw` 只说明挂载允许写，不代表实际能写：宿主目录属主若不是容器运行用户（默认 `1000:1000`），写入仍会失败。只读状态下的写入会返回明确错误（`server.media.read_only`），不会静默失败。

### 多个片源目录

多块盘时每个片源一条挂载，挂到 `/media` 的子目录下，它们都会出现在建库的目录选择器里：

```yaml
    volumes:
      - jvedionext-data:/config
      - '/volume1/AV:/media/av:rw'
      - '/volume2/Movies:/media/movies:rw'
```

> 片源目录**只要挂进 `/media` 或其子目录**就会被识别，不需要额外告诉程序；每盘可分别设置 `rw` / `ro`。改完 `docker compose up -d` 重建容器生效。

### 缓存落宿主盘

`/cache` 只放播放/转码的会话级临时文件（镜像内匿名卷，删容器自动清理），默认不必配置。要落到宿主盘便于观察时，在 `volumes` 里加一行：

```yaml
      - /srv/jvedio/cache:/cache
```

> bind `/cache` 的属主同样要是 `1000:1000`，否则播放/转码临时文件可能写入失败。
>
> 悬停预览不在这里：当前预览落在数据卷的 `/config/cache/video-preview`（可重建）。要把预览也放到宿主盘，需要把 `/config` 改成宿主 bind（见「数据管理」）。

### 硬件解码

硬件加速只在 `transcode` 档生效；`direct` / `remux` 不探测也不占用设备。需要烧字幕时会强制软解。

**Intel / AMD VAAPI**：宿主有 `/dev/dri` 时透传设备：

```yaml
    devices:
      - /dev/dri:/dev/dri
```

**NVIDIA NVENC**：宿主先装好 nvidia-container-toolkit，再在 compose 里声明 NVIDIA 运行时，**二选一**：

方式一（推荐，Compose v2 的 device reservation）：

```yaml
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu, video]   # video 是 NVENC 必需的，只写 gpu 无法编码
```

方式二（老版本 Compose 不识别 `deploy` 时用）：

```yaml
    runtime: nvidia
    environment:
      NVIDIA_VISIBLE_DEVICES: all
      NVIDIA_DRIVER_CAPABILITIES: compute,video,utility
```

NVIDIA 容器里没有 `/dev/dri`，toolkit 注入的是 `/dev/nvidiactl`、`/dev/nvidia0` 等节点；**只手工挂 `/dev/nvidia0` 不够**，驱动库与 capabilities 也要靠 toolkit 注入。NAS 请按其容器管理器文档配置 NVIDIA 运行时。改完重建容器生效：

```sh
docker compose up -d
```

验证设备与编码器（有输出才说明可用）：

```sh
docker compose exec jvedio sh -c 'ls /dev/nvidiactl /dev/nvidia0 2>/dev/null; ffmpeg -hide_banner -encoders 2>/dev/null | grep nvenc'
```

服务端首次转码时读取 `ffmpeg -encoders` 并检查设备：只有同时满足设备可见、`h264_vaapi` / `h264_nvenc` 编码器可用、非烧字幕三个条件才启用；否则回退 `libx264` 软解，不影响起播。NAS 上通常还需要 `group_add` 把 render/video 组加入容器。

### 访问控制与口令

默认已是「局域网可访问 + 免登录」：

| 场景 | 配置 |
| --- | --- |
| 局域网共享（**默认**） | 什么都不改 |
| 只允许本机 | 把 `ports` 换成 `- '127.0.0.1:8080:8080'` |
| 限定来源 | 加 `environment`，填 `JVEDIO_ALLOWED_HOSTS`（见下方示例） |
| 关闭自动白名单 | `JVEDIO_LAN_MODE: 'false'`，此时必须显式填白名单 |
| 需要口令 | **页面「设置 → 安全」开启口令门**（12–1024 字符） |
| 口令（无人值守） | 环境固定 password 模式 + 挂入口令文件（见下方示例） |

限定来源示例：

```yaml
    environment:
      JVEDIO_ALLOWED_HOSTS: 192.168.1.10,media.lan
      # JVEDIO_LAN_MODE: 'false'   # 关闭自动白名单时打开，且必须已填上面的白名单
```

无人值守口令门示例（口令文件仅首启读取，12–1024 字符；环境固定后页面开关不可改）：

```yaml
    environment:
      JVEDIO_AUTH_MODE: password
      JVEDIO_ADMIN_PASSWORD_FILE: /run/secrets/admin-password
    volumes:
      - jvedionext-data:/config
      - ./media:/media:rw
      - /srv/jvedio/admin-password.txt:/run/secrets/admin-password:ro
```

> **⚠️ 口令门开启或改密后，所有已登录会话立即失效**，需要重新进入。

### 反向代理与 STRM

局域网直连是明文 HTTP。跨网段或要对公网提供服务时，建议前面加一层反代做 TLS。

反代除转发普通 HTTP 与 SSE，还要允许大文件上传与 `Range`。在 `compose.yaml` 里加：

```yaml
    environment:
      JVEDIO_PUBLIC_ORIGIN: https://media.example.com
      JVEDIO_TRUSTED_PROXIES: 192.168.1.2
      JVEDIO_ALLOWED_HOSTS: media.example.com
```

> **⚠️ 不要把服务器 origin 配成 `localhost` 后要求远端浏览器使用**。

STRM 远程索引默认拒绝未授权 origin：

```yaml
    environment:
      JVEDIO_STRM_ALLOWED_ORIGINS: '["https://strm.example.com"]'
      # 访问内网 STRM 服务时再填（须为上项子集）：
      # JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS: '["http://192.168.1.20:8080"]'
```

重定向与 HLS 子资源同样受校验，不因初始地址获准就放开全部网络。

### 抓取失败与出站网络

**现象**：建库、扫描、播放都正常，但「抓取」任务全部失败或没有封面、演员信息。

先分清是「够不到 MetaTube」还是「够不到外网」——两者症状不同，处理也不同。另外：**片源挂了 `:ro` 时封面图写不进影片目录，抓取后页面仍无封面**，这与网络无关，改成 `:rw` 即可（见上节）。

**容器能不能出网。** 在部署目录执行（用 service 名，不依赖容器名）：

```sh
docker compose exec jvedio sh -c 'wget -qO- -T 8 https://example.com >/dev/null && echo OUTBOUND_OK'
```

返回 `OUTBOUND_OK` 说明容器网络通；不通就是宿主网络、DNS 或防火墙问题，与 Jvedio 配置无关。

**抓取失败先看 MetaTube。** 标准库的封面与资料来自 MetaTube 服务，不配也能浏览播放，只是没有封面和演员信息。两个入口都能生效，但**抓取/远端选择任务以环境变量优先**：

1. 环境变量 `JVEDIO_METATUBE_SERVER_URL`（重建容器生效；设置后覆盖页面地址）：

   ```yaml
    environment:
      JVEDIO_METATUBE_SERVER_URL: http://metatube:8080
   ```

2. 页面「设置 → 标准库」的 MetaTube 地址栏（保存即生效，作为未注入环境变量时的默认/回退）。

注意：容器里的 `127.0.0.1` 指容器自己，**不能**用它指向宿主上的 MetaTube。MetaTube 是另一个容器时用服务名（`http://metatube:8080`）；跑在宿主机时用宿主局域网 IP（`http://192.168.1.10:8080`）。

**需要走代理时。** 外网抓取有两条出网路径，**优先级从高到低**：

| 优先级 | 入口 | 生效方式 |
| --- | --- | --- |
| 高 | 页面「设置 → 标准库」的代理主机 / 端口 | 保存即生效，覆盖环境变量；访问回环、私有地址与 `.local` 主机时**自动直连**，不会把局域网请求送进代理 |
| 低 | 容器环境变量 `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`（加在 `compose.yaml` 的 `environment` 里） | 仅在页面没配代理时作为系统默认代理生效；改了要重建容器 |

> **⚠️ 两处不是同一件事的两种写法**。页面配置是程序自己的代理，还能自动识别内网直连；环境变量是 .NET 的系统代理兜底。配了页面代理就不要再调环境变量猜。

**代理配好仍失败时按顺序查：**

1. 用上面那条 `wget` 确认容器真能到目标域名；
2. 确认代理地址是**容器能访问**的地址（容器内的 `127.0.0.1` 是容器自己）；
3. 用 `NO_PROXY` 保留内网目标（如 `.local`、MetaTube 所在网段）；
4. 抓取任务在页面「任务中心」看具体错误码，`metatube_missing` 表示没配 MetaTube 地址，而不是网络不通。

### 环境变量参考

以下变量全部可选，写在 `compose.yaml` 的 `environment` 里即可。主模板不读取任何变量。

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `JVEDIO_ALLOWED_HOSTS` | 空 | 显式 Host 白名单（逗号分隔、不含协议、可带端口） |
| `JVEDIO_LAN_MODE` | `true` | 自动纳入本机网卡地址与主机名，并接受局域网 IP 字面量 Host |
| `JVEDIO_PUBLIC_ORIGIN` | 空 | 反代后的外部 origin |
| `JVEDIO_TRUSTED_PROXIES` | 空 | 信任的反代 IP（逗号分隔的单个 IP，不支持 CIDR 网段） |
| `JVEDIO_STRM_ALLOWED_ORIGINS` | `[]` | 允许访问的 STRM HTTP(S) origin |
| `JVEDIO_STRM_ALLOWED_PRIVATE_ORIGINS` | `[]` | 允许访问内网 STRM 的 origin（须为上项子集） |
| `JVEDIO_METATUBE_SERVER_URL` | 空 | MetaTube 地址；抓取/远端选择优先于页面设置 |
| `JVEDIO_AUTH_MODE` | 空（等同 `trusted`） | `trusted` / `password`；环境显式时覆盖页面口令门 |
| `JVEDIO_ADMIN_PASSWORD_FILE` | 空 | password 模式首启的只读密码文件（需自行挂入容器） |
| `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` | 空 | 系统默认代理，仅页面未配代理时生效 |

**容器内固定值（不用管）：** 下面这些由镜像写死，改不改都一样；列出来是为了回答「为什么这个变量我不用管」：

| 变量 | 固定值 | 为什么固定 |
| --- | --- | --- |
| `JVEDIO_HOST_MODE` | `server` | 镜像只跑服务器模式 |
| `JVEDIO_DATA_DIR` | `/config` | 与数据卷挂载点绑定 |
| `JVEDIO_CACHE_DIR` | `/cache` | 与缓存卷挂载点绑定 |
| `JVEDIO_LOG_DIR` | `/config/log` | 日志跟数据一起走，方便整体备份 |
| `JVEDIO_MEDIA_ROOTS` | `["/media"]` | 片源授权根；子目录自动可见，不需要额外声明 |

## 数据管理

### 路径与目录结构

| 容器内路径 | 归属 | 放什么 | 挂载方式 |
| --- | --- | --- | --- |
| `/config` | 程序 | 数据库、设置、头像与预览缓存、日志、升级备份 | 默认命名卷 `jvedionext-data`；改挂载行左侧可落到宿主目录 |
| `/media` | **你** | 片源（原片、sidecar） | 默认 `./media`，**必改成你的实际片源目录**，多片源挂成子目录 |
| `/cache` | 程序 | 播放/转码等会话级临时文件，可整体丢弃 | 默认镜像内匿名卷；要落宿主盘加一行挂载（见「缓存落宿主盘」） |
| `/tmp` | 程序 | 单次操作中转 | tmpfs 内存盘，已在模板里配好 |

一句话记住：**`/config` 丢了要重抓重建，`/cache` 丢了下次用时自动生成，`/media` 是你的原片、默认可写（整理与写 sidecar），不想被改动就挂 `:ro`。**

运行数据默认存放在 Docker 命名卷里：

```sh
docker volume ls | grep jvedionext-data
docker volume inspect jvedionext-data --format '{{ .Mountpoint }}'
```

卷名是 `<compose 项目名>_jvedionext-data`，在部署目录下执行时通常就是 `jvedionext-data`。容器内对应 `/config`，与桌面版 `data/{用户名}/` 结构同构：

```text
/config/
├── app_datas.sqlite            业务数据库
├── app_configs.sqlite          设置
├── server-data-version.json    数据版本 / 迁移状态（启动守卫读取）
├── media-roots.json            媒体根挂载指纹登记
├── diagnostics.json            诊断开关（可选；写入 {"enabled": true} 后重启生效，Docker 版独立于桌面版）
├── auth/                       口令门状态与会话密钥
├── tools/ffmpeg/               启动即建的 FFmpeg 工具目录
├── backup/<backupId>/          升级前一致备份（manifest + 两库/资源）
├── cache/actor-avatar/         演员头像（重建要重抓，随备份保留）
├── cache/video-preview/        悬停预览（可重建，不进备份与导出）
└── log/runtime/                运行日志
```

两条部署约束：SQLite 数据卷**不能直接放在 SMB/NFS 等网络共享文件系统**上；同一数据目录受单实例锁保护，不能让两个容器同时挂载使用。

> **ℹ️ 旧版 `/cache/video-preview` 残留**：12.2.0 之前匿名卷里的历史预览不会再被读取；确认不再需要后，用 `docker volume prune` 或 `docker compose down -v`（**后者会连数据卷一起删，先导出**）清理。当前预览在 `/config/cache/video-preview`，不要混在一起。

### 把数据放到宿主目录

想直接在文件管理器里看到 sqlite，或已有旧部署的数据目录要复用，把 `/config` 那一行改成宿主路径即可（`./` 或 `/` 开头就会切到 bind 挂载）：

```yaml
    volumes:
      - '/srv/jvedio/data:/config'
      - '/volume1/AV:/media:rw'
```

```sh
mkdir -p /srv/jvedio/data && sudo chown -R 1000:1000 /srv/jvedio/data
```

> **属主必须是运行用户**。容器以 `1000:1000` 运行，宿主目录属主不一致会启动即失败（日志里 `ServerDataLock` 打不开 `.server.lock`）。换用户时取消 `compose.yaml` 的 `user:` 注释并填对应数字（`user: '1001:1001'`）。
>
> 用默认命名卷时**不需要**这一步——卷初始化会继承镜像内 `/config` 的属主，这正是默认值的好处。

改完 `docker compose up -d` 重建容器生效。若原先是命名卷，旧数据不会自动搬过来，按下一节的导出 / 导入迁移。

### 备份与导出

**日常备份推荐页面导出，不要直接拷卷文件：**

1. 「设置 → 用户数据导入导出 → 导出」，得到 `JvedioUserData_*.zip`；
2. 把 zip 存到容器之外。

导出包带格式版本号与来源版本记录，可跨机器导入；**来源版本高于当前服务器版本会被拒绝**（预检报 `future_version`），请先升级再导入。直接复制 `/config` 目录不做格式校验，项目**不保证**跨版本可用。

**导出范围（服务端口径）**：先停写、等后台任务结束，再生成两库的一致快照打包；排除 `auth/`、`tools/`、`backup/`、`log/`、`server-data-version.json` 等本机状态，以及可重建的 `cache/video-preview/`；演员头像 `cache/actor-avatar/` 有网络获取成本，**保留在包内**。媒体原片与 sidecar 不在导出边界内——它们属于你的片源目录，由你自己备份。

**升级备份**是另一份东西：由「容器升级」面板触发，落在 `/config/backup/<backupId>/`，包含数据库与持久化资源的一致快照（不含预览缓存与媒体原片），可在维护态下载。注意备份**只增不减**，长期运行后需自行清理旧备份；恢复没有页面入口，靠管理员手工操作（见「升级」）。

### 迁移与导入

**换机器 / 重装：**

1. 老机器导出 zip；
2. 新机器按本文装好并启动；
3. 「设置 → 用户数据导入导出 → 导入」选那个 zip。

**从桌面版（Windows）迁到 Docker 版**：同样走导出 / 导入，但 Docker 侧多一步——数据包里存的是 `E:\...` 盘符路径，容器里没有这些概念，导入流程要求你先做**媒体根映射**：

1. 上传 zip 后先做停写预检（需无后台任务；预检结果 15 分钟内有效）；
2. 为包内每个源路径根显式指定容器内的目标根（必须落在 `/media` 授权根内且真实存在）；
3. 提交后按最长前缀匹配改写库路径，再以事务日志方式替换两库与 `cache`、`reports` 等用户数据；`auth/`、`server-data-version.json`、`media-roots.json` 等服务端状态保持原位，失败自动回滚。

改写是纯字符串操作，**不访问源盘、不搬运媒体文件**；改写后文件能否访问取决于挂载是否到位。从 Docker 迁回桌面版则直接导入即可，但悬停预览不随包走，需要重新生成。

导入是**替换**而非合入：当前库数据被包内数据替换，失败自动回滚，成功后需要人工复核扫描路径告警。普通导入不覆盖服务端的认证状态、授权根与数据版本记录。

### 不要随手 down -v

| 命令 | 对数据的影响 |
| --- | --- |
| `docker compose stop` / `restart` | 数据不动 |
| `docker compose down` | 删容器与网络，**卷保留**，数据不动 |
| `docker compose down -v` | **连卷一起删，数据全部丢失** |

> **⚠️ `down -v` 前务必先导出。** 测试脚本用 `-v` 清理自己的临时项目，因为那些项目的卷是一次性的；你的生产项目不要加 `-v`。

## 升级与旧版本迁移

### 升级

> **⚠️ 12.2.0 起的数据目录变更**：运行数据默认进入命名卷 `jvedionext-data`，不再要求 `JVEDIO_CONFIG_DIR`。旧部署见下文「从旧版本迁移」。

1. 「设置 → 关于 → 容器升级」填写目标版本，并勾选确认目标镜像已在仓库或 NAS 管理器中核实；页面只校验版本格式，不会替你验证镜像是否存在。
2. 点「准备升级」：应用停止接受写入、等待后台任务结束，生成两库与持久化资源的一致备份，然后进入维护态（`/health/ready` 返回 503）。有活跃任务时会先提示处理，不会强停任务。
3. 在维护态点「下载备份」并把 zip 保存到**容器之外**。升级备份包含数据库与持久化资源，不包含媒体原片。
4. 在 Compose/NAS 管理器把镜像 tag 换成确认过的精确版本，然后重建容器：

```sh
docker compose pull
docker compose up -d
```

5. 新容器启动时检查版本并执行必要迁移；`/health/ready` 恢复 200 后再继续使用。失败时保留数据卷和备份，按日志恢复镜像/数据，不要反复强制重建。

数据卷不动，升级在位完成。

> **⚠️ 不可回退**：数据被新版本初始化后，旧镜像会拒绝打开（`server-data-version.json` 启动守卫：数据格式更高、迁移未完成、产品版本更高三种情形均拒绝启动）。升级前的备份务必保存好；真要回到旧版本，只能「旧镜像 + 匹配的升级前备份」由管理员手工恢复。
>
> **ℹ️ 镜像可用性不会自动核实**：页面只校验版本号。**桌面 Release 发布 ≠ Docker 镜像已推送**——升级前先确认能 `docker pull` 到目标 tag。
>
> **⚠️ 新默认值不会删除旧数据**：它只是不再指向旧目录。

### 从旧版本迁移

12.1.x 及更早的部署要求用 `JVEDIO_CONFIG_DIR` 指定宿主目录。升到 12.2.0 后旧数据不会被删，只是新默认值不再指向它——按下面两条任选一条。

| 出路 | 做法 | 适合 |
| --- | --- | --- |
| **改一行（推荐）** | 把 `/config` 那一行改回原路径：`- '/srv/jvedio/config:/config'`，然后 `docker compose up -d` | 不想动数据的人，最省事 |
| 导出 → 导入 | 旧部署页面导出 zip → 新部署页面导入 | 想统一成新布局，或顺带换机器 |

> 停容器再动数据，避免两份 sqlite 同时写。直接复制 `config` 目录跨版本**不做格式校验**，不保证可用；要么改回原路径，要么走导出 / 导入。

> **ℹ️ 候选版卷名变更**：12.2.0 候选期曾用命名卷 `jvedio-data`，正式版改为 `jvedionext-data`。跑过旧候选版、数据仍在旧卷的机器，升级后新模板不会自动接上旧卷——把 `/config` 挂载行改回 `jvedio-data:/config` 即可继续用旧数据（或按上面的导出 / 导入迁移）。正式版用户无需处理。

### 从变量模式迁移

旧主模板靠 `${JVEDIO_*}` 变量驱动，一个 `jvedio.env` 能改镜像、挂载、端口与权限。新主模板把这些写死在文件里，旧部署按下表改一次即可：

| 旧变量 | 新做法 |
| --- | --- |
| `JVEDIO_IMAGE` | 改 `compose.yaml` 的 `image:` 行 |
| `JVEDIO_CONFIG_DIR` | 改 `/config` 挂载行左侧 |
| `JVEDIO_MEDIA_DIR` | 改 `/media` 挂载行左侧 |
| `JVEDIO_MEDIA_ACCESS` | 改 `/media` 挂载行尾部的 `:ro` / `:rw` |
| `JVEDIO_PORT` | 改 `ports:` 行 |
| `JVEDIO_BIND_ADDRESS` | 改 `ports:` 行左侧（`127.0.0.1:8080:8080`） |
| `JVEDIO_UID` / `JVEDIO_GID` | 取消 `user:` 注释并填数字 |
| `JVEDIO_AUTH_MODE` + `JVEDIO_ADMIN_SECRET` | 加 `environment` 填 `JVEDIO_AUTH_MODE: password`，并把口令文件挂成 `/run/secrets/admin-password` |
| `JVEDIO_ALLOWED_HOSTS` / `JVEDIO_PUBLIC_ORIGIN` / `JVEDIO_TRUSTED_PROXIES` / `JVEDIO_STRM_*` / `JVEDIO_METATUBE_SERVER_URL` / `JVEDIO_LAN_MODE` | 加 `environment` 直接填字面值，变量名不变 |
| `JVEDIO_CACHE_HOST_DIR` | 加一行 `/cache` 挂载直接写宿主路径 |

> 迁移不改变数据位置：`/config` 挂载行左侧保持原值，命名卷用户继续用命名卷。旧 `jvedio.env` 里的变量按上表迁完后，该文件即可删除。
