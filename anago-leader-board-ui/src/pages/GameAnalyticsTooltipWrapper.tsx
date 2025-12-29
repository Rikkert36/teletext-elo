import React, { useRef, useState } from "react";
import { ClickAwayListener, Popper } from "@mui/material";
import { GameWithAnalytics } from "../clients/server.generated";
import GameAnalyticsTooltip from "./GameAnalyticsTooltip";

type Props = {
  game: GameWithAnalytics;
  children: React.ReactNode;
};

const BORDER_W = 2;
const GREEN = "#00ff00";

const GameAnalyticsTooltipWrapper: React.FC<Props> = ({ game, children }) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const openNow = () => setOpen(true);
  const closeNow = () => setOpen(false);

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
