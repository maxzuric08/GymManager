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

            <p>Queremos avisarte que tu plan <strong>${planName}</strong> vencerá el <strong>${new Date(`${String(expirationDate).slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>

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
    return { success: true };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error: error.message };
  }
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const formatDate = (date) => new Date(`${String(date).slice(0, 10)}T00:00:00Z`)
  .toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

const buildMembershipConfirmationEmail = ({ userEmail, userName, plan, startDate, expirationDate }) => {
  const planName = escapeHtml(plan.plan_type);
  const benefits = escapeHtml(plan.benefits || "Sin beneficios adicionales especificados");
  const classLimit = plan.class_limit == null ? "Sin limite" : `${plan.class_limit} reservas futuras`;
  const price = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(plan.cost || 0));

  return {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "✅ Confirmacion de tu membresia GymManager",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2f855a 0%, #276749 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">¡Membresia confirmada!</h1>
          <p style="margin: 10px 0 0 0;">Ya podes disfrutar de tu plan.</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Hola <strong>${escapeHtml(userName)}</strong>,</p>
          <p>Tu plan <strong>${planName}</strong> fue asignado correctamente.</p>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Inicio</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${formatDate(startDate)}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Vencimiento</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${formatDate(expirationDate)}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Precio</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${price}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Limite de reservas</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(classLimit)}</td></tr>
            <tr><td style="padding: 10px;"><strong>Beneficios</strong></td><td style="padding: 10px;">${benefits}</td></tr>
          </table>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Este es un mensaje automatico de GymManager.</p>
        </div>
      </div>
    `,
  };
};

const sendMembershipConfirmationEmail = async (details) => {
  try {
    await transporter.sendMail(buildMembershipConfirmationEmail(details));
    console.log(`Confirmacion de membresia enviada a ${details.userEmail}`);
    return true;
  } catch (error) {
    console.error("Error enviando la confirmacion de membresia:", error);
    return false;
  }
};

const formatClassTime = (value) => String(value || "").slice(0, 5);

const buildClassCancellationEmail = ({ userEmail, userName, className, classDate, startTime, endTime }) => ({
  from: process.env.EMAIL_USER,
  to: userEmail,
  subject: "⚠️ Tu reserva fue cancelada",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dd6b20 0%, #c05621 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">Clase cancelada</h1>
        <p style="margin: 10px 0 0 0;">Tu reserva ya no está activa.</p>
      </div>
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hola <strong>${escapeHtml(userName)}</strong>,</p>
        <p>Lamentamos avisarte que la clase <strong>${escapeHtml(className)}</strong> del <strong>${formatDate(classDate)}</strong> de ${formatClassTime(startTime)} a ${formatClassTime(endTime)} fue desactivada, por lo que tu reserva se canceló.</p>
        <p>La cancelación no consume tu límite de reservas: podés reservar otra clase desde tu panel.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">Este es un mensaje automatico de GymManager.</p>
      </div>
    </div>
  `,
});

const sendClassCancellationEmail = async (details) => {
  try {
    await transporter.sendMail(buildClassCancellationEmail(details));
    return true;
  } catch (error) {
    console.error("Error enviando el aviso de clase cancelada:", error);
    return false;
  }
};

module.exports = {
  buildClassCancellationEmail,
  sendClassCancellationEmail,
  sendMembershipExpirationEmail,
  buildMembershipConfirmationEmail,
  sendMembershipConfirmationEmail,
  transporter
};
