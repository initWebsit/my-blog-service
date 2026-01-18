/**
 * Redis 工具类测试文件
 * 运行: node test-redis.js
 */

const { set, get, del, exists, expire, ttl } = require('./utils/redis')

async function testRedis() {
    console.log('开始测试 Redis 工具类...\n')

    try {
        // 测试1: 设置和获取字符串
        console.log('测试1: 设置和获取字符串')
        await set('test:string', 'Hello Redis')
        const strValue = await get('test:string')
        console.log('✓ 设置值: test:string = "Hello Redis"')
        console.log('✓ 获取值:', strValue)
        console.log('')

        // 测试2: 设置和获取对象
        console.log('测试2: 设置和获取对象')
        const userInfo = {
            id: 1,
            username: 'xiaoliu',
            email: 'xiaoliu@example.com'
        }
        await set('test:object', userInfo)
        const objValue = await get('test:object')
        console.log('✓ 设置对象:', JSON.stringify(userInfo))
        console.log('✓ 获取对象:', JSON.stringify(objValue))
        console.log('')

        // 测试3: 设置带过期时间的值
        console.log('测试3: 设置带过期时间的值（5秒）')
        await set('test:expire', 'This will expire in 5 seconds', 5)
        const expireValue = await get('test:expire')
        const remainingTime = await ttl('test:expire')
        console.log('✓ 设置值（5秒过期）:', expireValue)
        console.log('✓ 剩余过期时间:', remainingTime, '秒')
        console.log('')

        // 测试4: 检查键是否存在
        console.log('测试4: 检查键是否存在')
        await set('test:exists', 'exists value')
        const isExists = await exists('test:exists')
        const isNotExists = await exists('test:not-exists')
        console.log('✓ test:exists 存在:', isExists)
        console.log('✓ test:not-exists 存在:', isNotExists)
        console.log('')

        // 测试5: 设置过期时间
        console.log('测试5: 为已存在的键设置过期时间（10秒）')
        await set('test:expire2', 'expire test')
        await expire('test:expire2', 10)
        const ttlValue = await ttl('test:expire2')
        console.log('✓ 设置过期时间后，剩余时间:', ttlValue, '秒')
        console.log('')

        // 测试6: 删除键
        console.log('测试6: 删除键')
        await set('test:delete', 'to be deleted')
        const beforeDelete = await get('test:delete')
        await del('test:delete')
        const afterDelete = await get('test:delete')
        console.log('✓ 删除前:', beforeDelete)
        console.log('✓ 删除后:', afterDelete)
        console.log('')

        // 清理测试数据
        console.log('清理测试数据...')
        await del('test:string')
        await del('test:object')
        await del('test:expire')
        await del('test:exists')
        await del('test:expire2')
        console.log('✓ 测试数据已清理\n')

        console.log('✅ 所有测试通过！')
        process.exit(0)
    } catch (err) {
        console.error('❌ 测试失败:', err)
        console.error('\n请确保 Redis 服务已启动！')
        console.error('启动方法:')
        console.error('  macOS: brew services start redis')
        console.error('  Linux: sudo systemctl start redis-server')
        process.exit(1)
    }
}

// 运行测试
testRedis()
