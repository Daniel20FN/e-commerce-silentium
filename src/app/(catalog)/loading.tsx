import { RouteLoading } from "@/components/route_loading";
import { getDictionary } from "@/dictionary/services/get-dictionary";

export default function Loading() {
  return <RouteLoading label={getDictionary("es").general.loading} />;
}
