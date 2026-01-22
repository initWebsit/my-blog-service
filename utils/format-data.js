const { escape } = require('../db/mysql')

const formatData = (data) => {
  if (Object.prototype.toString.call(data) !== '[object Object]') return data

  let result = {}
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined || data[key] === null) {
      result[key] = null
    } else if (!data[key]) {
      result[key] = data[key]
    } else {
      result[key] = escape(data[key])
    }
  })
  return result
}

module.exports = formatData