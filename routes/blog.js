const express = require('express')
const router = express.Router()
const { ErrorModel, SuccessModel } = require('../model/resModel')
const loginCheck = require('../middleware/loginCheck')
const { addBlog, getBlogList, getBlogTotal, getBlogDetail, likeBlog, getTags, getTagsNum, getComments, getCommentsTotal, addComment } = require('../controller/blog')
const LoginCheck = require('../middleware/loginCheck')

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
        res.send(new SuccessModel(result, '新增博客成功'))
    } else {
        res.send(new ErrorModel(null, '新增博客失败'))
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

    res.send(new SuccessModel({
        list: result || [],
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
        res.send(new SuccessModel(result, '获取博客详情成功'))
    } else {
        res.send(new ErrorModel(null, '获取博客详情失败'))
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
        res.send(new SuccessModel(result, '点赞博客成功'))
    } else {
        res.send(new ErrorModel(null, '点赞博客失败'))
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
        res.send(new SuccessModel(result, '获取标签列表成功'))
    } else {
        res.send(new ErrorModel(null, '获取标签列表失败'))
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
        res.send(new SuccessModel({
            list: result || [],
            total: total || 0,
            page: pageTemp,
            pageSize: pageSizeTemp,
        }, '获取评论列表成功'))
    } else {
        res.send(new ErrorModel(null, '获取评论列表失败'))
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
        res.send(new SuccessModel(result, '添加评论成功'))
    } else {
        res.send(new ErrorModel(null, '添加评论失败'))
    }
})

module.exports = router