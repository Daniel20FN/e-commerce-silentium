import type { DocumentType } from "@/components/files-uploader/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { AdminCategoriesPage } from "./admin_categories_page";

jest.mock("@/components/files-uploader/files_uploader", () => ({
  FilesUploader: ({
    initialFiles = [],
    onFilesChange,
    trads,
  }: {
    initialFiles?: DocumentType[];
    onFilesChange?: (files: DocumentType[]) => void;
    trads: { upload_documents: string };
  }) => (
    <div>
      <span>{trads.upload_documents}</span>
      {initialFiles.map((file) => (
        <span key={file.id}>{file.fileName}</span>
      ))}
      <button
        type="button"
        onClick={() =>
          onFilesChange?.([
            {
              fileName: "category.webp",
              id: "new-image",
              originalFile: new File(["image"], "category.webp", {
                type: "image/webp",
              }),
              size: 5,
              type: "image/webp",
              url: "blob:category",
            },
          ])
        }
      >
        Select category image
      </button>
    </div>
  ),
}));

const mockUploadAdminStorageImage = jest.fn();

jest.mock(
  "@/domains/admin/storage/services/upload_admin_storage_image",
  () => ({
    uploadAdminStorageImage: (...args: unknown[]) =>
      mockUploadAdminStorageImage(...args),
  }),
);

jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({
    rows,
    columns,
  }: {
    rows: Array<{ id: string; name?: string }>;
    columns: Array<{
      field: string;
      renderCell?: (params: {
        row: { id: string; name?: string };
      }) => ReactElement;
    }>;
  }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id}>
          <div>{row.name ?? row.id}</div>
          {columns
            .filter((column) => column.field === "actions" && column.renderCell)
            .map((column) => (
              <div key={`${row.id}-${column.field}`}>
                {column.renderCell?.({ row })}
              </div>
            ))}
        </div>
      ))}
    </div>
  ),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockAbort = jest.fn();

jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({
    cancellableApi: {
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      put: jest.fn(),
      delete: jest.fn(),
    },
    abort: mockAbort,
    abortAll: jest.fn(),
    isPending: () => false,
  }),
}));

jest.mock("notistack", () => ({
  enqueueSnackbar: jest.fn(),
}));

const dictionary = {
  admin: {
    categories: {
      title: "Categorías",
      description: "Gestioná jerarquías del catálogo",
      table: {
        columns: {
          name: "Nombre",
          slug: "Slug",
          hierarchy: "Jerarquía",
          status: "Estado",
          sortOrder: "Orden",
          trash: "Papelera",
          actions: "Acciones",
        },
        searchLabel: "Buscar categorías",
        searchPlaceholder: "Nombre o slug",
        statusFilter: "Estado",
        hierarchyFilter: "Jerarquía",
        allStatuses: "Todos",
        allHierarchy: "Todos",
        onlyTrash: "Solo papelera",
        clearFilters: "Limpiar filtros",
        noRows: "Sin categorías",
      },
      actions: {
        create: "Crear categoría",
        edit: "Editar",
        sendToTrash: "Enviar a papelera",
        restore: "Restaurar",
        save: "Guardar",
        cancel: "Cancelar",
        imageUploader: {
          clean_all: "Limpiar imagen",
          documents_preview: "Vista previa",
          drag_an_drop_files_or_click_to_select_them: "Arrastr? imagen",
          drag_or_click_some_files_in_the_area: "Arrastr? o seleccion?",
          drag_or_click_to_select: "Arrastr? o hac? click",
          download_file: "Descargar",
          drop_files_here: "Solt? imagen",
          file_upload_disabled: "Carga deshabilitada",
          move_file_backward: "Mover atr?s",
          move_file_forward: "Mover adelante",
          not_selected_files: "Sin imagen",
          primary_file: "Principal",
          remove_file: "Eliminar imagen",
          selected_files: "Imagen seleccionada",
          size: "Tama?o",
          supports_images_pdf_word_docs_and_txt: "Soporta im?genes",
          this_file_type_is_not_permited: "Tipo no permitido",
          upload_documents: "Subir imagen",
        },
      },
      feedback: {
        loadError: "No pudimos cargar categorías",
      },
      status: {
        active: "Activa",
        inactive: "Inactiva",
      },
      hierarchy: {
        root: "Raíz",
        child: "Hija",
      },
      form: {
        createTitle: "Nueva categoría",
        editTitle: "Editar categoría",
        name: "Nombre",
        slug: "Slug",
        description: "Descripción",
        image: "Imagen de categor?a",
        parent: "Padre",
        noParent: "Sin categoría padre",
        sortOrder: "Orden",
        status: "Activa",
        seoTitle: "SEO title",
        seoDescription: "SEO description",
        save: "Guardar",
        cancel: "Cancelar",
        imageUploader: {
          clean_all: "Limpiar imagen",
          documents_preview: "Vista previa",
          drag_an_drop_files_or_click_to_select_them: "Arrastr? imagen",
          drag_or_click_some_files_in_the_area: "Arrastr? o seleccion?",
          drag_or_click_to_select: "Arrastr? o hac? click",
          download_file: "Descargar",
          drop_files_here: "Solt? imagen",
          file_upload_disabled: "Carga deshabilitada",
          move_file_backward: "Mover atr?s",
          move_file_forward: "Mover adelante",
          not_selected_files: "Sin imagen",
          primary_file: "Principal",
          remove_file: "Eliminar imagen",
          selected_files: "Imagen seleccionada",
          size: "Tama?o",
          supports_images_pdf_word_docs_and_txt: "Soporta im?genes",
          this_file_type_is_not_permited: "Tipo no permitido",
          upload_documents: "Subir imagen",
        },
      },
      formHelp: {
        description: "Texto corto",
        image: "La imagen se sube al guardar",
        name: "Nombre visible",
        parent: "Categor?a padre",
        seoDescription: "Descripci?n SEO",
        seoTitle: "T?tulo SEO",
        slug: "Se genera autom?ticamente",
        sortOrder: "Orden visual",
        status: "Estado operativo",
      },
      trashConfirm: {
        title: "Confirmar env?o a papelera",
        description:
          "Esta acci?n enviar? la categor?a a papelera y saldr? del listado operativo.",
        withProductsWarning: "Esta categor?a tiene productos asociados.",
        confirm: "Confirmar",
        cancel: "Cancelar",
      },
      bulk: {
        activate: "Activar selección",
        deactivate: "Desactivar selección",
        trash: "Papelera selección",
        restore: "Restaurar selección",
        report: "{success} exitosas, {failed} con error",
      },
    },
  },
  grid: {
    columns: "Columnas",
    filters: "Filtros",
    density: "Densidad",
  },
} as const;

describe("admin_categories_page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadAdminStorageImage.mockResolvedValue({
      publicUrl: "https://storage.example.com/category.webp",
    });
  });

  it("loads categories and applies filters from UI", async () => {
    mockGet.mockResolvedValue({
      items: [
        {
          id: "cat-1",
          name: "Ropa de cama",
          slug: "ropa-de-cama",
          description: "Textiles suaves para dormitorio",
          imageUrl: "https://example.com/ropa-de-cama.webp",
          parentId: null,
          parentName: null,
          isActive: true,
          inTrash: false,
          sortOrder: 10,
          seoTitle: "Ropa de cama Silentium",
          seoDescription: "Sabanas, fundas y acolchados premium",
          productsCount: null,
          createdAt: "2026-04-18T10:00:00.000Z",
          updatedAt: "2026-04-18T10:00:00.000Z",
        },
      ],
      total: 1,
      page: 0,
      pageSize: 10,
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "admin-categories-list",
        "/admin/categories",
        expect.objectContaining({
          page: 0,
          pageSize: 10,
          status: "all",
        }),
      );
    });

    fireEvent.change(screen.getByLabelText("Buscar categorías"), {
      target: { value: "ropa" },
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenLastCalledWith(
        "admin-categories-list",
        "/admin/categories",
        expect.objectContaining({
          search: "ropa",
        }),
      );
    });
  });

  it("shows load error when request fails", async () => {
    mockGet.mockRejectedValue(new Error("network_error"));

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("network_error");
    });
  });

  it("requests trash-only listing when toggle is enabled", async () => {
    mockGet.mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      pageSize: 10,
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(mockGet).toHaveBeenLastCalledWith(
        "admin-categories-list",
        "/admin/categories",
        expect.objectContaining({
          inTrash: true,
        }),
      );
    });
  });

  it("creates a category from modal form", async () => {
    mockGet.mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      pageSize: 10,
    });
    mockPost.mockResolvedValue({
      category: {
        id: "cat-2",
        name: "Fundas",
        slug: "fundas",
        parentId: null,
        parentName: null,
        isActive: true,
        inTrash: false,
        sortOrder: 20,
        productsCount: null,
        createdAt: "2026-04-18T10:00:00.000Z",
        updatedAt: "2026-04-18T10:00:00.000Z",
      },
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Fundas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "admin-categories-create",
        "/admin/categories",
        expect.objectContaining({
          name: "Fundas",
          slug: "fundas",
        }),
      );
    });

    expect(screen.getByLabelText("Slug")).toHaveValue("fundas");
    expect(screen.getByLabelText("Slug")).toBeDisabled();
  });

  it("uploads a selected category image before saving", async () => {
    mockGet.mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      pageSize: 10,
    });
    mockPost.mockResolvedValue({
      category: {
        id: "cat-2",
        name: "Fundas",
        slug: "fundas",
        description: null,
        imageUrl: "https://storage.example.com/category.webp",
        parentId: null,
        parentName: null,
        isActive: true,
        inTrash: false,
        sortOrder: 20,
        seoTitle: null,
        seoDescription: null,
        productsCount: null,
        createdAt: "2026-04-18T10:00:00.000Z",
        updatedAt: "2026-04-18T10:00:00.000Z",
      },
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.categories.actions.create,
      }),
    );
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Fundas" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Select category image" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockUploadAdminStorageImage).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: "fundas",
          scope: "category",
        }),
      );
    });
    expect(mockPost).toHaveBeenCalledWith(
      "admin-categories-create",
      "/admin/categories",
      expect.objectContaining({
        imageUrl: "https://storage.example.com/category.webp",
      }),
    );
  });

  it("loads parent options independently from visible rows", async () => {
    mockGet.mockImplementation((requestId: string) => {
      if (requestId === "admin-categories-parent-options") {
        return Promise.resolve({
          items: [
            {
              id: "cat-parent",
              name: "Dormitorio",
            },
          ],
        });
      }

      return Promise.resolve({
        items: [
          {
            id: "visible-row",
            name: "Visible Row",
            slug: "visible-row",
            description: null,
            imageUrl: null,
            parentId: null,
            parentName: null,
            isActive: true,
            inTrash: false,
            sortOrder: 1,
            seoTitle: null,
            seoDescription: null,
            productsCount: null,
            createdAt: "2026-04-18T10:00:00.000Z",
            updatedAt: "2026-04-18T10:00:00.000Z",
          },
        ],
        total: 0,
        page: 0,
        pageSize: 10,
      });
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.categories.actions.create,
      }),
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "admin-categories-parent-options",
        "/admin/categories/parent-options",
      );
    });
    expect(mockGet).not.toHaveBeenCalledWith(
      "admin-categories-parent-options",
      "/admin/categories",
      expect.anything(),
    );

    fireEvent.mouseDown(
      screen.getByRole("combobox", {
        name: dictionary.admin.categories.form.parent,
      }),
    );

    expect(
      await screen.findByRole("option", { name: "Dormitorio" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Visible Row" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the current parent visible when it is missing from parent options", async () => {
    mockGet.mockImplementation((requestId: string) => {
      if (requestId === "admin-categories-parent-options") {
        return Promise.resolve({
          items: [
            {
              id: "available-parent",
              name: "Dormitorio",
            },
          ],
        });
      }

      return Promise.resolve({
        items: [
          {
            id: "cat-1",
            name: "Ropa de cama",
            slug: "ropa-de-cama",
            description: null,
            imageUrl: null,
            parentId: "archived-parent",
            parentName: "ColecciÃ³n archivada",
            isActive: true,
            inTrash: false,
            sortOrder: 10,
            seoTitle: null,
            seoDescription: null,
            productsCount: null,
            createdAt: "2026-04-18T10:00:00.000Z",
            updatedAt: "2026-04-18T10:00:00.000Z",
          },
        ],
        total: 1,
        page: 0,
        pageSize: 10,
      });
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: dictionary.admin.categories.actions.edit,
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.categories.actions.edit,
      }),
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "admin-categories-parent-options",
        "/admin/categories/parent-options",
      );
    });

    const parentSelect = screen.getByRole("combobox", {
      name: dictionary.admin.categories.form.parent,
    });

    expect(parentSelect).toHaveTextContent("ColecciÃ³n archivada");

    fireEvent.mouseDown(parentSelect);

    expect(
      await screen.findByRole("option", { name: "ColecciÃ³n archivada" }),
    ).toBeInTheDocument();
  });

  it("edits an existing category from row action", async () => {
    mockGet.mockResolvedValue({
      items: [
        {
          id: "cat-1",
          name: "Ropa de cama",
          slug: "ropa-de-cama",
          description: "Textiles suaves para dormitorio",
          imageUrl: "https://example.com/ropa-de-cama.webp",
          parentId: null,
          parentName: null,
          isActive: true,
          inTrash: false,
          sortOrder: 10,
          seoTitle: "Ropa de cama Silentium",
          seoDescription: "Sabanas, fundas y acolchados premium",
          productsCount: null,
          createdAt: "2026-04-18T10:00:00.000Z",
          updatedAt: "2026-04-18T10:00:00.000Z",
        },
      ],
      total: 1,
      page: 0,
      pageSize: 10,
    });
    mockPatch.mockResolvedValue({
      category: {
        id: "cat-1",
        name: "Ropa de cama premium",
        slug: "ropa-de-cama",
        parentId: null,
        parentName: null,
        isActive: true,
        inTrash: false,
        sortOrder: 10,
        productsCount: null,
        createdAt: "2026-04-18T10:00:00.000Z",
        updatedAt: "2026-04-18T10:00:00.000Z",
      },
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Editar" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(
      screen.getByLabelText(dictionary.admin.categories.form.description),
    ).toHaveValue("Textiles suaves para dormitorio");
    expect(screen.getByText("ropa-de-cama-image")).toBeInTheDocument();
    expect(
      screen.getByLabelText(dictionary.admin.categories.form.seoTitle),
    ).toHaveValue("Ropa de cama Silentium");
    expect(
      screen.getByLabelText(dictionary.admin.categories.form.seoDescription),
    ).toHaveValue("Sabanas, fundas y acolchados premium");

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Ropa de cama premium" },
    });
    expect(screen.getByLabelText("Slug")).toHaveValue("ropa-de-cama-premium");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        "admin-categories-edit-cat-1",
        "/admin/categories/cat-1",
        expect.objectContaining({
          name: "Ropa de cama premium",
          slug: "ropa-de-cama-premium",
        }),
      );
    });
  });

  it("requires confirmation before sending category to trash", async () => {
    mockGet.mockResolvedValue({
      items: [
        {
          id: "cat-1",
          name: "Ropa de cama",
          slug: "ropa-de-cama",
          parentId: null,
          parentName: null,
          isActive: true,
          inTrash: false,
          sortOrder: 10,
          productsCount: 3,
          createdAt: "2026-04-18T10:00:00.000Z",
          updatedAt: "2026-04-18T10:00:00.000Z",
        },
      ],
      total: 1,
      page: 0,
      pageSize: 10,
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Enviar a papelera" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Enviar a papelera" }));

    expect(mockPost).not.toHaveBeenCalledWith(
      "admin-category-cat-1-toggle-trash",
      "/admin/categories/cat-1/trash",
      {},
    );
    expect(
      screen.getByText(dictionary.admin.categories.trashConfirm.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        dictionary.admin.categories.trashConfirm.withProductsWarning,
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.categories.trashConfirm.confirm,
      }),
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "admin-category-cat-1-toggle-trash",
        "/admin/categories/cat-1/trash",
        {},
      );
    });
  });

  it("resets combined filters when clear filters is clicked", async () => {
    mockGet.mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      pageSize: 10,
    });

    render(<AdminCategoriesPage dictionary={dictionary as never} />);

    fireEvent.change(screen.getByLabelText("Buscar categorías"), {
      target: { value: "sabanas" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(mockGet).toHaveBeenLastCalledWith(
        "admin-categories-list",
        "/admin/categories",
        expect.objectContaining({
          search: "sabanas",
          inTrash: true,
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenLastCalledWith(
        "admin-categories-list",
        "/admin/categories",
        expect.objectContaining({
          search: "",
          status: "all",
          hierarchy: "all",
          inTrash: false,
          page: 0,
        }),
      );
    });
  });
});
