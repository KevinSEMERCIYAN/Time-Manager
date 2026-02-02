import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>TimeManager</h1>
      <p>Frontend OK.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
