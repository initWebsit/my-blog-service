# 博客详情接口优化方案

## 问题背景

在获取博客详情时，通常需要同时获取：
- 博客基本信息
- 点赞数量
- 评论数量
- 当前用户是否已点赞
- 评论列表（可选）

如果依次查询数据库，会导致 **N+1 查询问题**，性能很差。

## 方案对比

### ❌ 方案一：依次查询（不推荐）

```javascript
// 问题：需要多次数据库查询，性能差
const getDetail = async (id, userId) => {
    // 1. 查询博客
    const blog = await exec(`SELECT * FROM blogs WHERE id=${id}`)
    
    // 2. 查询点赞数
    const likeCount = await exec(`SELECT COUNT(*) FROM blog_likes WHERE blog_id=${id}`)
    
    // 3. 查询评论数
    const commentCount = await exec(`SELECT COUNT(*) FROM blog_comments WHERE blog_id=${id}`)
    
    // 4. 查询用户是否已点赞
    const isLiked = await exec(`SELECT * FROM blog_likes WHERE user_id=${userId} AND blog_id=${id}`)
    
    // 问题：4 次数据库查询，串行执行，总耗时 = 查询1 + 查询2 + 查询3 + 查询4
    return { blog, likeCount, commentCount, isLiked }
}
```

**缺点：**
- 需要 4 次数据库查询
- 串行执行，总耗时长
- 数据库连接占用时间长

### ✅ 方案二：并行查询（推荐）

```javascript
// 优点：并行执行，总耗时 = max(查询1, 查询2, 查询3, 查询4)
const getDetailWithRelations = (id, userId) => {
    const promises = [
        exec(`SELECT * FROM blogs WHERE id=${id}`),
        exec(`SELECT COUNT(*) FROM blog_likes WHERE blog_id=${id}`),
        exec(`SELECT COUNT(*) FROM blog_comments WHERE blog_id=${id}`),
        exec(`SELECT * FROM blog_likes WHERE user_id=${userId} AND blog_id=${id}`)
    ]
    
    return Promise.all(promises).then(results => {
        // 处理结果...
    })
}
```

**优点：**
- 并行执行，总耗时约等于最慢的查询
- 代码清晰，易于维护
- 适合复杂业务逻辑

**缺点：**
- 仍然是多次数据库查询
- 数据库连接数占用较多

### ✅✅ 方案三：JOIN 查询（性能最优）

```javascript
// 优点：一次 SQL 查询获取所有数据
const getDetailWithJoin = (id, userId) => {
    const sql = `
        SELECT 
            b.*,
            (SELECT COUNT(*) FROM blog_likes WHERE blog_id=b.id) as likeCount,
            (SELECT COUNT(*) FROM blog_comments WHERE blog_id=b.id) as commentCount,
            (SELECT COUNT(*) > 0 FROM blog_likes WHERE user_id=${userId} AND blog_id=b.id) as isLiked
        FROM blogs b
        WHERE b.id=${id};
    `
    return exec(sql)
}
```

**优点：**
- **只需 1 次数据库查询**
- 性能最优
- 数据库连接占用最少

**缺点：**
- SQL 较复杂
- 需要理解子查询

## 实际应用

### API 接口

1. **基础接口**：`GET /api/blog/detail?id=1`
   - 只返回博客基本信息
   - 适用于简单场景

2. **完整接口**：`GET /api/blog/detail/full?id=1&userId=123`
   - 返回博客信息 + 点赞数 + 评论数 + 是否已点赞
   - **推荐使用**

3. **评论列表**：`GET /api/blog/comments?blogId=1&page=1&pageSize=10`
   - 分页获取评论列表
   - 单独接口，按需加载

### 使用建议

1. **博客详情页**：使用 `/api/blog/detail/full` 一次性获取所有数据
2. **博客列表页**：使用基础接口，只获取基本信息
3. **评论列表**：使用单独接口，支持分页和懒加载

## 性能对比

假设每次数据库查询耗时 10ms：

| 方案 | 查询次数 | 总耗时 | 说明 |
|------|---------|--------|------|
| 依次查询 | 4 次 | ~40ms | 串行执行 |
| 并行查询 | 4 次 | ~10ms | 并行执行 |
| JOIN 查询 | 1 次 | ~10ms | 一次查询 |

**结论：JOIN 查询性能最优，推荐使用！**

## 数据库表结构

### 博客点赞表
```sql
CREATE TABLE blog_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    blog_id INT NOT NULL,
    createtime BIGINT NOT NULL,
    UNIQUE KEY uk_user_blog (user_id, blog_id)
);
```

### 博客评论表
```sql
CREATE TABLE blog_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    createtime BIGINT NOT NULL,
    KEY idx_blog_id (blog_id)
);
```

## 注意事项

1. **SQL 注入防护**：代码中使用了字符串拼接，实际生产环境应该使用参数化查询
2. **索引优化**：确保 `blog_id`、`user_id` 等字段有索引
3. **缓存策略**：点赞数、评论数可以考虑使用 Redis 缓存
4. **分页加载**：评论列表建议使用分页，避免一次性加载过多数据

