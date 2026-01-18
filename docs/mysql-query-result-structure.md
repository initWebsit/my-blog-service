# MySQL query() 返回数据结构详解

## 核心区别

- **SELECT**：返回**数组**（查询结果集）
- **INSERT/UPDATE/DELETE**：返回**对象**（操作结果信息）

---

## 1. SELECT 查询 - 返回数组

### 返回结构

```javascript
// SELECT 返回数组
[
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
  { id: 3, name: '王五', email: 'wangwu@example.com' }
]
```

### 示例代码

```javascript
// controller/user.js
const sql = `SELECT * FROM users WHERE email=${email}`;
const result = await exec(sql);

// result 是数组
console.log(result);  
// [
//   { id: 1, email: 'user@example.com', nickname: '张三' },
//   { id: 2, email: 'user2@example.com', nickname: '李四' }
// ]

// 获取第一条记录
const user = result[0] || {};
```

### 在你的代码中的使用

```javascript
// controller/user.js
return exec(sql).then((result) => {
    return result[0] || {};  // ✅ 正确：SELECT 返回数组
});
```

---

## 2. INSERT 插入 - 返回对象

### 返回结构

```javascript
// INSERT 返回对象
{
    fieldCount: 0,
    affectedRows: 1,        // 受影响的行数
    insertId: 123,          // 插入的自增 ID（重要！）
    serverStatus: 2,
    warningCount: 0,
    message: '',
    protocol41: true,
    changedRows: 0
}
```

### 示例代码

```javascript
const sql = `INSERT INTO users (email, password, nickname) VALUES ('user@example.com', 'pwd', '张三')`;
const result = await exec(sql);

// result 是对象
console.log(result);
// {
//   affectedRows: 1,
//   insertId: 123
// }

// 获取插入的 ID
const newUserId = result.insertId;  // 123
```

### 在你的代码中的问题

```javascript
// controller/user.js (第 40-42 行)
return exec(sql).then((result) => {
    return result[0].insertId || null;  // ❌ 错误！INSERT 返回的是对象，不是数组
})
```

**应该改为：**

```javascript
return exec(sql).then((result) => {
    return result.insertId || null;  // ✅ 正确：直接使用 result.insertId
})
```

---

## 3. UPDATE 更新 - 返回对象

### 返回结构

```javascript
// UPDATE 返回对象
{
    fieldCount: 0,
    affectedRows: 1,        // 受影响的行数（重要！）
    insertId: 0,
    serverStatus: 2,
    warningCount: 0,
    message: '(Rows matched: 1  Changed: 1  Warnings: 0)',
    protocol41: true,
    changedRows: 1          // 实际改变的行数
}
```

### 示例代码

```javascript
const sql = `UPDATE users SET nickname='新昵称' WHERE id=1`;
const result = await exec(sql);

// result 是对象
console.log(result);
// {
//   affectedRows: 1,  // 1 行被更新
//   changedRows: 1     // 1 行实际改变
// }

// 判断是否更新成功
if (result.affectedRows > 0) {
    console.log('更新成功');
} else {
    console.log('没有行被更新');
}
```

### 在你的代码中的使用

```javascript
// controller/blog.js (假设有更新函数)
const sql = `UPDATE blogs SET title='新标题' WHERE id=1`;
const result = await exec(sql);

if (result.affectedRows > 0) {
    return true;  // 更新成功
} else {
    return false; // 没有行被更新
}
```

---

## 4. DELETE 删除 - 返回对象

### 返回结构

```javascript
// DELETE 返回对象
{
    fieldCount: 0,
    affectedRows: 1,        // 受影响的行数（重要！）
    insertId: 0,
    serverStatus: 2,
    warningCount: 0,
    message: '',
    protocol41: true,
    changedRows: 0
}
```

### 示例代码

```javascript
const sql = `DELETE FROM users WHERE id=1`;
const result = await exec(sql);

// result 是对象
console.log(result);
// {
//   affectedRows: 1  // 1 行被删除
// }

// 判断是否删除成功
if (result.affectedRows > 0) {
    console.log('删除成功');
} else {
    console.log('没有行被删除');
}
```

---

## 完整对比表

| SQL 类型 | 返回类型 | 数据结构 | 主要属性 |
|---------|---------|---------|---------|
| **SELECT** | 数组 | `[{...}, {...}]` | 数组元素是查询结果 |
| **INSERT** | 对象 | `{affectedRows, insertId}` | `insertId` 是插入的自增 ID |
| **UPDATE** | 对象 | `{affectedRows, changedRows}` | `affectedRows` 是受影响行数 |
| **DELETE** | 对象 | `{affectedRows}` | `affectedRows` 是删除的行数 |

---

## 实际使用示例

### SELECT 查询

```javascript
// 查询多条记录
const sql = `SELECT * FROM users`;
const result = await exec(sql);
// result: [{id:1, name:'张三'}, {id:2, name:'李四'}]

// 查询单条记录
const sql = `SELECT * FROM users WHERE id=1`;
const result = await exec(sql);
// result: [{id:1, name:'张三'}]
const user = result[0] || {};  // 获取第一条记录
```

### INSERT 插入

```javascript
const sql = `INSERT INTO users (email, password, nickname) VALUES ('user@example.com', 'pwd', '张三')`;
const result = await exec(sql);
// result: {affectedRows: 1, insertId: 123}

const newUserId = result.insertId;  // 获取插入的 ID
```

### UPDATE 更新

```javascript
const sql = `UPDATE users SET nickname='新昵称' WHERE id=1`;
const result = await exec(sql);
// result: {affectedRows: 1, changedRows: 1}

if (result.affectedRows > 0) {
    console.log('更新成功');
}
```

### DELETE 删除

```javascript
const sql = `DELETE FROM users WHERE id=1`;
const result = await exec(sql);
// result: {affectedRows: 1}

if (result.affectedRows > 0) {
    console.log('删除成功');
}
```

---

## 常见错误

### 错误1：对 INSERT 结果使用数组索引

```javascript
// ❌ 错误
const result = await exec(`INSERT INTO users ...`);
const id = result[0].insertId;  // 错误！result 是对象，不是数组

// ✅ 正确
const result = await exec(`INSERT INTO users ...`);
const id = result.insertId;  // 正确！直接使用 result.insertId
```

### 错误2：对 SELECT 结果使用对象属性

```javascript
// ❌ 错误
const result = await exec(`SELECT * FROM users WHERE id=1`);
const user = result.id;  // 错误！result 是数组，不是对象

// ✅ 正确
const result = await exec(`SELECT * FROM users WHERE id=1`);
const user = result[0] || {};  // 正确！获取数组第一个元素
```

### 错误3：混淆 affectedRows 和数组长度

```javascript
// ❌ 错误：对 SELECT 使用 affectedRows
const result = await exec(`SELECT * FROM users`);
if (result.affectedRows > 0) {  // 错误！SELECT 返回数组，没有 affectedRows
    // ...
}

// ✅ 正确：使用数组长度
const result = await exec(`SELECT * FROM users`);
if (result.length > 0) {  // 正确！数组有 length 属性
    // ...
}
```

---

## 修复你的代码

### controller/user.js 中的 insertUser 函数

**当前代码（错误）：**

```javascript
async function insertUser(email, password, nickname) {
  // ...
  return exec(sql).then((result) => {
    return result[0].insertId || null;  // ❌ 错误
  })
}
```

**应该改为：**

```javascript
async function insertUser(email, password, nickname) {
  // ...
  return exec(sql).then((result) => {
    return result.insertId || null;  // ✅ 正确
  })
}
```

---

## 统一处理函数示例

### 方式1：根据 SQL 类型判断

```javascript
function exec(sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            
            // 判断 SQL 类型
            const sqlType = sql.trim().toUpperCase().split(' ')[0];
            
            if (sqlType === 'SELECT') {
                // SELECT 返回数组
                resolve(result);
            } else {
                // INSERT/UPDATE/DELETE 返回对象
                resolve(result);
            }
        });
    });
}
```

### 方式2：封装不同的处理函数

```javascript
// SELECT 查询
async function select(sql) {
    const result = await exec(sql);
    return result;  // 返回数组
}

// INSERT 插入
async function insert(sql) {
    const result = await exec(sql);
    return {
        success: result.affectedRows > 0,
        insertId: result.insertId
    };
}

// UPDATE 更新
async function update(sql) {
    const result = await exec(sql);
    return {
        success: result.affectedRows > 0,
        affectedRows: result.affectedRows
    };
}

// DELETE 删除
async function del(sql) {
    const result = await exec(sql);
    return {
        success: result.affectedRows > 0,
        affectedRows: result.affectedRows
    };
}
```

---

## 总结

1. **SELECT**：返回**数组** `[{...}, {...}]`
   - 使用 `result[0]` 获取第一条记录
   - 使用 `result.length` 获取记录数

2. **INSERT**：返回**对象** `{affectedRows, insertId}`
   - 使用 `result.insertId` 获取插入的 ID
   - 使用 `result.affectedRows` 判断是否成功

3. **UPDATE**：返回**对象** `{affectedRows, changedRows}`
   - 使用 `result.affectedRows` 判断是否更新成功

4. **DELETE**：返回**对象** `{affectedRows}`
   - 使用 `result.affectedRows` 判断是否删除成功

**关键点：**
- ✅ SELECT 返回数组
- ✅ INSERT/UPDATE/DELETE 返回对象
- ❌ 不要对 INSERT/UPDATE/DELETE 使用数组索引
- ❌ 不要对 SELECT 使用对象属性（如 `affectedRows`）

