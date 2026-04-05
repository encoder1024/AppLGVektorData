import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import imagenCaldera from "../../assets/ES_Boiler_Control_02.svg";
import { Translate } from "@mui/icons-material";

export const CalderaInteractiva = ({ datosSensores }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  console.log('[CalderaInteractiva] Render with:', datosSensores);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "900px" }}>
      {/* 1. Imagen base de la caldera */}
      <img
        src={imagenCaldera}
        style={{ width: "100%", display: "block" }}
        alt="Caldera"
      />

      {/* 2. Capa SVG para instrumentos y luces */}
      <svg
        viewBox="0 0 900 583" // Ajustar a las dimensiones de tu PNG
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <motion.g
          initial={{ rotate: 90, x: 50, y: -50, scaleX: 0.7, scaleY: 0.15 }} // Girado 90 grados y re-centrado
          style={{ originX: "126px", originY: "507px" }} // Punto de anclaje central de la llama
        >
          {/* Llama Exterior */}
          <motion.path
            d="M187.899,164.809c-2.096,50.059-43.325,90.003-93.899,90.003-51.915,0-94-43.5-94-94c0-6.75-.121-20.24,10-43c6.057-13.621,9.856-22.178,12-30c1.178-4.299,3.469-11.129,10,0c3.851,6.562,4,16,4,16s14.328-10.995,24-32c14.179-30.793,2.866-49.2-1-62-1.338-4.428-2.178-12.386,7-9c9.352,3.451,34.076,20.758,47,39c18.445,26.035,25,51,25,51s5.906-7.33,8-15c2.365-8.661,2.4-17.239,9.999-7.999c7.227,8.787,17.96,25.3,24.001,40.999c10.969,28.509,7.899,55.997,7.899,55.997Z"
            fill="#fc6e02"
            animate={{ scale: [1, 1.03, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Llama Media */}
          <motion.path
            d="M94,254.812c-35.899,0-65-29.101-65-65c0-21.661,8.729-34.812,26.896-52.646c11.632-11.419,22.519-25.444,27.146-34.994.911-1.88,2.984-11.677,10.977-.206c4.193,6.016,10.766,16.715,14.981,25.846c7.266,15.743,9,31,9,31s7.121-4.196,12-15c1.573-3.482,4.753-16.664,13.643-3.484C150.166,150,159.127,167.39,159,189.812c0,35.899-29.102,65-65,65Z"
            fill="#fc9502"
            animate={{ x: [-1, 1, -1], y: [0, -2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          {/* Núcleo */}
          <motion.path
            d="M95,183.812c9.25,0,9.25,17.129,21,40c7.824,15.229-3.879,31-21,31s-26-13.879-26-31c0-17.12,16.75-40,26-40Z"
            fill="#fce202"
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.g>

        <rect width="4.098071" height="35.912043" rx="0" ry="0" transform="translate(461.828885 433.974317) scale(1.248)" fill="#069cc5"/>

        {/* LUZ DE ALERTA (Parpadeo) */}
        <motion.circle
          cx="97.5"
          cy="106"
          r="25"
          fill={datosSensores.temperatura > 80 ? "red" : "green"}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ pointerEvents: "auto", cursor: "pointer" }}
        />

        {/* ÁREA INTERACTIVA (Invisible, para abrir el cuadro) */}
        <circle
          cx="175.5"
          cy="106"
          r="25"
          fill="#00ff11"
          opacity="0.71" // Casi invisible pero clickeable
          style={{ pointerEvents: "auto", cursor: "help" }}
          onClick={() => setShowTooltip(!showTooltip)}
        />

        <circle
          cx="254.5"
          cy="106"
          r="25"
          fill="#00ff11"
          opacity="0.71" // Casi invisible pero clickeable
          style={{ pointerEvents: "auto", cursor: "help" }}
          onClick={() => setShowTooltip(!showTooltip)}
        />

        <motion.path
          d="M372.053138,310.369927l-.253773,108.150351c-.102921.926899.442385,2.44042,1.11187,3.017932.534271.94461,2.142678,1.773171,3.17677,1.747222l196.980445.079182c2.332316.290149,4.432351-2.725923,4.745241-5.377941l-.360462-223.488267-4.393224-4.393224-64.922083-.488136c-3.959572.693395-8.923653-1.825908-8.298311-8.298311-.508406-4.789239,3.346063-9.864268,8.786447-9.274583h198.1832" // Tu tubería
          stroke="#3f5787"
          strokeWidth="3"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="10 5" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, 15] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />

        {/* Salida de agua caliente de la Caldera */}
        <motion.path
          d="M301.53584,195.826312l-.586238-55.692596c.623344-1.756911-1.639926-5.385954-5.276141-5.27614l-242.383553-.441029" // Tu tubería
          stroke="#c55c6a"
          strokeWidth="3"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="10 5" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, -15] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />

        {/* Entrada de Combustible */}
        <motion.path
          d="M14.937247,244.863127h138.660547c2.671821.93715,5.08849,3.377894,4.37218,4.996777l-.021017,84.766219" // Tu tubería
          stroke="#fda901"
          strokeWidth="3"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="10 5" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, -15] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />

        {/* Entrada de Aire al boiler */}
        <motion.path
          d="M16.517708,447.609711l136.985358.250889c2.230163.102904,4.741074-1.556709,4.265112-4.265113l.250889-32.866451" // Tu tubería
          stroke="#8eadea"
          strokeWidth="3"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="10 5" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, -15] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />
        {/* Gases de Salida del boiler salida del fuego */}
        <motion.path
          d="M451.974864,360.095698l27.910551.193823c5.363207-1.018516,10.34144-5.991596,10.078809-9.884988l.193823-25.003201c.143005-4.612195-3.769847-11.482404-10.078813-12.017043h-11.629395" // Tu tubería
          stroke="#8eadea"
          strokeWidth="6"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="5 3" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, -16] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />
        {/* Gases de Salida del boiler distribución de gases */}
        <motion.path
          d="M451.974864,360.095698l27.910551.193823c5.363207-1.018516,10.34144-5.991596,10.078809-9.884988l.193823-25.003201c.143005-4.612195-3.769847-11.482404-10.078813-12.017043h-11.629395" // Tu tubería
          stroke="#8eadea"
          strokeWidth="6"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="5 3" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248) matrix(-1 0 0 1 706.109448 -55.067938)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, -16] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />
        {/* Gases de Salida del boiler salida del fuego */}
        <motion.path
          d="M528.641789,64.814418l-.362681,203.30896-7.42637,4.791206-128.562692.103355" // Tu tubería
          stroke="#8eadea"
          strokeWidth="3"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="5 3" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, 16] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />
        {/* Gases de Salida del boiler salida del fuego */}
        <motion.path
          d="M370.589349,257.64661l149.305149.175677l8.62417-6.228567" // Tu tubería
          stroke="#8eadea"
          strokeWidth="3"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="5 3" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, -16] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />
        {/* Gases de Salida del boiler salida del fuego */}
        <motion.path
          d="M298.705786,241.823185l221.188712,1.385925l8.38461-6.468127" // Tu tubería
          stroke="#8eadea"
          strokeWidth="3"
          fill="none"
          stroke-linecap="round"
          strokeDasharray="5 3" // 10px de línea, 5px de espacio
          transform="translate(0 0) scale(1.248)" // Ajusta posición y tamaño
          animate={{ strokeDashoffset: [0, -16] }} // Se mueve 15px (un ciclo completo)
          transition={{
            repeat: Infinity,
            duration: 0.5,
            ease: "linear",
          }}
        />
      </svg>

      {/* 3. Cuadro desplegable (Tooltip de sensores) */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              top: "20%",
              left: "55%",
              background: "rgba(0,0,0,0.85)",
              color: "white",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #555",
            }}
          >
            <h4>Estado de Sensores</h4>
            <p>Temperatura: {datosSensores.temperatura}°C</p>
            <p>Presión: {datosSensores.presion} bar</p>
            <button onClick={() => setShowTooltip(false)}>Cerrar</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalderaInteractiva;

// USO EN APPCONFIG.JSX
