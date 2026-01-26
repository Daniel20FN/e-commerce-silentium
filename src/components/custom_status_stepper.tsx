import { useLanguage } from "@/dictionary/context/language_context";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepConnector, {
  stepConnectorClasses,
} from "@mui/material/StepConnector";
import { StepIconProps } from "@mui/material/StepIcon";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import { styled } from "@mui/material/styles";
import { Language } from "@prisma/client";
import * as React from "react";

export const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        "linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)",
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        "linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)",
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: "#eaeaf0",
    borderRadius: 1,
    ...theme.applyStyles("dark", {
      backgroundColor: theme.palette.grey[800],
    }),
  },
}));

export const ColorLibStepIconRoot = styled("div")<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme }) => ({
  backgroundColor: "#ccc",
  zIndex: 1,
  color: "#fff",
  width: 50,
  height: 50,
  display: "flex",
  borderRadius: "50%",
  justifyContent: "center",
  alignItems: "center",
  ...theme.applyStyles("dark", {
    backgroundColor: theme.palette.grey[700],
  }),
  transition: "transform 0.3s ease-in-out, background-image 0.3s ease-in-out",
  ":hover": {
    backgroundColor: "black",
    transform: "scale(1.2)",
  },
  variants: [
    {
      props: ({ ownerState }) => ownerState.active,
      style: {
        backgroundImage:
          "linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)",
        boxShadow: "0 4px 10px 0 rgba(0,0,0,.25)",
        transition:
          "transform 0.3s ease-in-out, background-image 0.3s ease-in-out",
        ":hover": {
          transform: "scale(1.2)",
          backgroundImage:
            "linear-gradient(136deg, rgb(255,180,0) 0%, rgb(255,120,0) 50%, rgb(200,80,0) 100%)",
        },
      },
    },
    {
      props: ({ ownerState }) => ownerState.completed,
      style: {
        backgroundImage:
          "linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)",
        transition:
          "transform 0.3s ease-in-out, background-image 0.3s ease-in-out",
        ":hover": {
          transform: "scale(1.2)",
          backgroundImage:
            "linear-gradient(136deg, rgb(0,150,136) 0%, rgb(0,200,180) 50%, rgb(0,250,200) 100%)",
        },
      },
    },
  ],
}));

function ColorLibStepIcon<T extends string>({
  icon,
  active,
  completed,
  className,
  enabled,
  icons,
  steps,
}: StepIconProps & {
  enabled: boolean;
  icons: Record<T, React.ReactElement>;
  steps: T[];
}) {
  // el tipo icon entra como React.ReactNode pero realmente entra como number, es un error de MUI
  const stepKey = steps[Number(icon) - 1] as T;

  return (
    <ColorLibStepIconRoot
      ownerState={{ completed, active }}
      className={className}
      sx={{ cursor: enabled ? "pointer" : "default" }}
    >
      {icons[stepKey] ?? null}
    </ColorLibStepIconRoot>
  );
}

export default function CustomStatusStepper<T extends string>({
  steps,
  status,
  setStatus,
  icons,
  translationKey,
  enabled,
}: {
  steps: T[];
  status: T | null;
  setStatus: (newStatus: T) => void;
  icons: Record<T, React.ReactElement>;
  translationKey: Record<T, Record<Language, string>>;
  enabled: boolean;
}) {
  const lang = useLanguage();

  return (
    <Stack sx={{ width: "100%" }} spacing={4}>
      <Stepper
        alternativeLabel
        activeStep={status == null ? undefined : steps.indexOf(status as T)}
        connector={<ColorlibConnector />}
      >
        {steps.map((step) => (
          <Step key={step}>
            <StepLabel
              slots={{
                stepIcon: (props) => (
                  <ColorLibStepIcon
                    steps={steps}
                    {...props}
                    enabled={enabled}
                    icons={icons}
                  />
                ),
              }}
              onClick={() => {
                if (enabled) setStatus(step);
              }}
            >
              {translationKey[step][lang.language] || step}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Stack>
  );
}
