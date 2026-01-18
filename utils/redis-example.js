/**
 * Redis 工具类使用示例
 * 这个文件仅作为示例参考，实际使用时请删除此文件
 */

const { set, get, del, exists, expire, ttl } = require('./redis')

// 示例1: 设置简单的字符串值
async function example1() {
    try {
        await set('username', 'xiaoliu')
        const username = await get('username')
        console.log('username:', username) // 输出: username: xiaoliu
    } catch (err) {
        console.error('错误:', err)
    }
}

// 示例2: 设置带过期时间的值（30秒后过期）
async function example2() {
    try {
        await set('token', 'abc123xyz', 30) // 30秒后自动删除
        const token = await get('token')
        console.log('token:', token)
    } catch (err) {
        console.error('错误:', err)
    }
}

// 示例3: 设置对象（会自动序列化为JSON）
async function example3() {
    try {
        const userInfo = {
            id: 1,
            username: 'xiaoliu',
            email: 'xiaoliu@example.com'
        }
        await set('user:1', userInfo)
        const user = await get('user:1')
        console.log('user:', user) // 输出: user: { id: 1, username: 'xiaoliu', email: 'xiaoliu@example.com' }
    } catch (err) {
        console.error('错误:', err)
    }
}

// 示例4: 检查键是否存在
async function example4() {
    try {
        await set('test-key', 'test-value')
        const isExists = await exists('test-key')
        console.log('键是否存在:', isExists) // 输出: true
        
        const isNotExists = await exists('non-existent-key')
        console.log('不存在的键:', isNotExists) // 输出: false
    } catch (err) {
        console.error('错误:', err)
    }
}

// 示例5: 删除键
async function example5() {
    try {
        await set('temp-key', 'temp-value')
        await del('temp-key')
        const value = await get('temp-key')
        console.log('删除后的值:', value) // 输出: null
    } catch (err) {
        console.error('错误:', err)
    }
}

// 示例6: 设置过期时间
async function example6() {
    try {
        await set('session:123', 'session-data')
        await expire('session:123', 60) // 60秒后过期
        const remainingTime = await ttl('session:123')
        console.log('剩余过期时间（秒）:', remainingTime) // 输出: 60
    } catch (err) {
        console.error('错误:', err)
    }
}

// 示例7: 在路由中使用（实际项目中的用法）
/*
const express = require('express')
const router = express.Router()
const { set, get } = require('../utils/redis')

// 缓存博客列表
router.get('/list', async (req, res, next) => {
    const cacheKey = 'blog:list'
    
    try {
        // 先尝试从redis获取
        let blogList = await get(cacheKey)
        
        if (blogList) {
            // 缓存命中，直接返回
            return res.json(new SuccessModel(blogList, '从缓存获取'))
        }
        
        // 缓存未命中，从数据库查询
        blogList = await getList()
        
        // 存入redis，设置5分钟过期时间
        await set(cacheKey, blogList, 300)
        
        res.json(new SuccessModel(blogList, '从数据库获取'))
    } catch (err) {
        next(err)
    }
})
*/

// 运行示例（取消注释以运行）
// example1()
// example2()
// example3()
// example4()
// example5()
// example6()

module.exports = {
    example1,
    example2,
    example3,
    example4,
    example5,
    example6
}
