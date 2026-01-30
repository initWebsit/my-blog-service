const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { ErrorModel, SuccessModel } = require('../model/resModel')
const loginCheck = require('../middleware/loginCheck')
const { addBlog, getBlogList, getBlogTotal, getBlogDetail, likeBlog, getTags, getTagsNum, getComments, getCommentsTotal, addComment, updateBlog, deleteBlog } = require('../controller/blog')
const LoginCheck = require('../middleware/loginCheck')

// 配置上传目录
// const uploadDir = '/var/www/my-blog-front/dist/official-prod/upload-image'
const uploadDir = '/Users/xiaoliu/Documents/progress/ownProject/my-blog-front/dist/official-prod/upload-image'

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置 multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, uniqueSuffix + ext)
    }
})

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制文件大小为 10MB
    },
    fileFilter: function (req, file, cb) {
        // 只允许图片文件
        const allowedTypes = /jpeg|jpg|png|gif|webp/
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        const mimetype = allowedTypes.test(file.mimetype)
        
        if (mimetype && extname) {
            return cb(null, true)
        } else {
            cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'))
        }
    }
})

router.post('/addBlog', loginCheck, async (req, res) => {
    const { userId, nickname } = req.session
    const {
        title, 
        category,
        categoryName,
        tags,
        content,
    } = req.body

    if (!title || !category || !categoryName || !tags || !content) {
        return res.send(new ErrorModel(null, '标题、分类、标签、内容不能为空'))
    }
    
    let result
    try {
        result = await addBlog({
            title, 
            category, 
            categoryName,
            tags, 
            content, 
            nickname, 
            userId,
        })
    } catch (error) {
        console.log(error)
    }

    if (result) {
        return res.send(new SuccessModel(result, '新增博客成功'))
    } else {
        return res.send(new ErrorModel(null, '新增博客失败'))
    }
})

router.get('/getBlogList', async (req, res) => {
    const { userId } = req.session
    const { page, pageSize, category, tagId, keyword, searchByUser } = req.query
    let pageTemp = page ? parseInt(page) : 1
    let pageSizeTemp = pageSize ? parseInt(pageSize) : 20
    let categoryTemp = category ? parseInt(category) : ''
    let tagIdTemp = tagId ? parseInt(tagId) : ''
    let keywordTemp = keyword ? keyword : ''
    let result
    try {
        result = await getBlogList({ userId, searchByUserId: searchByUser ? userId : false, page: pageTemp, pageSize: pageSizeTemp, category: categoryTemp, tag: tagIdTemp, keyword: keywordTemp })
    } catch (error) {
        console.log(error)
    }

    let total = 0
    try {
        total = await getBlogTotal({ searchByUserId: searchByUser ? userId : false, category: categoryTemp, tag: tagIdTemp, keyword: keywordTemp })
    } catch (error) {
        console.log(error)
    }

    return res.send(new SuccessModel({
        list: result?.map(item => ({
            ...item,
            content: item.content.replace(/<[^>]*>?/g, '').slice(0, 300),
        })) || [],
        total: total || 0,
        page: pageTemp,
        pageSize: pageSizeTemp,
    }, '获取博客列表成功'))
})

router.get('/getBlogDetail', async (req, res) => {
    const { userId } = req.session
    const { id } = req.query
    if (!id) {
        return res.send(new ErrorModel(null, '博客ID不能为空'))
    }
    
    let result
    try {
        result = await getBlogDetail({ userId, id })
    } catch (error) {
        console.log(error)
    }

    if (result) {
        return res.send(new SuccessModel(result, '获取博客详情成功'))
    } else {
        return res.send(new ErrorModel(null, '获取博客详情失败'))
    }
})

router.post('/likeBlog', async (req, res) => {
    const { userId } = req.session
    const { id, isLiked } = req.body
    if (!id) {
        return res.send(new ErrorModel(null, '博客ID不能为空'))
    }

    let result
    try {
        result = await likeBlog({ userId, id, isLiked })
    } catch (error) {
        console.log(error)
    }

    if (result) {
        return res.send(new SuccessModel(result, '点赞博客成功'))
    } else {
        return res.send(new ErrorModel(null, '点赞博客失败'))
    }
})

router.post('/getTags', async (req, res) => {
    const { getBlogNum } = req.body
    let result
    try {
        result = await (getBlogNum ? getTagsNum() : getTags())
    } catch (error) {
        console.log(error)
    }

    console.log('result', result)
    if (result) {
        return res.send(new SuccessModel(result, '获取标签列表成功'))
    } else {
        return res.send(new ErrorModel(null, '获取标签列表失败'))
    }
})

router.get('/getComments', async (req, res) => {
    const { blogId, pageSize, page } = req.query
    const blogIdTemp = blogId ? parseInt(blogId) : 0
    const pageSizeTemp = pageSize ? parseInt(pageSize) : 20
    const pageTemp = page ? parseInt(page) : 1
    if (!blogId)
        return res.send(new ErrorModel(null, '博客ID不能为空'))
    let result, total
    try {
        [result, total] = await Promise.all([
            getComments({ blogId: blogIdTemp, pageSize: pageSizeTemp, page: pageTemp }), 
            getCommentsTotal({ blogId: blogIdTemp })
        ])
    } catch (error) {
        console.log(error)
    }

    if (result) {
        return res.send(new SuccessModel({
            list: result || [],
            total: total || 0,
            page: pageTemp,
            pageSize: pageSizeTemp,
        }, '获取评论列表成功'))
    } else {
        return res.send(new ErrorModel(null, '获取评论列表失败'))
    }
})

router.post('/addComment', LoginCheck, async (req, res) => {
    const { userId, nickname } = req.session
    const { blogId, parentId, parentGrandId, content } = req.body
    if (!blogId || !content) 
        return res.send(new ErrorModel(null, '博客ID和评论内容不能为空'))

    let result
    try {
        result = await addComment({ blogId, userId, userName: nickname, parentId, parentGrandId, content })
    } catch (error) {
        console.log(error)
    }

    if (result) {
        return res.send(new SuccessModel(result, '添加评论成功'))
    } else {
        return res.send(new ErrorModel(null, '添加评论失败'))
    }
})

router.post('/updateBlog', LoginCheck, async (req, res) => {
    const { userId, nickname } = req.session
    const { id, title, category, categoryName, tags, content } = req.body
    if (!id || !title || !category || !categoryName || !tags || !content) 
        return res.send(new ErrorModel(null, '博客ID和博客内容不能为空'))
    
    let result
    try {
        result = await updateBlog({ id, title, category, categoryName, tags, content, userId, nickname })
    } catch (error) {
        console.log(error)
    }

    if (result) {
        return res.send(new SuccessModel(result, '更新博客成功'))
    } else {
        return res.send(new ErrorModel(null, '更新博客失败'))
    }
})

router.post('/deleteBlog', LoginCheck, async (req, res) => {
    const { id } = req.body
    if (!id) 
        return res.send(new ErrorModel(null, '博客ID不能为空'))
    
    let result
    try {
        result = await deleteBlog({ id })
    } catch (error) {
        console.log(error)
    }

    if (result) {
        return res.send(new SuccessModel(result, '删除博客成功'))
    } else {
        return res.send(new ErrorModel(null, '删除博客失败'))
    }
})

router.post('/uploadImage', LoginCheck, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.send(new ErrorModel(null, '图片不能为空'))
    }
    
    try {
        // 生成返回的 URL
        const fileName = req.file.filename
        const imageUrl = `https://www.liuguangyuan.com/static/upload-image/${fileName}`
        
        return res.send(new SuccessModel({ url: imageUrl }, '上传图片成功'))
    } catch (error) {
        console.log(error)
        // 如果出错，删除已上传的文件
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path)
            } catch (unlinkError) {
                console.log('删除文件失败:', unlinkError)
            }
        }
        return res.send(new ErrorModel(null, '上传图片失败'))
    }
})

module.exports = router