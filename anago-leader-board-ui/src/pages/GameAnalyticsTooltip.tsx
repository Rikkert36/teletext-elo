import {
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Theme,
  FormControlLabel,
  Checkbox
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  ChartsReferenceLine,
  LineChart,
  useItemTooltip,
  ChartsTooltip,
} from "@mui/x-charts";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { GameWithAnalytics } from "../clients/server.generated";
import { makeStyles, createStyles } from "@mui/styles";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    chartTooltipAbove: {
      position: "relative",
      isolation: "isolate",
      "& .MuiChartsTooltip-root": {
        position: "absolute",
        zIndex: theme.zIndex.modal + 1, // > outer tooltip
        pointerEvents: "none",
      },
    },
    playerNames: {
      color: "#ffff00", // Yellow
      background: "black",
    },
  })
);

const deltaColor = "#ffff00";
const probColor = "cyan";

const scoreLabels = [
  "10-0",
  "10-1",
  "10-2",
  "10-3",
  "10-4",
  "10-5",
  "10-6",
  "10-7",
  "10-8",
  "10-9",
  "10-10",
  "9-10",
  "8-10",
  "7-10",
  "6-10",
  "5-10",
  "4-10",
  "3-10",
  "2-10",
  "1-10",
  "0-10",
];

type GameAnalyticsTooltipProps = {
  game: GameWithAnalytics;
};

function LoggingItemTooltip() {
  const tooltip = useItemTooltip();

  useEffect(() => {
    if (!tooltip) return;
    console.log("Hovered item:", tooltip);
  }, [tooltip]);

  return <ChartsTooltip />;
}

const toScore = (score: number) => {
  const team1Score = score <= 10 ? 10 : 10 - (score - 10);
  const team2Score = score >= 10 ? 10 : 10 - (10 - score);
  return `${team1Score}-${team2Score}`;
};

const GameAnalyticsTooltip: React.FC<GameAnalyticsTooltipProps> = ({
  game,
}) => {
  const classes = useStyles();
  const [showDelta, setShowDelta] = useState(false);
  const prob = game.probabilityPerScore![game.actualScore!]! * 100;
  const rounded = Math.round(prob * 100) / 100;
  return (
    <Grid
      container
      spacing={0.5}
      direction="column"
      style={{ minWidth: 450, maxWidth: 2000, background: "black" }}
    >
      <Grid item xs={7}>
        <Typography
          noWrap
          title={game.expectedScore?.toString() ?? ""}
          className={classes.playerNames}
          style={{ maxWidth: "100%" }}
        >
          Voorspelde uitslag:{" "}
          <span style={{ color: "cyan" }}>
            {toScore(game.expectedScore!) ?? ""}
          </span>
        </Typography>
      </Grid>
      <Grid item xs={5}>
        <Typography
          noWrap
          title={game.probabilityPerScore![game.actualScore!].toString() ?? ""}
          className={classes.playerNames}
          style={{ maxWidth: "100%" }}
        >
          Werkelijke uitslag: {toScore(game.actualScore!) + " -> "}kans:
          <span style={{ color: "cyan" }}> {rounded}%</span>
        </Typography>
      </Grid>
      <Grid item className={classes.chartTooltipAbove}>
        <Accordion className={classes.playerNames}>
          <AccordionSummary
            expandIcon={<ArrowDropDownIcon />}
            sx={{
              // move the icon to the left
              flexDirection: "row-reverse",
              "& .MuiAccordionSummary-expandIconWrapper": {
                color: "#ffff00",
                mr: 1, // space between icon and text
              },
              "& .MuiAccordionSummary-content": {
                ml: 0, // no extra left margin
                fontSize: "1.125rem", // make summary text bigger (~18px)
                fontWeight: 700, // optional: bolder
                color: "#ffff00",
              },
              minHeight: 40,
              "&.Mui-expanded": { minHeight: 40 },
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: "1.0rem", fontWeight: 100, color: "#ffff00" }}
            >
              Statistieken voor nerds
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <LineChart
              className={classes.chartTooltipAbove}
              height={400}
              width={600}
              margin={{ top: 16, right: 80, bottom: 28, left: 56 }}
              tooltip={{
                trigger: "axis",
                axisContent: () => (
                  <div style={{ padding: 8 }}>gdsgsdgsdgsdgdsg</div>
                ),
              }}
              onHighlightChange={(highlighted) => {
                console.log(highlighted);
                if (!highlighted || highlighted.dataIndex == null) return;

                const { seriesId, dataIndex } = highlighted;

                const xLabel = scoreLabels[dataIndex];

                const yValue =
                  seriesId === "pvId"
                    ? game.probabilityPerScore?.[dataIndex]
                    : seriesId === "dtpsId"
                    ? game.deltaPerScore?.[dataIndex]
                    : undefined;

                console.log({
                  seriesId,
                  dataIndex,
                  xLabel,
                  yValue,
                });
              }}
              slotProps={{
                legend: { hidden: true }, // <-- hides the legend
              }}
              xAxis={[
                {
                  data: scoreLabels, // 21 labels like '10-0', ...
                  scaleType: "point",
                  valueFormatter: (v) => v,
                  labelStyle: { fill: "#00ff00" }, // axis label color
                  tickLabelStyle: { fill: "#00ff00" },
                },
              ]}
              yAxis={[
                {
                  id: "prob-axis",
                  label: "Kans",
                  valueFormatter: (v) => `${Math.round(v * 100)}%`,
                  labelStyle: { fill: probColor }, // axis label color
                  tickLabelStyle: { fill: "#00ff00" }, // tick numbers color
                },
                ...(showDelta
                  ? [
                      {
                        id: "delta-axis",
                        position: "right" as const,
                        label: "Delta",
                        valueFormatter: (v: number) => v.toFixed(0),
                        labelStyle: { fill: deltaColor },
                        tickLabelStyle: { fill: "#00ff00" },
                      },
                    ]
                  : []),
              ]}
              sx={{
                ".MuiLineElement-series-pvId": {
                  strokeDasharray: "2 2", // Dashed line for the first series
                  stroke: probColor,
                },
                ".MuiLineElement-series-dtpsId": {
                  strokeDasharray: "2 2", // Dashed line for the first series
                  stroke: deltaColor,
                },
                "& .MuiPopper-root": {
                  stroke: "#ff0000", // Set vertical cursor line color
                  strokeWidth: 2, // Set line thickness
                  strokeDasharray: "4 2", // Optional: dashed line style
                },
                "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
                  fill: "#00ff00",
                },
                "& .MuiMarkElement-root": {
                  fill: "#ff0000", // Set the mark color (red in this case)
                },
                "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
                  fill: "#00ff00",
                },
                "& .MuiChartsAxis-bottom .MuiChartsAxis-line": {
                  stroke: "#00ff00",
                },
                "& .MuiChartsAxis-left .MuiChartsAxis-line": {
                  stroke: "#00ff00",
                },
                "& .MuiChartsAxis-right .MuiChartsAxis-line": {
                  stroke: "#00ff00",
                },
                "& .MuiChartsAxis-tick": {
                  stroke: "#00ff00",
                },
                ".MuiLineElement-series-pvMarker, .MuiLineElement-series-dtpsMarker":
                  { stroke: "transparent" },
              }}
              rightAxis={
                showDelta
                  ? {
                      axisId: "delta-axis",
                      position: "right" as const,
                      label: "Punten",
                      labelStyle: { fill: deltaColor },
                      tickLabelStyle: { fill: "#00ff00" },
                    }
                  : undefined
              }
              series={[
                {
                  id: "pvId",
                  label: "Probability",
                  data: game.probabilityPerScore, // length 21
                  curve: "natural",
                  showMark: false,
                  yAxisKey: "prob-axis",
                  color: probColor, // line color
                },
                ...(showDelta
                  ? [
                      {
                        id: "dtpsId",
                        label: "Delta",
                        data: game.deltaPerScore,
                        curve: "linear" as const,
                        showMark: false,
                        yAxisKey: "delta-axis",
                        color: deltaColor,
                      },
                    ]
                  : []),
              ]}
            >
              <ChartsReferenceLine
                x={scoreLabels[game.expectedScore!]} // or x={expectedIdx} if your X scale uses indices
                lineStyle={{
                  stroke: probColor,
                  strokeDasharray: "2 2",
                  strokeWidth: 1,
                }}
                labelStyle={{ fill: probColor }}
                labelAlign="start" // put label above the line (top)
              />
              <ChartsReferenceLine
                x={scoreLabels[game.actualScore!]} // or x={expectedIdx} if your X scale uses indices
                lineStyle={{
                  stroke: "#00ff00",
                  strokeDasharray: "3 2",
                  strokeWidth: 1,
                }}
                labelStyle={{ fill: "#00ff00" }}
                labelAlign="start" // put label above the line (top)
              />
            </LineChart>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showDelta}
                  onChange={(e) => setShowDelta(e.target.checked)}
                  sx={{
                    color: "#ffff00",
                    "&.Mui-checked": { color: "#ffff00" },
                  }}
                />
              }
              label="Toon Delta"
              sx={{ color: "#ffff00" }}
            />
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  );
};

export default GameAnalyticsTooltip;
