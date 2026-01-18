# escape() vs 加密：数据库存储说明

## 核心区别

- **`escape()`**：SQL 转义，防止 SQL 注入，**不是加密**
- **`genPassword()`**：MD5 哈希加密，**是加密**

---

## 代码分析

### 登录函数中的处理

```javascript
// controller/user.js
async function login(email, password) {
  email = escape(email);        // 1. SQL 转义（不是加密）
  
  password = genPassword(password);  // 2. MD5 加密
  password = escape(password);       // 3. SQL 转义（对已加密的密码）
  
  const sql = `
    SELECT * FROM users WHERE email=${email} AND password=${password}
  `;
}
```

---

## 1. escape() - SQL 转义（不是加密）

### 作用

`escape()` 是 MySQL 提供的函数，用于**防止 SQL 注入**，不是加密。

### 原理

```javascript
// mysql.escape() 的实现逻辑（简化）
function escape(value) {
  // 转义特殊字符，防止 SQL 注入
  // 例如：' 变成 \'
  // 例如：; 变成 \;
  return "'" + value.replace(/'/g, "\\'") + "'"
}
```

### 示例

```javascript
const email = "user@example.com";
const escaped = escape(email);
// 结果：'user@example.com'（加上引号，转义特殊字符）

const email2 = "user'; DROP TABLE users;--";
const escaped2 = escape(email2);
// 结果：'user\'; DROP TABLE users;--'（防止 SQL 注入）
```

### 数据库存储

```javascript
email = escape(email);
// 数据库存储的是：user@example.com（原始值，未加密）
```

**关键点：**
- ✅ 防止 SQL 注入
- ❌ **不是加密**，数据库存储的是原始值
- ✅ 可以用于查询和比较

---

## 2. genPassword() - MD5 加密

### 作用

`genPassword()` 使用 MD5 对密码进行**哈希加密**。

### 实现

```javascript
// utils/cryp.js
function genPassword(password) {
    const str = `password=${password}&key=${SECRET_KEY}`
    return md5(str)  // 返回 MD5 哈希值
}
```

### 示例

```javascript
const password = "123456";
const encrypted = genPassword(password);
// 结果：'a1b2c3d4e5f6...'（32位 MD5 哈希值）

// 数据库存储的是：a1b2c3d4e5f6...（加密后的值）
```

### 数据库存储

```javascript
password = genPassword(password);
// 数据库存储的是：a1b2c3d4e5f6...（MD5 哈希值，加密后的）
```

**关键点：**
- ✅ **是加密**，数据库存储的是哈希值
- ✅ 不可逆（无法从哈希值还原原始密码）
- ✅ 用于密码验证（登录时再次加密，比较哈希值）

---

## 数据库存储情况

### email（邮箱）

```javascript
email = escape(email);
```

**数据库存储：**
- ✅ **原始值**：`user@example.com`
- ❌ 未加密
- ✅ 只是 SQL 转义，防止注入

**原因：**
- 邮箱需要用于查询和显示
- 不需要加密（不是敏感信息）

---

### password（密码）

```javascript
password = genPassword(password);
password = escape(password);
```

**数据库存储：**
- ✅ **MD5 哈希值**：`a1b2c3d4e5f6...`
- ✅ 已加密
- ✅ 不可逆

**原因：**
- 密码是敏感信息，必须加密
- 即使数据库泄露，也无法还原原始密码

---

### nickname（昵称）

```javascript
nickname = escape(nickname);
```

**数据库存储：**
- ✅ **原始值**：`张三`
- ❌ 未加密
- ✅ 只是 SQL 转义，防止注入

**原因：**
- 昵称需要用于查询和显示
- 不需要加密（不是敏感信息）

---

## 完整流程示例

### 注册流程

```javascript
// 用户输入
const email = "user@example.com";
const password = "123456";
const nickname = "张三";

// 处理
email = escape(email);           // 'user@example.com'
password = genPassword(password); // 'a1b2c3d4e5f6...'（MD5 哈希）
password = escape(password);      // 'a1b2c3d4e5f6...'（转义）
nickname = escape(nickname);      // '张三'

// 数据库存储
INSERT INTO users (email, password, nickname) 
VALUES ('user@example.com', 'a1b2c3d4e5f6...', '张三');
```

**数据库实际存储：**
```
email: user@example.com        （原始值）
password: a1b2c3d4e5f6...     （MD5 哈希值）
nickname: 张三                 （原始值）
```

---

### 登录流程

```javascript
// 用户输入
const email = "user@example.com";
const password = "123456";

// 处理
email = escape(email);           // 'user@example.com'
password = genPassword(password); // 'a1b2c3d4e5f6...'（MD5 哈希）
password = escape(password);      // 'a1b2c3d4e5f6...'（转义）

// 查询数据库
SELECT * FROM users 
WHERE email='user@example.com' 
  AND password='a1b2c3d4e5f6...';
```

**验证过程：**
1. 用户输入密码：`123456`
2. 使用 `genPassword()` 加密：`a1b2c3d4e5f6...`
3. 与数据库中的哈希值比较
4. 如果匹配，登录成功

---

## 为什么 password 需要加密？

### 安全性

```javascript
// ❌ 不加密（危险）
password = "123456"
// 数据库存储：123456
// 如果数据库泄露，密码直接暴露

// ✅ 加密（安全）
password = genPassword("123456")
// 数据库存储：a1b2c3d4e5f6...
// 即使数据库泄露，也无法还原原始密码
```

### 为什么 email 和 nickname 不加密？

```javascript
// email 需要用于：
// 1. 查询用户：WHERE email = 'user@example.com'
// 2. 发送邮件：需要原始邮箱地址
// 3. 显示给用户：需要原始邮箱地址

// nickname 需要用于：
// 1. 查询用户：WHERE nickname = '张三'
// 2. 显示给用户：需要原始昵称
// 3. 搜索功能：需要原始昵称
```

---

## escape() 的作用

### 防止 SQL 注入

```javascript
// ❌ 不使用 escape（危险）
const email = "user'; DROP TABLE users;--";
const sql = `SELECT * FROM users WHERE email='${email}'`;
// SQL: SELECT * FROM users WHERE email='user'; DROP TABLE users;--'
// 危险！会执行 DROP TABLE

// ✅ 使用 escape（安全）
const email = "user'; DROP TABLE users;--";
const escaped = escape(email);
const sql = `SELECT * FROM users WHERE email=${escaped}`;
// SQL: SELECT * FROM users WHERE email='user\'; DROP TABLE users;--'
// 安全！特殊字符被转义
```

---

## 总结

### 数据库存储情况

| 字段 | 处理方式 | 数据库存储 | 是否加密 |
|------|---------|-----------|---------|
| **email** | `escape(email)` | 原始值 | ❌ 否 |
| **password** | `genPassword()` + `escape()` | MD5 哈希值 | ✅ 是 |
| **nickname** | `escape(nickname)` | 原始值 | ❌ 否 |

### 关键点

1. **`escape()`**：
   - ✅ 防止 SQL 注入
   - ❌ **不是加密**
   - ✅ 数据库存储原始值

2. **`genPassword()`**：
   - ✅ **是加密**（MD5 哈希）
   - ✅ 数据库存储哈希值
   - ✅ 不可逆

3. **为什么只有 password 加密？**
   - password 是敏感信息，必须加密
   - email 和 nickname 需要用于查询和显示，不加密

---

## 安全建议

### 当前实现的问题

1. **MD5 不够安全**：
   - MD5 已被认为不安全
   - 建议使用 bcrypt 或 argon2

2. **改进建议**：

```javascript
// 使用 bcrypt（推荐）
const bcrypt = require('bcrypt');

// 注册时
const hashedPassword = await bcrypt.hash(password, 10);

// 登录时
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 最佳实践

1. **密码**：使用 bcrypt 或 argon2 加密
2. **邮箱/昵称**：使用 escape() 防止 SQL 注入即可
3. **敏感信息**：根据需求决定是否加密

---

## 回答你的问题

**问：数据库存储的 email, password, nickname 都是被加密了的吗？**

**答：**
- ❌ **email**：未加密，只用了 `escape()` 防止 SQL 注入
- ✅ **password**：已加密，使用 `genPassword()` MD5 哈希
- ❌ **nickname**：未加密，只用了 `escape()` 防止 SQL 注入

**`escape()` 不是加密，只是 SQL 转义！**

