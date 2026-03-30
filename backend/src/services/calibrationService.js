/**
 * Motor de Cálculo para Señales Industriales
 * Aplica polinomios o fórmulas estándar a valores crudos (raw)
 */
export const applyCalibration = (rawValue, profile) => {
  // Si no hay perfil o no hay fórmula definida, devolver el valor crudo (Directo)
  if (!profile || !profile.tipo_formula) {
    return rawValue;
  }

  const { tipo_formula, c0, c1, c2, c3, c4 } = profile;

  switch (tipo_formula) {
    case 'C_TO_F':
      // y = T(°C) * 1.8 + 32
      return (rawValue * 1.8) + 32;

    case 'F_TO_C':
      // y = (T(°F) - 32) / 1.8
      return (rawValue - 32) / 1.8;

    case 'PSI_TO_BAR':
      // y = P(PSI) * 0.0689476
      return rawValue * 0.0689476;

    case 'BAR_TO_PSI':
      // y = P(Bar) / 0.0689476
      return rawValue / 0.0689476;

    case 'POLYNOMIAL':
    case 'LINEAR_SCALE':
    default:
      // y = c4*x^4 + c3*x^3 + c2*x^2 + c1*x + c0
      return (c4 * Math.pow(rawValue, 4)) +
             (c3 * Math.pow(rawValue, 3)) +
             (c2 * Math.pow(rawValue, 2)) +
             (c1 * rawValue) +
             c0;
  }
};
