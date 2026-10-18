import { prisma } from "@/lib/prisma";
import type { CatalogImage, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import "server-only";
import type {
  CatalogGalleryData,
  CatalogGalleryTarget,
  CatalogImageDto,
  CatalogImagePrepareParams,
  CatalogImageUploadParams,
  CatalogImageUploadTicket,
} from "../types/api_params";
import {
  describeImageUpload,
  signReservedImage,
  uploadReservedImage,
  validateStoredImage,
} from "./catalog_image_storage";
import { CatalogMediaError } from "./catalog_media_error";
import {
  CATALOG_PRODUCT_IMAGE_LIMIT,
  CATALOG_VARIANT_IMAGE_LIMIT,
  resolveGalleryImages,
} from "./catalog_media_rules";

type Transaction = Prisma.TransactionClient;
const order = [
  { position: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
] satisfies Prisma.CatalogImageOrderByWithRelationInput[];

function limitFor(target: CatalogGalleryTarget): number {
  return target.variantId
    ? CATALOG_VARIANT_IMAGE_LIMIT
    : CATALOG_PRODUCT_IMAGE_LIMIT;
}

async function assertTarget(
  tx: Transaction,
  target: CatalogGalleryTarget,
): Promise<void> {
  const product = await tx.product.findFirst({
    where: { id: target.productId, deletedAt: null },
    select: { id: true },
  });
  if (!product)
    throw new CatalogMediaError("not_found", "media_target_not_found");
  if (
    target.variantId &&
    !(await tx.productVariant.findFirst({
      where: {
        id: target.variantId,
        productId: target.productId,
        deletedAt: null,
      },
      select: { id: true },
    }))
  ) {
    throw new CatalogMediaError("not_found", "media_target_not_found");
  }
}

async function lockTarget(
  tx: Transaction,
  target: CatalogGalleryTarget,
): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${target.productId} FOR UPDATE`;
  await assertTarget(tx, target);
}

function imageDto(image: CatalogImage, isPrimary = false): CatalogImageDto {
  return {
    id: image.id,
    productId: image.productId,
    variantId: image.variantId,
    bucket: image.bucket,
    path: image.path,
    publicUrl: image.publicUrl,
    fileName: image.fileName,
    contentType: image.contentType,
    size: image.size,
    altText: image.altText,
    position: image.position,
    isPrimary,
    deletedAt: image.deletedAt?.toISOString() ?? null,
  };
}

async function readyRecords(
  tx: Transaction,
  target: CatalogGalleryTarget,
): Promise<CatalogImage[]> {
  return tx.catalogImage.findMany({
    where: { ...target, status: "ready" },
    orderBy: order,
  });
}

function revisionFor(records: CatalogImage[]): string {
  return createHash("sha256").update(JSON.stringify(records)).digest("hex");
}

function assertRevision(records: CatalogImage[], revision: string): void {
  if (revisionFor(records) !== revision)
    throw new CatalogMediaError("conflict", "media_conflict");
}

async function readGallery(
  tx: Transaction,
  target: CatalogGalleryTarget,
): Promise<CatalogGalleryData> {
  const records = await readyRecords(tx, target);
  const images = records
    .filter((record) => !record.deletedAt)
    .map((record, index) => imageDto(record, index === 0));
  const productImages = target.variantId
    ? (await readyRecords(tx, { ...target, variantId: null }))
        .filter((record) => !record.deletedAt)
        .map((record, index) => imageDto(record, index === 0))
    : images;
  const resolved = resolveGalleryImages(
    productImages,
    images,
    target.variantId !== null,
  );
  return {
    images,
    trash: records
      .filter((record) => record.deletedAt)
      .map((record) => imageDto(record)),
    resolvedImages: resolved.images,
    source: resolved.source,
    revision: revisionFor(records),
    limit: limitFor(target),
  };
}

async function assertCapacity(
  tx: Transaction,
  target: CatalogGalleryTarget,
  excludeId?: string,
): Promise<void> {
  const count = await tx.catalogImage.count({
    where: {
      ...target,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      deletedAt: null,
      OR: [
        { status: "ready" },
        {
          status: "pending",
          createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
        },
      ],
    },
  });
  if (count >= limitFor(target))
    throw new CatalogMediaError("conflict", "media_limit");
}

export async function getCatalogGallery(
  target: CatalogGalleryTarget,
): Promise<CatalogGalleryData> {
  return prisma.$transaction(
    async (tx) => {
      await assertTarget(tx, target);
      return readGallery(tx, target);
    },
    { isolationLevel: "RepeatableRead" },
  );
}

export async function uploadCatalogImage(
  params: CatalogImageUploadParams,
): Promise<CatalogGalleryData> {
  const target = { productId: params.productId, variantId: params.variantId };
  const asset = describeImageUpload(target, params.file);
  const reserved = await prisma.$transaction(async (tx) => {
    await lockTarget(tx, target);
    const records = await readyRecords(tx, target);
    assertRevision(records, params.revision);
    await assertCapacity(tx, target);
    return tx.catalogImage.create({
      data: {
        ...target,
        ...asset,
        status: "pending",
        position: Math.max(-1, ...records.map((record) => record.position)) + 1,
      },
    });
  });
  try {
    await uploadReservedImage(asset, params.file);
    return await prisma.$transaction(async (tx) => {
      await lockTarget(tx, target);
      assertRevision(await readyRecords(tx, target), params.revision);
      await assertCapacity(tx, target, reserved.id);
      await tx.catalogImage.update({
        where: { id: reserved.id },
        data: { status: "ready" },
      });
      return {
        ...(await readGallery(tx, target)),
        uploadedImageId: reserved.id,
      };
    });
  } catch (error) {
    try {
      await prisma.$transaction(async (tx) =>
        tx.catalogImage.updateMany({
          where: {
            id: reserved.id,
            productId: target.productId,
            status: "pending",
          },
          data: { status: "failed", deletedAt: new Date() },
        }),
      );
    } catch (trackingError) {
      console.error(
        "Catalog image remains pending for reconciliation",
        reserved.id,
        trackingError,
      );
    }
    if (error instanceof CatalogMediaError) throw error;
    throw new CatalogMediaError("internal_server_error", "media_upload_failed");
  }
}

export async function saveCatalogGallery(
  target: CatalogGalleryTarget,
  params: { revision: string; images: { id: string; altText: string }[] },
): Promise<CatalogGalleryData> {
  return prisma.$transaction(async (tx) => {
    await lockTarget(tx, target);
    const records = await readyRecords(tx, target);
    assertRevision(records, params.revision);
    const activeIds = new Set(
      records.filter((record) => !record.deletedAt).map((record) => record.id),
    );
    if (
      params.images.length > limitFor(target) ||
      new Set(params.images.map((item) => item.id)).size !==
        params.images.length ||
      params.images.some(
        (item) => !activeIds.has(item.id) || item.altText.length > 500,
      )
    ) {
      throw new CatalogMediaError("validation_error", "media_invalid_gallery");
    }
    await tx.catalogImage.updateMany({
      where: {
        ...target,
        status: "ready",
        deletedAt: null,
        id: { notIn: params.images.map((item) => item.id) },
      },
      data: { deletedAt: new Date() },
    });
    for (const [position, item] of params.images.entries()) {
      await tx.catalogImage.update({
        where: { id: item.id },
        data: { position, altText: item.altText.trim() },
      });
    }
    return readGallery(tx, target);
  });
}

export async function restoreCatalogImage(
  target: CatalogGalleryTarget,
  imageId: string,
  revision: string,
): Promise<CatalogGalleryData> {
  return prisma.$transaction(async (tx) => {
    await lockTarget(tx, target);
    const records = await readyRecords(tx, target);
    assertRevision(records, revision);
    const image = records.find(
      (record) => record.id === imageId && record.deletedAt,
    );
    if (!image)
      throw new CatalogMediaError("not_found", "media_image_not_found");
    await assertCapacity(tx, target);
    await tx.catalogImage.update({
      where: { id: imageId },
      data: {
        deletedAt: null,
        position:
          Math.max(
            -1,
            ...records
              .filter((record) => !record.deletedAt)
              .map((record) => record.position),
          ) + 1,
      },
    });
    return readGallery(tx, target);
  });
}

export async function listStorefrontCatalogImages(
  productId: string,
  variantId: string | null = null,
): Promise<CatalogImageDto[]> {
  return prisma.$transaction(
    async (tx) => {
      if (
        !(await tx.product.findFirst({
          where: { id: productId, deletedAt: null, status: "active" },
          select: { id: true },
        }))
      )
        return [];
      if (
        variantId &&
        !(await tx.productVariant.findFirst({
          where: { id: variantId, productId, deletedAt: null, isActive: true },
          select: { id: true },
        }))
      )
        return [];
      return (await readGallery(tx, { productId, variantId })).resolvedImages;
    },
    { isolationLevel: "RepeatableRead" },
  );
}

async function failPendingUpload(
  target: CatalogGalleryTarget,
  imageId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) =>
    tx.catalogImage.updateMany({
      where: { ...target, id: imageId, status: "pending" },
      data: { status: "failed", deletedAt: new Date() },
    }),
  );
}

export async function prepareCatalogImageUpload(
  params: CatalogImagePrepareParams & { productId: string },
): Promise<CatalogImageUploadTicket> {
  const target = { productId: params.productId, variantId: params.variantId };
  const asset = describeImageUpload(target, {
    name: params.fileName,
    type: params.contentType,
    size: params.size,
  });
  const reserved = await prisma.$transaction(async (tx) => {
    await lockTarget(tx, target);
    const records = await readyRecords(tx, target);
    assertRevision(records, params.revision);
    await assertCapacity(tx, target);
    return tx.catalogImage.create({
      data: {
        ...target,
        ...asset,
        status: "pending",
        uploadRevision: params.revision,
        position: Math.max(-1, ...records.map((record) => record.position)) + 1,
      },
    });
  });
  try {
    return { imageId: reserved.id, signedUrl: await signReservedImage(asset) };
  } catch (error) {
    await failPendingUpload(target, reserved.id);
    if (error instanceof CatalogMediaError) throw error;
    throw new CatalogMediaError("internal_server_error", "media_upload_failed");
  }
}

export async function completeCatalogImageUpload(
  target: CatalogGalleryTarget,
  imageId: string,
): Promise<CatalogGalleryData> {
  try {
    const reserved = await prisma.$transaction(async (tx) => {
      await lockTarget(tx, target);
      return tx.catalogImage.findFirst({
        where: {
          ...target,
          id: imageId,
          deletedAt: null,
          status: { in: ["pending", "ready"] },
        },
      });
    });
    if (!reserved)
      throw new CatalogMediaError("not_found", "media_image_not_found");
    if (reserved.status === "ready")
      return { ...(await getCatalogGallery(target)), uploadedImageId: imageId };
    const revision = reserved.uploadRevision;
    if (!revision || reserved.createdAt.getTime() < Date.now() - 15 * 60 * 1000)
      throw new CatalogMediaError("conflict", "media_conflict");
    await validateStoredImage(reserved);
    return await prisma.$transaction(async (tx) => {
      await lockTarget(tx, target);
      const current = await tx.catalogImage.findFirst({
        where: {
          ...target,
          id: imageId,
          deletedAt: null,
          status: { in: ["pending", "ready"] },
        },
      });
      if (!current)
        throw new CatalogMediaError("not_found", "media_image_not_found");
      if (current.status !== "ready") {
        assertRevision(await readyRecords(tx, target), revision);
        await assertCapacity(tx, target, imageId);
        await tx.catalogImage.update({
          where: { id: imageId },
          data: { status: "ready" },
        });
      }
      return { ...(await readGallery(tx, target)), uploadedImageId: imageId };
    });
  } catch (error) {
    try {
      await failPendingUpload(target, imageId);
    } catch (trackingError) {
      console.error(
        "Catalog signed upload pending reconciliation",
        imageId,
        trackingError,
      );
    }
    throw error;
  }
}

export async function cancelCatalogImageUpload(
  target: CatalogGalleryTarget,
  imageId: string,
): Promise<{ cancelled: boolean }> {
  return prisma.$transaction(async (tx) => {
    await lockTarget(tx, target);
    const result = await tx.catalogImage.updateMany({
      where: { ...target, id: imageId, status: "pending" },
      data: { status: "failed", deletedAt: new Date() },
    });
    return { cancelled: result.count > 0 };
  });
}
