# MySQL 服务搭建和故障排查指南

## 一、MySQL 安装

### macOS 安装

#### 方法1: 使用 Homebrew（推荐）

```bash
# 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 或者手动启动（前台运行）
mysql.server start

# 停止 MySQL 服务
brew services stop mysql

# 检查 MySQL 状态
brew services list | grep mysql
```

#### 方法2: 使用官方安装包

1. 访问 [MySQL 官网](https://dev.mysql.com/downloads/mysql/)
2. 下载 macOS 安装包（.dmg 文件）
3. 运行安装程序，按提示安装
4. 安装完成后，MySQL 会自动启动

### Linux 安装

#### Ubuntu/Debian

```bash
# 更新包管理器
sudo apt update

# 安装 MySQL
sudo apt install mysql-server

# 启动 MySQL 服务
sudo systemctl start mysql

# 设置开机自启
sudo systemctl enable mysql

# 检查 MySQL 状态
sudo systemctl status mysql

# 安全配置（设置 root 密码等）
sudo mysql_secure_installation
```

#### CentOS/RHEL

```bash
# 安装 MySQL
sudo yum install mysql-server

# 启动 MySQL 服务
sudo systemctl start mysqld

# 设置开机自启
sudo systemctl enable mysqld

# 检查 MySQL 状态
sudo systemctl status mysqld

# 获取临时 root 密码
sudo grep 'temporary password' /var/log/mysqld.log
```

### Windows 安装

1. 访问 [MySQL 官网](https://dev.mysql.com/downloads/mysql/)
2. 下载 Windows 安装包（.msi 文件）
3. 运行安装程序，选择 "Developer Default" 或 "Server only"
4. 按提示完成安装和配置

### Docker 安装（跨平台）

```bash
# 拉取 MySQL 镜像
docker pull mysql:8.0

# 运行 MySQL 容器
docker run -d \
  --name mysql-server \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=blog \
  -e MYSQL_USER=user \
  -e MYSQL_PASSWORD=password \
  -p 3306:3306 \
  mysql:8.0
```

或使用 docker-compose，创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: mysql-server
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: blog
      MYSQL_USER: user
      MYSQL_PASSWORD: password
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql-data:
```

然后运行：

```bash
docker-compose up -d
```

## 二、验证 MySQL 安装

### 1. 检查 MySQL 是否运行

**macOS:**
```bash
# 检查进程
ps aux | grep mysql | grep -v grep

# 检查端口
lsof -i :3306
```

**Linux:**
```bash
# 检查服务状态
sudo systemctl status mysql

# 检查端口
sudo netstat -tlnp | grep 3306
```

### 2. 测试 MySQL 连接

```bash
# 使用命令行客户端连接
mysql -u root -p

# 或者指定主机和端口
mysql -h 127.0.0.1 -P 3306 -u root -p
```

### 3. 测试 Node.js 连接

创建测试文件 `test-mysql.js`：

```javascript
const mysql = require('mysql')

const connection = mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'your_password',
    database: 'blog'
})

connection.connect((err) => {
    if (err) {
        console.error('连接失败:', err.message)
        return
    }
    console.log('MySQL 连接成功')
    connection.end()
})
```

运行测试：

```bash
node test-mysql.js
```

## 三、常见错误及解决方案

### 错误1: ERROR 2002 (HY000): Can't connect to local MySQL server through socket

**原因:**
- MySQL 服务未启动
- Socket 文件路径不正确
- 使用了 `localhost` 而不是 `127.0.0.1`

**解决方案:**

1. **检查 MySQL 服务是否启动**

   **macOS:**
   ```bash
   # 检查进程
   ps aux | grep mysql | grep -v grep
   
   # 如果未运行，启动服务
   brew services start mysql
   # 或
   mysql.server start
   ```

   **Linux:**
   ```bash
   sudo systemctl start mysql
   ```

2. **修改配置文件使用 TCP/IP 连接**

   在 `conf/db.js` 中，确保使用 `127.0.0.1` 而不是 `localhost`：

   ```javascript
   MYSQL_CONF = {
       host: '127.0.0.1',  // 使用 127.0.0.1 而不是 localhost
       user: 'root',
       password: 'your_password',
       port: 3306,
       database: 'blog'
   }
   ```

3. **检查 socket 文件位置**

   **macOS:**
   ```bash
   # 查找 socket 文件
   find /tmp -name "mysql.sock" 2>/dev/null
   find /var -name "mysql.sock" 2>/dev/null
   
   # 如果找到，可以在配置中指定
   socketPath: '/path/to/mysql.sock'
   ```

   但更推荐使用 TCP/IP 连接（使用 `127.0.0.1`）。

### 错误2: ERROR 1045 (28000): Access denied for user

**原因:**
- 用户名或密码错误
- 用户没有权限

**解决方案:**

1. **重置 root 密码**

   **macOS/Linux:**
   ```bash
   # 停止 MySQL
   sudo systemctl stop mysql
   # 或
   brew services stop mysql
   
   # 以安全模式启动（跳过权限检查）
   sudo mysqld_safe --skip-grant-tables &
   
   # 连接 MySQL（无需密码）
   mysql -u root
   
   # 在 MySQL 中重置密码
   USE mysql;
   UPDATE user SET authentication_string=PASSWORD('new_password') WHERE User='root';
   FLUSH PRIVILEGES;
   EXIT;
   
   # 重启 MySQL
   sudo systemctl restart mysql
   ```

2. **创建新用户并授权**

   ```sql
   -- 创建用户
   CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
   CREATE USER 'user'@'127.0.0.1' IDENTIFIED BY 'password';
   
   -- 授权
   GRANT ALL PRIVILEGES ON blog.* TO 'user'@'localhost';
   GRANT ALL PRIVILEGES ON blog.* TO 'user'@'127.0.0.1';
   
   -- 刷新权限
   FLUSH PRIVILEGES;
   ```

### 错误3: ERROR 1049 (42000): Unknown database

**原因:**
- 数据库不存在

**解决方案:**

```sql
-- 创建数据库
CREATE DATABASE blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE blog;

-- 查看所有数据库
SHOW DATABASES;
```

### 错误4: ER_NOT_SUPPORTED_AUTH_MODE: Client does not support authentication protocol

**原因:**
- MySQL 8.0 使用了新的认证方式，旧版本的客户端不支持

**解决方案:**

```sql
-- 修改用户认证方式
ALTER USER 'user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
ALTER USER 'user'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;
```

## 四、项目配置

### 1. 更新配置文件

编辑 `conf/db.js`，填入正确的 MySQL 信息：

```javascript
const env = process.env.NODE_ENV

let MYSQL_CONF
let REDIS_CONF

if (env === 'dev') {
    MYSQL_CONF = {
        host: '127.0.0.1',        // 使用 127.0.0.1 而不是 localhost
        user: 'root',              // 你的 MySQL 用户名
        password: 'your_password', // 你的 MySQL 密码
        port: 3306,                // MySQL 端口
        database: 'blog'           // 数据库名
    }
    
    REDIS_CONF = {
        host: '127.0.0.1',
        port: 6379
    }
}

// ... 其他环境配置

module.exports = {
    MYSQL_CONF,
    REDIS_CONF
}
```

### 2. 创建数据库和表

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE blog;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    realname VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建博客表
CREATE TABLE IF NOT EXISTS blogs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 五、MySQL 常用命令

### 服务管理

**macOS:**
```bash
# 启动
brew services start mysql
mysql.server start

# 停止
brew services stop mysql
mysql.server stop

# 重启
brew services restart mysql
mysql.server restart
```

**Linux:**
```bash
# 启动
sudo systemctl start mysql

# 停止
sudo systemctl stop mysql

# 重启
sudo systemctl restart mysql

# 查看状态
sudo systemctl status mysql
```

### 数据库操作

```sql
-- 查看所有数据库
SHOW DATABASES;

-- 使用数据库
USE database_name;

-- 查看当前数据库的所有表
SHOW TABLES;

-- 查看表结构
DESCRIBE table_name;

-- 查看用户
SELECT user, host FROM mysql.user;

-- 查看当前用户
SELECT USER();

-- 查看当前数据库
SELECT DATABASE();
```

## 六、安全建议

1. **设置强密码**: 使用复杂的密码，包含大小写字母、数字和特殊字符
2. **创建专用用户**: 不要使用 root 用户连接应用，创建专用用户并只授予必要权限
3. **限制访问**: 只允许必要的 IP 访问数据库
4. **定期备份**: 定期备份数据库
5. **更新软件**: 保持 MySQL 版本更新

## 七、参考资源

- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [MySQL 下载页面](https://dev.mysql.com/downloads/mysql/)
- [Node.js mysql 包文档](https://github.com/mysqljs/mysql)
