const nodemailer = require('nodemailer')

// 邮件配置
// 可以通过环境变量配置，或直接在这里配置
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.qq.com', // SMTP 服务器地址
  port: process.env.EMAIL_PORT || 587, // SMTP 端口
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || '', // 发送邮件的邮箱账号
    pass: process.env.EMAIL_PASS || '', // 邮箱授权码（不是登录密码）
  },
}

// 创建邮件传输器
const transporter = nodemailer.createTransport(emailConfig)

/**
 * 发送验证码邮件
 * @param {string} to - 接收邮件的邮箱地址
 * @param {string} code - 验证码
 * @returns {Promise} 发送结果
 */
async function sendVerificationCode(to, code) {
  const mailOptions = {
    from: `"博客系统" <${emailConfig.auth.user}>`, // 发件人
    to: to, // 收件人
    subject: '验证码', // 邮件主题
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">验证码</h2>
        <p style="color: #666; font-size: 16px;">您的验证码是：</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #1890ff; letter-spacing: 5px;">${code}</span>
        </div>
        <p style="color: #999; font-size: 14px;">验证码有效期为 5 分钟，请勿泄露给他人。</p>
        <p style="color: #999; font-size: 14px;">如果这不是您的操作，请忽略此邮件。</p>
      </div>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('邮件发送成功:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('邮件发送失败:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  sendVerificationCode,
}

