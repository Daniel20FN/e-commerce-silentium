import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import type { useWorkspaceGuard } from "../hooks/use_workspace_guard";

export function EditorGuardDialog({
  dictionary,
  guard,
}: {
  dictionary: Dictionary;
  guard: ReturnType<typeof useWorkspaceGuard>;
}) {
  const copy = dictionary.admin.products.workspace;
  if (guard.prompt === null) return null;
  return (
    <Dialog
      open={guard.prompt !== null}
      onClose={guard.stay}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {guard.prompt === "busy" ? copy.waitTitle : copy.discardTitle}
      </DialogTitle>
      <DialogContent>
        {guard.prompt === "busy" ? copy.waitBody : copy.discardBody}
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={guard.stay}>
          {copy.keep}
        </Button>
        {guard.prompt === "dirty" && (
          <Button onClick={guard.discard}>{copy.discard}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
