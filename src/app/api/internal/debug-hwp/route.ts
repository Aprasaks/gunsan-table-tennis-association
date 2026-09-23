import { NextRequest, NextResponse } from 'next/server';
import { documentText, open } from 'js-hwp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TOKEN='debug-hwp-62b4c0';

export async function GET(request: NextRequest){
  if(request.nextUrl.searchParams.get('token')!==TOKEN) return NextResponse.json({ok:false},{status:404});
  const wr=request.nextUrl.searchParams.get('wr')||'1747';
  const no=request.nextUrl.searchParams.get('no')||'0';
  const page=request.nextUrl.searchParams.get('page')||'1';
  const url='http://jbtta.pingpongkorea.com/bbs/download.php?bo_table=community_09&wr_id='+encodeURIComponent(wr)+'&no='+encodeURIComponent(no)+'&page='+encodeURIComponent(page);
  try{
    const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0','referer':'http://jbtta.pingpongkorea.com/bbs/board.php?bo_table=community_09'},cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(20000)});
    const bytes=new Uint8Array(await res.arrayBuffer());
    let text='';
    let parseError='';
    try{ text=documentText(open(bytes)); }catch(e){ parseError=e instanceof Error?e.message:String(e); }
    return NextResponse.json({ok:true,status:res.status,contentType:res.headers.get('content-type'),contentDisposition:res.headers.get('content-disposition'),size:bytes.length,magic:Array.from(bytes.slice(0,32)),parseError,text:text.slice(0,5000)});
  }catch(e){
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500});
  }
}
