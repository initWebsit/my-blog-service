const { exec } = require('../db/mysql')
const formatData = require('../utils/format-data')
// const { genPassword } = require("../utils/cryp");

async function login(email, password) {
  //   password = genPassword(password);
  const { email: emailTemp, password: passwordTemp } = formatData({ email, password })

  const sql = `
        SELECT * FROM users WHERE email=${emailTemp} AND password=${passwordTemp}
    `
  return exec(sql).then((result) => {
    return result[0] ? { 
      id: result[0].id, 
      email: result[0].email, 
      nickname: result[0].nickname, 
      password: result[0].password,
    } : null
  })
}

async function getUserInfoByEmailOrNickname(email, nickname) {
  const { email: emailTemp, nickname: nicknameTemp } = formatData({ email, nickname })

  const sql = `
        SELECT * FROM users WHERE email=${emailTemp} OR nickname=${nicknameTemp}
    `

  return exec(sql).then((result) => {
    return result[0] ? { 
      id: result[0].id, 
      email: result[0].email, 
      nickname: result[0].nickname, 
    } : null
  })
}

async function insertUser(email, password, nickname) {
  //   password = genPassword(password);
  const { email: emailTemp, password: passwordTemp, nickname: nicknameTemp } = formatData({ email, password, nickname })

  // 将毫秒时间戳转换为秒级时间戳，然后使用 FROM_UNIXTIME 转换为日期时间格式
  const timestamp = Math.floor(new Date().getTime() / 1000)
  const sql = `
    INSERT INTO users (email, password, nickname, create_time) VALUES (${emailTemp}, ${passwordTemp}, ${nicknameTemp}, FROM_UNIXTIME(${timestamp}))
  `

  return exec(sql).then((result) => {
    return result.insertId || null
  })
}

async function getUserInfoById(id) {
  const { id: idTemp } = formatData({ id })
  const sql = `
    SELECT id, email, nickname, create_time FROM users WHERE id=${idTemp}
  `

  return exec(sql).then((result) => {
    return result[0] ? { 
      id: result[0].id, 
      email: result[0].email, 
      nickname: result[0].nickname, 
    } : null
  })
}

module.exports = {
  login,
  getUserInfoByEmailOrNickname,
  insertUser,
  getUserInfoById,
}
