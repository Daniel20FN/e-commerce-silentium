import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  SxProps,
  Theme,
  Typography,
  useTheme,
} from "@mui/material";
import type React from "react";

export default function CustomAccordion({
  title,
  children,
  accordionSx,
  defaultExpanded,
  accordionOverflow,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  accordionSx?: SxProps<Theme> | undefined;
  defaultExpanded?: boolean;
  accordionOverflow?: "auto" | "clip" | "hidden" | "scroll" | "visible";
}) {
  const theme = useTheme();

  return (
    <Accordion
      defaultExpanded={defaultExpanded ?? true}
      variant="outlined"
      sx={{
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        overflow: accordionOverflow ?? "hidden",
        border: "1px solid #e0e0e0",
        "&:before": {
          display: "none",
        },
      }}
    >
      <AccordionSummary
        sx={{
          borderRadius: "8px 8px 0 0",
          background: "linear-gradient(to right, #f8f9fa, #e9ecef)",
          border: "none",
          borderBottom: "1px solid #dee2e6",
          minHeight: 56,
          "&:hover": {
            backgroundColor: "#f1f3f5",
          },
          "& .MuiAccordionSummary-content": {
            marginY: 0,
          },
          "& .Mui-expanded": {
            marginY: 0,
          },
        }}
        expandIcon={
          <ExpandMoreIcon
            sx={{
              color: theme.palette.primary.main,
              transition: "transform 0.3s ease",
            }}
          />
        }
        aria-controls="panel1-content"
        id="panel1-header"
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            component="span"
            variant="h6"
            sx={{
              fontWeight: 500,
              // color: theme.palette.primary.main,
              letterSpacing: "0.5px",
              fontSize: "1.1rem",
              textTransform: "capitalize",
              position: "relative",
              paddingBottom: "2px",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "40%",
                height: "2px",
                backgroundColor: "rgba(227, 60, 47, 0.3)",
                borderRadius: "1px",
              },
            }}
          >
            {title}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          padding: 3,
          backgroundColor: "#ffffff",
          ...accordionSx,
        }}
      >
        {children}
      </AccordionDetails>
    </Accordion>
  );
}
