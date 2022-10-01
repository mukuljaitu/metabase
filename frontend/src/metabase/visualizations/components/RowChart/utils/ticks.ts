import { ChartTheme } from "../types";
import { XScaleType } from "./scale";

export const getXTicksCount = (
  theme: ChartTheme,
  innerWidth: number,
  xScaleType: XScaleType = "linear",
) => {
  if (xScaleType !== "linear") {
    // FIXME: calculate ticks ahead of time
    return 4;
  }
  return Math.max(2, Math.floor(innerWidth / theme.axis.minTicksInterval));
};
