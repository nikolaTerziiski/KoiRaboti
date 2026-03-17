import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessionMode = await getSessionMode();
  redirect(sessionMode === "guest" ? "/login" : "/today");
}
