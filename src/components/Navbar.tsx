import { getSessionUser } from "@/lib/auth";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const user = await getSessionUser();

  const serializedUser = user
    ? {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      }
    : null;

  return <NavbarClient user={serializedUser} />;
}
