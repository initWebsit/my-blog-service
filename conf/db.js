const env = process.env.NODE_ENV || 'dev' // 环境参数，默认为开发环境

// 配置
let MYSQL_CONF
let REDIS_CONF

// 开发环境下（默认）
if (env === 'dev' || !env) {
    // mysql 配置
    MYSQL_CONF = {
        host: '127.0.0.1',  // 使用 127.0.0.1 而不是 localhost，避免 socket 连接问题
        user: 'root',       // 请修改为你的 MySQL 用户名
        password: '13997565277',       // 请修改为你的 MySQL 密码
        port: 3306,         // MySQL 端口
        database: 'blog'    // 请确保数据库已创建
    }

    // redis 配置
    REDIS_CONF = {
        host: '127.0.0.1',
        port: 6379
    }
}

// 线上环境时，这里暂时和开发环境配置一样，当真正发布到线上时，需要将配置改为线上
if (env === 'production') {
    MYSQL_CONF = {
        host: '127.0.0.1',
        user: 'root',       // 请修改为你的 MySQL 用户名
        password: '13997565277',        // 请修改为你的 MySQL 密码
        port: 3306,
        database: 'blog'
    }

    REDIS_CONF = {
        host: '127.0.0.1',
        port: 6379
    }
}

module.exports = {
    MYSQL_CONF,
    REDIS_CONF,
}