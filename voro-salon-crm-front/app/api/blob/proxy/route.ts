import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

// URLs do Vercel Blob carregam um sufixo aleatório por upload: o conteúdo de uma
// URL nunca muda, então a resposta pode ser cacheada de forma agressiva pela CDN
// e pelo browser. Trocar a foto gera outra URL, que é outra entrada de cache.
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

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
        'Cache-Control': IMMUTABLE_CACHE,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error("Blob proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
