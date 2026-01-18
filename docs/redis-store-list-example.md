# Redis 存储博客列表完整示例

## Redis 存储数组/对象列表的原理

Redis 本身只能存储字符串，但我们可以通过 **JSON 序列化** 来存储复杂的数据结构（数组、对象等）。

你的项目中的 `utils/redis.js` 已经自动处理了 JSON 序列化：

```javascript
// set 方法会自动将对象转为 JSON 字符串
if (typeof val === 'object') {
    val = JSON.stringify(val)
}

// get 方法会自动将 JSON 字符串解析回对象
try {
    resolve(JSON.parse(val))
} catch (ex) {
    resolve(val)
}
```

---

## 完整实现示例

### 1. 基础版本：存储和获取博客列表

```javascript
// controller/blog.js
const { set, get, del } = require('../utils/redis')
const { exec } = require('../db/mysql')

/**
 * 获取博客列表（带缓存）
 * @param {string} author - 作者（可选）
 * @param {string} keyword - 关键词（可选）
 * @returns {Promise<Array>} 返回博客列表
 */
const getListWithCache = async (author, keyword) => {
    // 构建缓存键
    const cacheKey = `blog:list:${author || 'all'}:${keyword || ''}`
    
    // 1. 先尝试从 Redis 获取
    const cached = await get(cacheKey)
    if (cached) {
        console.log('✅ 从 Redis 缓存获取博客列表')
        return cached
    }
    
    // 2. 缓存未命中，从数据库查询
    console.log('❌ 缓存未命中，从数据库查询')
    let sql = `select * from blogs where 1=1 `
    if (author) {
        sql += `and author='${author}' `
    }
    if (keyword) {
        sql += `and title like '%${keyword}%' `
    }
    sql += `order by createtime desc;`
    
    const list = await exec(sql)
    
    // 3. 存入 Redis，设置过期时间（5分钟 = 300秒）
    await set(cacheKey, list, 300)
    console.log('💾 博客列表已存入 Redis 缓存')
    
    return list
}
```

---

### 2. 分页版本：存储分页列表

```javascript
/**
 * 获取博客列表（分页 + 缓存）
 * @param {string} author - 作者（可选）
 * @param {string} keyword - 关键词（可选）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 返回包含列表和分页信息的对象
 */
const getListWithPaginationAndCache = async (author, keyword, page = 1, pageSize = 10) => {
    // 构建缓存键（包含分页参数）
    const cacheKey = `blog:list:${author || 'all'}:${keyword || ''}:${page}:${pageSize}`
    
    // 1. 先尝试从 Redis 获取
    const cached = await get(cacheKey)
    if (cached) {
        console.log('✅ 从 Redis 缓存获取分页列表')
        return cached
    }
    
    // 2. 缓存未命中，从数据库查询
    console.log('❌ 缓存未命中，从数据库查询')
    const offset = (page - 1) * pageSize
    
    let whereCondition = ` where 1=1 `
    if (author) {
        whereCondition += `and author='${author}' `
    }
    if (keyword) {
        whereCondition += `and title like '%${keyword}%' `
    }
    
    // 查询列表
    const listSql = `
        select * from blogs 
        ${whereCondition}
        order by createtime desc
        limit ${pageSize} offset ${offset};
    `
    
    // 查询总数
    const countSql = `
        select count(*) as total from blogs 
        ${whereCondition};
    `
    
    const [listData, countData] = await Promise.all([
        exec(listSql),
        exec(countSql)
    ])
    
    const total = countData[0].total || 0
    const totalPages = Math.ceil(total / pageSize)
    
    const result = {
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
    
    // 3. 存入 Redis，设置过期时间（5分钟）
    await set(cacheKey, result, 300)
    console.log('💾 分页列表已存入 Redis 缓存')
    
    return result
}
```

---

### 3. 更新博客时清除缓存

```javascript
/**
 * 新增博客（清除相关缓存）
 */
const newBlogWithCache = async (blogData) => {
    const { exec } = require('../db/mysql')
    const xss = require('xss')
    
    const title = xss(blogData.title)
    const content = xss(blogData.content)
    const author = blogData.author
    const createtime = Date.now()
    
    const sql = `
        insert into blogs (title, content, createtime, author)
        values ('${title}', '${content}', '${createtime}', '${author}');
    `
    
    const insertData = await exec(sql)
    
    // 清除相关缓存
    // 注意：需要清除所有相关的列表缓存
    await clearBlogListCache(author)
    
    return {
        id: insertData.insertId
    }
}

/**
 * 更新博客（清除相关缓存）
 */
const updateBlogWithCache = async (id, blogData) => {
    const { exec } = require('../db/mysql')
    const xss = require('xss')
    
    const title = xss(blogData.title)
    const content = xss(blogData.content)
    
    const sql = `
        update blogs set title='${title}', content='${content}' where id=${id};
    `
    
    const updateData = await exec(sql)
    
    if (updateData.affectedRows > 0) {
        // 清除相关缓存
        await clearBlogListCache()
        // 清除该博客的详情缓存
        await del(`blog:detail:${id}`)
        return true
    }
    
    return false
}

/**
 * 删除博客（清除相关缓存）
 */
const delBlogWithCache = async (id, author) => {
    const { exec } = require('../db/mysql')
    
    const sql = `delete from blogs where id=${id} and author='${author}';`
    const delData = await exec(sql)
    
    if (delData.affectedRows > 0) {
        // 清除相关缓存
        await clearBlogListCache(author)
        await del(`blog:detail:${id}`)
        return true
    }
    
    return false
}

/**
 * 清除博客列表相关缓存
 * 注意：Redis 不支持通配符删除，需要手动删除或使用 SCAN
 */
const clearBlogListCache = async (author = null) => {
    // 方案1：删除所有可能的缓存键（简单但不完美）
    const keys = [
        `blog:list:all:`,
        `blog:list:${author || 'all'}:`,
        `blog:count:all:`,
        `blog:count:${author || 'all'}:`
    ]
    
    // 删除所有分页缓存（假设最多100页）
    for (let page = 1; page <= 100; page++) {
        for (let pageSize of [10, 20, 50]) {
            keys.push(`blog:list:all::${page}:${pageSize}`)
            keys.push(`blog:list:${author || 'all'}::${page}:${pageSize}`)
        }
    }
    
    // 批量删除
    for (const key of keys) {
        await del(key)
    }
    
    console.log('🗑️ 已清除博客列表相关缓存')
}
```

---

## 实际使用示例

### 在路由中使用

```javascript
// routes/blog.js
const { getListWithCache, getListWithPaginationAndCache } = require('../controller/blog')

// 获取博客列表（带缓存）
router.get('/list', async (req, res, next) => {
    let author = req.query.author || ''
    const keyword = req.query.keyword || ''
    
    if (req.query.isadmin) {
        if (req.session.username == null) {
            res.json(new ErrorModel('未登录'))
            return
        }
        author = req.session.username
    }
    
    try {
        const listData = await getListWithCache(author, keyword)
        res.json(new SuccessModel(listData))
    } catch (err) {
        next(err)
    }
})

// 获取分页列表（带缓存）
router.get('/list/pagination', async (req, res, next) => {
    let author = req.query.author || ''
    const keyword = req.query.keyword || ''
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    
    if (req.query.isadmin) {
        if (req.session.username == null) {
            res.json(new ErrorModel('未登录'))
            return
        }
        author = req.session.username
    }
    
    try {
        const result = await getListWithPaginationAndCache(author, keyword, page, pageSize)
        res.json(new SuccessModel(result))
    } catch (err) {
        next(err)
    }
})
```

---

## 数据存储格式

### Redis 中存储的数据

```javascript
// 缓存键
blog:list:all::1:10

// 存储的值（JSON 字符串）
{
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
```

### Redis 实际存储（JSON 字符串）

```
键: blog:list:all::1:10
值: {"list":[{"id":1,"title":"博客标题1",...}],"pagination":{...}}
```

---

## 缓存键命名规范

### 推荐格式

```
模块:类型:参数1:参数2:参数3:参数4
```

### 示例

```javascript
// 所有博客列表
blog:list:all:

// 特定作者的博客列表
blog:list:zhangsan:

// 搜索关键词的博客列表
blog:list:all:关键词

// 分页列表
blog:list:all::1:10        // 第1页，每页10条
blog:list:zhangsan::2:20  // 作者zhangsan，第2页，每页20条
blog:list:all:关键词:1:10  // 搜索关键词，第1页，每页10条
```

---

## 注意事项

### 1. 缓存过期时间

```javascript
// 列表数据：5-10分钟（数据变化相对频繁）
await set(cacheKey, list, 300)  // 5分钟

// 详情数据：10-30分钟（数据变化较少）
await set(cacheKey, detail, 1800)  // 30分钟
```

### 2. 缓存更新策略

**方案1：删除缓存（推荐）**
```javascript
// 更新数据后，删除相关缓存
await del(cacheKey)
// 下次查询时自动重新加载
```

**方案2：更新缓存**
```javascript
// 更新数据后，同时更新缓存
await updateDatabase()
await set(cacheKey, newData, 300)
```

### 3. 缓存穿透防护

```javascript
// 如果查询结果为空，也缓存空结果（时间短一些）
if (list.length === 0) {
    await set(cacheKey, [], 60)  // 缓存1分钟
}
```

### 4. 缓存雪崩防护

```javascript
// 设置随机过期时间，避免大量缓存同时过期
const expireTime = 300 + Math.random() * 60  // 300-360秒之间
await set(cacheKey, list, expireTime)
```

---

## 测试示例

### 测试缓存功能

```javascript
// test-redis-list.js
const { set, get, del } = require('./utils/redis')

async function testBlogListCache() {
    // 模拟博客列表数据
    const blogList = [
        {
            id: 1,
            title: "博客标题1",
            content: "博客内容...",
            author: "zhangsan",
            createtime: 1234567890
        },
        {
            id: 2,
            title: "博客标题2",
            content: "博客内容...",
            author: "zhangsan",
            createtime: 1234567891
        }
    ]
    
    const cacheKey = 'blog:list:all:'
    
    // 1. 存储列表
    console.log('存储博客列表到 Redis...')
    await set(cacheKey, blogList, 300)
    console.log('✅ 存储成功')
    
    // 2. 获取列表
    console.log('\n从 Redis 获取博客列表...')
    const cached = await get(cacheKey)
    console.log('✅ 获取成功:', cached)
    
    // 3. 验证数据
    console.log('\n验证数据:')
    console.log('列表长度:', cached.length)
    console.log('第一条博客:', cached[0])
    
    // 4. 删除缓存
    console.log('\n删除缓存...')
    await del(cacheKey)
    console.log('✅ 删除成功')
    
    // 5. 再次获取（应该为 null）
    const afterDel = await get(cacheKey)
    console.log('\n删除后获取:', afterDel)
}

// 运行测试
testBlogListCache().catch(console.error)
```

---

## 性能优化建议

### 1. 批量操作

```javascript
// ❌ 逐个查询
for (const blogId of blogIds) {
    const detail = await getDetailWithCache(blogId)
}

// ✅ 批量查询
const details = await Promise.all(
    blogIds.map(id => getDetailWithCache(id))
)
```

### 2. 预热缓存

```javascript
// 系统启动时，预热热点数据
const warmupCache = async () => {
    // 预热首页列表
    await getListWithCache(null, null)
    
    // 预热热门博客详情
    const hotBlogs = await getHotBlogs()
    for (const blog of hotBlogs) {
        await getDetailWithCache(blog.id)
    }
}
```

### 3. 监控缓存命中率

```javascript
let cacheHits = 0
let cacheMisses = 0

const getListWithStats = async (author, keyword) => {
    const cacheKey = `blog:list:${author || 'all'}:${keyword || ''}`
    const cached = await get(cacheKey)
    
    if (cached) {
        cacheHits++
        return cached
    } else {
        cacheMisses++
        // 查询数据库...
    }
}

// 定期输出统计
setInterval(() => {
    const total = cacheHits + cacheMisses
    const hitRate = total > 0 ? (cacheHits / total * 100).toFixed(2) : 0
    console.log(`缓存命中率: ${hitRate}% (${cacheHits}/${total})`)
}, 60000)  // 每分钟输出一次
```

---

## 总结

1. **存储方式**：使用 JSON 序列化存储数组/对象
2. **工具函数**：`utils/redis.js` 已自动处理 JSON 序列化
3. **缓存键命名**：使用清晰的命名规范
4. **过期时间**：列表数据 5-10 分钟
5. **更新策略**：更新数据后删除相关缓存
6. **注意事项**：防止缓存穿透、雪崩等问题

你的项目中的 `utils/redis.js` 已经完美支持存储数组和对象，直接使用即可！

