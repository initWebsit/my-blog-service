// 定义接口返回的数据模型
const CODE_MAP = require('../const/code')

class BaseModel {
    constructor(data, message) {
        if (typeof data === 'string') {
            this.message = data
            data = null
            message = null
        }

        if (data) {
            this.data = data
        }

        if (message) {
            this.message = message
        }
    }
}


class SuccessModel extends BaseModel {
    constructor(data, message, code) {
        super(data, message)
        this.code = code || CODE_MAP.SUCCESS
    }
}

class ErrorModel extends BaseModel {
    constructor(data, message, code) {
        super(data, message)
        this.code = code || CODE_MAP.ERROR
    }
}

module.exports = {
    SuccessModel,
    ErrorModel
}