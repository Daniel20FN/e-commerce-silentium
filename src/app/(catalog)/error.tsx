"use client";
import { getDictionary } from "@/dictionary/services/get-dictionary";
import { Button, Container, Stack, Typography } from "@mui/material";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const copy = getDictionary("es").storefront;
  return (
    <Container maxWidth="md">
      <Stack role="alert" spacing={3}>
        <Typography component="h1" variant="h4">
          {copy.errorTitle}
        </Typography>
        <Typography>{copy.errorBody}</Typography>
        <Button onClick={reset}>{copy.retry}</Button>
      </Stack>
    </Container>
  );
}
