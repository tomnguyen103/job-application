import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

function redirectToLogin(request: NextRequest, error: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const code = request.nextUrl.searchParams.get("insforge_code");
    const oauthError =
      request.nextUrl.searchParams.get("error") ??
      request.nextUrl.searchParams.get("insforge_error");

    if (oauthError || !code) {
      if (oauthError) {
        console.warn("[auth/callback] OAuth provider returned an error");
      }
      return redirectToLogin(request, "oauth_failed");
    }

    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get("insforge_code_verifier")?.value;

    if (!codeVerifier) {
      return redirectToLogin(request, "missing_verifier");
    }

    const insforge = createServerClient();
    const { data, error } = await insforge.auth.exchangeOAuthCode(
      code,
      codeVerifier,
    );

    if (error || !data?.accessToken) {
      if (error) {
        console.error("[auth/callback]", error);
      }
      return redirectToLogin(request, "exchange_failed");
    }

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    setAuthCookies(response.cookies, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    response.cookies.delete("insforge_code_verifier");

    return response;
  } catch (error) {
    console.error("[auth/callback]", error);
    return redirectToLogin(request, "unexpected_error");
  }
}
