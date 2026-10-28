"use client";
import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { LEGAL_VERSION } from "../services/legal_release";
import type { LegalUiCopy } from "../services/legal_ui_copy";
import type {
  LegalPreferencesData,
  LegalPreferencesParams,
  LegalPreferencesResponse,
} from "../types/api_params";
import { ConsentFields } from "./consent_fields";

export function LegalSettings({ copy }: { copy: LegalUiCopy }) {
  const { cancellableApi } = useCancellableApiContext();
  const [data, setData] = useState<LegalPreferencesData | null>(null);
  const [acceptance, setAcceptance] = useState({
    acceptTerms: false,
    acceptPrivacy: false,
    adult: false,
  });
  const [emails, setEmails] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const flight = useRef(false);
  const request = useRef<string | null>(null);
  const text = copy.settings;
  useEffect(() => {
    let active = true;
    void cancellableApi
      .get<LegalPreferencesResponse, undefined>(
        "legal-preferences",
        "/account/legal",
      )
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setEmails(result.acceptsMarketingEmails);
        setWhatsapp(result.acceptsWhatsAppMarketing);
      })
      .catch(() => {
        if (active) setFeedback("error");
      });
    return () => {
      active = false;
    };
  }, [cancellableApi]);
  async function save(withdraw = false): Promise<void> {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setFeedback(null);
    request.current ??= crypto.randomUUID();
    try {
      const result = await cancellableApi.patch<
        LegalPreferencesResponse,
        LegalPreferencesParams
      >("legal-save", "/account/legal", {
        ...(withdraw
          ? { acceptTerms: false, acceptPrivacy: false, adult: false }
          : acceptance),
        legalVersion: LEGAL_VERSION,
        acceptsMarketingEmails: withdraw ? false : emails,
        acceptsWhatsAppMarketing: withdraw ? false : whatsapp,
        requestId: request.current,
      });
      if (!result) throw new Error("legal_save_failed");
      setData(result);
      setEmails(result.acceptsMarketingEmails);
      setWhatsapp(result.acceptsWhatsAppMarketing);
      setFeedback("saved");
      setAcceptance({ acceptTerms: false, acceptPrivacy: false, adult: false });
      request.current = null;
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
      flight.current = false;
    }
  }
  return (
    <Container maxWidth="md" sx={{ pb: 6 }}>
      <Box
        component="section"
        aria-labelledby="legal-settings-title"
        sx={{ borderTop: 1, borderColor: "divider", pt: 4 }}
      >
        <Stack spacing={2}>
          <Typography id="legal-settings-title" component="h2" variant="h5">
            {text.title}
          </Typography>
          <Typography color="text.secondary">{text.intro}</Typography>
          {feedback && (
            <Alert severity={feedback === "error" ? "error" : "success"}>
              {text[feedback]}
            </Alert>
          )}
          {!data ? (
            <Typography role="status">{text.loading}</Typography>
          ) : (
            <>
              <Typography>
                {data.currentAccepted ? text.accepted : text.review}
              </Typography>
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <Stack spacing={2}>
                  {!data.currentAccepted && (
                    <ConsentFields
                      copy={copy}
                      value={acceptance}
                      disabled={busy}
                      onChange={(key, checked) => {
                        request.current = null;
                        setAcceptance((previous) => ({
                          ...previous,
                          [key]: checked,
                        }));
                      }}
                    />
                  )}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={emails}
                        disabled={busy}
                        onChange={(event) => {
                          request.current = null;
                          setEmails(event.target.checked);
                        }}
                      />
                    }
                    label={copy.controls.email}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={whatsapp}
                        disabled={busy}
                        onChange={(event) => {
                          request.current = null;
                          setWhatsapp(event.target.checked);
                        }}
                      />
                    }
                    label={copy.controls.whatsapp}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button type="submit" variant="outlined" disabled={busy}>
                      {text.accept}
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      disabled={busy}
                      onClick={() => {
                        request.current = null;
                        void save(true);
                      }}
                    >
                      {text.withdraw}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </>
          )}
          <Link href="/api/account/legal/evidence">{text.history}</Link>
          <Link href="mailto:contacto@silentium-hogar.com">{text.rights}</Link>
        </Stack>
      </Box>
    </Container>
  );
}
