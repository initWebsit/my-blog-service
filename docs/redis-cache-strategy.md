# Redis 缓存策略指南

## 什么时候使用 Redis 缓存？

### ✅ 适合缓存的数据

1. **读多写少的数据**
   - 博客列表、博客详情
   - 用户信息
   - 统计数据（点赞数、评论数）

2. **频繁查询的数据**
   - 热点数据
   - 首页推荐内容

3. **计算成本高的数据**
   - 聚合统计（总数、排行榜）
   - 复杂查询结果

4. **实时性要求不高的数据**
   - 可以接受短暂延迟的数据

---

### ❌ 不适合缓存的数据

1. **写多读少的数据**
   - 频繁更新的数据
   - 实时性要求极高的数据

2. **数据一致性要求高的数据**
   - 金融交易数据
   - 库存数据（需要精确）

3. **数据量过大的数据**
   - 单个数据超过几 MB
   - 不适合全部缓存

4. **很少访问的数据**
   - 冷数据
   - 缓存命中率低

---

## 博客系统的缓存策略

### 1. 博客表（blogs）✅ 适合缓存

#### 缓存场景

**✅ 博客列表**
```javascript
// 缓存键：blog:list:author:keyword:page:pageSize
const cacheKey = `blog:list:${author || 'all'}:${keyword || ''}:${page}:${pageSize}`
```

**缓存策略：**
- 缓存时间：5-10 分钟
- 更新时机：新增/更新/删除博客时，清除相关缓存
- 适用场景：首页列表、作者列表、搜索结果

**✅ 博客详情**
```javascript
// 缓存键：blog:detail:id
const cacheKey = `blog:detail:${id}`
```

**缓存策略：**
- 缓存时间：10-30 分钟
- 更新时机：更新博客时，清除该博客的缓存
- 适用场景：博客详情页

**✅ 博客总数**
```javascript
// 缓存键：blog:count:author:keyword
const cacheKey = `blog:count:${author || 'all'}:${keyword || ''}`
```

**缓存策略：**
- 缓存时间：5-10 分钟
- 更新时机：新增/删除博客时，清除相关缓存
- 适用场景：分页查询的总数

---

### 2. 点赞表（blog_likes）⚠️ 部分缓存

#### 缓存场景

**✅ 点赞数量**（推荐缓存）
```javascript
// 缓存键：blog:like:count:blogId
const cacheKey = `blog:like:count:${blogId}`
```

**缓存策略：**
- 缓存时间：5-10 分钟
- 更新时机：点赞/取消点赞时，更新缓存（+1/-1）
- 适用场景：博客详情页显示点赞数

**实现示例：**
```javascript
// 获取点赞数（带缓存）
const getLikeCountWithCache = async (blogId) => {
    const cacheKey = `blog:like:count:${blogId}`
    
    // 先查缓存
    let count = await get(cacheKey)
    if (count !== null) {
        return parseInt(count)
    }
    
    // 查数据库
    count = await getLikeCount(blogId)
    
    // 存入缓存，10分钟过期
    await set(cacheKey, count, 600)
    
    return count
}

// 点赞时更新缓存
const toggleLikeWithCache = async (userId, blogId) => {
    const result = await toggleLike(userId, blogId)
    
    // 更新缓存
    const cacheKey = `blog:like:count:${blogId}`
    const currentCount = await get(cacheKey)
    
    if (currentCount !== null) {
        // 缓存存在，直接更新
        const newCount = result.liked ? parseInt(currentCount) + 1 : parseInt(currentCount) - 1
        await set(cacheKey, newCount, 600)
    } else {
        // 缓存不存在，清除缓存，下次查询时重新加载
        await del(cacheKey)
    }
    
    return result
}
```

**❌ 点赞记录**（不推荐缓存）
- 需要实时查询用户是否已点赞
- 数据变化频繁
- 实时性要求高

---

### 3. 评论表（blog_comments）⚠️ 部分缓存

#### 缓存场景

**✅ 评论数量**（推荐缓存）
```javascript
// 缓存键：blog:comment:count:blogId
const cacheKey = `blog:comment:count:${blogId}`
```

**缓存策略：**
- 缓存时间：5-10 分钟
- 更新时机：新增/删除评论时，更新缓存
- 适用场景：博客详情页显示评论数

**❌ 评论列表**（不推荐缓存）
- 实时性要求高
- 用户需要看到最新评论
- 数据变化频繁

**特殊情况：**
- 如果评论量很大，可以考虑缓存前几页的热门评论
- 缓存时间设置较短（1-2 分钟）

---

### 4. 用户表（users）✅ 适合缓存

#### 缓存场景

**✅ 用户信息**
```javascript
// 缓存键：user:info:userId
const cacheKey = `user:info:${userId}`
```

**缓存策略：**
- 缓存时间：30 分钟 - 1 小时
- 更新时机：更新用户信息时，清除缓存
- 适用场景：用户详情、评论显示用户名

**✅ Session 数据**（已经在用）
- 项目已经在使用 Redis 存储 Session
- 这是 Redis 的经典应用场景

---

## 缓存策略总结表

| 数据表 | 数据类型 | 是否缓存 | 缓存时间 | 更新策略 |
|--------|---------|---------|---------|---------|
| blogs | 列表 | ✅ 是 | 5-10分钟 | 增删改时清除 |
| blogs | 详情 | ✅ 是 | 10-30分钟 | 更新时清除 |
| blogs | 总数 | ✅ 是 | 5-10分钟 | 增删时清除 |
| blog_likes | 点赞数 | ✅ 是 | 5-10分钟 | 点赞时更新 |
| blog_likes | 点赞记录 | ❌ 否 | - | 实时查询 |
| blog_comments | 评论数 | ✅ 是 | 5-10分钟 | 增删时更新 |
| blog_comments | 评论列表 | ❌ 否 | - | 实时查询 |
| users | 用户信息 | ✅ 是 | 30分钟-1小时 | 更新时清除 |
| users | Session | ✅ 是 | 24小时 | 自动过期 |

---

## 实现示例

### 1. 博客列表缓存

```javascript
// controller/blog.js
const { set, get, del } = require('../utils/redis')

const getListWithCache = async (author, keyword, page = 1, pageSize = 10) => {
    // 构建缓存键
    const cacheKey = `blog:list:${author || 'all'}:${keyword || ''}:${page}:${pageSize}`
    
    // 先查缓存
    const cached = await get(cacheKey)
    if (cached) {
        console.log('从缓存获取博客列表')
        return cached
    }
    
    // 查数据库
    console.log('从数据库查询博客列表')
    const result = await getListWithPagination(author, keyword, page, pageSize)
    
    // 存入缓存，5分钟过期
    await set(cacheKey, result, 300)
    
    return result
}

// 新增博客时清除缓存
const newBlogWithCache = async (blogData) => {
    const result = await newBlog(blogData)
    
    // 清除相关缓存
    await del(`blog:list:*`)  // 注意：需要支持通配符删除
    await del(`blog:count:*`)
    
    return result
}
```

---

### 2. 博客详情缓存

```javascript
const getDetailWithCache = async (id, userId = null) => {
    const cacheKey = `blog:detail:${id}`
    
    // 先查缓存
    const cached = await get(cacheKey)
    if (cached) {
        // 如果用户已登录，需要查询是否已点赞（不缓存）
        if (userId) {
            const isLiked = await checkLike(userId, id)
            cached.isLiked = isLiked
        }
        return cached
    }
    
    // 查数据库
    const result = await getDetailWithJoin(id, userId)
    
    // 存入缓存，30分钟过期
    await set(cacheKey, result, 1800)
    
    return result
}

// 更新博客时清除缓存
const updateBlogWithCache = async (id, blogData) => {
    const result = await updateBlog(id, blogData)
    
    if (result) {
        // 清除该博客的缓存
        await del(`blog:detail:${id}`)
        await del(`blog:list:*`)
    }
    
    return result
}
```

---

### 3. 点赞数缓存

```javascript
const getLikeCountWithCache = async (blogId) => {
    const cacheKey = `blog:like:count:${blogId}`
    
    // 先查缓存
    let count = await get(cacheKey)
    if (count !== null) {
        return parseInt(count)
    }
    
    // 查数据库
    count = await getLikeCount(blogId)
    
    // 存入缓存，10分钟过期
    await set(cacheKey, count, 600)
    
    return count
}

// 点赞时更新缓存
const toggleLikeWithCache = async (userId, blogId) => {
    const result = await toggleLike(userId, blogId)
    
    // 更新缓存
    const cacheKey = `blog:like:count:${blogId}`
    const currentCount = await get(cacheKey)
    
    if (currentCount !== null) {
        // 缓存存在，直接更新
        const newCount = result.liked 
            ? parseInt(currentCount) + 1 
            : parseInt(currentCount) - 1
        await set(cacheKey, newCount, 600)
    } else {
        // 缓存不存在，清除缓存，下次查询时重新加载
        await del(cacheKey)
    }
    
    return result
}
```

---

## 缓存更新策略

### 1. Cache Aside（旁路缓存）⭐ 推荐

**流程：**
1. 读：先查缓存，缓存未命中则查数据库，然后写入缓存
2. 写：更新数据库，然后删除缓存

**优点：**
- 实现简单
- 数据一致性较好

**缺点：**
- 可能出现缓存穿透（缓存未命中时）

**适用场景：**
- 大多数读多写少的场景
- 博客列表、详情等

---

### 2. Write Through（写穿透）

**流程：**
1. 写：同时更新数据库和缓存
2. 读：先查缓存

**优点：**
- 数据一致性最好

**缺点：**
- 写操作较慢（需要同时写两个地方）

**适用场景：**
- 数据一致性要求极高的场景

---

### 3. Write Back（写回）

**流程：**
1. 写：只更新缓存，异步更新数据库
2. 读：先查缓存

**优点：**
- 写操作很快

**缺点：**
- 数据可能丢失（缓存未持久化）
- 实现复杂

**适用场景：**
- 写操作非常频繁的场景
- 可以接受数据丢失的场景

---

## 缓存键命名规范

### 推荐格式

```
模块:类型:标识:参数
```

### 示例

```javascript
// 博客列表
blog:list:all::1:10              // 所有博客，第1页，每页10条
blog:list:zhangsan::1:10         // 作者zhangsan的博客
blog:list:all:关键词:1:10        // 搜索关键词的博客

// 博客详情
blog:detail:1                    // 博客ID为1的详情

// 点赞数
blog:like:count:1                 // 博客ID为1的点赞数

// 评论数
blog:comment:count:1             // 博客ID为1的评论数

// 用户信息
user:info:123                    // 用户ID为123的信息

// 总数
blog:count:all:                  // 所有博客总数
blog:count:zhangsan:             // 作者zhangsan的博客总数
```

---

## 缓存注意事项

### 1. 缓存穿透

**问题：** 查询不存在的数据，缓存未命中，每次都查数据库

**解决方案：**
```javascript
// 缓存空值
if (result === null) {
    await set(cacheKey, null, 60)  // 缓存空值，时间短一些
}
```

---

### 2. 缓存雪崩

**问题：** 大量缓存同时过期，导致大量请求打到数据库

**解决方案：**
```javascript
// 设置随机过期时间
const expireTime = 300 + Math.random() * 60  // 300-360秒之间
await set(cacheKey, data, expireTime)
```

---

### 3. 缓存击穿

**问题：** 热点数据过期，大量请求同时查询数据库

**解决方案：**
```javascript
// 使用互斥锁
const lockKey = `lock:${cacheKey}`
const lock = await set(lockKey, '1', 10)  // 10秒锁

if (lock) {
    // 获取锁，查数据库
    const data = await queryFromDB()
    await set(cacheKey, data, 300)
    await del(lockKey)
} else {
    // 未获取锁，等待后重试
    await sleep(100)
    return await get(cacheKey)
}
```

---

### 4. 缓存一致性

**问题：** 数据库更新后，缓存未更新

**解决方案：**
- 更新数据库后，立即删除相关缓存
- 使用较短的缓存时间
- 使用消息队列异步更新缓存

---

## 性能优化建议

### 1. 批量操作

```javascript
// ❌ 逐个查询
for (const blogId of blogIds) {
    const count = await getLikeCountWithCache(blogId)
}

// ✅ 批量查询
const counts = await Promise.all(
    blogIds.map(id => getLikeCountWithCache(id))
)
```

### 2. 预热缓存

```javascript
// 系统启动时，预热热点数据
const warmupCache = async () => {
    const hotBlogs = await getHotBlogs()  // 获取热门博客
    for (const blog of hotBlogs) {
        await getDetailWithCache(blog.id)
    }
}
```

### 3. 监控缓存命中率

```javascript
let cacheHits = 0
let cacheMisses = 0

const getWithStats = async (key) => {
    const cached = await get(key)
    if (cached) {
        cacheHits++
        return cached
    } else {
        cacheMisses++
        return null
    }
}

// 计算命中率
const hitRate = cacheHits / (cacheHits + cacheMisses)
```

---

## 总结

### ✅ 需要 Redis 缓存的表/数据

1. **blogs 表**
   - 博客列表 ✅
   - 博客详情 ✅
   - 博客总数 ✅

2. **blog_likes 表**
   - 点赞数量 ✅
   - 点赞记录 ❌（实时查询）

3. **blog_comments 表**
   - 评论数量 ✅
   - 评论列表 ❌（实时查询）

4. **users 表**
   - 用户信息 ✅
   - Session ✅（已在用）

---

### ❌ 不需要 Redis 缓存的表/数据

1. **实时性要求高的数据**
   - 用户是否已点赞
   - 最新评论列表

2. **写多读少的数据**
   - 频繁更新的数据

3. **数据一致性要求极高的数据**
   - 需要精确的数据

---

### 缓存策略建议

1. **读多写少** → 缓存时间长（10-30分钟）
2. **读少写多** → 不缓存或缓存时间短（1-2分钟）
3. **实时性要求高** → 不缓存或缓存时间很短（30秒-1分钟）
4. **数据变化频繁** → 更新时删除缓存，而不是更新缓存

