import db from "../config/db.js"; // Importar la conexión de la base de datos como módulo ES
import { logAudit } from "../utils/auditLogger.js"; // Importar el logger de auditoría

export const getAllAuditLogs = async (req, res) => {
  try {
    const { start, end } = req.query;
    // Usamos 'knex' que se importó desde '../config/db.js'
    let query = db("audit_logs").select("*");

    if (start && end) {
      query = query.whereBetween("time", [start, end]);
    } else if (start) {
      query = query.where("time", ">=", start);
    } else if (end) {
      query = query.where("time", "<=", end);
    }

    // Opcional: unir con la tabla 'users' para obtener el nombre del usuario en lugar del ID
    // Suponiendo que existe una tabla 'users' y la columna 'full_name'
    // query = query.leftJoin('users', 'audit_logs.user_id', 'users.id').select('audit_logs.*', 'users.full_name as user_name');

    const logs = await query.orderBy("time", "desc");

    // Registrar la acción de obtener logs de auditoría usando el logger
    // Se asume que req.user está poblado por un middleware de autenticación.
    const userId = req.user ? req.user.id : null; // Placeholder para ID de usuario real
    logAudit(userId, "GET_AUDIT_LOGS", "Se obtuvieron logs de auditoría", {
      queryParameters: req.query,
      count: logs.length,
    });

    res.status(200).json(logs);
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    // Registrar el error también
    const userId = req.user ? req.user.id : null; // Placeholder para ID de usuario real
    logAudit(
      userId,
      "ERROR_GET_AUDIT_LOGS",
      "Fallo al obtener logs de auditoría",
      {
        error: err.message,
        queryParameters: req.query,
      },
    );
    res
      .status(500)
      .json({
        error: "Error interno del servidor al obtener logs de auditoría.",
      });
  }
};
