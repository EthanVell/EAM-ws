# EAM 设备报修 · Java 后端 RESTful 接口契约文档 (v1)

> **关联文档**：[系统总体与前端架构设计](./ARCHITECTURE.md) · [数据模型与字段规范](./DATA_MODEL.md) · [移动端适配与现场闭环设计](./MOBILE_DESIGN.md)

---

## 1. 接口全局规范

- **Base Path**: `/api/v1`
- **数据格式**: `Content-Type: application/json; charset=utf-8`
- **时间格式**: 统一采用 ISO-8601 UTC 或东八区带偏移字符串（如 `2026-11-16T10:30:00+08:00`），日期字段统一为 `YYYY-MM-DD`。
- **认证与幂等请求头**:
  - `Authorization: Bearer <JWT_TOKEN>`（除登录接口外全部必传）
  - `X-Factory-Id: bencao-main`（多厂区扩展预留，可选，默认 `bencao-main`）
  - `X-Idempotency-Key: <UUID>`（移动端弱网写接口建议必传：`POST /repair-orders`、`POST /inspections`、`/claim`、`/complete`、`/verify`，服务端 10 分钟幂等缓存防重复提交）
- **统一响应信封**:
  ```json
  {
    "code": 0,
    "message": "ok",
    "data": {},
    "timestamp": "2026-11-16T10:30:00+08:00"
  }
  ```
- **统一分页数据结构 (`PageResult<T>`)**:
  ```json
  {
    "items": [],
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
  ```

### 业务错误码规范

| HTTP 状态 | 业务码 `code` | 含义与处理说明 |
| :---: | :---: | :--- |
| `400` | `40001` | JSON 格式错误或缺少必填参数 |
| `401` | `40101` | Token 缺失、过期或签名无效，前端引导重新登录 |
| `403` | `40301` | 当前角色无权执行该操作（如操作员尝试设备建档或补货） |
| `404` | `40401` | 指定的设备 / 工单 / 备件 / 用户不存在 |
| `409` | `40901` | 工单或生命周期状态机不允许当前跃迁（如重复接单、未维修直接验收） |
| `409` | `40902` | 资源已处于终态（`closed` 工单或 `scrapped` 设备禁止变更） |
| `409` | `40903` | 唯一编码冲突（设备编码 `code` 或备件编码 `partCode` 已存在） |
| `409` | `40904` | 幂等键 `X-Idempotency-Key` 请求正在处理或已重复提交 |
| `413` | `41301` | 上传图片超过单张 5MB 限制或单次附件数超过 5 张 |
| `422` | `42201` | 字段长度/正则/枚举校验不通过 |
| `422` | `42202` | 备件库存不足，无法完成维修领料扣库 |

---

## 2. 认证与团队角色接口 (`/auth`, `/users`)

### 2.1 登录鉴权
- **`POST /api/v1/auth/login`**（公开）
  - **用途**：验证账号/企业 SSO 凭证并签发 JWT（内置 `uid`、`role`、`factoryId`）。
  - **Request**: `{ "account": "zhangsan@bencao.com", "credential": "..." }`
  - **Response `data`**: `{ "token": "<jwt>", "expiresIn": 86400, "user": { ...UserProfile } }`

### 2.2 获取当前用户信息
- **`GET /api/v1/auth/me`**（全员）
  - **Response `data`**:
    ```json
    {
      "uid": "u_001",
      "displayName": "王工",
      "role": "supervisor",
      "workshop": "全厂统筹",
      "factoryId": "bencao-main",
      "email": "wylvyx@gmail.com"
    }
    ```

### 2.3 查询工厂成员列表
- **`GET /api/v1/users`**（全员；仅 `supervisor` 返回脱敏前 `email` 字段，其余角色不返回 `email`）
  - **Query**: `role` (可选), `workshop` (可选), `page`, `pageSize`

### 2.4 调整成员角色与所属车间
- **`PATCH /api/v1/users/{uid}/role`**（仅 `supervisor`，禁止修改本人防止自我降权锁死或越权）
  - **Request**:
    ```json
    {
      "role": "technician",
      "workshop": "提取浓缩车间"
    }
    ```

### 2.5 更新本人基础展示信息
- **`PATCH /api/v1/users/me`**（全员，服务端忽略任何传入的 `role` 字段）
  - **Request**: `{ "displayName": "李师傅", "workshop": "制剂车间" }`

---

## 3. 设备台账与生命周期接口 (`/equipment`)

### 3.1 分页查询设备列表
- **`GET /api/v1/equipment`**（全员）
  - **Query**:
    - `workshop`: `前处理车间` | `提取浓缩车间` | `制剂车间` | `包装车间`
    - `lifecycleStage`: `commissioning` | `active` | `overhaul` | `sealed` | `scrapped`
    - `healthStatus`: `normal` | `attention` | `repairing` | `stopped`
    - `keyword`: 匹配 `code` / `name` / `model` / `processSection`
    - `page` (默认 1), `pageSize` (默认 50)

### 3.2 获取单台设备详情（含电子保养卡数据）
- **`GET /api/v1/equipment/{id}`**（全员；支持现场扫码 `?equip={id}` 页面落地加载）
  - **Response `data`**:
    ```json
    {
      "id": "eq-tq-101",
      "code": "TQ-101",
      "name": "多功能中药提取罐",
      "workshop": "提取浓缩车间",
      "processSection": "水提/醇提工段",
      "model": "TQ-3000L",
      "manufacturer": "温州东富龙药机",
      "specs": "容积 3000L · 夹套设计压力 0.35MPa · 316L",
      "installDate": "2022-03-20",
      "maintenanceCycleDays": 30,
      "lifecycleStage": "active",
      "healthStatus": "normal",
      "lastInspectedAt": "2026-11-15 08:15",
      "nextMaintenanceDate": "2026-12-15",
      "totalOrderCount": 2,
      "totalDowntimeMinutes": 65
    }
    ```

### 3.3 新增设备建档
- **`POST /api/v1/equipment`**（仅 `supervisor`，事务操作）
  - **服务端事务**：校验 `code` 唯一性 → 写入 `eam_equipment`（初始 `healthStatus = "normal"`，`nextMaintenanceDate = installDate/today + maintenanceCycleDays`）→ 自动写入一条 `eventType = "commissioned"` 履历。
  - **Request**:
    ```json
    {
      "code": "TQ-105",
      "name": "真空减压浓缩罐",
      "workshop": "提取浓缩车间",
      "processSection": "减压浓缩工段",
      "model": "SJN-2000",
      "manufacturer": "温州东富龙药机",
      "specs": "容积 2000L · 316L不锈钢",
      "installDate": "2026-11-16",
      "maintenanceCycleDays": 30,
      "lifecycleStage": "active"
    }
    ```

### 3.4 编辑设备铭牌与保养周期参数
- **`PUT /api/v1/equipment/{id}`**（仅 `supervisor`）
  - **Request**: 同建档字段（`code` 若变更需重检唯一性；禁止直接修改 `lifecycleStage`）。

### 3.5 变更设备生命周期阶段
- **`POST /api/v1/equipment/{id}/lifecycle-stage`**（仅 `supervisor`，事务操作）
  - **服务端事务**：校验非 `scrapped` 终态 → 更新 `lifecycleStage` 并联动修正 `healthStatus`（转 `overhaul` 置为 `repairing`，转 `sealed`/`scrapped` 置为 `attention`）→ 写入 `eventType = "stage_change"` 不可变履历。
  - **Request**: `{ "nextStage": "overhaul", "note": "主轴大修更换轴承" }`

### 3.6 查询设备生命周期履历时间线
- **`GET /api/v1/equipment/{id}/lifecycle-logs`**（全员）
  - **Query**: `page`, `pageSize`（按 `createdAt` 倒序返回）。

---

## 4. 故障报修四步闭环接口 (`/repair-orders`)

### 4.1 查询报修工单列表
- **`GET /api/v1/repair-orders`**（全员）
  - **Query**: `status`, `urgency`, `workshop`, `equipmentId`, `myTaskOnly` (`true`/`false`, 移动端筛选待我处理/我提报工单), `keyword`, `page`, `pageSize`

### 4.1.1 查询单条报修工单详情（含照片与备件明细）
- **`GET /api/v1/repair-orders/{id}`**（全员；移动端 `/m/orders/{id}` 与推送卡片落地页调用）
  - **Response `data`**: 返回工单基础字段外，附带 `reportAttachments[]`（报修现场照片 URL 列表）、`completeAttachments[]`（维修完工照片 URL 列表）及 `consumedParts[]`（`partId`, `partCode`, `partName`, `qty`, `unit`）。

### 4.2 发起故障报修
- **`POST /api/v1/repair-orders`**（全员，事务操作）
  - **服务端事务**：校验设备存在且非 `scrapped` → 后端生成唯一 `orderNo`（如 `WO-202611-009`），取当前用户为 `reporterUid` → 工单初始 `status = "pending"` → 同步更新设备 `healthStatus`（`critical` 置为 `stopped`，否则 `repairing`）→ 写入 `repair_opened` 履历。
  - **Request**:
    ```json
    {
      "equipmentId": "eq-tq-101",
      "faultCategory": "密封渗漏",
      "urgency": "critical",
      "description": "罐底出渣门锁紧法兰处出现蒸汽及药液滴漏",
      "attachmentIds": ["att_001", "att_002"],
      "clientCapturedAt": "2026-11-16T08:15:30+08:00"
    }
    ```
    > `attachmentIds` 为可选数组（最多 5 张），来自 `/api/v1/media/upload`；`clientCapturedAt` 为移动端离线暂存场景下的现场实际提报时间（ISO-8601，可选）。
  - **Response `data`**: `{ "id": "wo_009", "orderNo": "WO-202611-009", "status": "pending" }`

### 4.3 主管派单
- **`POST /api/v1/repair-orders/{id}/assign`**（仅 `supervisor`）
  - **校验**：工单必须处于 `pending` 或 `in_progress`；目标 `assigneeUid` 须为 `technician` 或 `supervisor`。
  - **Request**: `{ "assigneeUid": "u_tech_02" }`

### 4.4 维修工接单
- **`POST /api/v1/repair-orders/{id}/claim`**（`technician` / `supervisor`）
  - **状态跃迁**：`pending` → `in_progress`（`assigneeUid` 设为当前登录人；使用条件更新防并发抢单冲突）。

### 4.5 提交维修完工与备件领用
- **`POST /api/v1/repair-orders/{id}/complete`**（`technician` / `supervisor`，**强事务 + 原子扣库**）
  - **状态跃迁**：`in_progress` → `verifying`。
  - **服务端事务**：
    1. 更新 `rootCause`、`resolution`、`downtimeMinutes`、`partsSummary`；
    2. 遍历 `consumedParts`，对每项执行库存条件扣减（`stock_qty >= qty`），写入 `eam_order_part_usage` 与库存出库流水；若任一项库存不足，整体事务回滚并返回 `42202`。
  - **Request**:
    ```json
    {
      "rootCause": "硅胶密封圈老化开裂",
      "resolution": "更换DN450耐高温食品级硅胶密封圈，保压0.25MPa 15分钟无渗漏",
      "downtimeMinutes": 45,
      "consumedParts": [
        { "partId": "part-gq02", "qty": 1 }
      ],
      "attachmentIds": ["att_003"]
    }
    ```

### 4.6 试机验收并闭环
- **`POST /api/v1/repair-orders/{id}/verify`**（`operator` / `supervisor`，事务操作）
  - **状态跃迁**：`verifying` → `closed`。
  - **Request**: `{ "verifyNote": "现场点动试机30分钟，压力与密封稳定无渗漏" }`（`verifyNote` 可选，长度 `0..300`）
  - **服务端事务**：
    1. 锁定工单为 `closed` 终态；
    2. 若该设备已无其他未闭环工单，恢复 `healthStatus = "normal"`，并将 `nextMaintenanceDate` 顺延 `今日 + maintenanceCycleDays`；
    3. 写入 `repair_closed` 不可变履历。
  - **Response `data`**: `{ "id": "wo_009", "status": "closed", "equipmentHealthStatus": "normal", "nextMaintenanceDate": "2026-12-16" }`

---

## 5. 车间日常点检接口 (`/inspections`)

### 5.1 获取车间点检标准模板
- **`GET /api/v1/inspections/templates`**（全员）
  - **Query**: `workshop`（可选，不传返回全部四车间 5 项标准工艺检查项）。

### 5.2 查询点检流水记录
- **`GET /api/v1/inspections`**（全员）
  - **Query**: `equipmentId`, `workshop`, `shift`, `overallResult`, `page`, `pageSize`

### 5.3 提交日常点检（支持异常一键直通报修）
- **`POST /api/v1/inspections`**（全员，事务操作）
  - **服务端事务**：
    1. 根据 `items` 自动判定 `overallResult`（全正常 `pass`，任一项 `ok: false` 为 `abnormal`）；
    2. 若 `overallResult == "abnormal"` 且 `createOrderIfAbnormal == true`，在同一事务内自动创建一条 `pending` 报修工单并回填 `linkedOrderNo`；
    3. 更新设备 `lastInspectedAt` 与 `healthStatus`（若设备已在 `repairing`/`stopped` 则保留故障态，否则异常未转单置 `attention`、转单置 `repairing`/`stopped`、合格置 `normal`）；
    4. 写入 `inspection` 履历（若转单额外追加 `repair_opened` 履历）。
  - **Request**:
    ```json
    {
      "equipmentId": "eq-tq-101",
      "shift": "早班",
      "items": [
        { "label": "夹套及罐内压力表、安全阀读数正常", "ok": true },
        { "label": "人孔、排渣门硅胶密封圈完好无渗漏", "ok": false }
      ],
      "summaryNote": "排渣门边缘轻度渗汽",
      "createOrderIfAbnormal": true,
      "faultCategory": "密封渗漏",
      "urgency": "high",
      "faultDescription": "早班点检发现出渣门密封圈渗汽",
      "attachmentIds": ["att_004"],
      "clientCapturedAt": "2026-11-16T08:15:30+08:00"
    }
    ```
    > 若由移动端离线队列联网补传，`clientCapturedAt` 记录现场真实点检时刻（用于班次核验与日志展示，入库审计时间仍以服务端为准）。
  - **Response `data`**: `{ "inspectionId": "ins_102", "overallResult": "abnormal", "linkedOrderNo": "WO-202611-010" }`

---

## 6. 易损备件仓储接口 (`/spare-parts`)

### 6.1 查询备件台账
- **`GET /api/v1/spare-parts`**（全员）
  - **Query**: `applicableWorkshop`, `lowStockOnly` (`true`/`false`), `keyword`, `page`, `pageSize`

### 6.2 新增备件品类
- **`POST /api/v1/spare-parts`**（仅 `supervisor`）
  - **Request**: `{ "partCode": "BJ-ZJ09", "name": "氟橡胶O型圈", "spec": "DN50 耐高温", "applicableWorkshop": "提取浓缩车间", "unit": "条", "stockQty": 10, "minThreshold": 4 }`

### 6.3 采购补货入库
- **`POST /api/v1/spare-parts/{id}/restock`**（仅 `supervisor`）
  - **Request**: `{ "addQty": 10, "note": "月度常规备品采购入库" }`
  - **Response `data`**: `{ "id": "part-mf01", "stockQty": 12 }`

### 6.4 查询备件出入库流水
- **`GET /api/v1/spare-parts/{id}/transactions`**（全员）
  - **Response `data`**: 返回入库补货与工单领料扣减的审计流水（操作人、变化量、关联工单号、时间）。

---

## 7. 仪表盘聚合分析接口 (`/dashboard`)

### 7.1 全厂运行总览
- **`GET /api/v1/dashboard/overview`**（全员）
  - **Response `data`**:
    ```json
    {
      "kpi": {
        "activeEquipmentCount": 12,
        "normalEquipmentCount": 8,
        "openOrdersCount": 3,
        "criticalOrdersCount": 1,
        "inspectionPassRate": 75,
        "inspectionTotalCount": 4,
        "lowStockPartsCount": 3
      },
      "workshopSummary": [
        { "workshop": "前处理车间", "total": 4, "normal": 2, "abnormal": 2, "openOrders": 2 }
      ]
    }
    ```

### 7.2 车间稳定性与工单分布图数据
- **`GET /api/v1/dashboard/workshop-analytics`**（全员）
  - **Response `data`**: 返回四车间的 `openOrders`、`closedOrders`、`totalDowntimeMinutes`、`faultRatePct`，以及按 `FaultCategory` 汇总的工单数量分布数组。

### 7.3 MTBF 潜在故障预警排行
- **`GET /api/v1/dashboard/mtbf-warnings`**（全员）
  - **Query**: `limit`（默认 5，传 `0` 返回全量在役设备）
  - **Response `data`**: 按 `remainingDays` 升序返回每台在役设备的 `lastServiceDate`、`lastServiceSource`、`elapsedDays`、`mtbfDays`、`remainingDays`、`usageRatioPct` 与 `riskLevel`（`critical` / `warning` / `safe`）。

---

## 8. 移动端扫码聚合、拍照上传与消息推送接口 (`/mobile`, `/media`, `/notifications`)

### 8.1 移动端一跳扫码聚合接口
- **`GET /api/v1/mobile/scan/{equipmentId}`**（全员）
  - **用途**：供移动端/企微/PDA 扫码 `/?equip={equipmentId}` 后**单次请求**拿全现场作业上下文，降低车间弱网延迟。
  - **Response `data`**:
    ```json
    {
      "equipment": { "...Equipment 铭牌与当前健康态" },
      "activeOrders": [
        { "id": "wo_009", "orderNo": "WO-202611-009", "status": "verifying", "urgency": "high", "description": "..." }
      ],
      "inspectionTemplate": [
        "夹套及罐内压力表、安全阀读数正常",
        "人孔、排渣门硅胶密封圈完好无渗漏"
      ],
      "recommendedShift": "早班",
      "latestInspection": { "id": "ins_101", "overallResult": "pass", "createdAt": "2026-11-16T08:15:00+08:00" },
      "quickActions": ["VERIFY_ORDER", "INSPECT", "REPORT_REPAIR"]
    }
    ```

### 8.2 现场拍照图片上传
- **`POST /api/v1/media/upload`**（全员）
  - **Content-Type**: `multipart/form-data`
  - **Form Fields**: `file`（`jpeg`/`png`/`webp`，单张 `<= 5MB`）、`bizType`（`repair_report` / `repair_complete` / `inspection_abnormal`）
  - **Response `data`**: `{ "attachmentId": "att_001", "url": "https://oss.example.com/eam/202611/att_001.jpg", "sizeBytes": 342180 }`

### 8.3 绑定 / 刷新移动端推送通道
- **`POST /api/v1/notifications/bindings`**（全员）
  - **用途**：登录企微/钉钉 H5 或开启 PWA WebPush 后上报个人推送凭证。
  - **Request**: `{ "channel": "wecom", "externalTargetId": "ZhangSan_WeComUserId", "quietHoursEnabled": false }`

### 8.4 查询当前用户消息中心列表
- **`GET /api/v1/notifications`**（全员）
  - **Query**: `unreadOnly` (`true`/`false`), `page`, `pageSize`
  - **Response `data`**: 在标准 `PageResult` 外附带 `unreadCount` 字段，供移动端底部「消息」Tab 角标渲染。

### 8.5 标记单条消息已读
- **`PATCH /api/v1/notifications/{id}/read`**（全员，校验 `recipientUid == currentUser.uid`）

### 8.6 一键全部标为已读
- **`POST /api/v1/notifications/read-all`**（全员）
  - **Response `data`**: `{ "updatedCount": 5 }`

### 8.7 站内实时消息与未读角标推送流（SSE）
- **`GET /api/v1/notifications/stream`**（全员，`Accept: text/event-stream`）
  - **用途**：H5/PWA 前台存活时维持轻量长连接，服务端有新通知写入时下发 `{ "event": "NEW_NOTIFICATION", "unreadCount": 3, "latest": { ... } }`；弱网断连时前端降级为每 30 秒轮询 `GET /api/v1/notifications?page=1&pageSize=1`。
