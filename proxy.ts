import { updateSession } from "@insforge/sdk/ssr";
import type { CookieOptions, CookieStore } from "@insforge/sdk/ssr";
import { type NextRequest, NextResponse } from "next/server";

const protectedRoutePrefixes = ["/dashboard", "/profile", "/find-jobs"];
const publicAuthRoutes = ["/", "/login"];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicAuthRoute(pathname: string): boolean {
  return publicAuthRoutes.includes(pathname);
}

function createRequestCookieStore(request: NextRequest): CookieStore {
  function setCookie(name: string, value: string): unknown;
  function setCookie(
    options: { name: string; value: string } & CookieOptions,
  ): unknown;
  function setCookie(
    nameOrOptions: string | ({ name: string; value: string } & CookieOptions),
    value?: string,
  ): unknown {
    if (typeof nameOrOptions === "string") {
      if (value) {
        request.cookies.set(nameOrOptions, value);
      }
      return undefined;
    }

    request.cookies.set({
      name: nameOrOptions.name,
      value: nameOrOptions.value,
    });
    return undefined;
  }

  function deleteCookie(name: string): unknown;
  function deleteCookie(options: { name: string } & CookieOptions): unknown;
  function deleteCookie(
    nameOrOptions: string | ({ name: string } & CookieOptions),
  ): unknown {
    const name =
      typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;
    request.cookies.delete(name);
    return undefined;
  }

  return {
    get: (name: string) => request.cookies.get(name),
    set: setCookie,
    delete: deleteCookie,
  };
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });
  const { accessToken } = await updateSession({
    requestCookies: createRequestCookieStore(request),
    responseCookies: response.cookies,
  });
  const pathname = request.nextUrl.pathname;

  if (isProtectedRoute(pathname) && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicAuthRoute(pathname) && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/profile/:path*",
    "/find-jobs/:path*",
  ],
};
