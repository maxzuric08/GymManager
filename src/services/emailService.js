const nodemailer = require('nodemailer');

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
});

// Función para enviar email de vencimiento de membresía
const sendMembershipExpirationEmail = async (userEmail, userName, planName, expirationDate) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: '⏰ Tu membresía está próxima a vencer',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">¡Atención!</h1>
            <p style="margin: 10px 0 0 0;">Tu membresía está por vencer</p>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hola <strong>${userName}</strong>,</p>

            <p>Queremos avisarte que tu plan <strong>${planName}</strong> vencerá el <strong>${new Date(expirationDate).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>

            <p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; color: #856404;">
              ⚠️ Una vez venza tu membresía, no podrás reservar nuevas clases hasta que adquieras un nuevo plan.
            </p>

            <p>Para renovar tu membresía o mejorar a un plan superior, ingresa a tu panel de usuario y ve a la sección "Mi Membresía".</p>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Ir a GymManager
              </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #666; font-size: 12px;">
              Este es un mensaje automático de GymManager. Si tienes dudas, contacta con el administrador.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email enviado a ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};

module.exports = {
  sendMembershipExpirationEmail,
  transporter
};
