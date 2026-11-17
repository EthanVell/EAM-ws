# EAM 设备报修 · 移动端交互设计、页面逻辑流与接口参数规范

> **关联文档**：[系统总体与前端架构设计](./ARCHITECTURE.md) · [数据模型与字段规范](./DATA_MODEL.md) · [Java 后端 RESTful 接口契约](./API_SPEC.md)

---

## 1. 移动端定位、全局页面路由与交互约束

面向中药制造**前处理、提取浓缩、制剂、包装**四大 GMP 车间的现场巡线、故障提报与抢修验收人员，移动端基于同一套 React 19 前端在 `< 768px` 视口及**企业微信 / 钉钉工作台 H5 / 工业防爆 PDA 浏览器（PWA）**下启用移动端交互工作台，实现“**桌面端重分析配置、移动端重扫码极速闭环**”。

### 1.1 全局页面路由与页面逻辑流

```text
[外部触发入口]
  ├─ A. 微信/企微/钉钉扫描设备电子保养卡二维码 ──▶ URL: /?equip={equipmentId}
  ├─ B. 点击推送消息卡片 Deep-Link              ──▶ URL: /m/orders/{orderId} 或 /?view=dashboard#mtbf
  └─ C. 直接打开企微工作台 / 手机 PWA 图标       ──▶ URL: /m/home
                                                          │
                                                          ▼
                                             [登录态前置拦截器 AuthGuard]
                                               ├─ 未登录：缓存 targetRedirectUrl ──▶ [M0 登录页 / 企业免登] ──▶ 登录成功自动回跳原目标
                                               └─ 已登录：进入移动工作台主框架 (顶部状态栏 + 底部 4 Tab)
                                                          │
           ┌──────────────────────────┬───────────────────┴──────────────────────┬──────────────────────────┐
           ▼                          ▼                                          ▼                          ▼
     [Tab 1: 工作台]             [Tab 2: 扫一扫]                            [Tab 3: 工单]              [Tab 4: 消息]
      /m/home                     /m/scan                                    /m/orders                  /m/notifications
   · 个人待办计数卡            · 调起相机/wx.scanQRCode                  · 分段 Tab：全部/待我处理   · 筛选：全部 / 未读
   · 本车间设备快览            · 解析 ?equip={id} 或设备编码              · 按 critical 紧急度置顶    · 一键全部已读
   · 弱网离线草稿提示          · 跳转 ──▶ [M1 设备扫码落地页]               · 点击进入 ──▶ [M5 工单详情] · 点击卡片直达对应页
                                          │
                ┌─────────────────────────┼─────────────────────────┐
                ▼                         ▼                         ▼
        [M2 扫码报修页]            [M3 扫码巡检页]            [M5 工单协同结单页]
        /m/repair/new              /m/inspect/new             /m/orders/{orderId}
      · 防重报修横幅提示         · 加载车间5项标准点检       · 状态驱动按钮组：
      · 6分类+3紧急度+拍照       · 一键全正常 / 异常直转单     pending ─▶ 接单/派单
      · 幂等提交 ──▶ 回跳详情    · 弱网草稿暂存 ──▶ 提交       in_progress ─▶ 领料完工
                                                               verifying ─▶ 试机验收闭环
```

### 1.2 移动端页面清单与底部导航规范

| 页面编号 | 路由路径 | 页面名称 | 核心交互职责 | 适用角色 |
| :--- | :--- | :--- | :--- | :--- |
| **M0** | `/login` | 移动端登录 / 免登页 | 企微/钉钉免登换取 JWT 或账号密码登录，携带 `redirect` 参数保持扫码上下文 | 全员 |
| **M1** | `/?equip={id}` | **设备扫码落地页** | 一跳展示设备铭牌、健康态、未闭环工单警示及基于角色的快捷动作分发 | 全员 |
| **M2** | `/m/repair/new` | **扫码报修页** | 故障分类、紧急度定级、快捷故障标签、现场压缩拍照（`<=5` 张）与防重报修提交 | 全员 |
| **M3** | `/m/inspect/new` | **设备扫码巡检页** | 自动匹配车间 5 项工艺模板、大按钮点检、异常照片取证与“一键联动转报修” | 全员 |
| **M4** | `/m/orders` | **移动工单队列页** | 分状态/紧急度/“待我处理”筛选工单卡片，支持下拉刷新 | 全员 |
| **M5** | `/m/orders/{id}` | **工单闭环详情页** | 根据工单状态与当前角色动态呈现派单、抢单、备件领料完工或试机验收动作 | 全员 |
| **M6** | `/m/notifications` | **消息与通知中心** | 站内未读通知队列、推送通道（企微/钉钉/WebPush）绑定开关与免打扰设置 | 全员 |

### 1.3 触控、拍照与弱网防重统一约束

1. **单手拇指热区规范**：所有主要提交按钮采用吸底固定通栏设计（高度 `48px~52px`）；点检切换按钮、备件 `+ / -` 步进器最小触控区域 `44px × 44px`，防戴手套误触。
2. **现场照片前端预处理**：调用 `<input type="file" accept="image/*" capture="environment">` 或容器拍照 SDK；前端通过 Canvas 将照片等比压缩至最长边 `<= 1280px`、JPEG 质量 `0.75`（单张 `<= 500KB`），再调用上传接口换取 `attachmentId`（单业务单最多 `5` 张）。
3. **全局弱网、盲区离线缓存与幂等防重协议**（完整设计见 [系统架构第 6 章](./ARCHITECTURE.md#6-移动端离线操作方案应对中药车间信号盲区)）：
   - **分级缓存（`LocalStorage` + `IndexedDB`）**：
     - `LocalStorage` 实时保存勾选进度热草稿（防拍照切换杀后台丢数）与全局待同步角标数；
     - `IndexedDB`（`eam_offline_db`）预缓存设备摘要与四车间 5 项标准点检模板（`catalog_cache`）、压缩后的现场照片二进制 `Blob`（`offline_media_blobs`）以及按 FIFO 排列的待同步队列（`sync_outbox`）。
   - **离线可用边界**：点检打卡与报修提报支持信号盲区完全离线暂存；抢单、备件领料完工与试机验收因涉及并发锁与防超卖强事务，必须联网实时提交。
   - **联网触发与幂等重放**：监听 `online`、`visibilitychange`、应用启动事件及手动「立即同步」按钮，先做轻量连通性探测，再按“先传照片换 `attachmentId`、后带固定 `X-Idempotency-Key` 与 `clientCapturedAt` 提交业务报文”的两阶段顺序同步；遇 `40902/42201` 冲突标红待人工处理。

---

## 2. 统一扫码入口与智能路由落地页（M1）

### 2.1 页面线框与交互逻辑流

```text
┌─────────────────────────────────────┐
│ ← 返回        扫码设备作业       🔔 │
├─────────────────────────────────────┤
│ [正常] TQ-101 · 多功能中药提取罐      │  <-- 铭牌卡：编码/名称/车间/工序/下次保养日
│ 提取浓缩车间 · 水提/醇提工段          │
│ 上次点检：今天 08:15 · 下次保养：12-15│
├─────────────────────────────────────┤
│ ⚠ 待处理提示（仅存在活跃工单时显示） │  <-- 若有 verifying 工单：置顶“去试机验收”按钮
│  WO-202611-009 [待验收] 出渣门渗汽   │      若有 pending/in_progress：置顶“接单/完工”按钮
│                    [ 立即处理 ▶ ]   │
├─────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐  │
│  │  ✓ 班前巡检 │   │  🔧 故障报修 │  │  <-- 底部双主动作卡片（scrapped 时置灰锁定）
│  │  (5项模板)  │   │  (带图提报) │  │
│  └─────────────┘   └─────────────┘  │
├─────────────────────────────────────┤
│ 最近履历时间线（折叠默认展示最新3条） │
└─────────────────────────────────────┘
```

**页面分支逻辑**：
1. 扫码解析出 `equipmentId`（支持完整 URL `https://.../ ?equip=eq-tq-101` 或纯 ID 字符串 `eq-tq-101`）。
2. 调用聚合接口 `GET /api/v1/mobile/scan/{equipmentId}`；若返回 `40401`，弹出「未识别的设备标签，请联系主管核对台账」并提供重新扫码按钮。
3. 若 `equipment.lifecycleStage === 'scrapped'`（已报废注销）：隐藏报修与巡检操作按钮，顶部显示红色警示条「设备已报废注销，禁止作业提报」。
4. 根据当前用户真实角色 `role` + `activeOrders` 动态突出第一优先级 CTA：
   - **操作员**：存在 `verifying` 工单 → 优先引导「试机验收结单」；否则优先「班前巡检」与「故障报修」。
   - **维修工程师**：存在 `pending` 或本人 `in_progress` 工单 → 优先跳转 `/m/orders/{id}`「立即接单/完工」。
   - **设备主管**：开放全动作（派单、抢修、验收、巡检、查看参数）。

### 2.2 场景一对应接口与参数需求

#### A. 扫码聚合上下文查询：`GET /api/v1/mobile/scan/{equipmentId}`
- **请求参数**：
  - `Header`：`Authorization: Bearer <token>`、`X-Factory-Id`
  - `Path`：`equipmentId`（`string`, 必填，如 `eq-tq-101`）
- **响应 `data` 字段需求**：

| 字段名 | 类型 | 说明与前端用途 |
| :--- | :--- | :--- |
| `equipment` | `Equipment` | 含 `id`, `code`, `name`, `workshop`, `processSection`, `lifecycleStage`, `healthStatus`, `lastInspectedAt`, `nextMaintenanceDate` |
| `activeOrders` | `RepairOrderSummary[]` | 该设备所有未闭环工单（`pending`/`in_progress`/`verifying`），用于置顶办单提醒及防重复报修 |
| `inspectionTemplate` | `string[]` | 自动按 `equipment.workshop` 匹配好的 5 项工艺点检标准文案 |
| `recommendedShift` | `ShiftType` | 根据服务端当前时间自动推断班次（`08:00-16:00` 早班 / `16:00-00:00` 中班 / `00:00-08:00` 夜班） |
| `latestInspection` | `object \| null` | 最近一次点检时间与结果摘要（`id`, `overallResult`, `inspectorName`, `createdAt`） |
| `quickActions` | `string[]` | 服务端结合权限推荐的动作编码枚举：`VERIFY_ORDER` / `CLAIM_ORDER` / `COMPLETE_ORDER` / `INSPECT` / `REPORT_REPAIR` |

#### B. 现场照片上传：`POST /api/v1/media/upload`
- **请求参数（`multipart/form-data`）**：

| 参数名 | 类型 | 必填 | 校验约束与说明 |
| :--- | :--- | :---: | :--- |
| `file` | `Binary File` | 是 | 前端压缩后图片，MIME 限 `image/jpeg`、`image/png`、`image/webp`，单张 `<= 5MB`（超限返回 `41301`） |
| `bizType` | `MediaBizType` | 是 | `repair_report`（报修图）/ `repair_complete`（完工图）/ `inspection_abnormal`（点检异常图） |

- **响应 `data`**：`{ "attachmentId": "att_001", "url": "https://.../att_001.jpg", "mimeType": "image/jpeg", "sizeBytes": 342180 }`

---

## 3. 扫码报修（Scan-to-Report）交互与接口规范（M2）

### 3.1 页面交互流程与异常分支

```text
[M1 点击故障报修] ──▶ 进入 [M2 扫码报修页 /m/repair/new?equip={id}]
                             │
             ┌───────────────┴───────────────┐
             ▼ (activeOrders 非空)            ▼ (无进行中工单)
   顶部弹出琥珀色防重提示条：             直接展开表单主体
   “已有进行中工单 WO-xxx，点击查看”
             │ (用户确认属于新故障，继续填写)
             ▼
   1. 故障分类 6宫格单选 (默认不预选，强制人工确认)
   2. 紧急度 3段开关：常规 / 优先加急 / 停机紧急
      └─ 选 [停机紧急]：红色提示“提交后设备健康态将立即置为【故障停机】并强提醒维修组”
   3. 故障现象描述 (底部置入高频词条 Tag：如“密封渗汽”“温控漂移”“电机异响”“安全阀漏气”，支持语音输入)
   4. 现场拍照取证区 (最多5张；选图后即时压缩并发上传，显示缩略图与重试角标)
             │
             ▼
   点击吸底主按钮【立即提交报修】(携带 X-Idempotency-Key)
             │
     ┌───────┼───────────────┐
     ▼ (成功) ▼ (40904 幂等重放) ▼ (网络超时/断网)
  Toast提示  直接按原成功结果    存入 IndexedDB 本地待同步队列
  “已派发    跳转工单详情页      顶部横幅提示“已离线暂存，联网自动重发”
   WO-xxx”
     │
     ▼
  跳转 [M5 工单详情页 /m/orders/{orderId}]
```

### 3.2 扫码报修接口参数需求：`POST /api/v1/repair-orders`

- **请求头**：`Authorization`（必传）、`X-Factory-Id`（可选）、`X-Idempotency-Key`（UUID，移动端必传）
- **请求体（JSON）参数表**：

| 字段名 | 类型 | 必填 | 校验约束与业务规则 |
| :--- | :--- | :---: | :--- |
| `equipmentId` | `string` | 是 | 存在且未处于 `scrapped`（否则返回 `40902`） |
| `faultCategory` | `FaultCategory` | 是 | 枚举：`机械传动` \| `电气控制` \| `密封渗漏` \| `温压异常` \| `清洁与筛网` \| `其他故障` |
| `urgency` | `RepairUrgency` | 是 | 枚举：`normal` \| `high` \| `critical` |
| `description` | `string` | 是 | 长度 `2..600` 字符，描述具体故障部位与现象 |
| `attachmentIds` | `string[]` | 否 | 经 `/api/v1/media/upload` 上传返回的附件 ID 数组，上限 `5` 个 |

- **响应 `data`**：`{ "id": "wo_009", "orderNo": "WO-202611-009", "status": "pending", "equipmentHealthStatus": "stopped" }`
- **服务端联动**：生成工单（`pending`）→ 更新设备 `healthStatus`（`critical` 置 `stopped`，否则 `repairing`）→ 写入 `repair_opened` 履历 → **事务提交后异步触发 `ORDER_CREATED` 消息推送**。

---

## 4. 设备扫码巡检（Scan-to-Inspect）交互与接口规范（M3）

### 4.1 页面交互流程与联动分支

```text
[M1 点击班前巡检] ──▶ 进入 [M3 扫码巡检页 /m/inspect/new?equip={id}]
                             │
                             ▼
             加载设备信息 + 所属车间 5 项标准工艺模板 + 推荐班次 (早班/中班/夜班可点选微调)
             [校验若 IndexedDB 存在该设备未提交草稿 ──▶ 自动恢复勾选状态并顶部提示]
                             │
                             ▼
             顶部快捷按钮：【 ⚡ 一键全部标为正常 】
             逐项点检卡片 (5张大卡片)：
               每卡展示检查项文本 + 双大按钮：[ ✓ 正常 ] / [ ✕ 异常 ]
                             │
            ┌────────────────┴────────────────┐
            ▼ (5项全为正常)                    ▼ (任意一项切换为 [✕ 异常])
   底部可选填工艺读数备注               卡片下方平滑展开【异常处置与联动面板】：
   (如：表压 0.24MPa，清场合格)           1. 必填异常说明输入框 + 现场异常拍照 (0..5张)
            │                           2. 开关：[同时直通生成故障报修单] (默认 ON)
            │                              └─ ON 时必选：faultCategory + urgency
            └────────────────┬────────────────┘
                             ▼
            点击吸底按钮【提交巡检记录】(带 X-Idempotency-Key)
                             │
                             ▼
            后端单事务执行 ──▶ 成功返回 inspectionId + (若转单) linkedOrderNo
                             │
                             ▼
            清除本地草稿 → 弹出结果反馈卡：
              · 全正常：展示“点检合格，设备运行正常” → 返回扫下一台 [打开相机扫下一台]
              · 已转单：展示“点检已记录并同步生成工单 WO-xxx” → [查看工单] / [继续巡检下一台]
```

### 4.2 设备巡检接口参数需求

#### A. 获取车间点检模板：`GET /api/v1/inspections/templates`
- **Query 参数**：`workshop`（可选，`Workshop` 枚举；若已调用过 `/mobile/scan/{equipmentId}` 可直接复用返回模板，免二次请求）
- **响应 `data`**：`{ "前处理车间": string[], "提取浓缩车间": string[], "制剂车间": string[], "包装车间": string[] }`

#### B. 提交日常巡检：`POST /api/v1/inspections`
- **请求头**：`Authorization`、`X-Idempotency-Key`（移动端必传）
- **请求体（JSON）参数表**：

| 字段名 | 类型 | 必填 | 校验约束与业务规则 |
| :--- | :--- | :---: | :--- |
| `equipmentId` | `string` | 是 | 目标设备 ID（非 `scrapped`） |
| `shift` | `ShiftType` | 是 | 枚举：`早班` \| `中班` \| `夜班` |
| `items` | `InspectionItem[]` | 是 | 数组长度 `>= 1`，每项 `{ "label": string(1..120), "ok": boolean }`；服务端据此自动计算 `overallResult` |
| `summaryNote` | `string` | 否 | 巡检读数与异常备注，长度 `0..500`；当存在 `ok: false` 项时前端强制提示填写 |
| `attachmentIds` | `string[]` | 否 | 异常现场拍照附件 ID，上限 `5` 张 |
| `createOrderIfAbnormal` | `boolean` | 是 | 异常时是否同事务直通生成报修工单（存在 `ok: false` 且设为 `true` 时以下三项必传） |
| `faultCategory` | `FaultCategory` | 条件必填 | `createOrderIfAbnormal === true` 时必填 |
| `urgency` | `RepairUrgency` | 条件必填 | `createOrderIfAbnormal === true` 时必填，默认建议 `high` |
| `faultDescription` | `string` | 条件必填 | `createOrderIfAbnormal === true` 时必填（长度 `2..600`，前端可默认由异常项与 `summaryNote` 自动拼接） |

- **响应 `data`**：`{ "inspectionId": "ins_102", "overallResult": "abnormal", "linkedOrderNo": "WO-202611-010", "linkedOrderId": "wo_010" }`

---

## 5. 消息推送与站内通知中心交互规范（M6）

### 5.1 推送通道注册与点击闭环逻辑流

```text
[阶段一：移动端初始化静默绑定]
  登录成功 / 切换角色 ──▶ 判断宿主环境：
    ├─ 企微/钉钉容器：免登获取 OpenID / UserId
    └─ PWA/移动浏览器：请求 Notification 权限并获取 WebPush Subscription
         │
         ▼
    调用 POST /api/v1/notifications/bindings 上报/刷新通道凭证

[阶段二：业务事件触发推送与触达]
  Java 事务提交成功 (@TransactionalEventListener AFTER_COMMIT)
         │
         ├─▶ 1. 写入 eam_notification 表 & SSE /notifications/stream 实时推前端红点
         └─▶ 2. 查 sys_user_push_binding ──▶ 下发企微/钉钉卡片消息或 PWA 通知
                 └─ 10分钟内同人同设备同类告警去重；critical 停机工单穿透夜间免打扰

[阶段三：用户点击消息落地]
  ├─ 从企微/钉钉卡片点击 Deep-Link ──▶ 自动携带 SSO 登录态直达 /m/orders/{orderId}
  └─ 从底部 Tab 4 [消息中心] 点击   ──▶ 调用 PATCH /notifications/{id}/read 消红点 ──▶ 跳转 deepLink
```

### 5.2 消息推送触发事件与接收人规则

| `eventType` | 触发时机 | 推送目标对象 | Deep-Link 落地页 |
| :--- | :--- | :--- | :--- |
| `ORDER_CREATED` | 报修提交 / 点检异常转单 | `critical`/`high` 推本车间及全厂 `technician` + `supervisor`；`normal` 推值班组与主管 | `/m/orders/{orderId}` |
| `ORDER_ASSIGNED` | 主管派单 | 指定 `assigneeUid` | `/m/orders/{orderId}` |
| `ORDER_CLAIMED` | 维修工接单 | 原报修人 `reporterUid`（及时感知已响应） | `/m/orders/{orderId}` |
| `ORDER_VERIFY_NEEDED` | 维修工提交完工 | 原报修人 `reporterUid` + 本车间 `operator` + `supervisor` | `/m/orders/{orderId}` |
| `ORDER_CLOSED` | 验收闭环完成 | 接单维修工程师 `assigneeUid` | `/m/orders/{orderId}` |
| `MTBF_WARNING` | 每日 08:30 巡检定时任务 | 所属车间与全厂 `supervisor` | `/?view=dashboard#mtbf` |
| `SPARE_PART_LOW_STOCK` | 领料扣库触发低于安全库存 | 全部 `supervisor` | `/?view=parts&lowStock=1` |

### 5.3 消息推送模块接口参数需求

| 接口 | Method & Path | 请求参数 | 响应 `data` 关键字段 |
| :--- | :--- | :--- | :--- |
| **绑定推送通道** | `POST /api/v1/notifications/bindings` | Body: `{ "channel": "wecom"\|"dingtalk"\|"webpush", "externalTargetId": string(1..512), "quietHoursEnabled": boolean }` | `{ "bindingId": string, "isActive": true }` |
| **消息列表查询** | `GET /api/v1/notifications` | Query: `unreadOnly` (`boolean`, 可选), `page` (`int`, 默认1), `pageSize` (`int`, 默认20) | `{ "items": NotificationItem[], "total": number, "unreadCount": number, "page": number, "pageSize": number }` |
| **单条标为已读** | `PATCH /api/v1/notifications/{id}/read` | Path: `id`（服务端校验归属本人 `recipientUid`） | `{ "id": string, "isRead": true, "unreadCount": number }` |
| **一键全部已读** | `POST /api/v1/notifications/read-all` | 无（按登录态 `uid` 批量置 `isRead=1`） | `{ "updatedCount": number, "unreadCount": 0 }` |
| **实时红点流** | `GET /api/v1/notifications/stream` | Header: `Accept: text/event-stream` | SSE 事件推送：`{ "event": "NEW_NOTIFICATION", "unreadCount": number, "latest": NotificationItem }` |

> `NotificationItem` 结构：`{ id, eventType, title, content, targetType, targetId, deepLink, isRead, createdAt }`。

---

## 6. 移动端结单流程（接单 → 领料完工 → 试机验收闭环）（M4 / M5）

为严格落实 GMP **“维修与试机确认分离”**，移动端结单由工单状态机与登录角色共同驱动底部操作区：

### 6.1 页面流与状态驱动操作图

```text
[入口：消息卡片 / 待办列表 M4 / 扫码直达] ──▶ [M5 工单协同详情页 /m/orders/{id}]
                                                    │ (调用 GET /api/v1/repair-orders/{id})
   ┌────────────────────────────────────────────────┼────────────────────────────────────────────────┐
   ▼ status: pending (待接单)                        ▼ status: in_progress (维修中)                   ▼ status: verifying (待验收)
  · 展示报修故障描述 + 现场照片缩略图(点击全屏放大)    · 展示已接单维修工与故障详情                       · 展示维修根因/措施/更换备件清单/完工照
  · 角色按钮逻辑：                                    · 角色按钮逻辑 (assignee 或 supervisor)：        · 角色按钮逻辑 (operator 或 supervisor)：
    ├─ technician / supervisor：                       吸底按钮【填写措施领料并提交完工】                 吸底绿色按钮【试机正常 · 确认验收结单】
    │   主按钮【立即抢单维修】(claim)                     └─ 打开半屏/全屏完工表单：                         ├─ 弹出确认面板(可选填验收备注 verifyNote)
    │   (若已被他人抢先接单返回40901，刷新展示接单人)         1) rootCause / resolution                      ├─ 提交 verify → 状态置 closed 终态
    └─ supervisor 额外提供：                                2) 停机时长(默认按创建时间自动估算，可手改)      └─ 恢复设备 normal + 顺延下次保养日期
        次按钮【指派给指定维修工】(assign)                  3) 备件领料选择器(按车间排序/扫码选料/实时防超卖)
                                                           4) 完工确认照片 (0..5张)
                                                           └─ 提交 complete → 转 verifying + 推送验收提醒
```

> **试机未通过异常兜底**：若操作员现场试机发现故障未消除，页面提供文字指引“如试机仍异常，请勿点击确认结单，点击右上角「重新反馈/通知维修工」发起补充报修或联系主管协调原工单处理”，确保问题不带病闭环。

### 6.2 结单闭环全量接口与参数需求

#### A. 移动工单列表与详情查询
- **`GET /api/v1/repair-orders`**
  - **Query 参数**：`status`（可选，`RepairStatus`）、`urgency`（可选）、`workshop`（可选）、`equipmentId`（可选）、`myTaskOnly`（`boolean`，`true` 时后端按角色返回“待我接单/我维修中/我报修待验”的个人队列）、`keyword`、`page`、`pageSize`。
- **`GET /api/v1/repair-orders/{id}`**
  - **响应 `data`**：在基础工单字段外，返回 `reportAttachments`（`{ id, url }[]`）、`completeAttachments`（`{ id, url }[]`）、`consumedParts`（`{ partId, partCode, partName, spec, qty, unit }[]`）及 `equipmentHealthStatus`。

#### B. 主管派单 / 维修工抢单
- **主管派单 `POST /api/v1/repair-orders/{id}/assign`**（仅 `supervisor`）
  - **Body**：`{ "assigneeUid": string }`（目标用户必须为 `technician` 或 `supervisor`）
  - **Response `data`**：`{ "id": string, "status": "in_progress", "assigneeUid": string, "assigneeName": string }`（同步触发 `ORDER_ASSIGNED` 推送）
- **维修工接单 `POST /api/v1/repair-orders/{id}/claim`**（`technician` \| `supervisor`，带 `X-Idempotency-Key`）
  - **Body**：无（服务端取当前 JWT `uid`）
  - **并发约束**：条件更新 `WHERE id = ? AND status = 'pending'`，失败返回 `40901`（工单已被其他人接单）。

#### C. 现场完工与备件原子扣库
- **备件查询 `GET /api/v1/spare-parts`**（完工弹窗挑选备件时调用）
  - **Query**：`applicableWorkshop`（前端默认传入当前设备所属车间优先排序）、`keyword`（支持扫备件仓位条码匹配 `partCode`）、`page`、`pageSize`
- **提交完工 `POST /api/v1/repair-orders/{id}/complete`**（`technician` \| `supervisor`，带 `X-Idempotency-Key`）

| 参数名 | 类型 | 必填 | 校验约束与说明 |
| :--- | :--- | :---: | :--- |
| `rootCause` | `string` | 是 | 故障根本原因，长度 `2..400` 字符 |
| `resolution` | `string` | 是 | 处理措施与自检结果，长度 `2..600` 字符 |
| `downtimeMinutes` | `number` | 是 | 整型，范围 `0..100000`（分钟） |
| `consumedParts` | `{ partId: string, qty: number }[]` | 否 | 领用备件数组，单条 `qty >= 1`；后端执行 `stock_qty >= qty` 条件扣减，不足返回 `42202` 并全事务回滚 |
| `attachmentIds` | `string[]` | 否 | 维修完工后现场确认照片，上限 `5` 张 |

- **Response `data`**：`{ "id": string, "status": "verifying", "partsSummary": string }`（同步触发 `ORDER_VERIFY_NEEDED` 推送）

#### D. 试机验收并闭环结单
- **`POST /api/v1/repair-orders/{id}/verify`**（`operator` \| `supervisor`，带 `X-Idempotency-Key`）
  - **Body**：`{ "verifyNote": string }`（可选，验收试机确认简评，长度 `0..300`）
  - **Response `data`**：
    ```json
    {
      "id": "wo_009",
      "status": "closed",
      "equipmentHealthStatus": "normal",
      "nextMaintenanceDate": "2026-12-16"
    }
    ```
  - **服务端闭环**：工单锁定为 `closed` 终态；若设备无其他未闭环工单，恢复 `normal` 并顺延保养日期；写入 `repair_closed` 不可变履历并推送 `ORDER_CLOSED`。

---

## 7. 移动端增量模块规划（后续前端开发实施参考）

在不破坏当前桌面端组件结构的前提下，按如下目录增量扩展即可接通全部移动端闭环：

- `src/hooks/useIsMobile.ts`：视口断点（`< 768px`）及企微/钉钉宿主容器识别。
- `src/utils/offlineDraft.ts`：巡检 `IndexedDB` 草稿读写、拍照 Canvas 压缩、`X-Idempotency-Key` 生成与断网重放队列。
- `src/components/mobile/`：`MobileShell.tsx`（底部 4 Tab）、`MobileScanLanding.tsx`（M1 落地分发）、`MobileRepairForm.tsx`（M2 扫码报修）、`MobileInspectionRunner.tsx`（M3 扫码巡检）、`MobileOrderQueue.tsx` & `MobileOrderDetail.tsx`（M4/M5 结单协同）、`MobileNotificationCenter.tsx`（M6 消息通知中心）。
