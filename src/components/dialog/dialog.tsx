import {
  Close as CloseIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  MoreVert,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { CustomDialogConfig, useDialog } from "./dialog_context";

interface DialogProps {
  dialog: CustomDialogConfig;
}

export interface ActionMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

// Variant configuration
const variantConfig = {
  default: {
    icon: InfoIcon,
    iconColor: "#1976d2",
    titleColor: "#1976d2",
  },
  error: {
    icon: ErrorIcon,
    iconColor: "#d32f2f",
    titleColor: "#d32f2f",
  },
  warning: {
    icon: WarningIcon,
    iconColor: "#ed6c02",
    titleColor: "#ed6c02",
  },
  info: {
    icon: InfoIcon,
    iconColor: "#0288d1",
    titleColor: "#0288d1",
  },
  success: {
    icon: SuccessIcon,
    iconColor: "#2e7d32",
    titleColor: "#2e7d32",
  },
};

export const CustomDialog = ({ dialog }: DialogProps) => {
  const { closeDialog } = useDialog();
  const [localData, setLocalData] = React.useState(dialog.data ?? {});
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loading, setLoading] = React.useState(false);

  const variant =
    dialog.variant != undefined ? variantConfig[dialog.variant] : undefined;
  const IconComponent = variant ? variant.icon : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSetData = (updater: any) => {
    const newData =
      typeof updater === "function" ? updater(localData) : updater;
    setLocalData(newData);
  };

  const handleClose = (
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    _event: {},
    reason?: "backdropClick" | "escapeKeyDown",
  ) => {
    if (dialog.persistent) return;
    if (reason === "backdropClick" && dialog.disableBackdropClick) return;
    if (reason === "escapeKeyDown" && dialog.disableEscapeKeyDown) return;
    if (!dialog.closable) return;

    closeDialog(dialog.id);
  };

  const handleConfirm = async () => {
    if (dialog.onConfirm) {
      try {
        await dialog.onConfirm({
          data: localData,
          setLoading: setLoading,
          closeDialog: handleClose,
          setData: handleSetData,
        });
      } catch (error) {
        console.error("Dialog confirm error:", error);
      }
    } else {
      closeDialog(dialog.id);
    }
  };

  const handleCancel = () => {
    if (dialog.onCancel) {
      try {
        dialog.onCancel({
          data: localData,
          setLoading: setLoading,
          closeDialog: handleClose,
          setData: handleSetData,
        });
      } catch (error) {
        console.error("Dialog cancel error:", error);
      }
    }
  };

  const TransitionComponent = dialog.TransitionComponent;

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      maxWidth={
        dialog.size != undefined &&
        dialog.size != "fullScreen" &&
        dialog.size != "fullWidth"
          ? dialog.size
          : "md"
      }
      fullWidth={
        dialog.size === "fullWidth" ||
        ["xs", "sm", "md", "lg", "xl"].includes(dialog.size ?? "")
      }
      fullScreen={dialog.size === "fullScreen"}
      scroll={dialog.scroll ?? "paper"}
      slots={{ transition: TransitionComponent }}
      transitionDuration={dialog.transitionDuration}
      disableEscapeKeyDown={dialog.disableEscapeKeyDown || dialog.persistent}
      className={dialog.className}
      slotProps={{
        paper: {
          className: dialog.paperClassName,
          style: { zIndex: dialog.zIndex },
        },
        backdrop: {
          style: {
            zIndex: (dialog.zIndex || 1300) - 1,
            backgroundColor:
              dialog.backdrop === "none" ? "transparent" : undefined,
          },
        },
      }}
      hideBackdrop={dialog.backdrop === "none"}
    >
      <Backdrop
        sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      {/* Dialog Title */}
      {(dialog.title || dialog.showCloseButton) && (
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: dialog.description ? 1 : 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {variant != undefined && IconComponent != undefined && (
              <IconComponent sx={{ color: variant.iconColor, fontSize: 24 }} />
            )}
            <Typography
              variant="h6"
              component="span"
              sx={{
                color: variant ? variant.titleColor : undefined,
                fontWeight: 600,
              }}
            >
              {dialog.title}
            </Typography>
          </Box>
          <Box display={"flex"}>
            {dialog.actionsMenuButtons && (
              <Box>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <MoreVert />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                  sx={{ "& .MuiPaper-root": { width: "auto" } }}
                >
                  <Box sx={{ px: 1, py: 1 }}>
                    {dialog
                      .actionsMenuButtons({
                        data: localData,
                        setData: handleSetData,
                        closeDialog: handleClose,
                        setLoading,
                      })
                      .map((ActionButton, index) => (
                        <Box
                          key={index}
                          sx={{ display: "flex", justifyContent: "flex-start" }}
                        >
                          <Tooltip title={ActionButton.label} placement="right">
                            <Button
                              color="inherit"
                              variant="text"
                              onClick={() => {
                                ActionButton.onClick?.();
                                setAnchorEl(null);
                              }}
                              startIcon={ActionButton.icon}
                              sx={{
                                justifyContent: "flex-start",
                                width: "100%",
                                textTransform: "none",
                              }}
                            >
                              {ActionButton.label}
                            </Button>
                          </Tooltip>
                        </Box>
                      ))}
                  </Box>
                </Menu>
              </Box>
            )}
            {dialog.showCloseButton &&
              dialog.closable !== false &&
              !dialog.persistent && (
                <IconButton
                  aria-label="close"
                  onClick={() => closeDialog(dialog.id)}
                  sx={{
                    color: (theme) => theme.palette.grey[500],
                  }}
                >
                  <CloseIcon />
                </IconButton>
              )}
          </Box>
        </DialogTitle>
      )}

      {/* Dialog Content */}
      <DialogContent
        className={dialog.contentClassName}
        sx={{
          pt: dialog.title ? (dialog.description ? 0 : 1) : 2,
        }}
      >
        {dialog.description && (
          <DialogContentText sx={{ mb: dialog.content ? 2 : 0 }}>
            {dialog.description}
          </DialogContentText>
        )}

        {typeof dialog.content === "function" ? (
          <Box>
            {dialog.content({
              data: localData,
              setData: handleSetData,
              setLoading: setLoading,
              closeDialog: handleClose,
            })}
          </Box>
        ) : (
          dialog.content && <Box> {dialog.content}</Box>
        )}
      </DialogContent>

      {/* Dialog Actions */}
      {(dialog.onConfirm || dialog.onCancel || dialog.customActions) && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {(dialog.customActions &&
            (typeof dialog.customActions === "function" ? (
              <Box width={"100%"}>
                {dialog.customActions({
                  data: localData,
                  setData: handleSetData,
                  closeDialog: handleClose,
                  setLoading: setLoading,
                })}
              </Box>
            ) : (
              <Box width={"100%"}>{dialog.customActions}</Box>
            ))) || (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: "flex-end",
                width: "100%",
              }}
            >
              {dialog.onCancel && (
                <Button
                  onClick={handleCancel}
                  disabled={dialog.loading}
                  variant="outlined"
                  color="inherit"
                >
                  {dialog.cancelText}
                </Button>
              )}

              {dialog.onConfirm && (
                <Button
                  onClick={handleConfirm}
                  disabled={dialog.loading}
                  variant="contained"
                  color={dialog.variant === "error" ? "error" : "primary"}
                  startIcon={
                    dialog.loading ? <CircularProgress size={16} /> : undefined
                  }
                >
                  {dialog.loading ? "Loading..." : dialog.confirmText}
                </Button>
              )}
            </Box>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default CustomDialog;

// Dialog Manager Component
export function DialogManager() {
  const { dialogs } = useDialog();

  return (
    <>
      {dialogs.map((dialog) => (
        <CustomDialog key={dialog.id} dialog={dialog} />
      ))}
    </>
  );
}
