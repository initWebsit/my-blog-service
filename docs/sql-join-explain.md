# SQL JOIN 查询语法详解

## 完整 SQL 语句

```sql
SELECT 
    b.*,
    (SELECT COUNT(*) FROM blog_likes WHERE blog_id=b.id) as likeCount,
    (SELECT COUNT(*) FROM blog_comments WHERE blog_id=b.id) as commentCount,
    (SELECT COUNT(*) > 0 FROM blog_likes WHERE user_id=123 AND blog_id=b.id) as isLiked
FROM blogs b
WHERE b.id=1;
```

## 逐行详细解释

### 1. `SELECT` - 选择要查询的字段

```sql
SELECT 
```
- **作用**：指定要查询哪些列
- **说明**：这是 SQL 查询的开始，告诉数据库要返回什么数据

---

### 2. `b.*` - 选择博客表的所有字段

```sql
    b.*,
```
- **`b`**：这是 `blogs` 表的别名（alias）
  - 在 `FROM blogs b` 中定义，`b` 代表 `blogs` 表
  - 使用别名可以简化 SQL，避免重复写表名
  
- **`*`**：通配符，表示选择所有列
  - 相当于 `blogs.id, blogs.title, blogs.content, blogs.author, ...` 等所有字段

- **`b.*`**：表示选择 `blogs` 表的所有字段
  - 结果会包含：`id`, `title`, `content`, `author`, `createtime` 等

**示例结果：**
```javascript
{
    id: 1,
    title: "我的博客",
    content: "博客内容...",
    author: "zhangsan",
    createtime: 1234567890
}
```

---

### 3. 子查询：获取点赞数量

```sql
    (SELECT COUNT(*) FROM blog_likes WHERE blog_id=b.id) as likeCount,
```

#### 语法结构
```
(子查询) as 别名
```

#### 详细分解

**`(SELECT COUNT(*) FROM blog_likes WHERE blog_id=b.id)`**
- **`SELECT COUNT(*)`**：
  - `COUNT(*)` 是聚合函数，统计行数
  - `*` 表示统计所有行（包括 NULL）
  - 返回一个数字，表示符合条件的记录数

- **`FROM blog_likes`**：
  - 从 `blog_likes` 表中查询
  - 这是点赞表

- **`WHERE blog_id=b.id`**：
  - `blog_id` 是 `blog_likes` 表的字段
  - `b.id` 是外层查询中 `blogs` 表的 `id` 字段
  - **关联关系**：查找所有 `blog_id` 等于当前博客 `id` 的点赞记录
  - 这是**关联子查询**（Correlated Subquery），子查询引用了外层查询的字段

**`as likeCount`**：
- 给这个子查询结果起一个别名 `likeCount`
- 在最终结果中，这个字段会显示为 `likeCount`

**执行过程：**
```sql
-- 假设当前博客 id = 1
-- 子查询会执行：
SELECT COUNT(*) FROM blog_likes WHERE blog_id=1
-- 返回：5（表示有 5 个点赞）
-- 最终结果中 likeCount = 5
```

---

### 4. 子查询：获取评论数量

```sql
    (SELECT COUNT(*) FROM blog_comments WHERE blog_id=b.id) as commentCount,
```

**逻辑与点赞数相同：**
- 从 `blog_comments` 表中统计
- 条件：`blog_id` 等于当前博客的 `id`
- 结果别名：`commentCount`

**示例：**
```sql
-- 假设当前博客 id = 1
SELECT COUNT(*) FROM blog_comments WHERE blog_id=1
-- 返回：10（表示有 10 条评论）
-- 最终结果中 commentCount = 10
```

---

### 5. 子查询：判断用户是否已点赞

```sql
    (SELECT COUNT(*) > 0 FROM blog_likes WHERE user_id=123 AND blog_id=b.id) as isLiked
```

#### 详细分解

**`SELECT COUNT(*) > 0`**：
- `COUNT(*)` 统计符合条件的记录数
- `> 0` 是条件判断
- **结果**：
  - 如果 `COUNT(*)` 返回 0，则 `COUNT(*) > 0` 为 `false`（0）
  - 如果 `COUNT(*)` 返回 1 或更多，则 `COUNT(*) > 0` 为 `true`（1）

**`WHERE user_id=123 AND blog_id=b.id`**：
- `user_id=123`：查找用户 ID 为 123 的记录
- `blog_id=b.id`：查找当前博客的记录
- `AND`：两个条件都要满足
- **含义**：查找用户 123 是否对当前博客点过赞

**`as isLiked`**：
- 别名 `isLiked`
- 结果：`1`（已点赞）或 `0`（未点赞）

**执行示例：**
```sql
-- 假设当前博客 id = 1，用户 id = 123
SELECT COUNT(*) > 0 FROM blog_likes WHERE user_id=123 AND blog_id=1
-- 如果存在记录：返回 1（true）
-- 如果不存在：返回 0（false）
```

---

### 6. `FROM blogs b` - 指定主查询表

```sql
FROM blogs b
```

- **`FROM blogs`**：从 `blogs` 表中查询
- **`b`**：给 `blogs` 表起别名
  - 后续可以用 `b.id`、`b.title` 等引用该表的字段
  - 简化 SQL 书写

**等价写法：**
```sql
FROM blogs
-- 但这样就不能用 b.id，必须用 blogs.id
```

---

### 7. `WHERE b.id=${id}` - 查询条件

```sql
WHERE b.id=${id};
```

- **`WHERE`**：指定查询条件
- **`b.id=${id}`**：
  - `b.id` 是 `blogs` 表的 `id` 字段
  - `${id}` 是 JavaScript 变量（会被替换为实际值，如 `1`）
  - **含义**：只查询 `id` 等于指定值的博客

**示例：**
```sql
-- 如果 id = 1
WHERE b.id=1
-- 只返回 id 为 1 的博客
```

---

## 完整执行流程示例

假设：
- 博客 ID = 1
- 用户 ID = 123
- `blog_likes` 表中有 5 条 `blog_id=1` 的记录
- `blog_comments` 表中有 10 条 `blog_id=1` 的记录
- 用户 123 已经点赞过博客 1

### SQL 执行过程：

```sql
SELECT 
    b.*,  -- 1. 获取博客 1 的所有字段
    (SELECT COUNT(*) FROM blog_likes WHERE blog_id=1) as likeCount,  -- 2. 统计点赞数：5
    (SELECT COUNT(*) FROM blog_comments WHERE blog_id=1) as commentCount,  -- 3. 统计评论数：10
    (SELECT COUNT(*) > 0 FROM blog_likes WHERE user_id=123 AND blog_id=1) as isLiked  -- 4. 判断是否点赞：1
FROM blogs b
WHERE b.id=1;
```

### 返回结果：

```javascript
{
    // 来自 b.*
    id: 1,
    title: "我的博客",
    content: "博客内容...",
    author: "zhangsan",
    createtime: 1234567890,
    
    // 来自子查询
    likeCount: 5,
    commentCount: 10,
    isLiked: 1  // 1 表示 true，已点赞
}
```

---

## 关键概念总结

### 1. **表别名（Alias）**
```sql
FROM blogs b  -- b 是 blogs 的别名
b.id          -- 使用别名引用字段
```

### 2. **关联子查询（Correlated Subquery）**
```sql
WHERE blog_id=b.id  -- 子查询引用了外层查询的 b.id
```
- 子查询会为外层查询的每一行执行一次
- 这里外层只有一行（WHERE b.id=1），所以子查询执行一次

### 3. **聚合函数 COUNT(*)**
```sql
COUNT(*)  -- 统计行数
COUNT(*) > 0  -- 判断是否存在记录
```

### 4. **字段别名（AS）**
```sql
as likeCount  -- 给查询结果起别名
```

---

## 性能说明

### 优点：
- **一次查询**：只需要 1 次数据库往返
- **数据完整**：一次性获取所有需要的数据

### 注意事项：
- 子查询会为外层查询的每一行执行
- 如果外层查询返回多行，子查询会执行多次
- 这里因为 `WHERE b.id=1` 只返回一行，所以性能没问题

### 优化建议：
- 确保 `blog_id`、`user_id` 等字段有索引
- 如果数据量很大，可以考虑使用 JOIN 替代子查询

---

## 等价的其他写法

### 使用 LEFT JOIN（性能可能更好）

```sql
SELECT 
    b.*,
    COALESCE(l.likeCount, 0) as likeCount,
    COALESCE(c.commentCount, 0) as commentCount,
    COALESCE(ul.isLiked, 0) as isLiked
FROM blogs b
LEFT JOIN (
    SELECT blog_id, COUNT(*) as likeCount 
    FROM blog_likes 
    GROUP BY blog_id
) l ON b.id = l.blog_id
LEFT JOIN (
    SELECT blog_id, COUNT(*) as commentCount 
    FROM blog_comments 
    GROUP BY blog_id
) c ON b.id = c.blog_id
LEFT JOIN (
    SELECT blog_id, COUNT(*) > 0 as isLiked 
    FROM blog_likes 
    WHERE user_id=123 
    GROUP BY blog_id
) ul ON b.id = ul.blog_id
WHERE b.id=1;
```

这种写法在数据量大时可能性能更好，但 SQL 更复杂。

