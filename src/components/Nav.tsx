import { auth } from "@/lib/auth";
import NavClient from "./NavClient";

export default async function Nav() {
  const session = await auth();
  return <NavClient isLoggedIn={!!session?.user} />;
}
