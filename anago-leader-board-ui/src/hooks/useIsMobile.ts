import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

/**
 * Returns true on phone-sized viewports (< 600px, MUI's `sm` breakpoint).
 * Used across pages to switch between the desktop teletext layout and a
 * reflowed mobile layout while keeping the retro aesthetic intact.
 */
const useIsMobile = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("sm"));
};

export default useIsMobile;
