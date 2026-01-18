-- 用户表结构
CREATE TABLE `users` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `nickname` VARCHAR(20) NOT NULL COMMENT '昵称',
    `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
    `password` VARCHAR(20) NOT NULL COMMENT '密码',
    `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    PRIMARY KEY (`id`),
    UNIQUE KEY `email_UNIQUE` (`email`),
    UNIQUE KEY `username_UNIQUE` (`nickname`),
    INDEX `idx_create_time` (`create_time`) COMMENT '创建时间索引：用于 ORDER BY create_time DESC'
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='用户表';

