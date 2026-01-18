# 博客标签存储方案设计

## 方案对比

### 方案1：存储 JSON 数组字符串 ❌ 不推荐

```sql
CREATE TABLE `blogs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `tags` TEXT COMMENT '标签：JSON数组字符串，如 [{"id":1,"title":"前端"},{"id":2,"title":"JavaScript"}]',
    ...
)
```

**存储示例：**
```json
[{"id": 1, "title": "前端"}, {"id": 2, "title": "JavaScript"}]
```

**优点：**
- 存储了标签的完整信息（id + title），查询时不需要 JOIN
- 实现简单

**缺点：**
- ❌ **无法使用索引**：无法为 JSON 字符串中的 id 创建索引，查询性能差
- ❌ **查询困难**：通过标签 ID 查询博客需要全表扫描 + JSON 解析
- ❌ **数据冗余**：标签 title 重复存储，如果标签名称修改，需要更新所有博客
- ❌ **维护困难**：删除标签时，需要更新所有相关博客的 JSON 字符串

---

### 方案2：存储 ID 字符串 ❌ 不推荐

```sql
CREATE TABLE `blogs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `tags` VARCHAR(255) COMMENT '标签ID：逗号分隔，如 "1,2,3"',
    ...
)
```

**存储示例：**
```
"1,2,3"
```

**优点：**
- 存储空间小
- 实现简单

**缺点：**
- ❌ **无法使用索引**：无法为逗号分隔的字符串创建有效索引
- ❌ **查询困难**：需要使用 `FIND_IN_SET` 或 `LIKE`，性能差
- ❌ **SQL 复杂**：查询语句复杂，容易出错
- ❌ **数据完整性差**：无法使用外键约束

---

### 方案3：关联表（多对多关系）✅ **强烈推荐**

```sql
-- 标签表
CREATE TABLE `tags` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '标签ID',
    `title` VARCHAR(50) NOT NULL COMMENT '标签名称',
    `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_title` (`title`),
    INDEX `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签表';

-- 博客标签关联表（多对多关系）
CREATE TABLE `blog_tags` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `blog_id` INT NOT NULL COMMENT '博客ID',
    `tag_id` INT NOT NULL COMMENT '标签ID',
    `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_blog_tag` (`blog_id`, `tag_id`) COMMENT '唯一索引：确保同一博客不会重复添加同一标签',
    KEY `idx_blog_id` (`blog_id`) COMMENT '索引：用于查询某博客的所有标签',
    KEY `idx_tag_id` (`tag_id`) COMMENT '索引：用于查询某标签的所有博客'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客标签关联表';
```

**优点：**
- ✅ **可以使用索引**：`tag_id` 有索引，查询性能优秀
- ✅ **查询简单**：标准的 JOIN 查询，SQL 清晰易懂
- ✅ **数据完整性**：可以使用外键约束
- ✅ **易于维护**：删除标签只需删除关联表记录
- ✅ **扩展性好**：可以轻松添加标签的其他属性（如排序、创建时间等）
- ✅ **符合数据库范式**：避免数据冗余

**缺点：**
- 需要额外的关联表
- 查询时需要 JOIN（但性能仍然很好）

---

## SQL 查询示例

### 方案3（关联表）的查询示例

#### 1. 通过标签 ID 查询所有博客

```sql
-- 查询标签 ID 为 1 的所有博客
SELECT 
    b.id,
    b.title,
    b.content,
    b.author,
    b.create_time
FROM blogs b
INNER JOIN blog_tags bt ON b.id = bt.blog_id
WHERE bt.tag_id = 1
ORDER BY b.create_time DESC;
```

#### 2. 通过多个标签 ID 查询（任一匹配）

```sql
-- 查询包含标签 1 或 2 的所有博客
SELECT DISTINCT
    b.id,
    b.title,
    b.content,
    b.author,
    b.create_time
FROM blogs b
INNER JOIN blog_tags bt ON b.id = bt.blog_id
WHERE bt.tag_id IN (1, 2)
ORDER BY b.create_time DESC;
```

#### 3. 通过多个标签 ID 查询（全部匹配）

```sql
-- 查询同时包含标签 1 和 2 的所有博客
SELECT 
    b.id,
    b.title,
    b.content,
    b.author,
    b.create_time
FROM blogs b
WHERE b.id IN (
    SELECT blog_id 
    FROM blog_tags 
    WHERE tag_id = 1
)
AND b.id IN (
    SELECT blog_id 
    FROM blog_tags 
    WHERE tag_id = 2
)
ORDER BY b.create_time DESC;

-- 或者使用 GROUP BY + HAVING（性能更好）
SELECT 
    b.id,
    b.title,
    b.content,
    b.author,
    b.create_time
FROM blogs b
INNER JOIN blog_tags bt ON b.id = bt.blog_id
WHERE bt.tag_id IN (1, 2)
GROUP BY b.id
HAVING COUNT(DISTINCT bt.tag_id) = 2  -- 2 是要匹配的标签数量
ORDER BY b.create_time DESC;
```

#### 4. 查询博客及其所有标签

**方式1：返回多行（每行一个标签）**

```sql
-- 查询博客 ID 为 1 的博客及其所有标签
SELECT 
    b.id AS blog_id,
    b.title AS blog_title,
    t.id AS tag_id,
    t.title AS tag_title
FROM blogs b
LEFT JOIN blog_tags bt ON b.id = bt.blog_id
LEFT JOIN tags t ON bt.tag_id = t.id
WHERE b.id = 1;
```

**返回结果示例：**

如果博客 ID 为 1 有 3 个标签，会返回 **3 行数据**：

| blog_id | blog_title | tag_id | tag_title |
|---------|------------|--------|-----------|
| 1       | 我的博客   | 1      | 前端      |
| 1       | 我的博客   | 2      | JavaScript|
| 1       | 我的博客   | 3      | Vue       |

**注意：**
- 博客信息（id, title）会重复出现在每一行
- 每个标签占一行
- 如果博客没有标签，tag_id 和 tag_title 会是 NULL（因为使用了 LEFT JOIN）

**后端处理方式（Node.js）：**

```javascript
// 方式1：手动聚合多行数据
async function getBlogWithTags(blogId) {
    const sql = `
        SELECT 
            b.id AS blog_id,
            b.title AS blog_title,
            b.content,
            t.id AS tag_id,
            t.title AS tag_title
        FROM blogs b
        LEFT JOIN blog_tags bt ON b.id = bt.blog_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE b.id = ${blogId}
    `
    
    const rows = await exec(sql)
    
    if (rows.length === 0) {
        return null
    }
    
    // 聚合标签
    const blog = {
        id: rows[0].blog_id,
        title: rows[0].blog_title,
        content: rows[0].content,
        tags: rows
            .filter(row => row.tag_id !== null)  // 过滤掉没有标签的情况
            .map(row => ({
                id: row.tag_id,
                title: row.tag_title
            }))
    }
    
    return blog
}
```

---

**方式2：使用 GROUP_CONCAT 返回单行（推荐）**

```sql
-- 查询博客及其所有标签（标签以 JSON 字符串形式返回）
SELECT 
    b.id,
    b.title,
    b.content,
    b.author,
    b.create_time,
    GROUP_CONCAT(
        JSON_OBJECT('id', t.id, 'title', t.title)
        SEPARATOR ','
    ) AS tags_json
FROM blogs b
LEFT JOIN blog_tags bt ON b.id = bt.blog_id
LEFT JOIN tags t ON bt.tag_id = t.id
WHERE b.id = 1
GROUP BY b.id;
```

**返回结果示例：**

| id | title   | content | tags_json                                    |
|----|---------|---------|----------------------------------------------|
| 1  | 我的博客| ...     | {"id":1,"title":"前端"},{"id":2,"title":"JavaScript"},{"id":3,"title":"Vue"} |

**后端处理方式：**

```javascript
// 方式2：使用 GROUP_CONCAT（推荐）
async function getBlogWithTags(blogId) {
    const sql = `
        SELECT 
            b.id,
            b.title,
            b.content,
            b.author,
            b.create_time,
            GROUP_CONCAT(
                JSON_OBJECT('id', t.id, 'title', t.title)
                SEPARATOR ','
            ) AS tags_json
        FROM blogs b
        LEFT JOIN blog_tags bt ON b.id = bt.blog_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE b.id = ${blogId}
        GROUP BY b.id
    `
    
    const result = await exec(sql)
    
    if (result.length === 0) {
        return null
    }
    
    const blog = result[0]
    
    // 解析 tags_json
    if (blog.tags_json) {
        // 将字符串转换为数组
        blog.tags = blog.tags_json
            .split('},{')
            .map(tagStr => {
                // 处理 JSON 字符串格式
                const cleaned = tagStr.replace(/[{}]/g, '')
                const [idPart, titlePart] = cleaned.split(',')
                return {
                    id: parseInt(idPart.split(':')[1]),
                    title: titlePart.split(':')[1].replace(/"/g, '')
                }
            })
    } else {
        blog.tags = []
    }
    
    delete blog.tags_json  // 删除原始 JSON 字符串
    
    return blog
}
```

---

**方式3：使用 JSON_ARRAYAGG（MySQL 5.7.22+，推荐）**

```sql
-- 查询博客及其所有标签（标签以 JSON 数组形式返回）
SELECT 
    b.id,
    b.title,
    b.content,
    b.author,
    b.create_time,
    COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT('id', t.id, 'title', t.title)
        ),
        JSON_ARRAY()
    ) AS tags
FROM blogs b
LEFT JOIN blog_tags bt ON b.id = bt.blog_id
LEFT JOIN tags t ON bt.tag_id = t.id
WHERE b.id = 1
GROUP BY b.id;
```

**返回结果示例：**

| id | title   | content | tags                                                          |
|----|---------|---------|---------------------------------------------------------------|
| 1  | 我的博客| ...     | [{"id":1,"title":"前端"},{"id":2,"title":"JavaScript"},{"id":3,"title":"Vue"}] |

**后端处理方式（最简单）：**

```javascript
// 方式3：使用 JSON_ARRAYAGG（推荐，最简单）
async function getBlogWithTags(blogId) {
    const sql = `
        SELECT 
            b.id,
            b.title,
            b.content,
            b.author,
            b.create_time,
            COALESCE(
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', t.id, 'title', t.title)
                ),
                JSON_ARRAY()
            ) AS tags
        FROM blogs b
        LEFT JOIN blog_tags bt ON b.id = bt.blog_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE b.id = ${blogId}
        GROUP BY b.id
    `
    
    const result = await exec(sql)
    
    if (result.length === 0) {
        return null
    }
    
    const blog = result[0]
    
    // tags 已经是 JSON 数组字符串，直接解析即可
    blog.tags = JSON.parse(blog.tags)
    
    return blog
}
```

#### 5. 分页查询：通过标签查询博客列表

```sql
-- 查询标签 ID 为 1 的博客，分页显示
SELECT 
    b.id,
    b.title,
    b.content,
    b.author,
    b.create_time
FROM blogs b
INNER JOIN blog_tags bt ON b.id = bt.blog_id
WHERE bt.tag_id = 1
ORDER BY b.create_time DESC
LIMIT 10 OFFSET 0;
```

---

### 方案2（ID字符串）的查询示例（仅作参考，不推荐）

```sql
-- 通过标签 ID 查询（性能差，不推荐）
SELECT * FROM blogs 
WHERE FIND_IN_SET('1', tags) > 0
ORDER BY create_time DESC;

-- 或者使用 LIKE（性能更差）
SELECT * FROM blogs 
WHERE tags LIKE '%,1,%' OR tags LIKE '1,%' OR tags LIKE '%,1' OR tags = '1'
ORDER BY create_time DESC;
```

---

## 完整示例：创建表结构

```sql
-- 1. 创建标签表
CREATE TABLE `tags` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '标签ID',
    `title` VARCHAR(50) NOT NULL COMMENT '标签名称',
    `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_title` (`title`),
    INDEX `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签表';

-- 2. 创建博客标签关联表
CREATE TABLE `blog_tags` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `blog_id` INT NOT NULL COMMENT '博客ID',
    `tag_id` INT NOT NULL COMMENT '标签ID',
    `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_blog_tag` (`blog_id`, `tag_id`) COMMENT '唯一索引：确保同一博客不会重复添加同一标签',
    KEY `idx_blog_id` (`blog_id`) COMMENT '索引：用于查询某博客的所有标签',
    KEY `idx_tag_id` (`tag_id`) COMMENT '索引：用于查询某标签的所有博客'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客标签关联表';

-- 3. 更新博客表（如果需要）
-- 注意：博客表不需要存储标签字段，通过关联表查询
```

---

## 总结

| 方案 | 查询性能 | 数据完整性 | 维护难度 | 推荐度 |
|------|---------|-----------|---------|--------|
| JSON 数组字符串 | ❌ 差 | ❌ 差 | ❌ 困难 | ⭐ |
| ID 字符串 | ❌ 差 | ❌ 差 | ❌ 困难 | ⭐ |
| **关联表** | ✅ **优秀** | ✅ **优秀** | ✅ **简单** | ⭐⭐⭐⭐⭐ |

**强烈推荐使用方案3（关联表）**，这是数据库设计的标准做法，性能好、易维护、扩展性强。

