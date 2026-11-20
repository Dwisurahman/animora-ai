interface Env { FAL_KEY?: string; APP_ACCESS_TOKEN?: string }
interface Ctx { request: Request; env: Env; params: { path?: string | string[] } }
const allowedModels = { text: 'wan/v2.6/text-to-video', image: 'wan/v2.6/image-to-video' } as const;
const JSON_HEADERS = { 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff' };
function json(v:unknown,status=200){return new Response(JSON.stringify(v),{status,headers:JSON_HEADERS});}
function errorMessage(value:any) { if (typeof value?.detail === 'string') return value.detail; if (typeof value?.error === 'string') return value.error; if (Array.isArray(value?.detail)) return value.detail.map((d:any)=>d.msg||String(d)).join('; '); return 'Layanan video tidak dapat memproses permintaan.'; }
async function falFetch(url:string, key:string, init:RequestInit={}){
  const resp=await fetch(url,{...init,headers:{'Authorization':`Key ${key}`,'content-type':'application/json',...(init.headers||{})}});
  const data:any=await resp.json().catch(()=>({}));
  if(!resp.ok) return {failure:json({error:errorMessage(data),httpStatus:resp.status},resp.status)};
  return {data};
}
export async function onRequest({request,env,params}:Ctx):Promise<Response>{
  if(!env.FAL_KEY) return json({error:'Server belum dikonfigurasi. Tambahkan FAL_KEY ke Cloudflare Pages Secrets.'},503);
  if(env.APP_ACCESS_TOKEN && request.headers.get('x-app-token') !== env.APP_ACCESS_TOKEN) return json({error:'Akses ditolak. Masukkan access token aplikasi.'},401);
  const path=Array.isArray(params.path)?params.path.join('/'):params.path||'';
  const url=new URL(request.url);
  if(request.method==='GET'&&path==='health') return json({ready:true,provider:'fal.ai',model:'wan/v2.6'});
  if(request.method==='POST'&&path==='generate'){
    if(Number(request.headers.get('content-length')||0)>5_000_000) return json({error:'Ukuran input terlalu besar.'},413);
    let body:any;try{body=await request.json();}catch{return json({error:'JSON tidak valid.'},400)}
    const mode=body?.mode;
    if(mode!=='text'&&mode!=='image') return json({error:'Mode harus text atau image.'},400);
    const prompt=String(body.prompt||'').trim();
    if(!prompt||prompt.length>1500) return json({error:'Prompt wajib diisi (maksimal 1.500 karakter).'},400);
    if(!['5','10','15'].includes(String(body.duration))) return json({error:'Durasi harus 5, 10, atau 15 detik.'},400);
    if(!['9:16','16:9','1:1'].includes(body.aspect_ratio)) return json({error:'Rasio tidak dikenal.'},400);
    if(!['720p','1080p'].includes(body.resolution)) return json({error:'Resolusi tidak dikenal.'},400);
    const input:Record<string,unknown>={prompt,duration:String(body.duration),resolution:body.resolution,enable_prompt_expansion:true};
    if(mode==='text') input.aspect_ratio=body.aspect_ratio;
    if(mode==='image'){
      const img=String(body.image_url||'');
      if(!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(img) || img.length>4_500_000) return json({error:'Upload JPG, PNG, atau WEBP maksimal 3 MB.'},400);
      input.image_url=img;
    }
    // WAN 2.6 supports adding a hosted audio soundtrack, not guaranteed lip sync.
    if(body.audio_url){const audio=String(body.audio_url);if(!/^https:\/\//.test(audio)||audio.length>1500)return json({error:'URL audio wajib HTTPS publik.'},400);input.audio_url=audio;}
    const model=allowedModels[mode];
    const result=await falFetch(`https://queue.fal.run/${model}`,env.FAL_KEY,{method:'POST',body:JSON.stringify(input)});
    if(result.failure) return result.failure;
    return json({request_id:result.data.request_id,mode,model,status:'IN_QUEUE'},202);
  }
  if(request.method==='GET'&&path==='status'){
    const mode=url.searchParams.get('mode');const id=url.searchParams.get('id');
    if((mode!=='text'&&mode!=='image')||!id||!/^[a-zA-Z0-9-]{8,100}$/.test(id)) return json({error:'Identitas job tidak valid.'},400);
    const model=allowedModels[mode];
    const status=await falFetch(`https://queue.fal.run/${model}/requests/${id}/status`,env.FAL_KEY);
    if(status.failure)return status.failure;
    const s=status.data;
    if(s.status!=='COMPLETED')return json({status:s.status,queue_position:s.queue_position||0,logs:Array.isArray(s.logs)?s.logs.slice(-3):[]});
    if(s.error)return json({status:'FAILED',error:s.error});
    const result=await falFetch(`https://queue.fal.run/${model}/requests/${id}`,env.FAL_KEY);
    if(result.failure)return result.failure;
    const video=result.data?.video?.url||result.data?.data?.video?.url;
    if(!video)return json({status:'FAILED',error:'Respons model tidak menyertakan URL video.',providerResponse:result.data},502);
    return json({status:'COMPLETED',video_url:video,seed:result.data.seed});
  }
  return json({error:'Endpoint tidak ditemukan.'},404);
}
