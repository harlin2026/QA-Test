# 需求庫（xuqiu）

來源檔（Excel 匯出 CSV）：

- `Peterson_PRD_1.4_UserStories.csv` → 用戶故事
- `Peterson_PRD_1.4_Feature_Backlog_MobileFrontEnd.csv` → 功能任務

## 關聯

以 **feature_key** 關聯，例如：

- 故事 `US-5.1.1.1` → `5.1.1.1`
- 任務標題 `5.1.1.1 (UL-001) 微信授权登录` → `5.1.1.1`

## 資料庫

- 路徑：`qa-data/xuqiu.db`（SQLite，本機）
- Dashboard 左側 **需求庫** 可 CRUD、搜尋、查看關聯、重新匯入 CSV

## API

- `GET /api/xuqiu/status`
- `POST /api/xuqiu/import` `{ "replace": true }`
- `GET/POST /api/xuqiu/stories`、`GET/PUT/DELETE /api/xuqiu/stories/:id`
- `GET/POST /api/xuqiu/tasks`、`GET/PUT/DELETE /api/xuqiu/tasks/:id`
