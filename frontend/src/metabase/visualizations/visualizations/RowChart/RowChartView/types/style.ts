export type ChartFont = {
  size: number;
  family?: string;
  weight?: number;
  color?: string;
};

export type ChartTheme = {
  axis: {
    color: string;
    ticks: ChartFont;
  };
  dataLabels: ChartFont;
  goal: {
    lineStroke: string;
    label: ChartFont;
  };
  grid: {
    color: string;
  };
};
