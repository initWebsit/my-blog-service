/**
 * MySQL 连接测试文件
 * 运行: node test-mysql.js
 */

const mysql = require('mysql')
const { MYSQL_CONF } = require('./conf/db')

console.log('正在测试 MySQL 连接...')
console.log('配置信息:', {
    host: MYSQL_CONF.host,
    port: MYSQL_CONF.port,
    user: MYSQL_CONF.user,
    database: MYSQL_CONF.database
})
console.log('')

// 确保使用 TCP/IP 连接
const connectionConfig = {
    ...MYSQL_CONF,
    host: MYSQL_CONF.host || '127.0.0.1',
    socketPath: undefined  // 明确不使用 socket
}

const connection = mysql.createConnection(connectionConfig)

connection.connect((err) => {
    if (err) {
        console.error('❌ MySQL 连接失败!')
        console.error('错误信息:', err.message)
        console.error('错误代码:', err.code)
        console.error('')
        console.error('请检查以下事项:')
        console.error('1. MySQL 服务是否启动')
        console.error('   macOS: brew services start mysql 或 mysql.server start')
        console.error('   Linux: sudo systemctl start mysql')
        console.error('')
        console.error('2. 配置信息是否正确 (conf/db.js)')
        console.error('   - host: 应该是 127.0.0.1 (不是 localhost)')
        console.error('   - user: MySQL 用户名')
        console.error('   - password: MySQL 密码')
        console.error('   - database: 数据库名')
        console.error('')
        console.error('3. 数据库是否存在')
        console.error('   运行: mysql -u root -p')
        console.error('   然后执行: CREATE DATABASE blog;')
        console.error('')
        console.error('4. 用户是否有权限')
        console.error('   运行: mysql -u root -p')
        console.error('   然后执行: GRANT ALL PRIVILEGES ON blog.* TO \'user\'@\'127.0.0.1\';')
        process.exit(1)
    }
    
    console.log('✅ MySQL 连接成功!')
    console.log('')
    
    // 测试查询
    connection.query('SELECT VERSION() as version, DATABASE() as database_name, USER() as user', (err, results) => {
        if (err) {
            console.error('❌ 查询失败:', err.message)
            connection.end()
            process.exit(1)
        }
        
        console.log('MySQL 信息:')
        console.log('  版本:', results[0].version)
        console.log('  当前数据库:', results[0].database_name || '未选择数据库')
        console.log('  当前用户:', results[0].user)
        console.log('')
        
        // 测试数据库是否存在
        connection.query('SHOW DATABASES', (err, databases) => {
            if (err) {
                console.error('❌ 查询数据库列表失败:', err.message)
            } else {
                console.log('可用数据库:')
                databases.forEach(db => {
                    const dbName = Object.values(db)[0]
                    const isCurrent = dbName === MYSQL_CONF.database
                    console.log(`  ${isCurrent ? '✓' : ' '} ${dbName}${isCurrent ? ' (当前)' : ''}`)
                })
                console.log('')
            }
            
            connection.end()
            console.log('✅ 测试完成!')
            process.exit(0)
        })
    })
})
