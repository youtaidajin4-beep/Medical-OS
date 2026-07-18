# Data Model — Version 0.1

Status: 論理モデル草案（物理DB未選定）

## 原則

- 実患者PIIなし
- `status: draft` 固定
- 音声: 処理後削除（Constitution）
- AI出力と編集差分を保存

## コアエンティティ

```
Encounter ── AudioAsset
Encounter ── Transcript
Encounter ── DocumentDraft ── DocumentRevision
```

### Encounter

`id`, `encounter_date`, `status`, `case_id?`, `user_id?`

### AudioAsset

`storage_path`, `mime_type`, `uploaded_at`, `deleted_at`

### Transcript

`full_text`, `provider`, `created_at`

### DocumentDraft

`document_type`: `soap` | `clinical_note`（要確認）  
`content_json`: `{s,o,a,p}`, `ai_generated_at`, `copied_at?`

### DocumentRevision（必須）

`revision_type`: `ai_generated` | `physician_edited`  
`content_json`, `changed_at`, `changed_by_user_id?`

## 付随（要確認）

Organization, User, Case, AuditLog, DraftSourceLink

## 0.1で持たない

患者マスタ、検査値、タイムライン、EHR連携キュー

詳細API: [`08_api_specification.md`](./08_api_specification.md)
