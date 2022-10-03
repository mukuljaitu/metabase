import React, { useMemo } from "react";
import { t } from "ttag";

import _ from "underscore";
import {
  GRAPH_AXIS_SETTINGS,
  GRAPH_DATA_SETTINGS,
  GRAPH_GOAL_SETTINGS,
} from "metabase/visualizations/lib/settings/graph";
import { DatasetData, VisualizationSettings } from "metabase-types/api";
import { isDimension, isMetric } from "metabase/lib/schema_metadata";
import {
  RowChart,
  RowChartProps,
} from "metabase/visualizations/components/RowChart";
import {
  getGroupedDataset,
  getSeries,
  trimData,
} from "metabase/visualizations/components/RowChart/utils/data";
import {
  getChartColumns,
  hasValidColumnsSelected,
} from "metabase/visualizations/lib/graph/columns";
import { getFormatters } from "metabase/visualizations/visualizations/RowChart/utils/format";
import { measureText } from "metabase/lib/measure-text";
import ExplicitSize from "metabase/components/ExplicitSize";
import {
  getClickData,
  getHoverData,
} from "metabase/visualizations/visualizations/RowChart/utils/events";
import { useChartSeries } from "metabase/visualizations/components/RowChart/hooks/use-chart-series";
import { getChartGoal } from "metabase/visualizations/lib/settings/goal";
import { getChartTheme } from "metabase/visualizations/components/RowChart/utils/theme";
import { getStackingOffset } from "metabase/visualizations/lib/settings/stacking";
import { getComputedSettingsForSeries } from "metabase/visualizations/lib/settings/visualization";
import {
  RowVisualizationRoot,
  RowChartContainer,
  RowChartLegendLayout,
} from "./RowChart.styled";
import { ChartSettingsError, MinRowsError } from "metabase/visualizations/lib/errors";
import LegendCaption from "metabase/visualizations/components/legend/LegendCaption";

type $FIXME = any;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const RowChartRenderer = ExplicitSize({
  wrapped: true,
  refreshMode: "throttle",
})((props: RowChartProps<any>) => (
  <RowChartContainer>
    <RowChart {...props} />
  </RowChartContainer>
));

// FIXME: fix the props type
interface RowChartVisualizationProps extends Record<string, any> {
  className: string;
  width: number;
  height: number;
  data: DatasetData;
  settings: VisualizationSettings;
  visualizationIsClickable: $FIXME;
  onVisualizationClick: $FIXME;
}

const RowChartVisualization = ({
  card,
  className,
  width,
  height,
  settings,
  data,
  visualizationIsClickable,
  onVisualizationClick,
  series: rawSeries,
  hovered,
  headerIcon,
  actionButtons,
  isFullscreen,
  isQueryBuilder,
  onHoverChange,
  onAddSeries,
  onRemoveSeries,
  showTitle,
  onChangeCardAndRun,
  onEditSeries,
  ...props
}: RowChartVisualizationProps) => {
  const { chartColumns, series, seriesColors } = useChartSeries(data, settings);

  const groupedData = useMemo(
    () => getGroupedDataset(data, chartColumns),
    [chartColumns, data],
  );
  const goal = useMemo(() => getChartGoal(settings), [settings]);
  const theme = useMemo(getChartTheme, []);
  const stackingOffset = getStackingOffset(settings);
  const shouldShowDataLabels =
    settings["graph.show_values"] && stackingOffset !== "expand";

  const tickFormatters = useMemo(
    () => getFormatters(chartColumns, settings),
    [chartColumns, settings],
  );

  const handleClick = (
    event: React.MouseEvent,
    seriesIndex: number,
    datumIndex: number,
  ) => {
    const clickData = getClickData(
      seriesIndex,
      datumIndex,
      series,
      groupedData,
      settings,
      chartColumns,
    );

    onVisualizationClick({ ...clickData, element: event.target });
  };

  const handleHover = (
    event: React.MouseEvent,
    seriesIndex: number | null,
    datumIndex: number | null,
  ) => {
    if (seriesIndex == null || datumIndex == null) {
      onHoverChange(null);
      return;
    }
    const hoverData = getHoverData(
      seriesIndex,
      datumIndex,
      series,
      groupedData,
      settings,
      chartColumns,
    );
    onHoverChange({
      ...hoverData,
      event: event.nativeEvent,
      element: event.target,
    });
  };

  const hoverData =
    hovered?.index != null
      ? {
          seriesIndex: hovered?.index,
          datumIndex: hovered?.datumIndex,
        }
      : null;

  // FIXME: settings axis are opposite
  const xLabel = settings["graph.y_axis.labels_enabled"]
    ? settings["graph.y_axis.title_text"]
    : undefined;
  const yLabel = settings["graph.x_axis.labels_enabled"]
    ? settings["graph.x_axis.title_text"]
    : undefined;


  const hasTitle = showTitle && settings["card.title"];
  const title = settings["card.title"] || card.name;
  const description = settings["card.description"];
  const canSelectTitle = !!onChangeCardAndRun;

  const handleSelectTitle = () => {
    if (onChangeCardAndRun) {
      onChangeCardAndRun({
        nextCard: card,
        seriesIndex: 0,
      });
    }
  };

  const handleSelectSeries = (event: any, index: number) => {
    const single = series[index];
    const hasBreakout = 'breakout' in chartColumns;

    if (onEditSeries && !hasBreakout) {
      onEditSeries(event, index);
    } 
  };

  return (
    <RowVisualizationRoot className={className}>
      {hasTitle && (
        <LegendCaption
          title={title}
          description={description}
          icon={headerIcon}
          actionButtons={actionButtons}
          onSelectTitle={canSelectTitle ? handleSelectTitle : undefined}
        />
      )}
      <RowChartLegendLayout
        hasLegend={series.length > 1}
        labels={series.map(s => s.seriesName)}
        actionButtons={!hasTitle ? actionButtons : undefined}
        colors={Object.values(seriesColors)}
        hovered={hovered}
        onHoverChange={onHoverChange}
        isFullscreen={isFullscreen}
        isQueryBuilder={isQueryBuilder}
        onSelectSeries={handleSelectSeries}
      >
        <RowChartRenderer
          className="flex-full"
          data={groupedData}
          trimData={trimData}
          series={series}
          seriesColors={seriesColors}
          goal={goal}
          theme={theme}
          stackingOffset={stackingOffset}
          shouldShowDataLabels={shouldShowDataLabels}
          tickFormatters={tickFormatters}
          measureText={measureText}
          hoveredData={hoverData}
          onClick={handleClick}
          onHover={handleHover}
          xLabel={xLabel}
          yLabel={yLabel}
          xScaleType={settings["graph.y_axis.scale"]}
        />
      </RowChartLegendLayout>
    </RowVisualizationRoot>
  );
};

RowChartVisualization.uiName = t`Row`;
RowChartVisualization.identifier = "row";
RowChartVisualization.iconName = "horizontal_bar";
RowChartVisualization.noun = t`row chart`;

RowChartVisualization.noHeader = true;
RowChartVisualization.supportsSeries = true;
RowChartVisualization.minSize = { width: 4, height: 3 };

const stackingSettings = {
  "stackable.stack_type": {
    section: t`Display`,
    title: t`Stacking`,
    widget: "radio",
    default: null,
    props: {
      options: [
        { name: t`Don't stack`, value: null },
        { name: t`Stack`, value: "stacked" },
        { name: t`Stack - 100%`, value: "normalized" },
      ],
    },
  },
};

RowChartVisualization.settings = {
  ...stackingSettings,
  "graph.show_values": {
    section: t`Display`,
    title: t`Show values on data points`,
    widget: "toggle",
    getHidden: (_series: any[], vizSettings: VisualizationSettings) =>
      vizSettings["stackable.stack_type"] === "normalized",
    default: false,
  },
  ...GRAPH_GOAL_SETTINGS,
  ...GRAPH_DATA_SETTINGS,
  ...GRAPH_AXIS_SETTINGS,
};

RowChartVisualization.isSensible = ({ cols, rows }: $FIXME) => {
  return (
    rows.length > 1 &&
    cols.length >= 2 &&
    cols.filter(isDimension).length > 0 &&
    cols.filter(isMetric).length > 0
  );
};

RowChartVisualization.isLiveResizable = (series: any[]) => {
  const totalRows = series.reduce((sum, s) => sum + s.data.rows.length, 0);
  return totalRows < 10;
};

// rename these settings
RowChartVisualization.settings["graph.metrics"] = {
  ...RowChartVisualization.settings["graph.metrics"],
  title: t`X-axis`,
};
RowChartVisualization.settings["graph.dimensions"] = {
  ...RowChartVisualization.settings["graph.dimensions"],
  title: t`Y-axis`,
};

/**
 * Required to make it compatible with series settings without rewriting them fully
 * It expands a single card + dataset into multiple "series" and sets _seriesKey which is needed for settings to work
 */
RowChartVisualization.transformSeries = (originalMultipleSeries: any) => {
  const [series] = originalMultipleSeries;
  const settings: any = getComputedSettingsForSeries(originalMultipleSeries);
  const { card, data } = series;

  if (series.card._transformed || !hasValidColumnsSelected(settings, data)) {
    return originalMultipleSeries;
  }

  const chartColumns = getChartColumns(data, settings);

  return getSeries(data, chartColumns)
    .map(s => s.seriesKey)
    .map(seriesKey => {
      const seriesCard = {
        ...card,
        name: seriesKey,
        _seriesKey: seriesKey,
        _transformed: true,
      };
      return { card: seriesCard, data };
    });
};

RowChartVisualization.checkRenderable = (series: $FIXME, settings: VisualizationSettings) => {
  if (!hasValidColumnsSelected(settings, series[0].data)) {
    throw new MinRowsError(1, 0);
  }

  const singleSeriesHasNoRows = ({ data: { cols, rows } }: $FIXME) => rows.length < 1;
  if (_.every(series, singleSeriesHasNoRows)) {
    throw new MinRowsError(1, 0);
  }

  const dimensions = (settings["graph.dimensions"] || []).filter(
    name => name,
  );
  const metrics = (settings["graph.metrics"] || []).filter(name => name);
  if (dimensions.length < 1 || metrics.length < 1) {
    throw new ChartSettingsError(
      t`Which fields do you want to use for the X and Y axes?`,
      { section: t`Data` },
      t`Choose fields`,
    );
  }
  const seriesOrder = (settings["graph.series_order"] || []).filter(
    series => series.enabled,
  );
  if (dimensions.length > 1 && seriesOrder.length === 0) {
    throw new ChartSettingsError(t`No breakouts are enabled`, {
      section: t`Data`,
    });
  }
}

RowChartVisualization. placeholderSeries = [
  {
    card: {
      display: "row",
      visualization_settings: {},
      dataset_query: { type: "null" },
    },
    data: {
      rows: _.range(0, 11).map(i => [i, i]),
      cols: [
        { name: "x", base_type: "type/Integer" },
        { name: "y", base_type: "type/Integer" },
      ],
    },
  },
];

export default RowChartVisualization;
