import Barometer from "Barometer";
import { useState } from "react";

export const BarometerView = ({ sensor }) => {
  const [angulo, setAngulo] = useState(0);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          padding: "40px",
        }}
      >
        <h2>Control de Barómetro</h2>

        {/* Componente del Barómetro */}
        <Barometer valor={angulo} size={200} />

        {/* Slider para mover la aguja */}
        <div style={{ width: "300px", textAlign: "center" }}>
          <p>
            Ángulo actual: <strong>{angulo}°</strong>
          </p>
          <input
            type="range"
            min="0"
            max="360"
            value={angulo}
            onChange={(e) => setAngulo(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
            }}
          >
            <button onClick={() => setAngulo(0)}>Min</button>
            <button onClick={() => setAngulo(136)}>Centro</button>
            <button onClick={() => setAngulo(271)}>Max</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarometerView;
