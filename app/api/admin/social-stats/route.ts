import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Même règle d'accès que /admin : un seul propriétaire.
const OWNER_EMAIL = "bsn.loan05@gmail.com";

async function isOwner(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === OWNER_EMAIL;
}

export async function GET() {
  if (!(await isOwner())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("social_stats")
    .select("date, instagram_views, tiktok_views")
    .order("date", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ stats: data });
}

export async function POST(request: NextRequest) {
  if (!(await isOwner())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const date = typeof body.date === "string" ? body.date : null;
  const instagramViews = Number(body.instagramViews);
  const tiktokViews = Number(body.tiktokViews);

  if (!date || !Number.isFinite(instagramViews) || !Number.isFinite(tiktokViews)) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("social_stats").upsert({
    date,
    instagram_views: instagramViews,
    tiktok_views: tiktokViews,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
