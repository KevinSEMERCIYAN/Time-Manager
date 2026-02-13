import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export function SparklineChart({ series, labels, id, color = "#3b82f6", options = {} }) {
  const canvasRef = useRef(null);
  const chartHeight = options.height ?? 96;
  const lineWidth = options.lineWidth ?? 2;
  const tension = options.tension ?? 0.35;
  const fillColor = options.fillColor ?? color;
  const yMin = options.yMin;
  const yMax = options.yMax;

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const ctx = canvasRef.current.getContext("2d");
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: options.label || "",
            data: series,
            borderColor: color,
            backgroundColor: `${fillColor}22`,
            borderWidth: lineWidth,
            pointRadius: 0,
            tension,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            grid: { color: "rgba(148,163,184,0.25)" },
            ticks: {
              color: "#374151",
              maxTicksLimit: options.maxTicks ?? 6,
              autoSkip: true,
              maxRotation: 0,
              minRotation: 0,
              padding: 6,
              font: { size: 10, weight: "600" },
            },
          },
          y: {
            grid: { color: "rgba(148,163,184,0.25)" },
            suggestedMin: yMin,
            suggestedMax: yMax,
            ticks: {
              color: "#6b7280",
              maxTicksLimit: 4,
              padding: 4,
              font: { size: 9 },
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [series, labels.join("|"), color, fillColor, lineWidth, tension, options.maxTicks, yMin, yMax]);

  return (
    <div style={{ width: "100%", height: chartHeight, marginTop: 8 }}>
      <canvas id={`chart-${id}`} ref={canvasRef} />
    </div>
  );
}
