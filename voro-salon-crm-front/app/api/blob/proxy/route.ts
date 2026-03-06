import { getDownloadUrl } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");

  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Basic validation to ensure it's a Vercel Blob URL
  if (!blobUrl.includes("blob.vercel-storage.com")) {
    return NextResponse.json({ error: "Invalid blob host" }, { status: 400 });
  }

  try {
    // getDownloadUrl uses BLOB_READ_WRITE_TOKEN environment variable by default,
    // or we can pass it if it has a different name. 
    // The user has VORO_READ_WRITE_TOKEN.
    const url = await getDownloadUrl(blobUrl);
    console.log("Download URL:", url);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Blob proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
