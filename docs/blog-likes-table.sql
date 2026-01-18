-- 博客点赞表结构
-- 用于存储用户对博客的点赞记录

CREATE TABLE IF NOT EXISTS `blog_likes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `blog_id` INT NOT NULL COMMENT '博客ID',
    `createtime` BIGINT NOT NULL COMMENT '创建时间（时间戳）',
    UNIQUE KEY `uk_user_blog` (`user_id`, `blog_id`) COMMENT '唯一索引：确保同一用户对同一博客只能有一条记录',
    KEY `idx_blog_id` (`blog_id`) COMMENT '索引：用于快速查询某博客的所有点赞',
    KEY `idx_user_id` (`user_id`) COMMENT '索引：用于快速查询某用户的所有点赞'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客点赞表';

-- 说明：
-- 1. UNIQUE KEY (user_id, blog_id) 确保同一用户对同一博客只能点赞一次
-- 2. 点赞/取消点赞通过删除和插入记录来实现
-- 3. 如果需要保留历史数据（记录用户何时点赞、何时取消），可以使用 is_liked 字段（见下方替代方案）

-- ============================================
-- 替代方案：使用状态字段（软删除，保留历史数据）
-- ============================================
-- 如果需要在取消点赞后保留历史记录，可以使用以下表结构：

/*
CREATE TABLE IF NOT EXISTS `blog_likes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `blog_id` INT NOT NULL COMMENT '博客ID',
    `is_liked` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否点赞：1-已点赞，0-已取消',
    `createtime` BIGINT NOT NULL COMMENT '创建时间（时间戳）',
    `updated_at` BIGINT NOT NULL COMMENT '更新时间（时间戳）',
    UNIQUE KEY `uk_user_blog` (`user_id`, `blog_id`) COMMENT '唯一索引：确保同一用户对同一博客只能有一条记录',
    KEY `idx_blog_id` (`blog_id`) COMMENT '索引：用于快速查询某博客的所有点赞',
    KEY `idx_user_id` (`user_id`) COMMENT '索引：用于快速查询某用户的所有点赞'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客点赞表';
*/

