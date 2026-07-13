import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;



if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("BODY:", JSON.stringify(body, null, 2));

    if (!body || (Array.isArray(body) && body.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "Data order kosong",
        },
        { status: 400 }
      );
    }

    const rows = Array.isArray(body) ? body : [body];

    const { data, error } = await supabase
      .from("orders")
      .insert(rows)
      .select();

    if (error) {
      console.error("SUPABASE ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data,
    });
  } catch (error: any) {
    console.error("IMPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown Error",
      },
      { status: 500 }
    );
  }
}