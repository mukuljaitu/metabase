import React, { useMemo } from "react";

import _ from "underscore";

import { TextMeasurer } from "metabase/visualizations/types/measure-text";
import { RowChartView, RowChartViewProps } from "./RowChartView/RowChartView";
import {
  getMaxYValuesCount,
  getChartMargin,
  StackingOffset,
  calculateStackedBars,
  calculateNonStackedBars,
} from "./utils/layout";
import {
  ChartGoal,
  ChartTheme,
  ChartTicksFormatters,
  HoveredData,
  Series,
} from "./types";
import { getXTicksCount } from "./utils/ticks";

const MIN_BAR_HEIGHT = 24;

export interface RowChartProps<TDatum> {
  width: number;
  height: number;

  data: TDatum[];
  series: Series<TDatum>[];
  seriesColors: Record<string, string>;

  trimData: (data: TDatum[], maxLength: number) => TDatum[];

  goal: ChartGoal | null;
  theme: ChartTheme;
  stackingOffset: StackingOffset;
  shouldShowDataLabels?: boolean;

  yLabel?: string;
  xLabel?: string;

  tickFormatters: ChartTicksFormatters;
  measureText: TextMeasurer;

  hoveredData?: HoveredData | null;

  xScaleType?: "linear" | "pow" | "log";

  onClick?: RowChartViewProps["onClick"];
  onHover?: RowChartViewProps["onHover"];
}

export const RowChart = <TDatum,>({
  width,
  height,

  data,
  trimData,
  series: multipleSeries,
  seriesColors,

  goal,
  theme,
  stackingOffset,
  shouldShowDataLabels,

  xLabel,
  yLabel,

  tickFormatters,
  measureText,

  hoveredData,

  onClick,
  onHover,
  xScaleType,
}: RowChartProps<TDatum>) => {
  const maxYValues = useMemo(
    () =>
      getMaxYValuesCount(
        height,
        MIN_BAR_HEIGHT,
        stackingOffset != null,
        multipleSeries.length,
      ),
    [height, multipleSeries.length, stackingOffset],
  );

  const trimmedData = trimData(data, maxYValues);

  const { xTickFormatter, yTickFormatter } = tickFormatters;

  const margin = useMemo(
    () =>
      getChartMargin(
        trimmedData,
        multipleSeries,
        yTickFormatter,
        theme.axis.ticks,
        theme.axis.label,
        goal != null,
        measureText,
        xLabel,
        yLabel,
      ),
    [
      trimmedData,
      multipleSeries,
      yTickFormatter,
      theme.axis.ticks,
      theme.axis.label,
      goal,
      measureText,
      xLabel,
      yLabel,
    ],
  );

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const additionalXValues = useMemo(
    () => (goal != null ? [goal.value ?? 0] : []),
    [goal],
  );

  const { xScale, yScale, bars } = useMemo(
    () =>
      stackingOffset != null
        ? calculateStackedBars<TDatum>({
            data: trimmedData,
            multipleSeries,
            additionalXValues,
            stackingOffset,
            innerWidth,
            innerHeight,
            seriesColors,
            xScaleType,
          })
        : calculateNonStackedBars<TDatum>({
            data: trimmedData,
            multipleSeries,
            additionalXValues,
            innerWidth,
            innerHeight,
            seriesColors,
            xScaleType,
          }),
    [
      additionalXValues,
      innerHeight,
      innerWidth,
      multipleSeries,
      seriesColors,
      stackingOffset,
      trimmedData,
      xScaleType,
    ],
  );

  const xTicksCount = getXTicksCount(theme, innerWidth, xScaleType);

  return (
    <RowChartView
      barsSeries={bars}
      innerHeight={innerHeight}
      innerWidth={innerWidth}
      margin={margin}
      theme={theme}
      width={width}
      height={height}
      xScale={xScale}
      yScale={yScale}
      goal={goal}
      hoveredData={hoveredData}
      yTickFormatter={yTickFormatter}
      xTickFormatter={xTickFormatter}
      onClick={onClick}
      onHover={onHover}
      xTicksCount={xTicksCount}
      shouldShowDataLabels={shouldShowDataLabels}
      yLabel={yLabel}
      xLabel={xLabel}
    />
  );
};
