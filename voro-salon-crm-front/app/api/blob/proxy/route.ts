import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");

  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!blobUrl.includes("blob.vercel-storage.com")) {
    return NextResponse.json({ error: "Invalid blob host" }, { status: 400 });
  }

  try {
    const result = await get(blobUrl, { access: 'private' });
    
    if (result?.statusCode !== 200) {
      return new NextResponse('Not found', { status: 404 });
    }
    
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error("Blob proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
