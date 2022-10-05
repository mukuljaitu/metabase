import { color } from "metabase/lib/colors";
import { ChartTheme } from "../types";

export const getChartTheme: () => ChartTheme = () => {
  return {
    axis: {
      color: color("bg-dark"),
      minTicksInterval: 60,
      ticks: {
        size: 12,
        weight: 900,
        color: color("bg-dark"),
      },
      label: {
        size: 14,
        weight: 900,
        color: color("bg-dark"),
      },
    },
    goal: {
      lineStroke: color("text-medium"),
      label: {
        size: 14,
        weight: 700,
        color: color("text-medium"),
      },
    },
    dataLabels: {
      weight: 900,
      color: color("text-dark"),
      size: 12,
    },
    grid: {
      color: color("border"),
    },
  };
};
