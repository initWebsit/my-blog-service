const { redisClient } = require('../db/redis')

/**
 * redis set 方法
 * @param {string} key 键
 * @param {string} val 值
 * @param {number} timeout 过期时间（秒），可选
 * @returns {Promise}
 */
function set(key, val, timeout = null) {
    return new Promise((resolve, reject) => {
        if (typeof val === 'object') {
            val = JSON.stringify(val)
        }
        
        if (timeout) {
            // 设置过期时间
            redisClient.setex(key, timeout, val, (err, result) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(result)
            })
        } else {
            // 不设置过期时间
            redisClient.set(key, val, (err, result) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(result)
            })
        }
    })
}

/**
 * redis get 方法
 * @param {string} key 键
 * @returns {Promise}
 */
function get(key) {
    return new Promise((resolve, reject) => {
        redisClient.get(key, (err, val) => {
            if (err) {
                reject(err)
                return
            }
            
            if (val == null) {
                resolve(null)
                return
            }
            
            // 尝试解析为JSON，如果失败则返回原始字符串
            try {
                resolve(JSON.parse(val))
            } catch (ex) {
                resolve(val)
            }
        })
    })
}

/**
 * redis del 方法 - 删除键
 * @param {string} key 键
 * @returns {Promise}
 */
function del(key) {
    return new Promise((resolve, reject) => {
        redisClient.del(key, (err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result)
        })
    })
}

/**
 * redis exists 方法 - 检查键是否存在
 * @param {string} key 键
 * @returns {Promise<boolean>}
 */
function exists(key) {
    return new Promise((resolve, reject) => {
        redisClient.exists(key, (err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result === 1)
        })
    })
}

/**
 * redis expire 方法 - 设置键的过期时间
 * @param {string} key 键
 * @param {number} seconds 过期时间（秒）
 * @returns {Promise}
 */
function expire(key, seconds) {
    return new Promise((resolve, reject) => {
        redisClient.expire(key, seconds, (err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result)
        })
    })
}

/**
 * redis ttl 方法 - 获取键的剩余过期时间
 * @param {string} key 键
 * @returns {Promise<number>} 返回剩余秒数，-1表示永不过期，-2表示键不存在
 */
function ttl(key) {
    return new Promise((resolve, reject) => {
        redisClient.ttl(key, (err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result)
        })
    })
}

/**
 * redis flushdb 方法 - 清除当前数据库的所有数据
 * @returns {Promise}
 */
function flushdb() {
    return new Promise((resolve, reject) => {
        redisClient.flushdb((err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result)
        })
    })
}

/**
 * redis flushall 方法 - 清除所有数据库的所有数据
 * @returns {Promise}
 */
function flushall() {
    return new Promise((resolve, reject) => {
        redisClient.flushall((err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result)
        })
    })
}

/**
 * redis keys 方法 - 获取匹配模式的所有键
 * @param {string} pattern 匹配模式，如 'blog:*' 或 '*'
 * @returns {Promise<string[]>}
 */
function keys(pattern = '*') {
    return new Promise((resolve, reject) => {
        redisClient.keys(pattern, (err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result || [])
        })
    })
}

/**
 * 按模式删除键
 * @param {string} pattern 匹配模式，如 'blog:*'
 * @returns {Promise<number>} 返回删除的键数量
 */
async function delByPattern(pattern) {
    const keysToDelete = await keys(pattern)
    if (keysToDelete.length === 0) {
        return 0
    }
    return new Promise((resolve, reject) => {
        redisClient.del(...keysToDelete, (err, result) => {
            if (err) {
                reject(err)
                return
            }
            resolve(result)
        })
    })
}

module.exports = {
    set,
    get,
    del,
    exists,
    expire,
    ttl,
    flushdb,
    flushall,
    keys,
    delByPattern
}
