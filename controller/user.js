const { escape, exec } = require('../db/mysql')
// const { genPassword } = require("../utils/cryp");

async function login(email, password) {
  email = escape(email)

  //   password = genPassword(password);
  password = escape(password)

  const sql = `
        SELECT * FROM users WHERE email=${email} AND password=${password}
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
  email = escape(email)
  nickname = escape(nickname)

  const sql = `
        SELECT * FROM users WHERE email=${email} OR nickname=${nickname}
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
  email = escape(email)
  //   password = genPassword(password);
  password = escape(password)
  nickname = escape(nickname)

  // 将毫秒时间戳转换为秒级时间戳，然后使用 FROM_UNIXTIME 转换为日期时间格式
  const timestamp = Math.floor(new Date().getTime() / 1000)
  const sql = `
    INSERT INTO users (email, password, nickname, create_time) VALUES (${email}, ${password}, ${nickname}, FROM_UNIXTIME(${timestamp}))
  `

  return exec(sql).then((result) => {
    return result.insertId || null
  })
}

async function getUserInfoById(id) {
  id = escape(id)
  const sql = `
    SELECT id, email, nickname, create_time FROM users WHERE id=${id}
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
