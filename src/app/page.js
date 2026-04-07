/** Raiz `/`: redireciona para `/login` (sem landing estática). */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
