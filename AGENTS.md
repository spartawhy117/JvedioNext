# AGENTS.md

## Issue 控制文件同步规则

- `.github/ISSUE_TEMPLATE/` 与 `.github/workflows/issue-template-*.yml` 属于 public / private 双仓共同维护的 issue 控制文件。
- 任何新增、删除或修改这几个文件时，必须同时同步到：
  - private `origin`
  - public `public`
- 不允许只改其中一个仓库后长期保持分叉。
- 如果 public 侧先做了 hotfix，后续必须尽快回同步到 private 工作区。
