import {
  CancellableApi,
  useCancellableApi,
  UseCancellableApiOptions,
} from "@/hooks/use_cancellable_api";
import React, { createContext, ReactNode, useContext } from "react";

interface CancellableApiContextValue {
  cancellableApi: CancellableApi;
  abort: (id: string) => void;
  abortAll: () => void;
  isPending: (id: string) => boolean;
}

const CancellableApiContext = createContext<
  CancellableApiContextValue | undefined
>(undefined);

export const useCancellableApiContext = (): CancellableApiContextValue => {
  const context = useContext(CancellableApiContext);
  if (!context) {
    throw new Error(
      "useCancellableApiContext must be used within a CancellableApiProvider",
    );
  }
  return context;
};

interface CancellableApiProviderProps {
  children: ReactNode;
  options?: UseCancellableApiOptions;
}

export const CancellableApiProvider: React.FC<CancellableApiProviderProps> = ({
  children,
  options,
}) => {
  const { cancellableApi, abort, abortAll, isPending } =
    useCancellableApi(options);

  return (
    <CancellableApiContext.Provider
      value={{ cancellableApi, abort, abortAll, isPending }}
    >
      {children}
    </CancellableApiContext.Provider>
  );
};
