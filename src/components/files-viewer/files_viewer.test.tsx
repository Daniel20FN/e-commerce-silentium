import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CustomDialogProvider } from "../dialog/dialog_context";
import { FilesViewer } from "./files_viewer";
jest.mock("./files_view_box", () => ({ FileViewBox: () => null }));
it("opens and closes the shared preview for the order-derived principal", async () => {
  const copy = dictionary.admin.media.uploader;
  render(
    <CustomDialogProvider>
      <FilesViewer
        enableReorder
        onReorder={jest.fn()}
        files={[
          {
            id: "qa",
            fileName: "qa.png",
            url: "https://example.com/qa.png",
            size: 16,
            type: "image/png",
          },
        ]}
        trads={copy}
      />
    </CustomDialogProvider>,
  );
  expect(screen.getByText(copy.primary_file)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: copy.documents_preview }));
  expect(
    await screen.findByRole("dialog", { name: copy.documents_preview }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: copy.close }));
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: copy.documents_preview }),
    ).not.toBeInTheDocument(),
  );
});
