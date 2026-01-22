const express = require('express')
const router = express.Router()
const { ErrorModel, SuccessModel } = require('../model/resModel')
const {
  login,
  getUserInfoByEmailOrNickname,
  insertUser,
  getUserInfoById,
} = require('../controller/user')
const { get, set, del } = require('../utils/redis')
const CODE_MAP = require('../const/code')
const loginCheck = require('../middleware/loginCheck')
const { sendVerificationCode } = require('../utils/email')

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.send(
      new ErrorModel(null, '用户名或密码不能为空', CODE_MAP.INVALID_PARAM)
    )
  }

  let result
  // // 先查缓存
  // try {
  //   result = await get(`blog:user:email:${email}`)
  // } catch (error) {
  //   console.log(error)
  // }

  // if (!result) {
    // 缓存未命中, 再查数据库
    try {
      result = await login(email, password)
    } catch (error) {
      console.log(error)
    }

    // 如果从数据库中查询到用户数据，则缓存到redis中
    if (result?.id) {
      set(`blog:user:id:${result.id}`, result, 60 * 60 * 24)
      set(`blog:user:email:${result.email}`, result, 60 * 60 * 24)
    }
  // }

  if (!result || result.password !== password)
    return res.send(
      new ErrorModel(null, '用户名或密码错误', CODE_MAP.INVALID_PARAM)
    )

  req.session.userId = result.id
  req.session.email = result.email
  req.session.nickname = result.nickname

  res.send(
    new SuccessModel(
      {
        id: result.id,
        email: result.email,
        nickname: result.nickname,
      },
      '登录成功'
    )
  )
})

router.post('/register', async (req, res) => {
  const { email, password, confirmPassword, nickname, verifyCode } = req.body
  if (!email || !password || !confirmPassword || !nickname || !verifyCode) {
    return res.send(
      new ErrorModel(
        null,
        '邮箱、密码、确认密码、昵称、验证码不能为空',
        CODE_MAP.INVALID_PARAM
      )
    )
  }
  if (password !== confirmPassword) {
    return res.send(
      new ErrorModel(null, '密码和确认密码不一致', CODE_MAP.INVALID_PARAM)
    )
  }

  // 获取redis中给用户发送的验证码
  let redisCode
  try {
    redisCode = await get(`blog:user:code:${email}`)
  } catch (error) {
    console.log(error)
  }
  if (verifyCode.toString() !== redisCode?.toString()) {
    return res.send(new ErrorModel(null, '验证码错误', CODE_MAP.INVALID_PARAM))
  }

  // 获取redis中用户数据
  let user
  try {
    user = await get(`blog:user:email:${email}`)
  } catch (error) {
    console.log(error)
  }
  if (!user) {
    try {
      user = await getUserInfoByEmailOrNickname(email, nickname)
    } catch (error) {
      console.log(error)
    }
  }

  if (user && user.email === email) {
    return res.send(new ErrorModel(null, '邮箱已存在', CODE_MAP.INVALID_PARAM))
  }
  if (user && user.nickname === nickname) {
    return res.send(new ErrorModel(null, '昵称已存在', CODE_MAP.INVALID_PARAM))
  }

  // 插入用户数据
  try {
    user = await insertUser(email, password, nickname)
  } catch (error) {
    console.log(error)
  }

  if (user) {
    return res.send(new SuccessModel(user, '注册成功'))
  } else {
    return res.send(new ErrorModel(null, '注册失败', CODE_MAP.SERVER_ERROR))
  }
})

router.post('/sendCode', async (req, res) => {
  const { email } = req.body
  if (!email)
    return res.send(new ErrorModel(null, '邮箱不能为空', CODE_MAP.INVALID_PARAM))
  const code = Math.random().toString(12).substring(2, 8)

  // 先存储验证码到 Redis
  let redisResult
  try {
    redisResult = await set(`blog:user:code:${email}`, code, 60 * 5)
  } catch (error) {
    console.log('Redis 存储失败:', error)
    return res.send(new ErrorModel(null, '验证码发送失败', CODE_MAP.SERVER_ERROR))
  }

  if (!redisResult) {
    return res.send(new ErrorModel(null, '验证码发送失败', CODE_MAP.SERVER_ERROR))
  }

  // 发送邮件
  try {
    const emailResult = await sendVerificationCode(email, code)
    if (emailResult.success) {
      return res.send(new SuccessModel(null, '验证码发送成功'))
    } else {
      console.error('邮件发送失败:', emailResult.error)
      return res.send(new ErrorModel(null, '验证码发送失败，请稍后重试', CODE_MAP.SERVER_ERROR))
    }
  } catch (error) {
    console.error('邮件发送异常:', error)
    return res.send(new ErrorModel(null, '验证码发送失败，请稍后重试', CODE_MAP.SERVER_ERROR))
  }
})

router.post('/logout',  async (req, res) => {
  const userId = req.session.userId
  const email = req.session.email
  req.session.userId = null
  req.session.email = null
  req.session.nickname = null
  if (userId) del(`blog:user:id:${userId}`)
  if (email) del(`blog:user:email:${email}`)
  return res.send(new SuccessModel(null, '退出成功'))
})

const getUserInfoFunc = async (id, res) => {
  let result
  try {
    result = await get(`blog:user:id:${id}`)
  } catch (error) {
    console.log(error)
  }

  if (!result) {
    try {
      result = await getUserInfoById(id)
    } catch (error) {
      console.log(error)
    }

    if (result?.id) {
      set(`blog:user:id:${result.id}`, result, 60 * 60 * 24)
      set(`blog:user:email:${result.email}`, result, 60 * 60 * 24)
    }
  }

  if (!result?.id) {
    return res.send(new ErrorModel(null, '用户不存在', CODE_MAP.INVALID_PARAM))
  } else {
    return res.send(new SuccessModel(result, '获取用户信息成功'))
  }
}

router.get('/getUserInfo', loginCheck, async (req, res) =>  {
  return getUserInfoFunc(req.session.userId, res)
})

router.get('/getUserInfoById', loginCheck, async (req, res) =>  {
  const { id } = req.query
  if (!id) return res.send(new ErrorModel(null, 'id不能为空', CODE_MAP.INVALID_PARAM))

  return getUserInfoFunc(id, res)
})

module.exports = router
