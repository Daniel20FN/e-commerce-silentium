import {
  serializeJsonLd,
  type JsonLdDocument,
} from "../services/structured_data";

export function StructuredData({ data }: { data: JsonLdDocument | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
