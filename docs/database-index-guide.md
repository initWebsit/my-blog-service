# 数据库索引详解

## 索引是什么？

索引是数据库中用于**快速查找数据**的数据结构，类似于书籍的目录。有了索引，数据库可以快速定位到数据，而不需要扫描整个表。

---

## 索引的创建时机

### 方式一：创建表时定义索引 ⭐ 推荐

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    author VARCHAR(50),
    createtime BIGINT,
    
    -- 创建普通索引
    INDEX idx_author (author),
    INDEX idx_createtime (createtime),
    
    -- 创建唯一索引
    UNIQUE INDEX idx_title (title),
    
    -- 创建复合索引
    INDEX idx_author_time (author, createtime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 方式二：表创建后添加索引

```sql
-- 添加普通索引
ALTER TABLE blogs ADD INDEX idx_author (author);

-- 添加唯一索引
ALTER TABLE blogs ADD UNIQUE INDEX idx_title (title);

-- 添加复合索引
ALTER TABLE blogs ADD INDEX idx_author_time (author, createtime);
```

---

## 索引类型对比

### 1. PRIMARY KEY（主键索引）

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- 主键索引
    ...
);
```

**特点：**
- ✅ 唯一且非空
- ✅ 一个表只能有一个
- ✅ 自动创建索引
- ✅ 通常用于关联其他表（外键）

**等价写法：**
```sql
id INT AUTO_INCREMENT,
PRIMARY KEY (id)
```

---

### 2. UNIQUE INDEX（唯一索引）

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    
    -- 唯一索引：确保 title 唯一
    UNIQUE INDEX idx_title (title)
);
```

**特点：**
- ✅ 确保字段值唯一
- ✅ 允许 NULL 值（MySQL 中 NULL 可以出现多次）
- ✅ 自动创建索引
- ✅ 一个表可以有多个

**作用：**
- 防止重复数据
- 提高查询性能（自动创建索引）

---

### 3. INDEX（普通索引）

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author VARCHAR(50),
    createtime BIGINT,
    
    -- 普通索引：提高查询性能，不限制唯一性
    INDEX idx_author (author),
    INDEX idx_createtime (createtime)
);
```

**特点：**
- ✅ 提高查询性能
- ❌ 不限制唯一性（允许重复值）
- ✅ 可以创建多个

**适用场景：**
- 经常用于 WHERE 条件的字段
- 经常用于 ORDER BY 的字段
- 经常用于 JOIN 的字段

---

### 4. 复合索引（联合索引）

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author VARCHAR(50),
    createtime BIGINT,
    
    -- 复合索引：多个字段组合
    INDEX idx_author_time (author, createtime)
);
```

**特点：**
- ✅ 多个字段组合成一个索引
- ✅ 遵循"最左前缀"原则
- ✅ 可以同时优化多个字段的查询

**最左前缀原则：**
```sql
-- ✅ 可以使用索引
WHERE author = 'zhangsan'
WHERE author = 'zhangsan' AND createtime > 1234567890

-- ❌ 不能使用索引（没有 author）
WHERE createtime > 1234567890
```

---

## 索引 vs UNIQUE 约束

### 区别对比

| 特性 | INDEX（普通索引） | UNIQUE INDEX（唯一索引） | PRIMARY KEY（主键） |
|------|------------------|------------------------|-------------------|
| 唯一性 | ❌ 不限制 | ✅ 限制 | ✅ 限制 |
| NULL 值 | ✅ 允许 | ✅ 允许（MySQL 中可多个） | ❌ 不允许 |
| 数量限制 | 无限制 | 无限制 | 1个 |
| 主要作用 | 提高查询性能 | 防止重复 + 提高性能 | 唯一标识 + 提高性能 |
| 自动创建索引 | ✅ | ✅ | ✅ |

### 实际应用

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,        -- 主键：唯一标识
    title VARCHAR(200) UNIQUE,                 -- 唯一索引：标题不能重复
    author VARCHAR(50),                       -- 普通字段
    createtime BIGINT,                         -- 普通字段
    
    -- 后续添加索引
    INDEX idx_author (author),                  -- 普通索引：提高按作者查询的性能
    INDEX idx_createtime (createtime)           -- 普通索引：提高按时间排序的性能
);
```

---

## 完整示例：博客表结构

### 创建表时定义所有索引

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    content TEXT COMMENT '内容',
    author VARCHAR(50) NOT NULL COMMENT '作者',
    createtime BIGINT NOT NULL COMMENT '创建时间',
    
    -- 普通索引：用于查询和排序
    INDEX idx_author (author) COMMENT '作者索引',
    INDEX idx_createtime (createtime) COMMENT '创建时间索引',
    
    -- 唯一索引：确保标题唯一
    UNIQUE INDEX idx_title (title) COMMENT '标题唯一索引',
    
    -- 复合索引：用于多条件查询
    INDEX idx_author_time (author, createtime) COMMENT '作者+时间复合索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客表';
```

### 表创建后添加索引

```sql
-- 假设表已经创建，没有索引
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    author VARCHAR(50),
    createtime BIGINT
);

-- 后续添加索引
ALTER TABLE blogs ADD INDEX idx_author (author);
ALTER TABLE blogs ADD INDEX idx_createtime (createtime);
ALTER TABLE blogs ADD UNIQUE INDEX idx_title (title);
ALTER TABLE blogs ADD INDEX idx_author_time (author, createtime);
```

---

## 如何查看表的索引？

### 方法1：SHOW INDEX

```sql
SHOW INDEX FROM blogs;
```

**输出示例：**
```
Table | Non_unique | Key_name      | Column_name | Index_type
------|------------|---------------|-------------|------------
blogs | 0          | PRIMARY       | id          | BTREE
blogs | 0          | idx_title     | title       | BTREE
blogs | 1          | idx_author    | author      | BTREE
blogs | 1          | idx_createtime| createtime  | BTREE
```

**说明：**
- `Non_unique = 0`：唯一索引（PRIMARY KEY 或 UNIQUE）
- `Non_unique = 1`：普通索引
- `Key_name`：索引名称
- `Column_name`：索引字段

---

### 方法2：查看表结构

```sql
SHOW CREATE TABLE blogs;
```

**输出：**
```sql
CREATE TABLE `blogs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `author` varchar(50) NOT NULL,
  `createtime` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_title` (`title`),
  KEY `idx_author` (`author`),
  KEY `idx_createtime` (`createtime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 方法3：查询系统表

```sql
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'blog'  -- 数据库名
  AND TABLE_NAME = 'blogs';
```

---

## 索引创建的最佳实践

### 1. 哪些字段需要索引？

**需要索引的字段：**
- ✅ 主键（PRIMARY KEY）- 自动创建
- ✅ 外键（FOREIGN KEY）- 自动创建
- ✅ 经常用于 WHERE 条件的字段
- ✅ 经常用于 ORDER BY 的字段
- ✅ 经常用于 JOIN 的字段
- ✅ 需要唯一性约束的字段（UNIQUE）

**不需要索引的字段：**
- ❌ 很少用于查询的字段
- ❌ 数据重复度很高的字段（如性别：男/女）
- ❌ 经常更新的字段（索引维护成本高）
- ❌ TEXT/BLOB 类型字段（通常不需要索引）

---

### 2. 索引命名规范

```sql
-- 主键：通常不需要命名（自动命名为 PRIMARY）
PRIMARY KEY (id)

-- 唯一索引：idx_字段名 或 uk_字段名
UNIQUE INDEX idx_title (title)
UNIQUE INDEX uk_email (email)

-- 普通索引：idx_字段名
INDEX idx_author (author)
INDEX idx_createtime (createtime)

-- 复合索引：idx_字段1_字段2
INDEX idx_author_time (author, createtime)
```

---

### 3. 索引对性能的影响

**优点：**
- ✅ 大幅提高查询速度
- ✅ 提高排序速度（ORDER BY）
- ✅ 提高 JOIN 速度

**缺点：**
- ❌ 占用存储空间
- ❌ 降低 INSERT/UPDATE/DELETE 速度（需要维护索引）
- ❌ 索引过多会影响性能

**建议：**
- 不要创建过多索引（通常 5-10 个足够）
- 根据实际查询需求创建索引
- 定期分析慢查询，优化索引

---

## 实际应用示例

### 博客表的完整索引设计

```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    content TEXT COMMENT '内容',
    author VARCHAR(50) NOT NULL COMMENT '作者',
    createtime BIGINT NOT NULL COMMENT '创建时间',
    status TINYINT DEFAULT 1 COMMENT '状态：1-发布，0-草稿',
    
    -- 唯一索引：标题不能重复
    UNIQUE INDEX uk_title (title),
    
    -- 普通索引：用于查询
    INDEX idx_author (author),              -- WHERE author = ?
    INDEX idx_createtime (createtime),       -- ORDER BY createtime
    INDEX idx_status (status),               -- WHERE status = ?
    
    -- 复合索引：用于多条件查询
    INDEX idx_author_time (author, createtime),  -- WHERE author = ? ORDER BY createtime
    INDEX idx_status_time (status, createtime)   -- WHERE status = ? ORDER BY createtime
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客表';
```

### 点赞表的索引设计

```sql
CREATE TABLE blog_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    blog_id INT NOT NULL,
    createtime BIGINT NOT NULL,
    
    -- 唯一索引：确保同一用户对同一博客只能点赞一次
    UNIQUE INDEX uk_user_blog (user_id, blog_id),
    
    -- 普通索引：用于查询
    INDEX idx_blog_id (blog_id),    -- WHERE blog_id = ?
    INDEX idx_user_id (user_id),    -- WHERE user_id = ?
    INDEX idx_createtime (createtime) -- ORDER BY createtime
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 常见问题

### 1. 索引是在创建表时设定的吗？

**答案：** 可以在创建表时设定，也可以后续添加。

**推荐：**
- 设计表时就规划好索引
- 在 `CREATE TABLE` 时一起定义
- 如果遗漏，后续用 `ALTER TABLE` 添加

---

### 2. 索引是表设置的哪个字段？是 UNIQUE 吗？

**答案：** 
- 索引可以设置在**任何字段**上
- **不是**只有 UNIQUE 字段才能有索引
- UNIQUE 只是索引的一种类型（唯一索引）

**区别：**
- **普通索引（INDEX）**：提高查询性能，不限制唯一性
- **唯一索引（UNIQUE INDEX）**：提高查询性能 + 限制唯一性
- **主键（PRIMARY KEY）**：提高查询性能 + 限制唯一性 + 非空

---

### 3. 主键会自动创建索引吗？

**答案：** ✅ 是的，主键会自动创建索引。

```sql
-- 这两种写法等价
id INT AUTO_INCREMENT PRIMARY KEY
-- 等价于
id INT AUTO_INCREMENT,
PRIMARY KEY (id)  -- 自动创建名为 PRIMARY 的索引
```

---

### 4. 一个字段可以有多个索引吗？

**答案：** ❌ 不可以。一个字段不能有多个单独的索引，但可以参与多个复合索引。

```sql
-- ❌ 错误：同一个字段不能有多个索引
INDEX idx_author (author),
INDEX idx_author2 (author)  -- 错误！

-- ✅ 正确：可以参与多个复合索引
INDEX idx_author (author),
INDEX idx_author_time (author, createtime),  -- author 参与复合索引
INDEX idx_author_status (author, status)     -- author 参与另一个复合索引
```

---

### 5. 如何删除索引？

```sql
-- 删除普通索引或唯一索引
ALTER TABLE blogs DROP INDEX idx_author;

-- 删除主键（需要先删除自增）
ALTER TABLE blogs MODIFY id INT;
ALTER TABLE blogs DROP PRIMARY KEY;
```

---

## 总结

1. **索引创建时机**：
   - ✅ 创建表时定义（推荐）
   - ✅ 表创建后添加（`ALTER TABLE`）

2. **索引类型**：
   - `PRIMARY KEY`：主键索引（唯一 + 非空）
   - `UNIQUE INDEX`：唯一索引（唯一）
   - `INDEX`：普通索引（不限制唯一性）

3. **索引作用**：
   - 提高查询性能
   - UNIQUE 索引还能防止重复数据

4. **查看索引**：
   - `SHOW INDEX FROM 表名`
   - `SHOW CREATE TABLE 表名`

5. **最佳实践**：
   - 在创建表时就规划好索引
   - 根据实际查询需求创建索引
   - 不要创建过多索引

