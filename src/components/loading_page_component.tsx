import {
  CircularProgress,
  CssBaseline,
  GlobalStyles,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";

export const LoadingPageComponent = (props: { text: string }) => {
  return (
    <React.Fragment key="loading-page">
      <GlobalStyles
        styles={{ ul: { margin: 0, padding: 0, listStyle: "none" } }}
      />
      <CssBaseline />

      <Stack
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={4}
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      >
        <CircularProgress key="loading-page-circular-progress" size={45} />
        <Typography>{props.text}</Typography>
      </Stack>
    </React.Fragment>
  );
};
