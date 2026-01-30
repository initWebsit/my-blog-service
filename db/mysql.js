let mysql = require('mysql')

const { MYSQL_CONF } = require('../conf/db')

// 确保使用 TCP/IP 连接而不是 socket 连接
const connectionConfig = {
    ...MYSQL_CONF,
    host: MYSQL_CONF.host || '127.0.0.1',
    // 明确指定使用 TCP/IP 连接
    socketPath: undefined,
    // 设置字符集为 utf8mb4，支持 emoji 等 4 字节字符
    charset: 'utf8mb4',
    // 连接池配置
    connectionLimit: 10,        // 连接池最大连接数
    queueLimit: 0,              // 队列限制，0 表示无限制
    acquireTimeout: 60000,      // 获取连接超时时间（毫秒）
    timeout: 60000,             // 查询超时时间（毫秒）
    reconnect: true,            // 自动重连
    // 连接选项
    multipleStatements: false,  // 禁用多语句查询（安全）
    dateStrings: false,         // 返回日期为 Date 对象而不是字符串
    debug: false                // 是否开启调试
}

// 使用连接池而不是单个连接
const pool = mysql.createPool(connectionConfig)

// 监听连接池错误
pool.on('error', (err) => {
    console.error('MySQL 连接池错误:', err)
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('MySQL 连接丢失，连接池会自动重连')
    } else if (err.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER') {
        console.log('MySQL 数据包乱序，连接池会自动处理')
    } else {
        console.error('MySQL 未知错误:', err.code)
    }
})

// 测试连接池
pool.getConnection((err, connection) => {
    if (err) {
        console.log('数据库连接池初始化失败:', err.message)
        console.log('请检查:')
        console.log('1. MySQL 服务是否启动')
        console.log('2. 配置中的 host、user、password、database 是否正确')
        console.log('3. MySQL 端口是否为 3306')
        return
    }
    // 确保连接使用 utf8mb4 字符集
    connection.query('SET NAMES utf8mb4', (err) => {
        connection.release() // 释放连接回连接池
        if (err) {
            console.log('设置字符集失败:', err.message)
        } else {
            console.log('数据库连接池初始化成功')
        }
    })
})

// 统一执行 sql 函数
function exec(sql) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err)
                return
            }
            
            connection.query(sql, (err, result) => {
                connection.release() // 释放连接回连接池
                if (err) {
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    })
}

// 优雅关闭连接池
function closePool() {
    return new Promise((resolve) => {
        pool.end((err) => {
            if (err) {
                console.error('关闭 MySQL 连接池时出错:', err)
            } else {
                console.log('MySQL 连接池已关闭')
            }
            resolve()
        })
    })
}

// 监听进程退出信号，优雅关闭连接池
process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信号，正在关闭 MySQL 连接池...')
    await closePool()
    process.exit(0)
})

process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信号，正在关闭 MySQL 连接池...')
    await closePool()
    process.exit(0)
})

module.exports = {
    exec,
    escape: mysql.escape,
    pool, // 导出连接池，以便需要时直接使用
    closePool
}