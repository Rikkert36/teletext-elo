import React, { useRef, useState } from "react";
import { ClickAwayListener, Popper, Modal, IconButton } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { GameWithAnalytics } from "../clients/server.generated";
import GameAnalyticsTooltip from "./GameAnalyticsTooltip";
import useIsMobile from "../hooks/useIsMobile";

type Props = {
  game: GameWithAnalytics;
  children: React.ReactNode;
};

const BORDER_W = 2;
const GREEN = "#00ff00";

// Strips the match card's own horizontal indent so, inside the sheet, the names
// and score line up with the summary text and chart edges. Scoped to the sheet
// only — the games list keeps its original card padding untouched.
const useStyles = makeStyles({
  sheetCardReset: {
    "& > .MuiPaper-root": { paddingLeft: 0, paddingRight: 0 },
    // teamNamesMobile (first child of each team row) — drop its left pad
    "& > .MuiPaper-root > div > div:first-child": { paddingLeft: 0 },
    // matchScoreMobile (last child of each team row) — drop its right margin
    "& > .MuiPaper-root > div > div:last-child": { marginRight: 0 },
  },
});

const GameAnalyticsTooltipWrapper: React.FC<Props> = ({ game, children }) => {
  const classes = useStyles();
  const isMobile = useIsMobile();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const openNow = () => setOpen(true);
  const closeNow = () => setOpen(false);

  // On touch devices hover doesn't work — tap the match to open a full-screen sheet.
  if (isMobile) {
    return (
      <>
        <div onClick={openNow} style={{ display: "block", cursor: "pointer" }}>
          {children}
        </div>
        <Modal
          open={open}
          onClose={closeNow}
          sx={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}
        >
          <div
            style={{
              width: "100vw",
              height: "100vh",
              backgroundColor: "black",
              border: `${BORDER_W}px solid ${GREEN}`,
              boxSizing: "border-box",
              overflowY: "auto",
              padding: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: GREEN, fontSize: "1.1rem" }}>
                {(() => {
                  const d = game.createdAt?.toLocaleDateString("nl-NL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  });
                  return d ? d.charAt(0).toUpperCase() + d.slice(1) : "";
                })()}
              </span>
              <IconButton onClick={closeNow} style={{ color: GREEN, fontSize: "1.5rem" }}>
                ✕
              </IconButton>
            </div>
            <div
              className={classes.sheetCardReset}
              style={{
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: `1px solid ${GREEN}`,
              }}
            >
              {children}
            </div>
            <GameAnalyticsTooltip game={game} />
          </div>
        </Modal>
      </>
    );
  }

  return (
    <ClickAwayListener onClickAway={closeNow}>
      <div
        ref={anchorRef}
        onMouseEnter={openNow}
        onMouseLeave={closeNow}
        style={{ display: "block" }}
      >
        {/* Children frame */}
        <div
          style={{
            border: `${BORDER_W}px solid ${open ? GREEN : "transparent"}`,
            borderRadius: 4,
            boxSizing: "border-box",
            
          }}
        >
          {children}
        </div>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom"
          disablePortal={false}
          modifiers={[
            // overlap by BORDER_W so the seam disappears
            { name: "offset", options: { offset: [0, -BORDER_W] } },
            { name: "preventOverflow", options: { padding: 100 } },
                { name: "computeStyles", options: { gpuAcceleration: false } },
          ]}
          style={{ zIndex: 10 }}
        >
          {({ placement }) => {
            const isBottom = placement.startsWith("bottom");
            const isTop = placement.startsWith("top");

            return (
              <div
                onMouseEnter={openNow}
                onMouseLeave={closeNow}
                style={{
                  maxWidth: "2000px",
                  minWidth: "300px",
                  backgroundColor: "black",
                  padding: "0.5rem 0.75rem",
                  boxSizing: "border-box",

                  // Full border, but remove the touching edge
                  border: `${BORDER_W}px solid ${GREEN}`,
                  borderTop: isBottom ? 0 : `${BORDER_W}px solid ${GREEN}`,
                  borderBottom: isTop ? 0 : `${BORDER_W}px solid ${GREEN}`,

                  // Make outer corners rounded, inner corners squared
                  borderRadius: 4,
                  borderTopLeftRadius: isBottom ? 0 : 4,
                  borderTopRightRadius: isBottom ? 0 : 4,
                  borderBottomLeftRadius: isTop ? 0 : 4,
                  borderBottomRightRadius: isTop ? 0 : 4,

                  overflow: "visible",
                  pointerEvents: "auto",
                }}
              >
                <GameAnalyticsTooltip game={game} />
              </div>
            );
          }}
        </Popper>
      </div>
    </ClickAwayListener>
  );
};

export default GameAnalyticsTooltipWrapper;
