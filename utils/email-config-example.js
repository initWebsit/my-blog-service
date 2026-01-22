/**
 * 邮件配置示例文件
 * 
 * 使用说明：
 * 1. 可以通过环境变量配置邮件服务
 * 2. 也可以直接修改 utils/email.js 中的 emailConfig 对象
 * 
 * 环境变量配置方式：
 * export EMAIL_HOST=smtp.qq.com
 * export EMAIL_PORT=587
 * export EMAIL_USER=your-email@qq.com
 * export EMAIL_PASS=your-authorization-code
 * 
 * 常见邮箱 SMTP 配置：
 * 
 * QQ 邮箱：
 *   host: smtp.qq.com
 *   port: 587
 *   user: 你的QQ邮箱（如：123456789@qq.com）
 *   pass: QQ邮箱授权码（需要在QQ邮箱设置中开启SMTP服务并获取授权码）
 * 
 * 163 邮箱：
 *   host: smtp.163.com
 *   port: 465 或 587
 *   user: 你的163邮箱
 *   pass: 163邮箱授权码
 * 
 * Gmail：
 *   host: smtp.gmail.com
 *   port: 587
 *   user: 你的Gmail邮箱
 *   pass: Gmail应用专用密码（需要在Google账号中开启两步验证并生成应用密码）
 * 
 * 企业邮箱（以腾讯企业邮箱为例）：
 *   host: smtp.exmail.qq.com
 *   port: 587
 *   user: 你的企业邮箱
 *   pass: 企业邮箱密码或授权码
 * 
 * 注意事项：
 * 1. 授权码不是登录密码，需要在邮箱设置中单独开启SMTP服务并获取
 * 2. 某些邮箱服务商需要先开启"POP3/SMTP服务"才能使用
 * 3. 建议使用环境变量配置，避免将敏感信息提交到代码仓库
 */

