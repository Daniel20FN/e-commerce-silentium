import spanish from "@/dictionary/es.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { AdminProductsPage } from "./admin_products_page";
import { ProductFormDialog } from "./product_form_dialog";
import { ProductVariantEditor } from "./product_variant_editor";
import { VariantGenerationDialog } from "./variant_generation_dialog";

jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({
    rows,
    columns,
    onRowSelectionModelChange,
    onSortModelChange,
  }: {
    rows: Array<{ id: string; name?: string; [key: string]: unknown }>;
    columns: Array<{
      field: string;
      valueGetter?: (
        value: unknown,
        row: { id: string; name?: string; [key: string]: unknown },
      ) => string;
      renderCell?: (params: {
        row: { id: string; name?: string; [key: string]: unknown };
      }) => ReactElement;
    }>;
    onRowSelectionModelChange?: (model: { ids: Set<string> }) => void;
    onSortModelChange?: (
      model: Array<{ field: string; sort: "asc" | "desc" }>,
    ) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onSortModelChange?.([{ field: "name", sort: "asc" }])}
      >
        Sort products by name asc
      </button>
      <button
        type="button"
        onClick={() =>
          onRowSelectionModelChange?.({
            ids: new Set(rows.map((row) => row.id)),
          })
        }
      >
        Select all products
      </button>
      {rows.map((row) => (
        <div key={row.id}>
          <div>{row.name ?? row.id}</div>
          {columns
            .filter((column) => column.field !== "actions")
            .map((column) => (
              <span key={`${row.id}-${column.field}`}>
                {column.valueGetter?.(row[column.field], row) ??
                  String(row[column.field] ?? "")}
              </span>
            ))}
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
const mockPut = jest.fn();
const mockPatch = jest.fn();
const mockAbort = jest.fn();
const mockEnqueueSnackbar = jest.fn();

const mockApi = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  patch: mockPatch,
  delete: jest.fn(),
};
const mockContextValue = {
  cancellableApi: mockApi,
  abort: mockAbort,
  abortAll: jest.fn(),
  isPending: () => false,
};
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => mockContextValue,
}));

jest.mock("notistack", () => ({
  enqueueSnackbar: (...args: unknown[]) => mockEnqueueSnackbar(...args),
}));

const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => new URLSearchParams(),
}));

const dictionary = {
  admin: {
    costs: spanish.admin.costs,
    media: spanish.admin.media,
    products: {
      workspace: spanish.admin.products.workspace,
      title: "Productos",
      description: "Gestioná productos y variantes del catálogo.",
      table: {
        ...spanish.admin.products.table,
        columns: {
          name: "Producto",
          slug: "Slug",
          status: "Estado",
          brand: "Marca",
          categories: "Categorías",
          variants: "Variantes",
          sellable: "Vendibles",
          warnings: "Alertas",
          trash: "Papelera",
          actions: "Acciones",
        },
        searchLabel: "Buscar productos",
        searchPlaceholder: "Nombre, slug o marca",
        statusFilter: "Estado",
        allStatuses: "Todos los estados",
        categoryFilter: "Categoría",
        brandFilter: "Marca",
        featuredFilter: "Destacado",
        featuredAll: "Todos",
        featuredYes: "Destacados",
        featuredNo: "No destacados",
        onlyTrash: "Solo papelera",
        clearFilters: "Limpiar filtros",
        noRows: "No encontramos productos",
        results: "Resultados",
        trashYes: "Sí",
        trashNo: "No",
      },
      status: {
        draft: "Borrador",
        active: "Activo",
        inactive: "Inactivo",
        archived: "Archivado",
      },
      actions: {
        create: "Crear producto",
        edit: "Editar",
        variants: "Variantes",
        generateVariants: "Generar variantes",
        sendToTrash: "Enviar a papelera",
        restore: "Restaurar",
        archive: "Archivar",
      },
      bulk: {
        trash: "Enviar selección a papelera",
        restore: "Restaurar selección",
        archive: "Archivar selección",
        report: "{success} procesados, {failed} con error",
      },
      form: {
        createTitle: "Nuevo producto",
        editTitle: "Editar producto",
        name: "Nombre",
        slug: "Slug",
        shortDescription: "Descripción corta",
        longDescription: "Descripción larga",
        brand: "Marca",
        seoTitle: "SEO title",
        seoDescription: "SEO description",
        featured: "Producto destacado",
        status: "Estado",
        categories: "Categorías asociadas",
        primaryCategory: "Categoría principal",
        options: "Opciones",
        save: "Guardar",
        cancel: "Cancelar",
      },
      formHelp: {
        slug: "Se genera automáticamente desde el nombre.",
        categories: "Buscá y elegí categorías.",
        primaryCategory: "Elegí una de las categorías asociadas.",
      },
      options: {
        name: "Nombre de la opción",
        value: "Valor",
        addOption: "Agregar opción",
        addValue: "Agregar valor",
        removeOption: "Eliminar opción",
        removeValue: "Eliminar valor",
        moveUp: "Mover opción hacia arriba",
        moveDown: "Mover opción hacia abajo",
        moveValueUp: "Mover valor hacia arriba",
        moveValueDown: "Mover valor hacia abajo",
        empty: "Todavía no hay opciones.",
        locked: "Estas opciones ya se usan en variantes.",
      },
      variants: {
        ...spanish.admin.products.variants,
        title: "Variantes",
        description: "SKU, precio y stock viven en la variante.",
        sku: "SKU",
        priceCents: "Precio en centavos",
        compareAtPriceCents: "Precio anterior en centavos",
        stock: "Stock",
        active: "Activa",
        isDefault: "Predeterminada",
        displayOrder: "Orden",
        dimensions: "Peso y medidas",
        create: "Crear variante",
        update: "Actualizar variante",
        edit: "Editar variante",
        cancelEdit: "Cancelar edición",
        empty: "Todavía no hay variantes cargadas en esta sesión.",
        stockZeroLabel: "Stock 0",
        stockZeroWarning: "Stock 0: visible en admin, no vendible en tienda.",
        sellable: "Vendible",
        notSellable: "No vendible",
      },
      generation: {
        title: "Generar variantes",
        options: "Opciones para combinar",
        optionsHelp: "Elegí las características.",
        preview: "Previsualizar combinaciones",
        previewTitle: "Combinaciones a crear",
        duplicateTitle: "Duplicadas omitidas",
        skuPrefix: "Prefijo SKU",
        priceCents: "Precio base en centavos",
        stock: "Stock inicial",
        confirm: "Confirmar generación",
        cancel: "Cancelar",
        emptyPreview: "No hay combinaciones nuevas para crear.",
        confirmed: "Generación confirmada: {count} variantes creadas.",
      },
      warnings: {
        product_has_no_sellable_variants:
          "Producto activo sin variantes vendibles. No aparecerá en tienda.",
        product_category_required: "Asociá al menos una categoría activa.",
        product_primary_category_invalid:
          "La categoría principal debe estar asociada al producto.",
      },
      feedback: {
        ...spanish.admin.products.feedback,
        loadError: "No pudimos cargar productos.",
        loadCategoriesError: "No pudimos cargar categorías.",
        saveError: "No pudimos guardar el producto.",
        product_slug_conflict: "Ya existe un producto con ese slug.",
        product_category_required: "Asociá al menos una categoría activa.",
        product_primary_category_invalid:
          "La categoría principal debe estar asociada al producto.",
        product_options_locked_by_variants:
          "No podés cambiar opciones cuando ya existen variantes.",
        variant_sku_conflict: "Ya existe una variante con ese SKU.",
        variant_combination_conflict:
          "Ya existe una variante con esa combinación.",
        variant_compare_at_price_invalid:
          "El precio anterior debe ser mayor al precio actual.",
        record_not_found: "El producto ya no existe.",
      },
      trashConfirm: {
        title: "Confirmar envío a papelera",
        description: "El producto saldrá del listado operativo por defecto.",
        confirm: "Enviar a papelera",
        cancel: "Cancelar",
      },
      bulkConfirm: {
        title: "Confirmar acción masiva",
        description: "Vas a procesar {count} productos seleccionados.",
        confirm: "Confirmar",
        cancel: "Cancelar",
      },
    },
  },
  grid: {
    columns: "Columnas",
    filters: "Filtros",
    density: "Densidad",
  },
} as const;

const productWithoutSellableVariants = {
  id: "product-1",
  name: "Sábanas Premium",
  slug: "sabanas-premium",
  status: "active",
  inTrash: false,
  brand: "Silentium",
  featured: true,
  primaryCategory: {
    id: "cat-1",
    name: "Dormitorio",
    slug: "dormitorio",
    isPrimary: true,
  },
  categories: [
    {
      id: "cat-1",
      name: "Dormitorio",
      slug: "dormitorio",
      isPrimary: true,
    },
  ],
  variantCount: 2,
  sellableVariantCount: 0,
  hasSellableVariants: false,
  warnings: ["product_has_no_sellable_variants"],
  archivedAt: null,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-02T10:00:00.000Z",
};

const productDetail = {
  ...productWithoutSellableVariants,
  shortDescription: null,
  longDescription: null,
  seoTitle: null,
  seoDescription: null,
  optionsLocked: true,
  options: [
    {
      id: "option-size",
      name: "Tamaño",
      displayOrder: 0,
      values: [
        { id: "size-queen", value: "Queen", displayOrder: 0 },
        { id: "size-king", value: "King", displayOrder: 1 },
      ],
    },
    {
      id: "option-color",
      name: "Color",
      displayOrder: 1,
      values: [{ id: "color-white", value: "Blanco", displayOrder: 0 }],
    },
  ],
};

describe("admin_products_page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGet.mockImplementation((requestId: string) => {
      if (requestId === "admin-products-category-options") {
        return Promise.resolve({
          items: [{ id: "cat-1", name: "Dormitorio" }],
        });
      }
      if (requestId === "admin-product-detail-product-1") {
        return Promise.resolve({ product: productDetail });
      }
      return Promise.resolve({
        items: [productWithoutSellableVariants],
        total: 1,
        page: 0,
        pageSize: 10,
      });
    });
  });

  it("loads products and applies search, trash, and sort filters", async () => {
    render(<AdminProductsPage dictionary={dictionary as never} />);
    expect(
      screen.getByRole("region", { name: dictionary.admin.products.title }),
    ).toHaveStyle({ height: "620px" });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "admin-products-list",
        "/admin/products",
        expect.objectContaining({
          page: 0,
          pageSize: 10,
          status: "all",
          inTrash: false,
        }),
      );
    });

    fireEvent.change(screen.getByLabelText("Buscar productos"), {
      target: { value: "sábanas" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Solo papelera" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Sort products by name asc" }),
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "admin-products-list",
        "/admin/products",
        expect.objectContaining({
          search: "sábanas",
          inTrash: true,
          sortField: "name",
          sortDirection: "asc",
        }),
      );
    });
  });

  it("shows sellability warnings for active products without sellable variants", async () => {
    render(<AdminProductsPage dictionary={dictionary as never} />);

    expect(
      await screen.findByText(
        "Producto activo sin variantes vendibles. No aparecerá en tienda.",
      ),
    ).toBeInTheDocument();
  });

  it("requires confirmation before bulk trash and calls lifecycle routes per selected product", async () => {
    mockPost.mockResolvedValue({ product: productWithoutSellableVariants });

    render(<AdminProductsPage dictionary={dictionary as never} />);

    await screen.findAllByText("Sábanas Premium");
    fireEvent.click(
      screen.getByRole("button", { name: "Select all products" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.products.bulk.trash,
      }),
    );

    expect(mockPost).not.toHaveBeenCalledWith(
      "admin-products-bulk-trash-product-1",
      "/admin/products/product-1/trash",
      {},
    );
    expect(
      screen.getByText(dictionary.admin.products.bulkConfirm.title),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.products.bulkConfirm.confirm,
      }),
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "admin-products-bulk-trash-product-1",
        "/admin/products/product-1/trash",
        {},
      );
    });
  });

  it("previews combinations and confirms variant generation explicitly", async () => {
    mockPost.mockImplementation((requestId: string) => {
      if (requestId === "admin-products-generate-preview-product-1") {
        return Promise.resolve({
          combinations: [
            {
              optionValueIds: ["size-queen", "color-white"],
              optionCombinationKey: "color-white:size-queen",
              label: "Tamaño: Queen / Color: Blanco",
            },
          ],
          duplicateCombinations: [
            {
              optionValueIds: ["size-king", "color-white"],
              optionCombinationKey: "size-king:color-white",
              label: "Tamaño: King / Color: Blanco",
            },
          ],
        });
      }

      return Promise.resolve({ product: productWithoutSellableVariants });
    });
    mockPut.mockResolvedValue({
      created: [
        {
          id: "variant-1",
          productId: "product-1",
          sku: "SIL-1",
          priceCents: 10000,
          compareAtPriceCents: null,
          stock: 5,
          active: true,
          isDefault: true,
          displayOrder: 0,
          weightGrams: null,
          widthMm: null,
          heightMm: null,
          lengthMm: null,
          optionValues: [
            {
              optionId: "option-size",
              optionName: "Tamaño",
              optionValueId: "size-queen",
              optionValue: "Queen",
            },
          ],
          inTrash: false,
          createdAt: "2026-06-01T10:00:00.000Z",
          updatedAt: "2026-06-01T10:00:00.000Z",
        },
      ],
      skippedDuplicateCombinationKeys: [],
    });

    render(
      <VariantGenerationDialog
        dictionary={dictionary as never}
        open
        productId="product-1"
        productOptions={productDetail.options}
        onClose={jest.fn()}
        onGenerated={jest.fn()}
      />,
    );

    expect(
      await screen.findByRole("checkbox", { name: "Tamaño" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Color" })).toBeChecked();
    fireEvent.change(screen.getByLabelText("Prefijo SKU"), {
      target: { value: "SIL" },
    });
    fireEvent.change(screen.getByLabelText("Precio base en centavos"), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText("Stock inicial"), {
      target: { value: "5" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Previsualizar combinaciones" }),
    );

    expect(
      await screen.findByText("Tamaño: Queen / Color: Blanco"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tamaño: King / Color: Blanco"),
    ).toBeInTheDocument();
    expect(screen.queryByText("size-king:color-white")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar generación" }),
    );

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "admin-products-generate-confirm-product-1",
        "/admin/products/product-1/generate-variants",
        {
          variants: [
            expect.objectContaining({
              sku: "SIL-1",
              priceCents: 10000,
              stock: 5,
              optionValueIds: ["size-queen", "color-white"],
            }),
          ],
        },
      );
    });
    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
        "Generación confirmada: 1 variantes creadas.",
        { variant: "success" },
      ),
    );
  });
});

describe("product workspace entry", () => {
  it("keeps only edit and lifecycle row actions and opens the unified editor", async () => {
    jest.resetAllMocks();
    mockGet.mockImplementation((id: string) =>
      Promise.resolve(
        id === "admin-products-category-options"
          ? { items: [] }
          : { items: [productWithoutSellableVariants], total: 1 },
      ),
    );
    render(<AdminProductsPage dictionary={dictionary as never} />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(
      screen.queryByText(dictionary.admin.products.description),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Variantes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: dictionary.admin.products.actions.generateVariants,
      }),
    ).not.toBeInTheDocument();
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining(
        "/admin/productos/product-1?section=information&returnTo=",
      ),
    );
    expect(
      screen.queryByText(dictionary.admin.products.variants.empty),
    ).not.toBeInTheDocument();
  });
});

describe("product_variant_editor", () => {
  it("keeps stock-0 variants visible and labels them as non sellable", () => {
    render(
      <ProductVariantEditor
        dictionary={dictionary as never}
        productId="product-1"
        productOptions={productDetail.options}
        initialVariants={[
          {
            id: "variant-0",
            productId: "product-1",
            sku: "SIL-STOCK-0",
            priceCents: 12000,
            compareAtPriceCents: null,
            stock: 0,
            active: true,
            isDefault: false,
            displayOrder: 0,
            weightGrams: null,
            widthMm: null,
            heightMm: null,
            lengthMm: null,
            optionValues: [
              {
                optionId: "option-size",
                optionName: "Tamaño",
                optionValueId: "size-queen",
                optionValue: "Queen",
              },
            ],
            inTrash: false,
            createdAt: "2026-06-01T10:00:00.000Z",
            updatedAt: "2026-06-01T10:00:00.000Z",
          },
        ]}
        onVariantsChange={jest.fn()}
      />,
    );

    expect(screen.getByText("SIL-STOCK-0")).toBeInTheDocument();
    expect(screen.getByText("Stock 0")).toBeInTheDocument();
    expect(screen.getByText("No vendible")).toBeInTheDocument();
    expect(
      screen.getByText("Stock 0: visible en admin, no vendible en tienda."),
    ).toBeInTheDocument();
  });

  it("hydrates named selections for editing without exposing internal keys", () => {
    render(
      <ProductVariantEditor
        dictionary={dictionary as never}
        productId="product-1"
        productOptions={productDetail.options}
        initialVariants={[
          {
            id: "variant-1",
            productId: "product-1",
            sku: "SIL-QUEEN-WHITE",
            priceCents: 12000,
            compareAtPriceCents: null,
            stock: 4,
            active: true,
            isDefault: true,
            displayOrder: 0,
            weightGrams: null,
            widthMm: null,
            heightMm: null,
            lengthMm: null,
            optionValues: [
              {
                optionId: "option-size",
                optionName: "Tamaño",
                optionValueId: "size-queen",
                optionValue: "Queen",
              },
              {
                optionId: "option-color",
                optionName: "Color",
                optionValueId: "color-white",
                optionValue: "Blanco",
              },
            ],
            inTrash: false,
            createdAt: "2026-06-01T10:00:00.000Z",
            updatedAt: "2026-06-01T10:00:00.000Z",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar variante" }));

    expect(screen.getByLabelText("Tamaño")).toHaveTextContent("Queen");
    expect(screen.getByLabelText("Color")).toHaveTextContent("Blanco");
    expect(screen.queryByText("size-queen")).not.toBeInTheDocument();
    expect(screen.queryByText("option-size")).not.toBeInTheDocument();
  });
});

describe("product_form_dialog", () => {
  it("shows named categories and locked options without ID or JSON instructions", () => {
    render(
      <ProductFormDialog
        dictionary={dictionary as never}
        open
        product={productDetail as never}
        categoryOptions={[{ id: "cat-1", name: "Dormitorio" }]}
        isSubmitting={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getAllByText("Dormitorio").length).toBeGreaterThan(0);
    expect(screen.getByText("Tamaño")).toBeInTheDocument();
    expect(screen.getByText("Queen")).toBeInTheDocument();
    expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ID de/i)).not.toBeInTheDocument();
    expect(screen.queryByText("option-size")).not.toBeInTheDocument();
  });
});
