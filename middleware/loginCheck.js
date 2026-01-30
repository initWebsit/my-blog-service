const { ErrorModel } = require('../model/resModel')
const CODE_MAP = require('../const/code')

module.exports = (req, res, next) => {
    if (req.session.userId) {
        // 登陆成功，需执行 next()，以继续执行下一步
        next()
        return
    }
    // 登陆失败，禁止继续执行，所以不需要执行 next()
    return res.send(
        new ErrorModel(null, '用户未登录', CODE_MAP.UNAUTHORIZED)
    )
}