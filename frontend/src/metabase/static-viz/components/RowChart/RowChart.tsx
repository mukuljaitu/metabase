import React, { useCallback } from "react";
import { RowChart } from "metabase/visualizations/components/RowChart";
import {
  FontStyle,
  TextMeasurer,
} from "metabase/visualizations/types/measure-text";
import { measureText } from "metabase/static-viz/lib/text";
import { getStaticFormatters } from "./utils/format";

interface RowChartProps {
  data: any;
  card: any;
}

const StaticRowChart = ({ data, card }: RowChartProps) => {
  const textMeasurer: TextMeasurer = useCallback(
    (text: string, style: FontStyle) =>
      measureText(text, parseInt(style.size, 10), parseInt(style.weight)),
    [],
  );

  return (
    <RowChart
      width={620}
      height={440}
      settings={card.visualization_settings}
      data={data}
      measureText={textMeasurer}
      getFormatters={getStaticFormatters}
    />
  );
};

export default StaticRowChart;
