const { exec } = require('../db/mysql')
const formatData = require('../utils/format-data')

async function addBlog({
    title, 
    category,
    categoryName, 
    tags, 
    content, 
    nickname, 
    userId,
}) {
    const { title: titleTemp, category: categoryTemp, categoryName: categoryNameTemp, content: contentTemp, nickname: nicknameTemp, userId: userIdTemp } = formatData({ title, category, categoryName, content, nickname, userId })
    tags = tags.split(',').map(tag => parseInt(tag))
    const timestamp = Math.floor(new Date().getTime() / 1000)

    const sql = `
        INSERT INTO blogs (title, category, category_name, content, create_person, create_person_name, update_person, update_person_name, createtime, look_number)
        VALUES (${titleTemp}, ${categoryTemp}, ${categoryNameTemp}, ${contentTemp}, ${userIdTemp}, ${nicknameTemp}, ${userIdTemp}, ${nicknameTemp}, FROM_UNIXTIME(${timestamp}), 0)
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
    const { userId: userIdTemp, searchByUserId: searchByUserIdTemp, page: pageTemp, pageSize: pageSizeTemp, category: categoryTemp, tag: tagTemp, keyword: keywordTemp } = formatData({ userId, searchByUserId, page, pageSize, category, tag, keyword })
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
            ${userIdTemp ? 'COALESCE(islike.isLiked, false) as isLiked,' : ''}
            IF (
                COUNT(t.id) = 0,
                JSON_ARRAY(),
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', t.id, 'name', t.name)
                )
            ) AS tags
        FROM blogs
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as likeCount FROM blog_likes GROUP BY blog_id
        ) l ON blogs.id = l.blog_id
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as commentCount FROM comments GROUP BY blog_id
        ) c ON blogs.id = c.blog_id
        ${userIdTemp ? `
            LEFT JOIN (
                SELECT blog_id, COUNT(*) > 0 as isLiked FROM blog_likes WHERE user_id = ${userIdTemp} GROUP BY blog_id
            ) islike ON blogs.id = islike.blog_id
        ` : ''}
        LEFT JOIN blog_tags bt ON blogs.id = bt.blog_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE 1=1 ${categoryTemp ? `AND blogs.category = ${categoryTemp}` : ''} ${tagTemp ? `AND EXISTS (SELECT 1 FROM blog_tags WHERE blog_id = blogs.id AND tag_id = ${tagTemp})` : ''} ${keywordTemp ? `AND (blogs.title LIKE CONCAT('%', ${keywordTemp}, '%') OR blogs.content LIKE CONCAT('%', ${keywordTemp}, '%'))` : ''} ${searchByUserIdTemp ? `AND blogs.create_person = ${searchByUserIdTemp}` : ''}
        GROUP BY blogs.id
        ORDER BY blogs.createtime DESC
        LIMIT ${pageSizeTemp} OFFSET ${(pageTemp - 1) * pageSizeTemp}
    `

    return exec(sql)
}

async function getBlogTotal({ searchByUserId, category = '', tag = '', keyword = '' }) {
    const { searchByUserId: searchByUserIdTemp, category: categoryTemp, tag: tagTemp, keyword: keywordTemp } = formatData({ searchByUserId, category, tag, keyword })

    const sql = `
        SELECT COUNT(DISTINCT blogs.id) AS total
        FROM blogs
        LEFT JOIN blog_tags bt ON blogs.id = bt.blog_id
        WHERE 1=1 ${categoryTemp ? `AND blogs.category = ${categoryTemp}` : ''} ${tagTemp ? `AND EXISTS (SELECT 1 FROM blog_tags WHERE blog_id = blogs.id AND tag_id = ${tagTemp})` : ''} ${keywordTemp ? `AND (blogs.title LIKE CONCAT('%', ${keywordTemp}, '%') OR blogs.content LIKE CONCAT('%', ${keywordTemp}, '%'))` : ''} ${searchByUserIdTemp ? `AND blogs.create_person = ${searchByUserIdTemp}` : ''}
    `

    return exec(sql).then(result => {
        return result[0]?.total || 0
    })
}

async function getBlogDetail({ userId, id }) {
    const { userId: userIdTemp, id: idTemp } = formatData({ userId, id })
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
            ${userIdTemp ? 'COALESCE(islike.isLiked, false) as isLiked,' : ''}
            IF (
                COUNT(t.id) = 0,
                JSON_ARRAY(),
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', t.id, 'name', t.name)
                )
            ) AS tags
        FROM blogs
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as likeCount FROM blog_likes GROUP BY blog_id
        ) l ON blogs.id = l.blog_id
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as commentCount FROM comments GROUP BY blog_id
        ) c ON blogs.id = c.blog_id
        ${userIdTemp ? `
            LEFT JOIN (
                SELECT blog_id, COUNT(*) > 0 as isLiked FROM blog_likes WHERE user_id = ${userIdTemp} GROUP BY blog_id
            ) islike ON blogs.id = islike.blog_id
        ` : ''}
        LEFT JOIN blog_tags bt ON blogs.id = bt.blog_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE blogs.id = ${idTemp}
        GROUP BY blogs.id
    `

    const addLookNumberSql = `
        UPDATE blogs SET look_number = look_number + 1 WHERE id = ${idTemp}
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
    const { userId: userIdTemp, id: idTemp } = formatData({ userId, id })
    const timestamp = Math.floor(new Date().getTime() / 1000)

    const sql = isLiked ? `
        INSERT INTO blog_likes (user_id, blog_id, create_time) VALUES (${userIdTemp}, ${idTemp}, FROM_UNIXTIME(${timestamp}))
    ` : `
        DELETE FROM blog_likes WHERE user_id = ${userIdTemp} AND blog_id = ${idTemp}
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

async function getComments({ blogId, pageSize, page }) {
    const { blogId: blogIdTemp, pageSize: pageSizeTemp, page: pageTemp } = formatData({ blogId, pageSize, page })

    const sql = `
        SELECT 
            top_c.*,
            IF(
                COUNT(child_c.id) = 0,
                JSON_ARRAY(),
                JSON_ARRAYAGG(
                    JSON_OBJECT('id', child_c.id, 'blog_id', child_c.blog_id, 'user_id', child_c.user_id, 'user_name', child_c.user_name, 'parent_id', child_c.parent_id, 'parent_grand_id', child_c.parent_grand_id, 'content', child_c.content, 'create_time', child_c.create_time)
                )
            ) AS child_comments
        FROM comments top_c
        LEFT JOIN (
            SELECT * FROM comments WHERE blog_id = ${blogIdTemp}
        ) child_c ON child_c.parent_id = top_c.id OR child_c.parent_grand_id = top_c.id
        WHERE top_c.blog_id = ${blogIdTemp} AND top_c.parent_id IS NULL
        GROUP BY top_c.id
        ORDER BY top_c.create_time DESC
        LIMIT ${pageSizeTemp} OFFSET ${(pageTemp - 1) * pageSizeTemp}
    `

    const result = await exec(sql)
    
    // 对每个评论的子评论按创建时间升序排序
    if (result && Array.isArray(result)) {
        result.forEach(comment => {
            comment.child_comments = JSON.parse(comment.child_comments)
            comment.child_comments.sort((a, b) => {
                const timeA = new Date(a.create_time).getTime()
                const timeB = new Date(b.create_time).getTime()
                return timeA - timeB
            })
            comment.child_comments = JSON.stringify(comment.child_comments)
        })
    }
    
    return result
}

async function getCommentsTotal({ blogId }) {
    const { blogId: blogIdTemp } = formatData({ blogId })
    const sql = `
        SELECT COUNT(*) as total FROM comments WHERE blog_id = ${blogIdTemp} AND parent_id IS NULL
    `

    return exec(sql).then(result => {
        return result[0]?.total || null
    })
}

async function addComment({ blogId, userId, userName, parentId, parentGrandId, content }) {
    const { blogId: blogIdTemp, userId: userIdTemp, userName: userNameTemp, parentId: parentIdTemp, parentGrandId: parentGrandIdTemp, content: contentTemp } = formatData({ blogId, userId, userName, parentId, parentGrandId, content })
    const timestamp = Math.floor(new Date().getTime() / 1000)

    const sql = `
        INSERT INTO comments (blog_id, user_id, user_name, parent_id, parent_grand_id, content, create_time) 
        VALUE (${blogIdTemp}, ${userIdTemp}, ${userNameTemp}, ${parentIdTemp}, ${parentGrandIdTemp}, ${contentTemp}, FROM_UNIXTIME(${timestamp})) 
    `

    return exec(sql).then(result => {
        return result.insertId || null
    })
}

module.exports = {
    addBlog,
    getBlogList,
    getBlogTotal,
    getBlogDetail,
    getTags,
    likeBlog,
    getTagsNum,
    getComments,
    getCommentsTotal,
    addComment,
}