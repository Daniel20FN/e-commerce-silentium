import { Slide } from "@mui/material";
import * as React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { ActionMenuItem, DialogManager } from "./dialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomDialogConfig<TData = any> {
  id: string;
  title?: string;
  description?: string;
  content?:
    | ((props: {
        data: TData;
        setData: (data: TData | ((prev: TData) => TData)) => void;
        setLoading: React.Dispatch<React.SetStateAction<boolean>>;
        closeDialog: (
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          _event: {},
          reason?: "backdropClick" | "escapeKeyDown",
        ) => void;
      }) => ReactNode)
    | ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "fullWidth" | "fullScreen";
  variant?: "default" | "error" | "warning" | "info" | "success";
  position?: "center" | "top" | "bottom";
  showCloseButton?: boolean;
  actionsMenuButtons?: (props: {
    data: TData;
    setData: (data: TData | ((prev: TData) => TData)) => void;
    closeDialog: (
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      _event: {},
      reason?: "backdropClick" | "escapeKeyDown",
    ) => void;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  }) => ActionMenuItem[] | ActionMenuItem[];
  closable?: boolean;
  persistent?: boolean;
  backdrop?: "static" | "clickable" | "none";
  customActions?:
    | ((props: {
        data: TData;
        setData: (data: TData | ((prev: TData) => TData)) => void;
        closeDialog: (
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          _event: {},
          reason?: "backdropClick" | "escapeKeyDown",
        ) => void;
        setLoading: React.Dispatch<React.SetStateAction<boolean>>;
      }) => ReactNode)
    | ReactNode;
  onConfirm?: (props: {
    data: TData;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setData: (data: TData | ((prev: TData) => TData)) => void;
    closeDialog: (
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      _event: {},
      reason?: "backdropClick" | "escapeKeyDown",
    ) => void;
  }) => void | Promise<void>;
  onCancel?: (props: {
    data: TData;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setData: (data: TData | ((prev: TData) => TData)) => void;
    closeDialog: (
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      _event: {},
      reason?: "backdropClick" | "escapeKeyDown",
    ) => void;
  }) => void;
  onClose?: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  zIndex?: number;
  className?: string;
  contentClassName?: string;
  paperClassName?: string;
  disableEscapeKeyDown?: boolean;
  disableBackdropClick?: boolean;
  scroll?: "paper" | "body";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TransitionComponent?: React.ComponentType<any>;
  transitionDuration?: number | { enter?: number; exit?: number };
  data?: TData;
}

export interface CustomDialogContextType {
  dialogs: CustomDialogConfig[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openDialog: <TData = any>(
    config: Omit<CustomDialogConfig<TData>, "id">,
  ) => string;
  closeDialog: (id: string) => void;
}

const CustomDialogContext = createContext<CustomDialogContextType | undefined>(
  undefined,
);

export function useDialog() {
  const context = useContext(CustomDialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a CustomDialogProvider");
  }
  return context;
}

interface CustomDialogProviderProps {
  children: ReactNode;
  maxDialogs?: number;
  defaultSize?: CustomDialogConfig["size"];
  defaultPosition?: CustomDialogConfig["position"];
  defaultBackdrop?: CustomDialogConfig["backdrop"];
  baseZIndex?: number;
}

export const SlideTransition = (
  direction: "left" | "right" | "up" | "down" = "up",
) => {
  // Devuelve un componente que Slide entiende
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SlideComponent = (props: any) => (
    <Slide direction={direction} {...props} />
  );
  SlideComponent.displayName = `SlideTransition(${direction})`;
  return SlideComponent;
};

export const CustomDialogProvider = ({
  children,
}: CustomDialogProviderProps) => {
  const [dialogs, setDialogs] = useState<CustomDialogConfig[]>([]);

  const closeDialog = useCallback((id: string) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id);
      if (dialog?.onClose) {
        try {
          dialog.onClose();
        } catch (error) {
          console.error("Error in dialog onClose callback:", error);
        }
      }
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const openDialog = useCallback((config: Omit<CustomDialogConfig, "id">) => {
    const id = `custom-dialog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setDialogs((prev) => {
      const newDialog: CustomDialogConfig = {
        id,
        size: "md",
        variant: undefined,
        position: "center",
        backdrop: "none",
        showCloseButton: false,
        closable: true,
        persistent: false,
        confirmText: "Confirm",
        cancelText: "Cancel",
        loading: false,
        zIndex: 1 + prev.length * 10,
        scroll: "paper",
        disableEscapeKeyDown: false,
        disableBackdropClick: false,
        transitionDuration: 225,
        ...config,
      };

      return [...prev, newDialog];
    });

    return id;
  }, []);

  const value: CustomDialogContextType = {
    dialogs,
    openDialog,
    closeDialog,
  };

  return (
    <CustomDialogContext.Provider value={value}>
      {children}
      <DialogManager />
    </CustomDialogContext.Provider>
  );
};

// Helper hooks for common dialog patterns
export function useCustomDialogActions() {
  const { openDialog, closeDialog } = useDialog();

  const showConfirmDialog = useCallback(
    (options: {
      title: string;
      description?: string;
      onConfirm: () => void | Promise<void>;
      onCancel?: () => void;
      confirmText?: string;
      cancelText?: string;
    }) => {
      return openDialog({
        title: options.title,
        description: options.description,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
      });
    },
    [openDialog],
  );

  const showAlertDialog = useCallback(
    (options: {
      title: string;
      description?: string;
      variant?: CustomDialogConfig["variant"];
      onClose?: () => void;
    }) => {
      return openDialog({
        title: options.title,
        description: options.description,
        variant: options.variant,
        onConfirm: options.onClose || (() => {}),
        confirmText: "OK",
        onClose: options.onClose,
      });
    },
    [openDialog],
  );

  const showLoadingDialog = useCallback(
    (options: { title: string; description?: string }) => {
      return openDialog({
        title: options.title,
        description: options.description,
        persistent: true,
        showCloseButton: false,
        disableEscapeKeyDown: true,
        disableBackdropClick: true,
        content: (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          </div>
        ),
      });
    },
    [openDialog],
  );

  return {
    showConfirmDialog,
    showAlertDialog,
    showLoadingDialog,
    openDialog,
    closeDialog,
  };
}

export { DialogManager } from "./dialog";
