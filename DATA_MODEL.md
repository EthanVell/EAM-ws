# EAM 设备报修 · 数据模型与字段规范文档

> **关联文档**：[系统总体与前端架构设计](./ARCHITECTURE.md) · [Java 后端 RESTful 接口契约](./API_SPEC.md) · [移动端适配与现场闭环设计](./MOBILE_DESIGN.md)

---

## 1. 核心实体关系（ER 模型）

系统面向单厂区/多厂区（通过 `factory_id` 隔离，当前默认 `bencao-main`）构建了 6 个核心业务实体；在转向 Java 关系型数据库（MySQL 8 / PostgreSQL 15+）并接入移动端现场作业与消息推送后，补充 `eam_repair_order_parts` 领料明细表、`eam_media_attachment` 现场影像附件表、`sys_user_push_binding` 推送渠道绑定表与 `eam_notification` 站内通知表。

```text
┌────────────────────┐        1 : N        ┌──────────────────────────┐
│   sys_user         │────────────────────▶│   eam_repair_order       │
│  (人员与岗位角色)   │  reporter / assignee │  (故障报修闭环工单)       │
└──┬────────┬────────┘                     └──────┬─────────────┬─────┘
   │ 1:1    │ 1:N                                 │ N : 1       │ 1 : N
   ▼        ▼                                     ▼             ▼
┌──────────┐┌──────────────────────┐       ┌──────────────┐ ┌────────────────────────┐
│sys_user_ ││sys_user_push_binding │       │eam_equipment │ │eam_repair_order_parts  │
│contact   ││(企微/钉钉/WebPush凭证)│       │(设备主台账)   │ │(工单领用备件明细/Java) │
└──────────┘└──────────┬───────────┘       └──┬────────┬──┘ └───────────┬────────────┘
                       │ 1:N                  │        │                │ N : 1
                       ▼                      │ 1 : N  │ 1 : N          ▼
            ┌──────────────────────┐          ▼        ▼         ┌──────────────┐
            │  eam_notification    │  ┌──────────────┐ ┌────────┐│eam_spare_part│
            │ (站内消息与推送记录)  │  │eam_inspection│ │eam_life││(易损备件台账) │
            └──────────────────────┘  │_record       │ │cycle_  │└──────────────┘
                                      └──────┬───────┘ │log     │
                                             │         └────────┘
                                             ▼ (按 biz_type + biz_id 关联故障/点检/完工照片)
                                      ┌──────────────────────────┐
                                      │  eam_media_attachment    │
                                      │ (现场拍照取证图片附件表)  │
                                      └──────────────────────────┘
```

---

## 2. 全局字典与枚举规范

所有枚举均以英文/固定中文编码落库，前端与 Java 后端必须严格校验取值集合。

| 字典名称 | 合法取值 (`Enum`) | 显示标签 / 业务说明 |
| :--- | :--- | :--- |
| **所属车间** (`Workshop`) | `前处理车间`, `提取浓缩车间`, `制剂车间`, `包装车间` | 中药全流程四大生产车间 |
| **用户部门范围** (`UserWorkshop`) | `全厂统筹` 或上述四大车间之一 | 仅主管通常配置为 `全厂统筹` |
| **系统角色** (`UserRole`) | `operator` / `technician` / `supervisor` | 车间操作员 / 维修工程师 / 设备主管 |
| **生命周期阶段** (`LifecycleStage`) | `commissioning` / `active` / `overhaul` / `sealed` / `scrapped` | 安装验收 / 在役运行 / 大修维保 / 封存停用 / 报废注销 |
| **运行健康态** (`HealthStatus`) | `normal` / `attention` / `repairing` / `stopped` | 正常运行 / 待检预警 / 维修处理中 / 故障停机 |
| **故障分类** (`FaultCategory`) | `机械传动`, `电气控制`, `密封渗漏`, `温压异常`, `清洁与筛网`, `其他故障` | 用于故障归因统计 |
| **工单紧急度** (`RepairUrgency`) | `normal` / `high` / `critical` | 常规处理 / 优先加急 / 停机紧急（触发 `stopped`） |
| **工单状态** (`RepairStatus`) | `pending` / `in_progress` / `verifying` / `closed` | 待接单 / 维修中 / 待验收 / 已闭环（终态） |
| **点检班次** (`ShiftType`) | `早班`, `中班`, `夜班` | 每日三班点检维度 |
| **点检结果** (`InspectionResult`) | `pass` / `abnormal` | 全部合格 / 发现异常 |
| **备件适用范围** (`ApplicableWorkshop`) | `通用备件` 或上述四大车间之一 | 用于快速过滤适用工段 |
| **履历事件类型** (`LifecycleEventType`) | `commissioned` / `stage_change` / `inspection` / `repair_opened` / `repair_closed` / `maintenance` | 不可变时间线事件分类 |
| **影像附件归属** (`MediaBizType`) | `repair_report` / `repair_complete` / `inspection_abnormal` | 报修现场图 / 维修完工图 / 点检异常图 |
| **消息推送通道** (`PushChannel`) | `wecom` / `dingtalk` / `webpush` | 企业微信 / 钉钉 / 浏览器 PWA WebPush |
| **推送事件类型** (`NotificationEventType`) | `ORDER_CREATED` / `ORDER_ASSIGNED` / `ORDER_CLAIMED` / `ORDER_VERIFY_NEEDED` / `ORDER_CLOSED` / `MTBF_WARNING` / `SPARE_PART_LOW_STOCK` | 移动端全闭环消息推送触发事件 |
| **外部投递状态** (`PushDeliveryStatus`) | `PENDING` / `SENT` / `FAILED` / `SKIPPED` | 外部通道投递状态（站内消息必达） |

---

## 3. 实体字段全量字典

> 约定：**原型字段名** 对应当前前端 TypeScript & Firestore；**SQL 列名** 对应后续 Java MyBatis-Plus / JPA 实体字段（驼峰映射下划线）。

### 3.1 用户档案表 (`users` / `sys_user`) & 私有联系信息 (`sys_user_contact`)

| 原型字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `uid` | `id` | `VARCHAR(128)` | 是 | 主键，正则 `^[a-zA-Z0-9_\-]+$` |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂租户标识，默认 `bencao-main` |
| `displayName` | `display_name` | `VARCHAR(80)` | 是 | 长度 `1..80`，人员姓名 |
| `role` | `role` | `VARCHAR(32)` | 是 | `UserRole` 枚举，新用户注册默认固定为 `operator` |
| `workshop` | `workshop` | `VARCHAR(32)` | 是 | `UserWorkshop` 枚举 |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 服务端生成，不可更改 |
| `updatedAt` | `updated_at` | `DATETIME(3)` | 是 | 服务端自动更新 |
| *(子表)* `email` | `email` | `VARCHAR(160)` | 是 | 隔离存储于 `sys_user_contact`，仅本人及 `supervisor` 可读 |

### 3.2 设备主台账表 (`equipment` / `eam_equipment`)

| 原型字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键（亦用作扫码 `?equip={id}` 参数），`^[a-zA-Z0-9_\-]+$` |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `code` | `code` | `VARCHAR(32)` | 是 | 设备唯一资产编码（如 `TQ-101`），`^[A-Z0-9\-]+$`，长度 `2..32` |
| `name` | `name` | `VARCHAR(100)` | 是 | 设备名称，长度 `2..100` |
| `workshop` | `workshop` | `VARCHAR(32)` | 是 | `Workshop` 枚举 |
| `processSection` | `process_section` | `VARCHAR(64)` | 是 | 所属工序工段（如 `水提/醇提工段`），长度 `1..64` |
| `model` | `model` | `VARCHAR(80)` | 是 | 型号规格，长度 `1..80` |
| `manufacturer` | `manufacturer` | `VARCHAR(100)` | 是 | 制造厂商，长度 `1..100` |
| `specs` | `specs` | `VARCHAR(200)` | 否 | 核心工艺参数（容积/功率/压力等），长度 `0..200` |
| `installDate` | `install_date` | `VARCHAR(32)` | 是 | 启用投产日期 `YYYY-MM-DD` |
| `maintenanceCycleDays` | `maintenance_cycle_days` | `INT` | 是 | 标准预防性保养周期（天），范围 `1..3650` |
| `lifecycleStage` | `lifecycle_stage` | `VARCHAR(32)` | 是 | `LifecycleStage` 枚举，`scrapped` 为终态 |
| `healthStatus` | `health_status` | `VARCHAR(32)` | 是 | `HealthStatus` 枚举 |
| `lastInspectedAt` | `last_inspected_at` | `VARCHAR(64)` | 否 | 最近点检时间文本 `YYYY-MM-DD HH:mm` 或 `尚未点检` |
| `nextMaintenanceDate` | `next_maintenance_date` | `VARCHAR(32)` | 否 | 下一次预防性维护日期 `YYYY-MM-DD` |
| `createdBy` | `created_by` | `VARCHAR(128)` | 是 | 建档人 UID（不可变） |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 服务端时间（不可变） |
| `updatedAt` | `updated_at` | `DATETIME(3)` | 是 | 服务端时间 |

### 3.3 故障报修闭环工单表 (`repairOrders` / `eam_repair_order`)

| 原型字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键，`^[a-zA-Z0-9_\-]+$` |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `orderNo` | `order_no` | `VARCHAR(32)` | 是 | 业务工单流水号（如 `WO-202611-001`），唯一索引，`^[A-Z0-9\-]+$` |
| `equipmentId` | `equipment_id` | `VARCHAR(128)` | 是 | 外键关联 `eam_equipment.id`（创建时必须存在） |
| `equipmentCode` | `equipment_code` | `VARCHAR(32)` | 是 | 冗余快照：设备编码 |
| `equipmentName` | `equipment_name` | `VARCHAR(100)` | 是 | 冗余快照：设备名称 |
| `workshop` | `workshop` | `VARCHAR(32)` | 是 | 冗余快照：`Workshop` 枚举 |
| `reporterUid` | `reporter_uid` | `VARCHAR(128)` | 是 | 报修人 UID（不可变） |
| `reporterName` | `reporter_name` | `VARCHAR(80)` | 是 | 报修人姓名快照 |
| `assigneeUid` | `assignee_uid` | `VARCHAR(128)` | 否 | 接单维修工 UID，未派单为空字符串 |
| `assigneeName` | `assignee_name` | `VARCHAR(80)` | 否 | 接单人姓名，默认 `待派单` |
| `faultCategory` | `fault_category` | `VARCHAR(32)` | 是 | `FaultCategory` 枚举 |
| `urgency` | `urgency` | `VARCHAR(16)` | 是 | `RepairUrgency` 枚举 |
| `description` | `description` | `VARCHAR(600)` | 是 | 故障现象描述，长度 `2..600` |
| `status` | `status` | `VARCHAR(24)` | 是 | `RepairStatus` 枚举，普通新建固定为 `pending` |
| `rootCause` | `root_cause` | `VARCHAR(400)` | 否 | 故障根本原因，长度 `0..400` |
| `resolution` | `resolution` | `VARCHAR(600)` | 否 | 现场处理措施与测试结果，长度 `0..600` |
| `downtimeMinutes` | `downtime_minutes` | `INT` | 是 | 累计停机时长（分钟），范围 `0..100000`，初始 `0` |
| `partsSummary` | `parts_summary` | `VARCHAR(300)` | 否 | 领用备件摘要文本；Java 端建议同步落库明细子表 `eam_order_part_usage` |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 提报时间（服务端生成，不可变） |
| `updatedAt` | `updated_at` | `DATETIME(3)` | 是 | 最近更新时间 |

### 3.4 车间日常点检记录表 (`inspections` / `eam_inspection_record`)

> **不可变审计表**：点检提交后禁止客户端修改或删除。

| 原型字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键，`^[a-zA-Z0-9_\-]+$` |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `equipmentId` | `equipment_id` | `VARCHAR(128)` | 是 | 关联 `eam_equipment.id` |
| `equipmentCode` | `equipment_code` | `VARCHAR(32)` | 是 | 设备编码快照 |
| `equipmentName` | `equipment_name` | `VARCHAR(100)` | 是 | 设备名称快照 |
| `workshop` | `workshop` | `VARCHAR(32)` | 是 | `Workshop` 枚举 |
| `inspectorUid` | `inspector_uid` | `VARCHAR(128)` | 是 | 点检人 UID |
| `inspectorName` | `inspector_name` | `VARCHAR(80)` | 是 | 点检人姓名 |
| `shift` | `shift` | `VARCHAR(16)` | 是 | `ShiftType` 枚举（`早班` / `中班` / `夜班`） |
| `overallResult` | `overall_result` | `VARCHAR(16)` | 是 | `pass` / `abnormal` |
| `summaryNote` | `summary_note` | `VARCHAR(500)` | 否 | 巡检读数与备注，长度 `0..500` |
| `checkItemsSummary` | `check_items_summary` | `VARCHAR(1000)` | 是 | 检查项明细摘要（Java 端可存 JSON 数组列 `check_items_json`） |
| `linkedOrderNo` | `linked_order_no` | `VARCHAR(32)` | 否 | 若异常直通报修，记录生成的工单流水号 |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 点检提交时间 |

### 3.5 易损备件库存表 (`spareParts` / `eam_spare_part`)

| 原型字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键 |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `partCode` | `part_code` | `VARCHAR(32)` | 是 | 备件编码（如 `BJ-MF01`），唯一索引，`^[A-Z0-9\-]+$` |
| `name` | `name` | `VARCHAR(100)` | 是 | 备件名称，长度 `2..100` |
| `spec` | `spec` | `VARCHAR(120)` | 是 | 规格材质描述，长度 `1..120` |
| `applicableWorkshop` | `applicable_workshop` | `VARCHAR(32)` | 是 | `通用备件` 或四大车间 |
| `unit` | `unit` | `VARCHAR(16)` | 是 | 计量单位（套/条/片/副/件） |
| `stockQty` | `stock_qty` | `INT` | 是 | 当前可用库存，范围 `0..100000` |
| `minThreshold` | `min_threshold` | `INT` | 是 | 安全库存预警下限，范围 `0..10000` |
| `updatedBy` | `updated_by` | `VARCHAR(128)` | 是 | 最后变更操作人 UID |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 创建时间 |
| `updatedAt` | `updated_at` | `DATETIME(3)` | 是 | 更新时间 |

### 3.6 设备生命周期履历表 (`lifecycleLogs` / `eam_lifecycle_log`)

> **不可变审计表**：任何建档、生命周期流转、点检打卡、报修创建与闭环验收均自动追加一行记录，禁止修改或删除。

| 原型字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键 |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `equipmentId` | `equipment_id` | `VARCHAR(128)` | 是 | 关联设备 ID |
| `equipmentCode` | `equipment_code` | `VARCHAR(32)` | 是 | 设备编码快照 |
| `eventType` | `event_type` | `VARCHAR(32)` | 是 | `LifecycleEventType` 枚举 |
| `title` | `title` | `VARCHAR(120)` | 是 | 事件标题（如 `工单验收闭环 [WO-202611-004]`） |
| `detail` | `detail` | `VARCHAR(500)` | 是 | 详细内容摘要 |
| `actorUid` | `actor_uid` | `VARCHAR(128)` | 是 | 操作人 UID |
| `actorName` | `actor_name` | `VARCHAR(80)` | 是 | 操作人姓名 |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 发生时间 |

### 3.7 现场影像附件表 (`eam_media_attachment` · 移动端扩展)

> 统一承接移动端扫码报修、扫码点检异常与维修完工确认上传的现场照片，避免在核心业务表中堆叠大字段。

| API 字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键，`^[a-zA-Z0-9_\-]+$` |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `bizType` | `biz_type` | `VARCHAR(32)` | 是 | `MediaBizType` 枚举（未绑定业务单前可暂存 `pending_upload`） |
| `bizId` | `biz_id` | `VARCHAR(128)` | 否 | 关联 `repair_order.id` 或 `inspection_record.id` |
| `url` | `url` | `VARCHAR(512)` | 是 | 对象存储（OSS/MinIO）访问地址 |
| `mimeType` | `mime_type` | `VARCHAR(64)` | 是 | 限制 `image/jpeg`、`image/png`、`image/webp` |
| `sizeBytes` | `size_bytes` | `INT` | 是 | 压缩后字节数，上限 `5242880`（5MB） |
| `uploaderUid` | `uploader_uid` | `VARCHAR(128)` | 是 | 上传人 UID |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 上传时间 |

### 3.8 用户推送通道绑定表 (`sys_user_push_binding` · 移动端扩展)

| API 字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键 |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `uid` | `uid` | `VARCHAR(128)` | 是 | 关联 `sys_user.id` |
| `channel` | `channel` | `VARCHAR(24)` | 是 | `PushChannel` 枚举（`wecom` / `dingtalk` / `webpush`） |
| `externalTargetId` | `external_target_id` | `VARCHAR(512)` | 是 | 企微 OpenID / 钉钉 UserId / WebPush Subscription JSON |
| `quietHoursEnabled` | `quiet_hours_enabled` | `TINYINT(1)` | 是 | 非停机紧急消息是否启用夜间免打扰，默认 `0` |
| `isActive` | `is_active` | `TINYINT(1)` | 是 | 绑定有效性标记，推送退信失效时置 `0` |
| `updatedAt` | `updated_at` | `DATETIME(3)` | 是 | 最近心跳刷新时间 |

### 3.9 站内消息与推送投递表 (`eam_notification` · 移动端扩展)

| API 字段名 | SQL 列名 | 类型 / 长度 | 必填 | 校验约束与说明 |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `id` | `VARCHAR(128)` | 是 | 主键 |
| `factoryId` | `factory_id` | `VARCHAR(64)` | 是 | 工厂标识 |
| `recipientUid` | `recipient_uid` | `VARCHAR(128)` | 是 | 接收人 UID |
| `eventType` | `event_type` | `VARCHAR(32)` | 是 | `NotificationEventType` 枚举 |
| `title` | `title` | `VARCHAR(120)` | 是 | 消息卡片标题 |
| `content` | `content` | `VARCHAR(400)` | 是 | 简明正文摘要 |
| `targetType` | `target_type` | `VARCHAR(24)` | 是 | `repair_order` / `equipment` / `spare_part` |
| `targetId` | `target_id` | `VARCHAR(128)` | 是 | 关联业务主键 |
| `deepLink` | `deep_link` | `VARCHAR(256)` | 是 | 移动端/企微卡片点击直达路由（如 `/m/orders/wo_009`） |
| `isRead` | `is_read` | `TINYINT(1)` | 是 | 站内未读状态，`0` 未读 / `1` 已读 |
| `pushStatus` | `push_status` | `VARCHAR(24)` | 是 | `PushDeliveryStatus` 枚举 |
| `createdAt` | `created_at` | `DATETIME(3)` | 是 | 生成时间 |

---

## 4. 状态机与核心不变量

### 4.1 合法状态跃迁约束
1. **工单状态机**：
   - `pending` → `in_progress`（操作角色：`technician` / `supervisor`）
   - `in_progress` → `verifying`（操作角色：`technician` / `supervisor`）
   - `verifying` → `closed`（操作角色：`operator` / `supervisor`）
   - 任何处于 `closed` 终态的工单，非主管严禁回退或修改。
2. **生命周期终态锁定**：
   - 当设备处于 `scrapped`（报废注销）阶段时，禁止发起点检、报修或普通健康状态更新，仅主管可介入调整。

### 4.2 Java 关系型数据库索引与并发锁建议

- **防超卖原子扣减（备件出库）**：
  ```sql
  UPDATE eam_spare_part
     SET stock_qty = stock_qty - #{qty}, updated_by = #{actorUid}, updated_at = NOW(3)
   WHERE id = #{partId} AND factory_id = #{factoryId} AND stock_qty >= #{qty};
  ```
  若受影响行数为 `0`，立即抛出库存不足异常（`42202`）并回滚整个维修完工事务。
- **推荐复合索引**：
  - `eam_equipment`: `UNIQUE KEY uk_factory_code (factory_id, code)`, `KEY idx_ws_stage (factory_id, workshop, lifecycle_stage)`
  - `eam_repair_order`: `UNIQUE KEY uk_order_no (order_no)`, `KEY idx_status_urgency (factory_id, status, urgency, created_at DESC)`, `KEY idx_equip (equipment_id, created_at DESC)`
  - `eam_inspection_record`: `KEY idx_equip_time (equipment_id, created_at DESC)`
  - `eam_lifecycle_log`: `KEY idx_equip_log (equipment_id, created_at DESC)`
  - `eam_media_attachment`: `KEY idx_biz_media (biz_type, biz_id)`
  - `sys_user_push_binding`: `UNIQUE KEY uk_uid_channel (uid, channel, external_target_id(128))`
  - `eam_notification`: `KEY idx_recipient_unread (recipient_uid, is_read, created_at DESC)`
