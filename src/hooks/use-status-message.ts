import * as React from "react";
import { toast } from "sonner";

export function useStatusMessage() {
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  const reset = React.useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const setError = React.useCallback((message: string) => {
    setErrorMessage(message);
    setSuccessMessage("");
  }, []);

  const setSuccess = React.useCallback((message: string) => {
    setSuccessMessage(message);
    setErrorMessage("");
  }, []);

  // Show toast when error changes
  React.useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  // Show toast when success changes
  React.useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
    }
  }, [successMessage]);

  return {
    errorMessage,
    successMessage,
    reset,
    setError,
    setSuccess,
  };
}
