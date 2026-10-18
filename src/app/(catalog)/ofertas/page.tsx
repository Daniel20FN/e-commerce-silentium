import { redirect } from "next/navigation";
export default function Page() {
  redirect("/productos?ofertas=1");
}
