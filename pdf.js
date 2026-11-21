/* ZLQ Fácil: gerador de PDF próprio, sem bibliotecas externas.
   Gera A4 com texto (Helvetica, WinAnsi) e imagens JPEG. */
(function(){
  const MAP = {"−":"-","–":"-","—":"-","≤":"<=","≥":">=","→":"->","√":"raiz","…":"...",
    "“":"\"","”":"\"","‘":"'","’":"'","•":"·"," ":" "};
  const WIN = {0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,
    0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,
    0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
  function enc(s){
    let o="";
    for(const ch of String(s)){
      const c = MAP[ch]!==undefined ? MAP[ch] : ch;
      for(const cc of c){
        const k = cc.codePointAt(0);
        let b = k<256 ? k : (WIN[k]||63);
        const t = String.fromCharCode(b);
        o += (t==="("||t===")"||t==="\\") ? "\\"+t : t;
      }
    }
    return o;
  }
  // larguras aproximadas Helvetica (unidades/1000) para quebra de linha
  function largura(s, size, bold){
    let w=0;
    for(const ch of String(s)){
      if(" ,.;:'|!il".includes(ch)) w+=280;
      else if("fjrtI()-[]".includes(ch)) w+=333;
      else if("mwMW".includes(ch)) w+=850;
      else if(ch>="A" && ch<="Z") w+=667;
      else w+=556;
    }
    return w*size/1000*(bold?1.05:1);
  }
  function quebrar(txt, size, max, bold){
    const linhas=[];
    String(txt).split("\n").forEach(par=>{
      let atual="";
      par.split(" ").forEach(p=>{
        const t = atual ? atual+" "+p : p;
        if(largura(t,size,bold) > max && atual){ linhas.push(atual); atual=p; } else atual=t;
      });
      linhas.push(atual);
    });
    return linhas;
  }
  function rgb(hex){ const n=parseInt(hex.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255].map(v=>v.toFixed(3)).join(" "); }

  class Doc{
    constructor(){ this.W=595.28; this.H=841.89; this.M=42; this.pages=[]; this.imgs=[]; this.novaPagina(); }
    novaPagina(){ this.c=[]; this.pages.push(this.c); this.y=this.H-this.M; }
    espaco(h){ if(this.y-h < this.M+28){ this.novaPagina(); return true; } return false; }
    texto(t, x, y, size=10, bold=false, cor="#1d2330"){
      this.c.push(`BT ${rgb(cor)} rg /${bold?"F2":"F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${enc(t)}) Tj ET`);
    }
    rect(x,y,w,h,cor){ this.c.push(`${rgb(cor)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
    linha(x1,y1,x2,y2,cor="#dfe3ea",lw=0.6){ this.c.push(`${rgb(cor)} RG ${lw} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`); }
    par(t, size=10, bold=false, cor="#1d2330", recuo=0){
      const lh=size*1.35, max=this.W-2*this.M-recuo;
      quebrar(t,size,max,bold).forEach(l=>{ this.espaco(lh); this.y-=lh; this.texto(l,this.M+recuo,this.y,size,bold,cor); });
    }
    titulo(t){ this.espaco(30); this.y-=22; this.texto(t,this.M,this.y,12,true,"#1f4e8c"); this.y-=5; this.linha(this.M,this.y,this.W-this.M,this.y,"#1f4e8c",0.8); this.y-=2; }
    tabela(linhas, col=0.6){
      const x2 = this.M + (this.W-2*this.M)*col;
      linhas.forEach(([a,b])=>{
        const la = quebrar(a,9.5,x2-this.M-8,false), lb = quebrar(b,9.5,this.W-this.M-x2,true);
        const n=Math.max(la.length,lb.length), h=n*12.5+5;
        this.espaco(h);
        la.forEach((l,k)=> this.texto(l,this.M,this.y-12.5*(k+1),9.5,false,"#3d4555"));
        lb.forEach((l,k)=> this.texto(l,x2,this.y-12.5*(k+1),9.5,true));
        this.y-=h; this.linha(this.M,this.y+2,this.W-this.M,this.y+2);
      });
    }
    imagem(dataUrl, wPx, hPx, maxW, maxH){
      const bin = atob(dataUrl.split(",")[1]);
      const id = this.imgs.length; this.imgs.push({bin,w:wPx,h:hPx});
      const k = Math.min(maxW/wPx, maxH/hPx), w=wPx*k, h=hPx*k;
      this.espaco(h+6);
      const x = this.M + (this.W-2*this.M-w)/2;
      this.y -= h+6;
      this.c.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${this.y.toFixed(2)} cm /Im${id} Do Q`);
    }
    rodape(txt){
      const n=this.pages.length;
      this.pages.forEach((c,k)=>{
        c.push(`BT ${rgb("#5d6677")} rg /F1 7.5 Tf ${this.M} 22 Td (${enc(txt)}) Tj ET`);
        c.push(`BT ${rgb("#5d6677")} rg /F1 7.5 Tf ${(this.W-this.M-40).toFixed(2)} 22 Td (${enc("Página "+(k+1)+" de "+n)}) Tj ET`);
      });
    }
    gerar(){
      const objs=[]; const add=s=>{ objs.push(s); return objs.length; };
      const cat = add(null), pagesId = add(null);
      const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      const imgIds = this.imgs.map(im=> add(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bin.length} >>\nstream\n${im.bin}\nendstream`));
      const xo = imgIds.map((id,k)=>`/Im${k} ${id} 0 R`).join(" ");
      const kids=[];
      this.pages.forEach(c=>{
        const s=c.join("\n");
        const cid = add(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`);
        kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << ${xo} >> >> /Contents ${cid} 0 R >>`));
      });
      objs[cat-1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
      objs[pagesId-1] = `<< /Type /Pages /Kids [${kids.map(k=>k+" 0 R").join(" ")}] /Count ${kids.length} >>`;
      let out = "%PDF-1.4\n%âãÏÓ\n"; const off=[];
      objs.forEach((o,k)=>{ off.push(out.length); out += `${k+1} 0 obj\n${o}\nendobj\n`; });
      const xref = out.length;
      out += `xref\n0 ${objs.length+1}\n0000000000 65535 f \n` + off.map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("");
      out += `trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const u = new Uint8Array(out.length); for(let i=0;i<out.length;i++) u[i]=out.charCodeAt(i)&255;
      return new Blob([u],{type:"application/pdf"});
    }
  }

  // SVG da tela -> JPEG, resolvendo variáveis CSS com a paleta clara
  const CLARO = {bg:"#f5f6f8",card:"#ffffff",tx:"#1d2330",mut:"#5d6677",ln:"#dfe3ea",pri:"#1f4e8c",ok:"#1e8e4e",okb:"#e5f5ec",
    at:"#b7791f",atb:"#fdf3df",na:"#c53030",nab:"#fde8e8",cr:"#7b1111",crb:"#f3d3d3",sky:"#eef4fb",gnd:"#9aa3ae",str:"#56606e"};
  function svgParaJpeg(svgEl, escala=2){
    return new Promise((ok,erro)=>{
      try{
        const vb = svgEl.viewBox.baseVal, w=vb.width, h=vb.height;
        let src = new XMLSerializer().serializeToString(svgEl);
        src = src.replace(/var\(--([a-z]+)\)/g,(m,k)=>CLARO[k]||"#000");
        if(!/xmlns=/.test(src)) src = src.replace("<svg","<svg xmlns=\"http://www.w3.org/2000/svg\"");
        src = src.replace(/^<svg([^>]*)>/, (m,at)=>"<svg"+at.replace(/\s(width|height|style)="[^"]*"/g,"")+">");
        src = src.replace("<svg",`<svg width="${w}" height="${h}" font-family="Helvetica, Arial, sans-serif" color="#1d2330"`);
        src = src.replace(/currentColor/g,"#1d2330");
        const img = new Image();
        img.onload = ()=>{
          const cv=document.createElement("canvas"); cv.width=w*escala; cv.height=h*escala;
          const g=cv.getContext("2d"); g.fillStyle=CLARO.sky; g.fillRect(0,0,cv.width,cv.height);
          g.drawImage(img,0,0,cv.width,cv.height);
          ok({url:cv.toDataURL("image/jpeg",0.9), w:cv.width, h:cv.height});
        };
        img.onerror = erro;
        img.src = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(src);
      }catch(e){ erro(e); }
    });
  }

  window.ZLQPDF = {Doc, svgParaJpeg};
})();
