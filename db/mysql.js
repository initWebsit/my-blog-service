let mysql = require('mysql')

const { MYSQL_CONF } = require('../conf/db')

// 确保使用 TCP/IP 连接而不是 socket 连接
const connectionConfig = {
    ...MYSQL_CONF,
    host: MYSQL_CONF.host || '127.0.0.1',
    // 明确指定使用 TCP/IP 连接
    socketPath: undefined,
    // 设置字符集为 utf8mb4，支持 emoji 等 4 字节字符
    charset: 'utf8mb4'
}

let connection = mysql.createConnection(connectionConfig)

// eslint-disable-next-line no-unused-vars
connection.connect((err, result) => {
    if (err) {
        console.log('数据库连接失败:', err.message)
        console.log('请检查:')
        console.log('1. MySQL 服务是否启动')
        console.log('2. 配置中的 host、user、password、database 是否正确')
        console.log('3. MySQL 端口是否为 3306')
        return
    }
    // 确保连接使用 utf8mb4 字符集
    connection.query('SET NAMES utf8mb4')
    console.log('数据库连接成功')
})


// 统一执行 sql 函数
function exec(sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result)
        })
    })
}

module.exports = {
    exec,
    escape: mysql.escape
}