import { hasSupabaseCredentials } from "@/lib/env";
import { RegisterContent } from "@/components/auth/register-content";

export default function RegisterPage() {
  const hasSupabase = hasSupabaseCredentials();

  return <RegisterContent hasSupabase={hasSupabase} />;
}
