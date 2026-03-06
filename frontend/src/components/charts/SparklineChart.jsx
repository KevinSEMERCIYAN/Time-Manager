import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export function SparklineChart({ series, labels, id, color = "#3b82f6", options = {} }) {
  const canvasRef = useRef(null);
  const chartHeight = options.height ?? 96;
  const lineWidth = options.lineWidth ?? 2;
  const tension = options.tension ?? 0.35;
  const fillColor = options.fillColor ?? color;
  const baseZero = options.baseZero ?? false;
  const unit = options.unit ?? "";
  const precision = options.tickPrecision ?? (unit === "%" ? 0 : 1);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const values = Array.isArray(series)
      ? series
          .map((v) => (typeof v === "number" ? v : Number(v)))
          .filter((v) => Number.isFinite(v))
      : [];
    const dataMin = values.length ? Math.min(...values) : 0;
    const dataMax = values.length ? Math.max(...values) : 0;
    const hasFlatSeries = values.length > 0 && Math.abs(dataMax - dataMin) < 1e-9;

    let resolvedMin = Number.isFinite(options.yMin) ? options.yMin : dataMin;
    let resolvedMax = Number.isFinite(options.yMax) ? options.yMax : dataMax;

    if (!values.length || hasFlatSeries) {
      if (baseZero) {
        const top = Math.max(Math.abs(dataMax), 1);
        resolvedMin = 0;
        resolvedMax = top;
      } else {
        const center = Number.isFinite(dataMax) ? dataMax : 0;
        const pad = Math.max(Math.abs(center) * 0.25, 1);
        resolvedMin = center - pad;
        resolvedMax = center + pad;
      }
    } else {
      const span = Math.abs(resolvedMax - resolvedMin);
      const pad = Math.max(span * 0.15, 0.2);
      if (!Number.isFinite(options.yMin)) resolvedMin = baseZero ? Math.min(0, resolvedMin - pad) : resolvedMin - pad;
      if (!Number.isFinite(options.yMax)) resolvedMax = resolvedMax + pad;
      if (baseZero) resolvedMin = 0;
    }

    if (resolvedMin === resolvedMax) {
      resolvedMax = resolvedMin + 1;
    }

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
            min: resolvedMin,
            max: resolvedMax,
            ticks: {
              color: "#6b7280",
              maxTicksLimit: 4,
              padding: 4,
              font: { size: 9 },
              callback: (value) => {
                if (typeof value !== "number" || !Number.isFinite(value)) return "";
                const rounded = Number(value.toFixed(precision));
                return unit ? `${rounded}${unit}` : `${rounded}`;
              },
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [series, labels.join("|"), color, fillColor, lineWidth, tension, options.maxTicks, options.yMin, options.yMax, baseZero, unit, precision]);

  return (
    <div style={{ width: "100%", height: chartHeight, marginTop: 8 }}>
      <canvas id={`chart-${id}`} ref={canvasRef} />
    </div>
  );
}
