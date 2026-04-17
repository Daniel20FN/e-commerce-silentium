import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FilesUploader } from "./files_uploader";
import type { DocumentType } from "./types";

jest.mock("@/components/dialog/dialog_context", () => ({
  useDialog: () => ({
    openDialog: jest.fn(),
  }),
}));

function createFile(id: string, fileName: string): DocumentType {
  return {
    id,
    fileName,
    size: 128,
    type: "image/png",
    url: `https://example.com/${fileName}`,
  };
}

const trads = {
  clean_all: "Limpiar todo",
  documents_preview: "Vista previa",
  drag_an_drop_files_or_click_to_select_them:
    "Arrastrá archivos o hacé click para seleccionarlos",
  drag_or_click_some_files_in_the_area: "Arrastrá o seleccioná archivos",
  drag_or_click_to_select: "Arrastrá o hacé click para seleccionar",
  download_file: "Descargar archivo",
  drop_files_here: "Soltá los archivos acá",
  file_upload_disabled: "Carga deshabilitada",
  move_file_backward: "Mover hacia atrás",
  move_file_forward: "Mover hacia adelante",
  not_selected_files: "No hay archivos seleccionados",
  primary_file: "Principal",
  remove_file: "Eliminar archivo",
  selected_files: "Archivos seleccionados",
  size: "Tamaño",
  supports_images_pdf_word_docs_and_txt: "Soporta imágenes, PDF, Word y TXT",
  this_file_type_is_not_permited: "Tipo de archivo no permitido",
  upload_documents: "Subir documentos",
};

describe("FilesUploader", () => {
  it("notifies parent with reordered files", async () => {
    const onFilesChange = jest.fn();
    const files = [
      createFile("first", "first.png"),
      createFile("second", "second.png"),
      createFile("third", "third.png"),
    ];

    render(
      <FilesUploader
        enableReorder
        initialFiles={files}
        multiple
        onFilesChange={onFilesChange}
        setFilesToDelete={jest.fn()}
        trads={trads}
      />,
    );

    fireEvent.click(screen.getByLabelText("Mover hacia adelante first.png"));

    await waitFor(() => {
      expect(onFilesChange).toHaveBeenCalledTimes(1);
    });

    const reorderedFiles = onFilesChange.mock.calls[0][0] as DocumentType[];
    expect(reorderedFiles.map((file) => file.id)).toEqual([
      "second",
      "first",
      "third",
    ]);
  });
});
