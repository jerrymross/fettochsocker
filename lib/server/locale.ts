import { cookies } from "next/headers";
import { isLocale, type Locale, localeCookieName } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(localeCookieName)?.value;
  return cookieValue && isLocale(cookieValue) ? cookieValue : "sv";
}
