# Redis 服务搭建指南

## 一、Redis 安装

### macOS 安装

使用 Homebrew 安装（推荐）：

```bash
# 安装 Redis
brew install redis

# 启动 Redis 服务
brew services start redis

# 或者手动启动（前台运行）
redis-server

# 停止 Redis 服务
brew services stop redis
```

### Linux 安装

#### Ubuntu/Debian

```bash
# 更新包管理器
sudo apt update

# 安装 Redis
sudo apt install redis-server

# 启动 Redis 服务
sudo systemctl start redis-server

# 设置开机自启
sudo systemctl enable redis-server

# 检查 Redis 状态
sudo systemctl status redis-server
```

#### CentOS/RHEL

```bash
# 安装 EPEL 仓库（如果还没有）
sudo yum install epel-release

# 安装 Redis
sudo yum install redis

# 启动 Redis 服务
sudo systemctl start redis

# 设置开机自启
sudo systemctl enable redis

# 检查 Redis 状态
sudo systemctl status redis
```

### Windows 安装

1. 下载 Redis for Windows：
   - 访问：https://github.com/microsoftarchive/redis/releases
   - 下载最新版本的 `.msi` 安装包
   - 运行安装程序，按提示安装

2. 或者使用 WSL（Windows Subsystem for Linux）：
   ```bash
   # 在 WSL 中安装
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

### Docker 安装（跨平台）

```bash
# 拉取 Redis 镜像
docker pull redis

# 运行 Redis 容器
docker run -d \
  --name redis-server \
  -p 6379:6379 \
  redis

# 或者使用 docker-compose
```

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    container_name: redis-server
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
```

然后运行：

```bash
docker-compose up -d
```

## 二、验证 Redis 安装

### 1. 检查 Redis 是否运行

```bash
# 检查进程
ps aux | grep redis

# 或者使用 systemctl（Linux）
sudo systemctl status redis
```

### 2. 测试 Redis 连接

使用 Redis 命令行客户端：

```bash
# 连接 Redis
redis-cli

# 在 Redis CLI 中测试
127.0.0.1:6379> ping
PONG

127.0.0.1:6379> set test "Hello Redis"
OK

127.0.0.1:6379> get test
"Hello Redis"

127.0.0.1:6379> exit
```

### 3. 测试 Node.js 连接

在项目根目录创建测试文件 `test-redis.js`：

```javascript
const redis = require('redis')
const client = redis.createClient(6379, '127.0.0.1')

client.on('connect', () => {
    console.log('Redis 连接成功')
})

client.on('error', (err) => {
    console.log('Redis 连接失败:', err)
})

client.set('test', 'Hello Redis', (err, reply) => {
    if (err) {
        console.error('设置失败:', err)
        return
    }
    console.log('设置成功:', reply)
    
    client.get('test', (err, reply) => {
        if (err) {
            console.error('获取失败:', err)
            return
        }
        console.log('获取成功:', reply)
        client.quit()
    })
})
```

运行测试：

```bash
node test-redis.js
```

## 三、Redis 配置

### 配置文件位置

- **macOS (Homebrew)**: `/usr/local/etc/redis.conf` 或 `/opt/homebrew/etc/redis.conf`
- **Linux**: `/etc/redis/redis.conf`
- **Windows**: Redis 安装目录下的 `redis.windows.conf`

### 常用配置项

编辑配置文件（需要 root 权限）：

```bash
# macOS/Linux
sudo vim /etc/redis/redis.conf
```

主要配置项：

```conf
# 绑定地址（0.0.0.0 表示允许所有IP连接，127.0.0.1 表示只允许本地连接）
bind 127.0.0.1

# 端口号
port 6379

# 密码保护（取消注释并设置密码）
# requirepass your_password_here

# 持久化配置
# RDB 持久化
save 900 1      # 900秒内至少1个key变化则保存
save 300 10     # 300秒内至少10个key变化则保存
save 60 10000   # 60秒内至少10000个key变化则保存

# AOF 持久化
appendonly yes
appendfsync everysec

# 最大内存限制
maxmemory 256mb
maxmemory-policy allkeys-lru
```

修改配置后需要重启 Redis：

```bash
# macOS (Homebrew)
brew services restart redis

# Linux
sudo systemctl restart redis-server
```

## 四、Redis 常用命令

### 服务管理

```bash
# 启动 Redis
# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# 停止 Redis
# macOS
brew services stop redis

# Linux
sudo systemctl stop redis-server

# 重启 Redis
# macOS
brew services restart redis

# Linux
sudo systemctl restart redis-server
```

### 命令行工具

```bash
# 连接 Redis CLI
redis-cli

# 连接远程 Redis（带密码）
redis-cli -h 127.0.0.1 -p 6379 -a your_password

# 查看所有键
redis-cli KEYS *

# 查看键的数量
redis-cli DBSIZE

# 清空当前数据库
redis-cli FLUSHDB

# 清空所有数据库
redis-cli FLUSHALL

# 查看 Redis 信息
redis-cli INFO
```

## 五、项目中使用 Redis

### 1. 使用工具类

项目已创建 `utils/redis.js` 工具类，可以直接使用：

```javascript
const { set, get, del } = require('./utils/redis')

// 设置值
await set('key', 'value')

// 设置带过期时间的值（30秒）
await set('key', 'value', 30)

// 获取值
const value = await get('key')

// 删除值
await del('key')
```

### 2. 在 Controller 中使用

```javascript
// controller/blog.js
const { set, get } = require('../utils/redis')

// 获取博客列表（带缓存）
const getList = async (author, keyword) => {
    const cacheKey = `blog:list:${author || 'all'}:${keyword || ''}`
    
    // 先尝试从缓存获取
    let list = await get(cacheKey)
    if (list) {
        return list
    }
    
    // 从数据库查询
    const sql = `select * from blogs where 1=1 ...`
    list = await exec(sql)
    
    // 存入缓存，5分钟过期
    await set(cacheKey, list, 300)
    
    return list
}
```

### 3. 在路由中使用

```javascript
// routes/blog.js
const { set, get } = require('../utils/redis')

router.get('/list', async (req, res, next) => {
    const { author, keyword } = req.query
    const cacheKey = `blog:list:${author || 'all'}:${keyword || ''}`
    
    try {
        // 尝试从缓存获取
        let result = await get(cacheKey)
        
        if (result) {
            return res.json(new SuccessModel(result, '从缓存获取'))
        }
        
        // 缓存未命中，从数据库查询
        result = await getList(author, keyword)
        
        // 存入缓存
        await set(cacheKey, result, 300)
        
        res.json(new SuccessModel(result, '从数据库获取'))
    } catch (err) {
        next(err)
    }
})
```

## 六、常见问题

### 1. Redis 连接失败

**问题**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决方案**:
- 检查 Redis 服务是否启动
- 检查配置文件中的 `bind` 和 `port` 设置
- 检查防火墙设置

### 2. 权限问题

**问题**: `Permission denied`

**解决方案**:
- 使用 `sudo` 运行命令
- 检查 Redis 数据目录权限

### 3. 内存不足

**问题**: Redis 内存使用过高

**解决方案**:
- 设置 `maxmemory` 和 `maxmemory-policy`
- 定期清理过期键
- 使用 Redis 集群

## 七、生产环境建议

1. **设置密码**: 在生产环境中必须设置 Redis 密码
2. **绑定 IP**: 不要绑定到 `0.0.0.0`，只允许必要的 IP 访问
3. **持久化**: 启用 RDB 或 AOF 持久化
4. **监控**: 使用 Redis 监控工具（如 RedisInsight）
5. **备份**: 定期备份 Redis 数据
6. **高可用**: 考虑使用 Redis Sentinel 或 Redis Cluster

## 八、参考资源

- [Redis 官方文档](https://redis.io/documentation)
- [Redis 命令参考](https://redis.io/commands)
- [Node.js Redis 客户端文档](https://github.com/NodeRedis/node-redis)
