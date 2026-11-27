# doc/wiki 目录说明

本目录**只放要发布到 GitHub Wiki 的面向用户页面文档**。

判断标准只有一条：这份文档是否出现在 `scripts/publish-public-release.ps1` 中 `Sync-PublicWiki` 的 `$wikiPages` 同步清单里。清单外的 Markdown 不属于本目录——即使用户可读，也应放到 `doc/research/`、`doc/modules/` 或 `doc/testing/`。

## 同步机制

`Sync-PublicWiki` 用一份 `源文件名 → Wiki 页面名` 的显式映射，把本目录下的文档拷贝进 `spartawhy117/JvedioNext.wiki.git`：

| 源文件 | Wiki 页面 |
| --- | --- |
| `software-user-guide.md` | `User-Guide` |
| `webmarker-guide.md` | `WebMarker-Guide` |
| `docker-image-deployment.md` | `Docker-Deployment` |
| `standard-library-naming-rules.md` | `Naming-Rules` |
| `mdcx-compatibility-guide.md` | `MDCX-Compatibility` |
| `strm-file-rules.md` | `STRM-Rules` |

同步时脚本会清空 Wiki 仓库（除 `.git`）后按清单重建，并生成 `Home.md`、`_Sidebar.md`、`_Footer.md` 三个导航页。因此：

- **不在清单里的文件不会被发布**，本 README 也不会上 Wiki。
- 不要在 Wiki 仓库手工改页面，下次同步会被覆盖；要改就改本目录的源文件。
- 清单里的文件缺失会让脚本直接抛错并中止发布。

## 新增一个 Wiki 页面要动的地方

三处必须一起改，否则要么页面不发布，要么导航点不到：

1. 在 `doc/wiki/` 下新建页面文档（正文面向用户，不写内部实现细节）。
2. 在 `Sync-PublicWiki` 的 `$wikiPages` 里加一条 `'<文件名>.md' = '<Page-Name>'`，页面名用连字符。
3. 在同一函数的 `$homeContent` 与 `$sidebarContent` 里补导航项，放在「上手 / 规则与兼容 / 版本」中合适的分组下。

删除页面则反向执行：删文件、删映射、删导航条目。`doc/README.md` 的 `### wiki` 分区同步增删。

## 写作约束

- 面向最终用户，只写「怎么用、怎么配、怎么排障」，产品内部链路、脚本名、数据库字段不进正文。
- 跨页引用在 Wiki 里的行为与仓库内不同：本目录文件被平铺拷贝，仓库内可用的 `standard-library-naming-rules.md` 这类相对链接在 Wiki 中并不指向 `Naming-Rules` 页面。跨页链接优先使用 Wiki 页面名（如 `Naming-Rules`）或完整 URL；仓库内导航链接只服务于本地阅读。
- 正文里的图片、附件路径同样不会被脚本搬运，需要外链。
- 更新历史按 `doc/AGENTS.md` 收在文首「历史更新」小节，不散落大段增量记录。

## 与其它目录的分工

| 目录 | 承担什么 | 是否会进 Wiki |
| --- | --- | --- |
| `doc/wiki/` | 面向用户的 GitHub Wiki 页面 | 是，按 `$wikiPages` 清单 |
| `doc/research/` | 外部项目对照、概念科普、技术结论沉淀 | 否 |
| `doc/modules/` | 稳定职责域的正式设计合同 | 否 |
| `doc/testing/` | 测试类型、档位、覆盖与运行口径 | 否 |
| `docs/plan/`、`docs/checklist/` | 规划与施工稿 | 否 |
