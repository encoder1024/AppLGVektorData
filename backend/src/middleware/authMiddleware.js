import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Obtener el token del header (Bearer TOKEN)
      token = req.headers.authorization.split(" ")[1];

      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Añadir los datos del usuario decodificados a la petición
      req.user = decoded;

      return next();
    } catch (error) {
      console.error("Error de token:", error);
      return res.status(401).json({ message: "No autorizado, token fallido" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No autorizado, no hay token" });
  }
};

// Middleware para restringir por roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `El rol '${req.user.role}' no tiene permisos para acceder a esta ruta`,
      });
    }
    next();
  };
};
