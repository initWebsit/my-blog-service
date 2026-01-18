# 分页查询实现指南

## 什么是分页查询？

分页查询是将大量数据分成多个"页"来显示，每次只加载一页的数据，避免一次性加载所有数据导致性能问题。

---

## MySQL 分页语法

### 基本语法

```sql
SELECT * FROM 表名
ORDER BY 排序字段
LIMIT 每页数量 OFFSET 偏移量;
```

### 参数说明

- **LIMIT**：限制返回的记录数（每页数量）
- **OFFSET**：跳过多少条记录（偏移量）
- **计算公式**：`offset = (page - 1) * pageSize`

### 示例

```sql
-- 第1页，每页10条
SELECT * FROM blogs 
ORDER BY createtime DESC 
LIMIT 10 OFFSET 0;

-- 第2页，每页10条
SELECT * FROM blogs 
ORDER BY createtime DESC 
LIMIT 10 OFFSET 10;

-- 第3页，每页10条
SELECT * FROM blogs 
ORDER BY createtime DESC 
LIMIT 10 OFFSET 20;
```

### 等价写法

```sql
-- 方式1：LIMIT offset, count（MySQL 特有）
LIMIT 10 OFFSET 0
-- 等价于
LIMIT 0, 10

-- 方式2：LIMIT count OFFSET offset（SQL 标准）
LIMIT 10 OFFSET 0
```

---

## 分页查询实现

### 1. 查询列表数据

```sql
SELECT * FROM blogs 
WHERE 1=1
  AND author='zhangsan'  -- 可选条件
  AND title LIKE '%关键词%'  -- 可选条件
ORDER BY createtime DESC
LIMIT 10 OFFSET 0;
```

### 2. 查询总数

```sql
SELECT COUNT(*) as total FROM blogs 
WHERE 1=1
  AND author='zhangsan'
  AND title LIKE '%关键词%';
```

### 3. 计算分页信息

```javascript
const total = 100        // 总记录数
const pageSize = 10      // 每页数量
const page = 1           // 当前页码

const totalPages = Math.ceil(total / pageSize)  // 总页数：10
const hasNext = page < totalPages                // 是否有下一页：true
const hasPrev = page > 1                         // 是否有上一页：false
```

---

## 完整实现示例

### 后端实现

```javascript
const getListWithPagination = (author, keyword, page = 1, pageSize = 10) => {
    // 计算偏移量
    const offset = (page - 1) * pageSize
    
    // 构建查询条件
    let whereCondition = ` WHERE 1=1 `
    if (author) {
        whereCondition += `AND author='${author}' `
    }
    if (keyword) {
        whereCondition += `AND title LIKE '%${keyword}%' `
    }
    
    // 查询列表数据
    const listSql = `
        SELECT * FROM blogs 
        ${whereCondition}
        ORDER BY createtime DESC
        LIMIT ${pageSize} OFFSET ${offset};
    `
    
    // 查询总数
    const countSql = `
        SELECT COUNT(*) as total FROM blogs 
        ${whereCondition};
    `
    
    // 并行查询列表和总数
    return Promise.all([
        exec(listSql),
        exec(countSql)
    ]).then(([listData, countData]) => {
        const total = countData[0].total || 0
        const totalPages = Math.ceil(total / pageSize)
        
        return {
            list: listData,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total: parseInt(total),
                totalPages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    })
}
```

### API 接口

```javascript
// GET /api/blog/list/pagination?page=1&pageSize=10&author=zhangsan&keyword=关键词

router.get('/list/pagination', (req, res, next) => {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const author = req.query.author || ''
    const keyword = req.query.keyword || ''
    
    const result = getListWithPagination(author, keyword, page, pageSize)
    return result.then(data => {
        res.json(new SuccessModel(data))
    })
})
```

### 返回数据格式

```json
{
    "errno": 0,
    "data": {
        "list": [
            {
                "id": 1,
                "title": "博客标题1",
                "content": "博客内容...",
                "author": "zhangsan",
                "createtime": 1234567890
            },
            {
                "id": 2,
                "title": "博客标题2",
                "content": "博客内容...",
                "author": "zhangsan",
                "createtime": 1234567891
            }
        ],
        "pagination": {
            "page": 1,
            "pageSize": 10,
            "total": 100,
            "totalPages": 10,
            "hasNext": true,
            "hasPrev": false
        }
    }
}
```

---

## 前端使用示例

### JavaScript/Axios

```javascript
// 获取第1页数据
axios.get('/api/blog/list/pagination', {
    params: {
        page: 1,
        pageSize: 10,
        keyword: '搜索关键词'
    }
}).then(response => {
    const { list, pagination } = response.data.data
    
    // 渲染列表
    renderList(list)
    
    // 渲染分页器
    renderPagination(pagination)
})

// 翻页
function goToPage(page) {
    axios.get('/api/blog/list/pagination', {
        params: {
            page: page,
            pageSize: 10
        }
    }).then(response => {
        const { list, pagination } = response.data.data
        renderList(list)
        renderPagination(pagination)
    })
}
```

### React 示例

```jsx
function BlogList() {
    const [blogs, setBlogs] = useState([])
    const [pagination, setPagination] = useState({})
    const [page, setPage] = useState(1)
    
    useEffect(() => {
        fetchBlogs(page)
    }, [page])
    
    const fetchBlogs = async (page) => {
        const response = await axios.get('/api/blog/list/pagination', {
            params: { page, pageSize: 10 }
        })
        setBlogs(response.data.data.list)
        setPagination(response.data.data.pagination)
    }
    
    return (
        <div>
            {/* 博客列表 */}
            {blogs.map(blog => (
                <BlogItem key={blog.id} blog={blog} />
            ))}
            
            {/* 分页器 */}
            <Pagination
                current={pagination.page}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onChange={setPage}
            />
        </div>
    )
}
```

---

## 分页方式对比

### 1. 基于页码的分页（Page-based）⭐ 推荐

```sql
-- 第1页
LIMIT 10 OFFSET 0

-- 第2页
LIMIT 10 OFFSET 10
```

**优点：**
- 实现简单
- 用户体验好（可以直接跳转到指定页）
- 适合大多数场景

**缺点：**
- 数据变化时，页码可能不准确
- 大数据量时，OFFSET 性能较差

---

### 2. 基于游标的分页（Cursor-based）

```sql
-- 第一页
SELECT * FROM blogs 
WHERE id > 0
ORDER BY id
LIMIT 10;

-- 第二页（使用上一页最后一条的 id）
SELECT * FROM blogs 
WHERE id > 20  -- 上一页最后一条的 id
ORDER BY id
LIMIT 10;
```

**优点：**
- 性能好（不需要 OFFSET）
- 数据变化时更稳定

**缺点：**
- 不能直接跳转到指定页
- 实现较复杂

**适用场景：**
- 数据量非常大（百万级以上）
- 实时性要求高（如微博、Twitter）

---

## 性能优化

### 1. 索引优化

```sql
-- 确保排序字段有索引
CREATE INDEX idx_createtime ON blogs(createtime);

-- 确保查询条件字段有索引
CREATE INDEX idx_author ON blogs(author);
CREATE INDEX idx_title ON blogs(title);
```

### 2. 避免大 OFFSET

**问题：** 当 `OFFSET` 很大时（如 `OFFSET 10000`），MySQL 需要扫描并跳过大量数据，性能很差。

**解决方案：**

```sql
-- ❌ 性能差：OFFSET 很大
SELECT * FROM blogs 
ORDER BY id 
LIMIT 10 OFFSET 10000;

-- ✅ 性能好：使用 WHERE 条件
SELECT * FROM blogs 
WHERE id > 10000
ORDER BY id 
LIMIT 10;
```

### 3. 限制每页数量

```javascript
// 限制最大每页数量，避免一次性查询过多数据
const maxPageSize = 100
const pageSize = Math.min(req.query.pageSize || 10, maxPageSize)
```

### 4. 缓存总数

```javascript
// 使用 Redis 缓存总数（如果数据不经常变化）
const cacheKey = `blog_count_${author}_${keyword}`
const cachedTotal = await redis.get(cacheKey)

if (cachedTotal) {
    return parseInt(cachedTotal)
} else {
    const total = await getListCount(author, keyword)
    await redis.set(cacheKey, total, 300) // 缓存5分钟
    return total
}
```

---

## 常见问题

### 1. 为什么需要查询总数？

**原因：**
- 前端需要显示总页数
- 需要判断是否有上一页/下一页
- 用户体验（显示"共100条，第1页"）

**优化：**
- 如果不需要显示总数，可以不查询（使用游标分页）
- 使用缓存减少查询次数

---

### 2. 数据变化时页码不准确？

**场景：**
- 用户在第2页
- 第1页新增了一条数据
- 用户刷新后，第2页的数据会"上移"

**解决方案：**
- 使用游标分页（Cursor-based）
- 或者接受这个"不准确"（大多数场景可以接受）

---

### 3. 如何优化大 OFFSET 的性能？

**方案1：使用 WHERE 条件替代 OFFSET**

```sql
-- 假设每页10条，查询第100页
-- ❌ 性能差
LIMIT 10 OFFSET 990

-- ✅ 性能好（如果 id 是连续的）
WHERE id > 9900
LIMIT 10
```

**方案2：使用子查询**

```sql
SELECT * FROM blogs 
WHERE id IN (
    SELECT id FROM blogs 
    ORDER BY createtime DESC 
    LIMIT 10 OFFSET 990
)
ORDER BY createtime DESC;
```

---

## 最佳实践

### 1. 参数验证

```javascript
// 验证页码
if (page < 1) {
    return res.json(new ErrorModel('页码必须大于0'))
}

// 验证每页数量
if (pageSize < 1 || pageSize > 100) {
    return res.json(new ErrorModel('每页数量必须在1-100之间'))
}
```

### 2. 默认值设置

```javascript
const page = parseInt(req.query.page) || 1
const pageSize = parseInt(req.query.pageSize) || 10
```

### 3. 返回完整的分页信息

```javascript
{
    list: [...],
    pagination: {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false
    }
}
```

### 4. 使用并行查询

```javascript
// ✅ 并行查询列表和总数
Promise.all([
    exec(listSql),
    exec(countSql)
])

// ❌ 串行查询（性能差）
const list = await exec(listSql)
const total = await exec(countSql)
```

---

## 实际应用

### API 接口

```
GET /api/blog/list/pagination?page=1&pageSize=10&author=zhangsan&keyword=关键词
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | number | 否 | 页码，从1开始 | 1 |
| pageSize | number | 否 | 每页数量 | 10 |
| author | string | 否 | 作者筛选 | - |
| keyword | string | 否 | 关键词搜索 | - |
| isadmin | boolean | 否 | 是否管理员模式 | false |

### 返回示例

```json
{
    "errno": 0,
    "data": {
        "list": [...],
        "pagination": {
            "page": 1,
            "pageSize": 10,
            "total": 100,
            "totalPages": 10,
            "hasNext": true,
            "hasPrev": false
        }
    }
}
```

---

## 总结

1. **分页语法**：`LIMIT pageSize OFFSET offset`，其中 `offset = (page - 1) * pageSize`
2. **需要查询总数**：用于计算总页数和判断是否有上一页/下一页
3. **性能优化**：确保排序和查询字段有索引，避免大 OFFSET
4. **参数验证**：验证页码和每页数量的合法性
5. **并行查询**：同时查询列表和总数，提高性能

对于大多数场景，基于页码的分页已经足够。只有在数据量非常大（百万级以上）时，才需要考虑游标分页。

