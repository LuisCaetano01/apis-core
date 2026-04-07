/**
 * `GET /api/config/public`: flags públicas (sem segredos) para alinhar a UI ao servidor sem `NEXT_PUBLIC_*` redundantes.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    authAllowRegister: process.env.AUTH_ALLOW_REGISTER === "true",
    authAllowListUsers: process.env.AUTH_ALLOW_LIST_USERS === "true",
  });
}
