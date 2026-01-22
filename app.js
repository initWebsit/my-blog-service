// 加载环境变量（必须在最前面）
require('dotenv').config()

var createError = require('http-errors')
var express = require('express')
var path = require('path')
var fs = require('fs')
var cookieParser = require('cookie-parser') // 中间件，处理 cookie
var logger = require('morgan') // 中间件，生成日志
const session = require('express-session')
const RedisStore = require('connect-redis')(session)

var blogRouter = require('./routes/blog')
var userRouter = require('./routes/user')

var app = express()

// 前端视图引擎设置，对于前后端分离项目，不需要
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

// 处理日志
const ENV = process.env.NODE_ENV

// 处理跨域请求（仅开发模式，必须在最前面）
if (ENV !== 'production') {
  app.use((req, res, next) => {
    // 获取请求的 Origin
    const origin = req.headers.origin
    
    // 允许的源列表（开发环境）
    const allowedOrigins = [
      'http://localhost:6120',
      'http://localhost:3000',
      'http://127.0.0.1:6120',
      'http://127.0.0.1:3000'
    ]
    
    // 如果请求包含 Origin 且在允许列表中，则使用该 Origin
    // 否则使用第一个允许的源作为默认值
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    } else if (allowedOrigins.length > 0) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0])
    }
    
    // 设置其他 CORS 头部
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, user-language')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    
    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    
    next()
  })
}

if (ENV !== 'production') {
  // 如果是开发环境 / 测试环境，则直接在控制台终端打印 log 即可
  app.use(logger('dev'))
} else {
  // 如果当前是线上环境，则将日志写入/logs/access.log文件中
  const logFileName = path.join(__dirname, 'logs', 'access.log')
  const writeStream = fs.createWriteStream(logFileName, {
    flags: 'a'
  })
  app.use(logger('combined', {
    stream: writeStream
  }))
}


// 处理 post 请求的 json 数据，此方法支持Express4.16.0+ 的版本，用于取代 body-parser
// 增加请求体大小限制到 50MB，用于支持大内容博客
app.use(express.json({ limit: '50mb' }))
// 处理 post 请求的 urlencoded 数据(例如 form 表单数据)，支持Express4.16.0+ 的版本
app.use(express.urlencoded({ extended: false, limit: '50mb' }))
// 处理 cookie
app.use(cookieParser())
// 处理前端静态文件，对于前后端分离项目，不需要
app.use(express.static(path.join(__dirname, 'public')))

// 配置 session cookie
const redisClient = require('./db/redis').redisClient
const sessionStore = new RedisStore({
  client: redisClient
})
app.use(session({
  resave: true, //添加 resave 选项
  saveUninitialized: true, //添加 saveUninitialized 选项
  secret: 'niuniu', // 和cryp.js密匙类似，可以随意添加，建议由大写+小写+加数字+特殊字符组成
  name: 'userToken',
  cookie: {
    path: '/', // 默认配置
    httpOnly: true, // 默认配置，只允许服务端修改
    maxAge: 24 * 60 * 60 * 1000 // cookie 失效时间 24小时
  },
  store: sessionStore  // 将 session 存入 redis
}))

// 等以上各项解析完成后，开始处理下面的路由
app.use('/blogservice/blog', blogRouter)
app.use('/blogservice/user', userRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
// 错误处理
// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
  // 在开发模式下，错误响应也需要设置 CORS 头部
  if (ENV !== 'production') {
    const origin = req.headers.origin
    const allowedOrigins = [
      'http://localhost:6120',
      'http://localhost:3000',
      'http://127.0.0.1:6120',
      'http://127.0.0.1:3000'
    ]
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    } else if (allowedOrigins.length > 0) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0])
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, user-language')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  
  // set locals, only providing error in development
  res.locals.message = err.message
  // 只有在开发环境下，如果出现错误，就在页面中显示出来
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
