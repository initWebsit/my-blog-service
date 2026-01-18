const { escape, exec } = require('../db/mysql')

async function addBlog({
    title, 
    category,
    categoryName, 
    tags, 
    content, 
    nickname, 
    userId,
}) {
    title = escape(title)
    category = escape(category)
    categoryName = escape(categoryName)
    content = escape(content)
    nickname = escape(nickname)
    userId = escape(userId)
    tags = tags.split(',').map(tag => parseInt(tag))
    const timestamp = Math.floor(new Date().getTime() / 1000)

    const sql = `
        INSERT INTO blogs (title, category, category_name, content, create_person, create_person_name, update_person, update_person_name, createtime, look_number)
        VALUES (${title}, ${category}, ${categoryName}, ${content}, ${userId}, ${nickname}, ${userId}, ${nickname}, FROM_UNIXTIME(${timestamp}), 0)
    `

    let result
    try {
        result = await exec(sql)
    } catch (error) {
        console.log(error)
    }   
    if (!result) return null

    for (let i = 0; i < tags.length; i++) {
        const blog_tag_sql = `
            INSERT INTO blog_tags (blog_id, tag_id, create_time) VALUES (${result.insertId}, ${tags[i]}, FROM_UNIXTIME(${timestamp}))
        `
        try {
            await exec(blog_tag_sql)
        } catch (error) {
            console.log(error)
        }
    }

    return result.insertId || null
} 

async function getBlogList({ userId, searchByUserId, page = 1, pageSize = 10, category = '', tag = '', keyword = '' }) {
    if (userId) userId = escape(userId)
    if (searchByUserId) searchByUserId = escape(searchByUserId)
    if (page) page = escape(page)
    if (pageSize) pageSize = escape(pageSize)
    if (category) category = escape(category)
    if (tag) tag = escape(tag)
    if (keyword) keyword = escape(keyword)

    const sql = `
        SELECT
            blogs.id,
            blogs.title,
            blogs.category,
            blogs.category_name,
            blogs.content,
            blogs.create_person,
            blogs.create_person_name,
            blogs.update_person,
            blogs.update_person_name,
            blogs.createtime,
            blogs.look_number,
            COALESCE(l.likeCount, 0) as likeCount,
            COALESCE(c.commentCount, 0) as commentCount,
            COALESCE(islike.isLiked, false) as isLiked,
            COALESCE(
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', t.id, 'name', t.name)
                ),
                JSON_ARRAY()
            ) AS tags
        FROM blogs
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as likeCount FROM blog_likes GROUP BY blog_id
        ) l ON blogs.id = l.blog_id
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as commentCount FROM comments GROUP BY blog_id
        ) c ON blogs.id = c.blog_id
        ${userId ? `
            LEFT JOIN (
                SELECT blog_id, COUNT(*) > 0 as isLiked FROM blog_likes WHERE user_id = ${userId} GROUP BY blog_id
            ) islike ON blogs.id = islike.blog_id
        ` : ''}
        LEFT JOIN blog_tags bt ON blogs.id = bt.blog_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE 1=1 ${category ? `AND blogs.category = ${category}` : ''} ${tag ? `AND EXISTS (SELECT 1 FROM blog_tags WHERE blog_id = blogs.id AND tag_id = ${tag})` : ''} ${keyword ? `AND (blogs.title LIKE CONCAT('%', ${keyword}, '%') OR blogs.content LIKE CONCAT('%', ${keyword}, '%'))` : ''} ${searchByUserId ? `AND blogs.create_person = ${searchByUserId}` : ''}
        GROUP BY blogs.id
        ORDER BY blogs.createtime DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `

    return exec(sql)
}

async function getBlogTotal({ searchByUserId, category = '', tag = '', keyword = '' }) {
    if (searchByUserId) searchByUserId = escape(searchByUserId)
    if (category) category = escape(category)
    if (tag) tag = escape(tag)
    if (keyword) keyword = escape(keyword)

    const sql = `
        SELECT COUNT(DISTINCT blogs.id) AS total
        FROM blogs
        LEFT JOIN blog_tags bt ON blogs.id = bt.blog_id
        WHERE 1=1 ${category ? `AND blogs.category = ${category}` : ''} ${tag ? `AND EXISTS (SELECT 1 FROM blog_tags WHERE blog_id = blogs.id AND tag_id = ${tag})` : ''} ${keyword ? `AND (blogs.title LIKE CONCAT('%', ${keyword}, '%') OR blogs.content LIKE CONCAT('%', ${keyword}, '%'))` : ''} ${searchByUserId ? `AND blogs.create_person = ${searchByUserId}` : ''}
    `

    return exec(sql).then(result => {
        return result[0]?.total || 0
    })
}

async function getBlogDetail({ userId, id }) {
    if (id) id = escape(id)
    if (userId) userId = escape(userId)
    const sql = `
        SELECT
            blogs.id,
            blogs.title,
            blogs.category,
            blogs.category_name,
            blogs.content,
            blogs.create_person,
            blogs.create_person_name,
            blogs.update_person,
            blogs.update_person_name,
            blogs.createtime,
            blogs.look_number,
            COALESCE(l.likeCount, 0) as likeCount,
            COALESCE(c.commentCount, 0) as commentCount,
            COALESCE(islike.isLiked, 0) as isLiked,
            COALESCE(
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', t.id, 'name', t.name)
                ),
                JSON_ARRAY()
            ) AS tags
        FROM blogs
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as likeCount FROM blog_likes GROUP BY blog_id
        ) l ON blogs.id = l.blog_id
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as commentCount FROM comments GROUP BY blog_id
        ) c ON blogs.id = c.blog_id
        ${userId ? `
            LEFT JOIN (
                SELECT blog_id, COUNT(*) > 0 as isLiked FROM blog_likes WHERE user_id = ${userId} GROUP BY blog_id
            ) islike ON blogs.id = islike.blog_id
        ` : ''}
        LEFT JOIN blog_tags bt ON blogs.id = bt.blog_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE blogs.id = ${id}
        GROUP BY blogs.id
    `

    const addLookNumberSql = `
        UPDATE blogs SET look_number = look_number + 1 WHERE id = ${id}
    `

    try {
        await exec(addLookNumberSql)
    } catch (error) {
        console.log(error)
    }

    return exec(sql).then(async (result) => {
        const blog = result[0] || null
        if (!blog) return null

        // 查询上一篇和下一篇
        const prevSql = `
            SELECT id, title FROM blogs 
            WHERE createtime < (SELECT createtime FROM blogs WHERE id = ${id})
            ORDER BY createtime DESC LIMIT 1
        `
        const nextSql = `
            SELECT id, title FROM blogs 
            WHERE createtime > (SELECT createtime FROM blogs WHERE id = ${id})
            ORDER BY createtime ASC LIMIT 1
        `

        try {
            const [prevResult, nextResult] = await Promise.all([
                exec(prevSql),
                exec(nextSql)
            ])
            blog.prevBlog = prevResult[0] || null
            blog.nextBlog = nextResult[0] || null
        } catch (error) {
            console.log(error)
            blog.prevBlog = null
            blog.nextBlog = null
        }

        return blog
    })
}

async function likeBlog({ userId, id, isLiked = 1 }) {
    if (id) id = escape(id)
    if (userId) userId = escape(userId)
    const timestamp = Math.floor(new Date().getTime() / 1000)

    const sql = isLiked ? `
        INSERT INTO blog_likes (user_id, blog_id, create_time) VALUES (${userId}, ${id}, FROM_UNIXTIME(${timestamp}))
    ` : `
        DELETE FROM blog_likes WHERE user_id = ${userId} AND blog_id = ${id}
    `
    return exec(sql).then(result => {
        return result.affectedRows > 0
    })
}

async function getTags() {
    const sql = `
        SELECT * FROM tags
    `
    return exec(sql)
}

async function getTagsNum() {
    const sql = `
        SELECT 
        blog_tags.tag_id as id, 
        tags.name as name, 
        COUNT(*) as count 
        FROM blog_tags 
        LEFT JOIN tags ON blog_tags.tag_id = tags.id
        GROUP BY tag_id
        ORDER BY count DESC
    `

    return exec(sql)
}

module.exports = {
    addBlog,
    getBlogList,
    getBlogTotal,
    getBlogDetail,
    getTags,
    likeBlog,
    getTagsNum,
}