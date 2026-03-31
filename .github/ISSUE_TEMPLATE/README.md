# Issue 管理说明

当前 public 仓库只保留两个正式 issue 模板：

- `缺陷反馈`
- `功能建议`

## 模板规则

`缺陷反馈`：

- 必填：标题、`涉及模块`、`软件版本号`、`问题`、`操作方式 / 复现方式`、`日志压缩包或日志内容`
- 日志要求：
  - 用户需要压缩软件根目录下的 `log/`
  - 将压缩包直接上传到 issue 正文对应输入框
  - 只写“已上传 / 见附件 / 附件”等占位文字不通过检查

`功能建议`：

- 标题必须以 `[Feature] ` 开头
- 必填：`涉及模块`、`建议内容`、`使用场景 / 当前操作方式`
- `补充说明` 为可选

## 模块标签映射

- `标准库` -> `标准库`
- `非标准库` -> `非标准库`
- `MetaTube` -> `metatube`
- `扫描整理` -> `scan`
- `UI` -> `ui`
- `其它` -> `other`

用户可以多选模块，workflow 会自动同步对应标签。

## 自动处理流程

当前 workflow：

- `.github/workflows/issue-template-compliance.yml`
- `.github/workflows/issue-template-close.yml`

处理顺序：

1. 用户新建、编辑或重新打开 issue
2. workflow 校验模板内容是否完整
3. workflow 根据模块勾选自动补标签
4. 不合规时：
   - 自动加 `needs:compliance`
   - 自动评论缺少的内容
   - 给用户 `2` 小时补全时间
5. 超过 `2` 小时仍未补全时：
   - 自动评论说明原因
   - 自动关闭 issue

## 当前附加规则

- `BUG` 如果没有勾选任何模块：
  - 除了 `needs:compliance`
  - 还会额外加 `needs:triage`
- `功能建议` 如果勾选了 `其它`：
  - workflow 会自动评论
  - 提醒用户尽量改成更具体的模块

## 修复与关闭规则

- 当前默认不使用额外的 `fix` 标签来表示“已修复”。
- issue 类型仍以 `bug`、`enhancement` 为主，关闭动作优先交给 GitHub 的 closing keywords 自动完成。
- 当前双仓推荐写法：
  - 在 private 仓库的 PR 描述或最终合并提交信息中写：`Fixes spartawhy117/JvedioNext#<issue-number>`
- 如果修复只在 private 仓库落地、但还没有进入 public 用户可获取的版本：
  - 先在对应 issue 评论说明当前状态
  - 不要只因为 private 已修复就机械地立即关闭 public issue

## 维护建议

- 修改模板字段后，要同步检查 `issue-template-compliance.yml`
- 修改模块选项后，要同步更新模块标签映射
- 如果要补扫历史 open issues，可再次按当前规则批量执行一次历史 issue 重扫
