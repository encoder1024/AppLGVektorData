import { motion } from "framer-motion";

export const TestInstruments = ({ valor = 0 }) => {
  // El valor serÃ­a el Ã¡ngulo de rotaciÃ³n (ej: de -90 a 90)

  const xInicio = 50;
  const yInicio = 50;
  const angulo = 180; // El valor que se le pasa al componente

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <g id="mi-grupo-contenedor">
        <motion.path
          d="M50 50 L150 50" // Suponiendo que empieza en 50,50
          stroke="blue"
          animate={{ rotate: angulo }}
          style={{
            // Forzamos el punto de giro al inicio de la recta
            transformOrigin: "50px 50px",
            // Evitamos que Framer use el centro del path
            originX: 0,
            originY: 0,
          }}
        />

        {/* Un círculo opcional para marcar el eje de rotación */}
        <circle cx={xInicio} cy={yInicio} r="3" fill="red" />
      </g>
    </svg>
  );
};

export default TestInstruments;
