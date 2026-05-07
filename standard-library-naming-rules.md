# 标准库命名规则

本文档面向 `JvedioNext` 用户，只回答三件事：

- 哪些命名当前能识别
- 哪些后缀当前有效
- 哪些命名当前不支持或不进入主链

## 1. 支持的命名家族

| 家族 | 当前支持 | 示例 | 备注 |
| --- | --- | --- | --- |
| 有码标准番号 | 是 | `ABP-123`、`SSIS-456`、`IPX-789` | 标准有码主链 |
| `FC2-PPV` | 是 | `FC2-PPV-4880000` | 推荐保留完整前缀 |
| 有码素人白名单 | 是 | `259LUXU-1113`、`300MIUM-635`、`200GANA-1234`、`261ARA-090`、`300MAAN-001`、`230ORE-001` | 当前支持前缀：`259LUXU`、`300MIUM`、`200GANA`、`261ARA`、`300MAAN`、`230ORE`；仍按有码处理，不走无码链路 |
| 无码主链 | 是 | `1PONDO-050426_001`、`10MUSUME-050426_01`、`PACOPACOMAMA-050426_100`、`HEYZO-3816` | 当前支持厂商：`1Pondo`、`10musume`、`pacopacomama`、`HEYZO`；必须带 `provider signal` |
| 已识别但不进主链 | 否 | `CARIBBEANCOM-050426-001`、`CARIBBEANCOMPR-030326_001` | 当前厂商：`Caribbeancom`、`Caribbeancompr`；只记规则问题，不自动进入抓取主链 |

## 2. 后缀识别规则

### 2.1 中文字幕后缀

| 后缀 | 当前处理 | 示例 |
| --- | --- | --- |
| `-C` | 字幕变体 | `ABC-123-C` |
| `-CH` | 字幕变体 | `ABC-123-CH` |

说明：

- `-C / -CH` 当前不按 multipart 处理。
- 无码影片同样只把这两个后缀当字幕变体。

### 2.2 有码 multipart

| 写法 | 当前处理 | 示例 |
| --- | --- | --- |
| 下划线数字 | multipart | `ABC-123_2` |
| 括号数字 | multipart | `ABC-123(2)` |
| 光盘/分段 | multipart | `ABC-123 CD1`、`ABC-123 DISC2` |
| `PART / PT` | multipart | `ABC-123 PART2`、`ABC-123 PT2` |

### 2.3 无码 multipart

| 写法 | 当前处理 |
| --- | --- |
| `_2`、`(2)`、`CD1`、`DISC2`、`PART2`、`PT2` | 当前不支持，不按 multipart 识别 |

### 2.4 无码尾缀恢复

以下写法当前允许恢复厂商信号后再识别：

| 示例 | 当前处理 |
| --- | --- |
| `050426_01-10MU` | 恢复为 `10musume` 家族 |
| `050426_100-PACO` | 恢复为 `pacopacomama` 家族 |

当前可忽略的描述性尾缀包括：

`1080P`、`720P`、`4K`、`HD`、`FHD`、`WEB`、`WEBDL`、`H264`、`H265`、`HEVC`、`X264`、`X265`

## 3. `.strm` 识别规则

| 项目 | 当前规则 |
| --- | --- |
| 适用范围 | 只适用于 `MetaTube` 标准库 |
| 文件名 | 必须遵循标准库命名规则 |
| 文件内容 | 只支持单行绝对 `http/https` 地址 |
| 同名本地实体共存 | 本地实体优先 |

### 支持示例

- `ABC-123.strm`
- `ABC-123_2.strm`
- `ABC-123-C.strm`
- `FC2-PPV-4880000.strm`

文件内容示例：

```txt
https://example.com/video/ABC-123.mp4
```

### 不支持示例

- `我的收藏001.strm`
- `episode01.strm`
- 本地路径：`D:\Videos\ABC-123.mp4`
- 相对路径：`../video/ABC-123.mp4`
- 其它协议：`alist://abc-123`、`rtsp://...`

更完整的 `.strm` 内容规则见 [doc/modules/22-strm-file-rules.md](./doc/modules/22-strm-file-rules.md)。

## 4. 当前不支持或不自动进入主链的情况

| 类型 | 示例 | 当前处理 |
| --- | --- | --- |
| 裸日期号无码 | `042026-001`、`050226_001`、`050426_01` | 不自动进入主链，记规则问题 |
| 单字母 multipart | `ABC-123-A`、`ABC-123-B` | 当前不作为 multipart |
| 非规则描述名 | `我的收藏001`、`episode01`、`Movie.Name.2024` | 不识别为标准库正式命名 |
| 纯数字无分隔 | `042026001` | 不识别 |

## 5. 推荐命名示例

### 有码

- `ABP-123.mp4`
- `SSIS-456-C.mp4`
- `FC2-PPV-4880000.mp4`
- `259LUXU-1113.mp4`

### 无码

- `1PONDO-050426_001.mp4`
- `10MUSUME-050426_01.mp4`
- `PACOPACOMAMA-050426_100.mp4`
- `HEYZO-3816.mp4`
