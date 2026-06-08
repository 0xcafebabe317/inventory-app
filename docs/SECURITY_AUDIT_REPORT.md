# 🔐 兔子进销存系统 — 安全审计报告

**审计日期**：2026-06-07  
**审计范围**：Go 后端 API、用户端 H5 (Vue3)、管理员 Web 端 (Vue3)、管理员 H5 端 (Vue3)、微信小程序端  
**审计方法**：白盒代码审计 + 架构审查  
**审计人员**：Claude Code (Anthropic Opus 4.8)

---

## 📊 漏洞统计

| 严重等级 | 数量 | 说明 |
|---------|------|------|
| 🔴 严重 (Critical) | 2 | 可导致系统被完全接管 |
| 🟠 高危 (High) | 4 | 可导致数据泄露或权限绕过 |
| 🟡 中危 (Medium) | 10 | 存在安全隐患但利用难度较高 |
| 🟢 低危 (Low) | 7 | 安全最佳实践建议 |

---

## 🔴 严重漏洞 (Critical)

### CVE-01: 公开的管理员创建接口

**位置**: `server/main.go:101` → `server/handler/auth.go:328-348`  
**严重等级**: 🔴 Critical

**描述**:  
`GET /api/auth/seed-admin` 是一个无需任何认证的公开端点。当系统中没有管理员账号时，任何知道此接口的人都可以创建一个管理员账号，使用配置文件中预设的用户名和密码登录，从而完全接管整个系统。

```go
// server/main.go:101 — 公开路由，无认证
r.GET("/api/auth/seed-admin", authH.SeedAdmin)
```

**影响**: 攻击者可在管理员首次登录前抢先创建管理员账号，完全接管系统后台。即使在已有管理员的情况下，此接口仍可通过暴力枚举探测管理员账号是否存在。

**修复建议**:
1. 🛡️ 移除此公开端点，管理员账号仅通过 Docker 启动时的 seed 机制创建
2. 或至少改为 POST 方法，并要求提供一个初始化密钥（seed key）

---

### CVE-02: 开发模式绕过微信登录自动创建用户

**位置**: `server/handler/auth.go:54-73`  
**严重等级**: 🔴 Critical

**描述**:  
当 WeChat AppID 未配置或为占位符时，`WechatLogin` 处理函数会自动创建带有随机手机号的用户，并直接生成 JWT token 返回。这个"开发便利"功能如果意外在生产环境启用（AppID 配置错误等），将允许任何人通过微信登录接口直接获取有效账号。

```go
// Dev mode: auto-create user so mini-program can be tested immediately
if h.Cfg.WechatAppID == "" || h.Cfg.WechatAppID == "YOUR_APPID" {
    phone := fmt.Sprintf("138%08d", time.Now().Unix()%100000000)
    user = model.User{
        Openid:             &openid,
        Phone:              phone,
        Nickname:           "开发测试",
        SubscriptionStatus: "trial",
        TrialStartAt:       time.Now(),
    }
    h.DB.Create(&user)
    // returns valid JWT tokens immediately!
}
```

**影响**: 攻击者可无限创建试用账号，绕过所有认证机制。

**修复建议**:
1. 🛡️ 通过环境变量 `ENV=development` 显式控制开发模式
2. 生产环境编译时剥离此代码路径（使用 build tags）

---

## 🟠 高危漏洞 (High)

### CVE-03: 登录接口无速率限制

**位置**: `server/main.go:97-99` (用户登录/注册)，`server/main.go:163` (管理员登录)  
**严重等级**: 🟠 High

**描述**:  
所有登录相关端点均无速率限制，攻击者可进行暴力破解攻击：
- `POST /api/auth/login` — 用户手机号+密码登录
- `POST /api/auth/register` — 用户注册
- `POST /admin/api/login` — 管理员登录

虽然有 `middleware/ratelimit.go` 中间件，但**未被应用到任何路由上**。

**影响**: 管理员密码或用户密码可被暴力破解。用户注册接口可被滥用于批量创建虚假账号。

**修复建议**:
1. 🛡️ 为所有登录端点应用 `RateLimit` 中间件（如 5次/分钟/IP）
2. 实现基于 IP + 用户名/手机号的联合限流
3. 连续失败后要求验证码

---

### CVE-04: Refresh Token 无轮转机制

**位置**: `server/handler/auth.go:281-303`，`server/utils/jwt.go:51-61`  
**严重等级**: 🟠 High

**描述**:  
Refresh Token 有效期长达 7 天，且刷新时不会轮转（即不会颁发新的 refresh token 并作废旧 token）。一旦 refresh token 被泄露，攻击者可在 7 天内持续获取新的 access token。

```go
func (h *AuthHandler) RefreshToken(c *gin.Context) {
    // 仅解析旧的 refresh token，生成新的 access token
    // 但不作废旧 refresh token，也不颁发新 refresh token
    access, _, err := utils.GenerateToken(h.Cfg.JWTSecret, claims.UserID, claims.Openid)
    utils.OK(c, gin.H{"access": access})
}
```

**影响**: 泄露的 refresh token 可被长期滥用。

**修复建议**:
1. 🛡️ 实现 Refresh Token Rotation：每次刷新时颁发新的 refresh token 并废止旧的
2. 使用 Redis 维护 refresh token 黑名单
3. 检测到重放攻击时，废止该用户的所有 refresh token

---

### CVE-05: JWT Token 存储在 localStorage (XSS 风险)

**位置**:  
- `app/src/stores/auth.ts:69` — 用户 H5 端
- `admin-frontend/src/views/Login.vue:48` — 管理员 Web 端
- `admin-h5/src/stores/auth.ts:16-17` — 管理员 H5 端
- `mini-app/utils/auth.js:13-14` — 微信小程序端

**严重等级**: 🟠 High

**描述**:  
所有前端均将 JWT access token 和 refresh token 存储在 `localStorage` / `wx.setStorageSync` 中。localStorage 可通过 XSS 攻击读取。虽然微信小程序环境相对安全，但 H5 和 Web 端面临较大 XSS 风险。

**影响**: 任意 XSS 漏洞可导致 token 被窃取，攻击者可伪装为受害用户或管理员。

**修复建议**:
1. 🛡️ Web 端改用 httpOnly + Secure + SameSite=Strict Cookie
2. 实现 CSRF Token 机制（双重提交 Cookie 模式）
3. 添加 Content-Security-Policy 头
4. 小程序端（无法使用 Cookie）可维持现状，但需做好输入验证

---

### CVE-06: 管理员 API 泄露用户手机号

**位置**: `server/handler/admin_user.go:45-49`  
**严重等级**: 🟠 High

**描述**:  
管理员用户列表接口虽然提供了 `phone_masked` 字段，但响应中的 `UserResp` 结构体嵌入了完整的 `model.User` 结构体，这意味着完整的手机号（`phone` 字段）也在 JSON 响应中暴露。

```go
type UserResp struct {
    model.User                              // ← 包含完整 phone 字段！
    PhoneMasked     string `json:"phone_masked"`
    TrialExpiresAt  string `json:"trial_expires_at,omitempty"`
}
```

**影响**: 管理员可看到所有用户的完整手机号，违反数据最小化原则。

**修复建议**:
1. 🛡️ 移除 `model.User` 的嵌入，使用显式字段列表
2. 或在 JSON 序列化前将 `phone` 字段替换为脱敏版本

---

## 🟡 中危漏洞 (Medium)

### CVE-07: 手机号枚举

**位置**: `server/handler/auth.go:121-124`  
**严重等级**: 🟡 Medium

**描述**:  
注册接口在手机号已存在时返回"该手机号已注册"，登录接口在手机号不存在时返回"手机号或密码错误"。攻击者可通过返回消息差异枚举系统中已注册的手机号。

**修复建议**:
1. 🛡️ 统一注册和登录的错误消息，如"手机号或密码错误"

---

### CVE-08: 文件上传仅校验扩展名

**位置**: `server/handler/upload.go:28-32`  
**严重等级**: 🟡 Medium

**描述**:  
`UploadAvatar` 仅通过文件扩展名校验文件类型，未验证文件的真实 MIME 类型或内容。攻击者可将恶意脚本重命名为 `.jpg` 后上传。

```go
ext := filepath.Ext(header.Filename)
allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
if !allowed[ext] {
    // 仅检查扩展名，不检查内容
```

**影响**: 可上传伪装成图片的恶意文件。

**修复建议**:
1. 🛡️ 读取文件头魔数 (magic bytes) 验证真实类型
2. 对上传图片进行重编码/压缩（去除可能的嵌入脚本）
3. 为上传目录配置禁止执行脚本的 HTTP 头

---

### CVE-09: Redis 无密码认证

**位置**: `server/config/config.go:24`，`docker-compose.yml:55-59`  
**严重等级**: 🟡 Medium

**描述**:  
Redis 服务未配置认证密码（`REDIS_PASS` 默认为空）。虽然有 Docker 网络隔离，但如果网络隔离被突破，Redis 数据可被直接访问。

**修复建议**:
1. 🛡️ 为 Redis 配置 `requirepass`
2. 在 docker-compose.yml 中通过环境变量设置密码

---

### CVE-10: MySQL 端口暴露到公网

**位置**: `docker-compose.yml:47-48`  
**严重等级**: 🟡 Medium

**描述**:  
MySQL 端口 3306 绑定到 `0.0.0.0:3306`（默认行为），使得数据库端口暴露在服务器的所有网络接口上。

```yaml
ports:
  - "3306:3306"  # 应改为 "127.0.0.1:3306:3306"
```

**影响**: 如服务器防火墙未正确配置，MySQL 端口可能被公网访问。

**修复建议**:
1. 🛡️ 将端口绑定改为 `127.0.0.1:3306:3306`

---

### CVE-11: 密码复杂度不足

**位置**: `server/handler/auth.go:111`，`server/handler/auth.go:358`  
**严重等级**: 🟡 Medium

**描述**:  
密码仅要求最少 6 个字符，无任何复杂度要求，无常见密码检查。

```go
Password string `json:"password" binding:"required,min=6"`
```

**影响**: 弱密码（如 `123456`）可通过暴力破解攻击被破解。

**修复建议**:
1. 🛡️ 提高最小长度为 8 位
2. 要求包含字母+数字
3. 检查常见弱密码黑名单

---

### CVE-12: 无账户锁定机制

**位置**: 所有登录处理函数  
**严重等级**: 🟡 Medium

**描述**:  
系统没有实现连续登录失败后的账户锁定机制，配合 CVE-03（无速率限制），暴力破解攻击可以无限制进行。

**修复建议**:
1. 🛡️ 实现连续失败计数（基于 Redis）
2. 连续 5 次失败后锁定账号 15 分钟
3. 通过管理员界面提供解锁功能

---

### CVE-13: 密码修改后 Token 未失效

**位置**: `server/handler/auth.go:352-383`  
**严重等级**: 🟡 Medium

**描述**:  
用户或管理员修改密码后，已签发的 JWT token 仍然有效。这意味着如果密码是因为被盗而修改的，攻击者仍可使用旧的 token 继续访问系统。

**修复建议**:
1. 🛡️ 在 JWT claims 中加入 `iat`(Issued At) 时间戳
2. 在 User/Admin 模型中维护 `password_changed_at` 字段
3. 中间件验证 token 签发时间在最后密码修改时间之后

---

### CVE-14: BindPhone 开发模式绕过

**位置**: `server/handler/auth.go:236-244`  
**严重等级**: 🟡 Medium

**描述**:  
`BindPhone` 处理函数在开发模式下允许将 `encrypted_data` 字段直接作为手机号使用，且接受空手机号时自动生成随机手机号。

```go
if phone == "" && isDev {
    phone = req.EncryptedData  // ← 直接接受 encrypted_data 作为手机号
    if phone == "" {
        phone = fmt.Sprintf("138%08d", time.Now().Unix()%100000000)  // ← 自动生成
    }
}
```

**修复建议**:
1. 🛡️ 与 CVE-02 相同，通过显式的环境变量控制开发模式

---

### CVE-15: 服务端未设置安全响应头

**位置**: `nginx/nginx.conf`，`server/main.go`  
**严重等级**: 🟡 Medium

**描述**:  
服务端未设置以下安全相关 HTTP 响应头：
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)

**修复建议**:
1. 🛡️ 在 nginx 配置中添加安全响应头
2. 启用 HSTS (max-age=31536000; includeSubDomains)

---

### CVE-16: Docker 容器以 root 运行

**位置**: `server/Dockerfile:18`  
**严重等级**: 🟡 Medium

**描述**:  
最终运行的 API 容器以 root 用户运行，违反最小权限原则。如果 API 被攻破，攻击者可能获得容器内的 root 权限。

```
FROM alpine:3.19
# 未设置 USER 指令，默认以 root 运行
CMD ["./api"]
```

**修复建议**:
1. 🛡️ 在 Dockerfile 中添加 `RUN adduser -D appuser && chown -R appuser:appuser /app`
2. 添加 `USER appuser`

---

## 🟢 低危漏洞 (Low)

### CVE-17: JWT Claims 缺少标准字段

**位置**: `server/utils/jwt.go:40-47`  
**严重等级**: 🟢 Low

**描述**: JWT token 缺少 `jti`（JWT ID，用于唯一标识和撤销）、`nbf`（Not Before）、`iss`（Issuer）等标准字段。

---

### CVE-18: 无请求追踪 ID

**位置**: `server/main.go`  
**严重等级**: 🟢 Low

**描述**: 缺少请求级别的追踪 ID（X-Request-ID），不利于安全事件调查和日志关联。

---

### CVE-19: TLS 配置可优化

**位置**: `nginx/nginx.conf:94-95`  
**严重等级**: 🟢 Low

**描述**: TLS 配置允许 TLSv1.2（虽然可接受，但 TLSv1.3 更安全），且未使用更安全的 cipher 配置。

```
ssl_protocols TLSv1.2 TLSv1.3;  # 可考虑仅 TLSv1.3
```

---

### CVE-20: Admin SPA 无认证中间件

**位置**: `server/main.go:212-256`  
**严重等级**: 🟢 Low

**描述**: Admin SPA 静态文件通过 `embed.FS` 嵌入在 Go 二进制文件中，通过 `/admin` 路径提供服务。虽然这些只是静态 Vue 打包文件，不包含敏感数据，但任何人都可以访问登录页面源码。

---

### CVE-21: 日志中可能包含敏感信息

**位置**: `server/main.go:35`  
**严重等级**: 🟢 Low

**描述**: GORM 日志级别设置为 `logger.Info`，会输出所有 SQL 查询，可能在生产日志中泄露敏感数据。

---

### CVE-22: 过期订阅未自动清理

**位置**: `server/middleware/subscription.go:37-42`  
**严重等级**: 🟢 Low

**描述**: 试用期过期或订阅到期的用户仅在下次 API 请求时才会被更新为过期状态（惰性更新），没有后台定时任务。

---

### CVE-23: 缺少依赖安全扫描

**位置**: `server/go.mod`  
**严重等级**: 🟢 Low

**描述**: Go 依赖中存在一些已知漏洞：
- `golang.org/x/net v0.14.0` — 有已知安全漏洞，建议升级到 ≥ v0.23.0
- `golang.org/x/crypto v0.17.0` — 建议升级到最新版本
- Google Protobuf `v1.30.0` — 存在已知漏洞

---

## 📋 修复优先级

| 优先级 | 漏洞编号 | 修复项 | 预计工作量 |
|--------|---------|--------|-----------|
| P0-立即 | CVE-01 | 移除公开的 seed-admin 端点 | 15 分钟 |
| P0-立即 | CVE-02 | 剥离开发模式绕过逻辑 | 30 分钟 |
| P1-24h | CVE-03 | 登录接口速率限制 | 30 分钟 |
| P1-24h | CVE-04 | Refresh Token 轮转 | 2 小时 |
| P1-24h | CVE-06 | 管理员 API 手机号脱敏 | 15 分钟 |
| P1-24h | CVE-09,10 | Redis 密码 + MySQL 端口绑定 | 15 分钟 |
| P2-1周 | CVE-05 | Token 存储方案改进 | 4 小时 |
| P2-1周 | CVE-07,08,11-16 | 其他中危漏洞修复 | 4 小时 |
| P3-后续 | CVE-17-23 | 低危改进项 | 2 小时 |

---

## ✅ 安全优势

本次审计也发现了系统中的一些良好安全实践：

1. ✅ 密码使用 bcrypt 哈希存储 (`golang.org/x/crypto/bcrypt`)
2. ✅ 数据库操作使用参数化查询（GORM ORM），无 SQL 注入风险
3. ✅ 数据库操作使用行级锁（`SELECT ... FOR UPDATE`）防止并发超卖
4. ✅ 管理员 API 和用户 API 使用不同的 JWT claims 结构体，防止混淆
5. ✅ 上传文件有大小限制（5MB）
6. ✅ Nginx 配置了基本的速率限制（`limit_req_zone`）
7. ✅ Nginx 配置了 client_max_body_size 限制（10MB）
8. ✅ `.env` 文件已加入 `.gitignore`
9. ✅ 用户 ID 隔离：所有数据查询都带 `user_id` 过滤，防止水平越权
10. ✅ 销售订单包含 `credit` 支付方式的验证

---

*本报告由 Claude Code 生成，基于对代码库的全面审查。建议在修复后进行二次审计验证。*
