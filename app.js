(() => {
'use strict';
const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const configured = !!(window.APP_CONFIG?.SUPABASE_URL && window.APP_CONFIG?.SUPABASE_ANON_KEY);
let supa = null, user = null, demoMode = !configured;
let products = [], sales = [], cart = [], selectedLabels = new Map();
let settings = {name:'My Clothing Store',phone:'',address:'',tagStyle:'professional'};
const localKey='kapda_barcode_demo_v1';
let localData = {products:[],sales:[],settings};
let toastTimer;

function toast(msg,error=false){$('toast').textContent=msg;$('toast').classList.remove('hidden','error');if(error)$('toast').classList.add('error');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3500)}
function setConnection(text,good=false){$('connectionBadge').textContent=text;$('connectionBadge').className='badge '+(good?'good':'warn')}
function loadLocal(){try{localData=JSON.parse(localStorage.getItem(localKey))||localData}catch{};products=localData.products||[];sales=localData.sales||[];settings={...settings,...localData.settings};}
function saveLocal(){localData={products,sales,settings};localStorage.setItem(localKey,JSON.stringify(localData));}
async function init(){
  if(configured && window.supabase){supa=window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL,window.APP_CONFIG.SUPABASE_ANON_KEY);const {data}=await supa.auth.getSession();user=data.session?.user||null;supa.auth.onAuthStateChange((_e,session)=>{user=session?.user||null;refreshAuth();if(user)loadCloud();});}
  else {loadLocal();setConnection('Demo mode · local only');$('setupNotice').classList.remove('hidden');}
  refreshAuth();
  if(user) await loadCloud(); else if(demoMode) renderAll();
}
function refreshAuth(){
  const cloudReady=!!supa;
  $('authPanel').classList.toggle('hidden',demoMode||!!user);
  $('appPanel').classList.toggle('hidden',!demoMode&&!user);
  $('logoutBtn').classList.toggle('hidden',!user);
  if(demoMode){$('authPanel').classList.add('hidden');$('appPanel').classList.remove('hidden');}
  if(user){setConnection('Cloud connected',true);$('setupNotice').classList.add('hidden');}
}
async function loadCloud(){
  if(!supa||!user)return;
  try{
    const [pr,sr,st]=await Promise.all([
      supa.from('products').select('*').order('created_at',{ascending:false}),
      supa.from('sales').select('id,receipt_no,customer_name,total,created_at,sale_items(quantity)').order('created_at',{ascending:false}).limit(300),
      supa.from('shop_settings').select('*').maybeSingle()
    ]);
    if(pr.error)throw pr.error;if(sr.error)throw sr.error;
    products=(pr.data||[]).map(p=>({...p,barcode:p.barcode||p.sku}));
    sales=(sr.data||[]).map(s=>({...s,items:s.sale_items?.reduce((a,x)=>a+Number(x.quantity),0)||0}));
    if(st.data)settings={name:st.data.shop_name||'My Clothing Store',phone:st.data.phone||'',address:st.data.address||'',tagStyle:st.data.tag_style||'professional'};
    renderAll();
  }catch(e){toast('Cloud data load nahi hua: '+e.message,true)}
}
async function cloudSaveProduct(p){
  const payload={...p,user_id:user.id};delete payload.id;delete payload.created_at;delete payload.updated_at;
  if(p.id){const r=await supa.from('products').update(payload).eq('id',p.id).select().single();if(r.error)throw r.error;return r.data;}
  const r=await supa.from('products').insert(payload).select().single();if(r.error)throw r.error;return r.data;
}
async function persistSettings(){
  if(demoMode){saveLocal();return}
  const r=await supa.from('shop_settings').upsert({user_id:user.id,shop_name:settings.name,phone:settings.phone,address:settings.address,tag_style:settings.tagStyle},{onConflict:'user_id'});
  if(r.error)throw r.error;
}
function newBarcode(){return 'KD'+Date.now().toString().slice(-9)+Math.floor(Math.random()*90+10)}
function productFromForm(){
  return {name:$('pName').value.trim(),category:$('pCategory').value.trim(),size:$('pSize').value.trim(),color:$('pColor').value.trim(),cost_price:Number($('pCost').value),selling_price:Number($('pPrice').value),stock_qty:Math.floor(Number($('pStock').value)),low_stock_at:Math.floor(Number($('pLow').value||0))};
}
function renderAll(){ $('shopTitle').textContent=settings.name||'Kapda Stock';fillSettings();renderDashboard();renderProducts();renderLabels();renderSales();renderCart();}
function fillSettings(){$('sName').value=settings.name||'';$('sPhone').value=settings.phone||'';$('sAddress').value=settings.address||'';$('sTagStyle').value=settings.tagStyle||'professional'}
function renderDashboard(){
  $('statProducts').textContent=products.length;
  $('statUnits').textContent=products.reduce((a,p)=>a+Number(p.stock_qty||0),0);
  $('statValue').textContent=money(products.reduce((a,p)=>a+Number(p.stock_qty||0)*Number(p.cost_price||0),0));
  const today=new Date().toDateString();$('statSales').textContent=money(sales.filter(s=>new Date(s.created_at||s.date).toDateString()===today).reduce((a,s)=>a+Number(s.total||0),0));
  const lows=products.filter(p=>Number(p.stock_qty)<=Number(p.low_stock_at??2));
  $('lowStock').innerHTML=lows.length?`<div class="table-wrap"><table><thead><tr><th>Product</th><th>Code</th><th>Stock</th></tr></thead><tbody>${lows.map(p=>`<tr><td>${escapeHtml(p.name)} ${escapeHtml(p.size||'')}</td><td class="code">${escapeHtml(p.barcode||p.sku)}</td><td class="stock-low">${Number(p.stock_qty)}</td></tr>`).join('')}</tbody></table></div>`:'Abhi koi low-stock product nahi.';
}
function renderProducts(){
 const q=$('productSearch').value.toLowerCase().trim();
 const rows=products.filter(p=>[p.name,p.category,p.size,p.color,p.barcode,p.sku].some(x=>String(x||'').toLowerCase().includes(q)));
 $('productsBody').innerHTML=rows.map(p=>`<tr><td><strong>${escapeHtml(p.name)}</strong><br><span class="muted">${escapeHtml(p.category||'')}</span></td><td>${escapeHtml(p.size||'—')} / ${escapeHtml(p.color||'—')}</td><td class="code">${escapeHtml(p.barcode||p.sku||'')}</td><td>${money(p.cost_price)}</td><td>${money(p.selling_price)}</td><td class="${Number(p.stock_qty)<=Number(p.low_stock_at??2)?'stock-low':''}">${Number(p.stock_qty||0)}</td><td><div class="row-actions"><button class="tiny-btn" data-edit="${p.id}">Edit</button><button class="tiny-btn" data-tag="${p.id}">Tag</button></div></td></tr>`).join('');
 $('productCount').textContent=`${rows.length} of ${products.length} products`;
 $('productsBody').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
 $('productsBody').querySelectorAll('[data-tag]').forEach(b=>{b.onclick=()=>{selectedLabels.set(b.dataset.tag,1);renderLabels();switchTab('labels')}});
}
function showProductForm(p=null){
 $('productForm').reset();$('productId').value=p?.id||'';$('productFormTitle').textContent=p?'Edit product':'Add product';
 $('pName').value=p?.name||'';$('pCategory').value=p?.category||'';$('pSize').value=p?.size||'';$('pColor').value=p?.color||'';
 $('pCost').value=p?.cost_price??0;$('pPrice').value=p?.selling_price??0;$('pStock').value=p?.stock_qty??0;$('pLow').value=p?.low_stock_at??2;
 $('barcodePreview').textContent=p?`Barcode: ${p.barcode||p.sku}`:'Naya unique barcode save karte waqt banega.';
 $('productFormPanel').classList.remove('hidden');$('pName').focus();
}
function editProduct(id){const p=products.find(x=>String(x.id)===String(id));if(p)showProductForm(p)}
async function submitProduct(e){
 e.preventDefault();const p=productFromForm();if(!p.name)return;
 const id=$('productId').value;const old=products.find(x=>String(x.id)===String(id));
 p.barcode=old?.barcode||old?.sku||newBarcode();p.sku=p.barcode;
 try{
  if(demoMode){p.id=old?.id||crypto.randomUUID();p.created_at=old?.created_at||new Date().toISOString();products=old?products.map(x=>x.id===p.id?p:x):[p,...products];saveLocal();}
  else {const saved=await cloudSaveProduct({...p,id:old?.id});products=old?products.map(x=>String(x.id)===String(saved.id)?saved:x):[saved,...products];}
  $('productFormPanel').classList.add('hidden');renderAll();toast(old?'Product updated':'Product saved with barcode');
 }catch(err){toast('Save failed: '+err.message,true)}
}
function renderLabels(){
 const q=$('labelSearch').value.toLowerCase().trim();
 const rows=products.filter(p=>[p.name,p.category,p.size,p.color,p.barcode].some(x=>String(x||'').toLowerCase().includes(q)));
 $('labelList').innerHTML=rows.map(p=>`<label class="label-choice"><input type="checkbox" data-label-check="${p.id}" ${selectedLabels.has(String(p.id))||selectedLabels.has(p.id)?'checked':''}><span class="details"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.size||'No size')} · ${escapeHtml(p.color||'No colour')} · ${money(p.selling_price)}</small></span><input class="qty" type="number" min="1" max="100" value="${selectedLabels.get(String(p.id))||selectedLabels.get(p.id)||1}" data-label-qty="${p.id}" aria-label="Tag quantity"></label>`).join('')||'<div class="empty">Pehle Products tab mein product add karein.</div>';
 $('labelList').querySelectorAll('[data-label-check]').forEach(c=>c.onchange=()=>{const id=c.dataset.labelCheck;if(c.checked){if(!selectedLabels.has(id))selectedLabels.set(id,1)}else selectedLabels.delete(id);renderLabels()});
 $('labelList').querySelectorAll('[data-label-qty]').forEach(i=>i.onchange=()=>{const id=i.dataset.labelQty;if(selectedLabels.has(id))selectedLabels.set(id,Math.max(1,Math.min(100,Number(i.value)||1)))});
}
function printLabels(){
 const ids=[...selectedLabels.keys()];if(!ids.length){toast('Print karne ke liye product select karein.',true);return}
 const chosen=ids.map(id=>({p:products.find(x=>String(x.id)===String(id)),n:selectedLabels.get(id)})).filter(x=>x.p);
 let tags=[];
 chosen.forEach(({p,n})=>{for(let i=0;i<n;i++)tags.push(`<article class="price-tag ${settings.tagStyle==='simple'?'tag-simple':''}"><div class="shop">${escapeHtml(settings.name)}</div><div class="prod">${escapeHtml(p.name)}</div><div class="meta">${escapeHtml(p.category||'')} ${p.size?'· '+escapeHtml(p.size):''} ${p.color?'· '+escapeHtml(p.color):''}</div><svg data-barcode="${escapeHtml(p.barcode||p.sku)}"></svg><div class="meta">${escapeHtml(p.barcode||p.sku)}</div><div class="price">${money(p.selling_price)}</div></article>`)});
 $('printArea').innerHTML=`<div class="print-grid">${tags.join('')}</div>`;
 try{document.querySelectorAll('#printArea svg[data-barcode]').forEach(svg=>JsBarcode(svg,svg.dataset.barcode,{format:'CODE128',displayValue:false,margin:0,height:34,width:1.3}));}catch(e){toast('Barcode library load nahi hui. Internet check karein.',true);return}
 document.body.classList.remove('printing-bill');document.body.classList.add('printing-labels');window.print();setTimeout(()=>document.body.classList.remove('printing-labels'),800);
}
function addCartByCode(code){
 code=String(code||'').trim();if(!code)return;
 const p=products.find(p=>String(p.barcode||p.sku).toLowerCase()===code.toLowerCase()||String(p.sku||'').toLowerCase()===code.toLowerCase());
 if(!p){$('billingMessage').textContent='Product nahi mila. Pehle Products mein add karein.';toast('Barcode/product code nahi mila.',true);return}
 const existing=cart.find(x=>String(x.id)===String(p.id));const qty=existing?existing.qty+1:1;
 if(qty>Number(p.stock_qty)){toast('Stock mein itni quantity nahi hai.',true);return}
 if(existing)existing.qty++;else cart.push({id:p.id,barcode:p.barcode||p.sku,name:p.name,size:p.size,color:p.color,price:Number(p.selling_price),qty:1});
 $('billingMessage').textContent=`Added: ${p.name} ${p.size||''}`;renderCart();$('scanInput').value='';$('scanInput').focus();
}
function renderCart(){
 $('cartBody').innerHTML=cart.map((x,i)=>`<tr><td><strong>${escapeHtml(x.name)}</strong><br><span class="muted">${escapeHtml(x.size||'')} ${escapeHtml(x.color||'')}</span></td><td>${money(x.price)}</td><td><div class="row-actions"><button class="tiny-btn" data-minus="${i}">−</button><strong>${x.qty}</strong><button class="tiny-btn" data-plus="${i}">+</button></div></td><td>${money(x.price*x.qty)}</td><td><button class="tiny-btn" data-remove="${i}">Remove</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Abhi bill mein koi product nahi.</td></tr>';
 $('cartTotal').textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0));
 $('cartBody').querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{const x=cart[+b.dataset.minus];x.qty--;if(x.qty<=0)cart.splice(+b.dataset.minus,1);renderCart()});
 $('cartBody').querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{const x=cart[+b.dataset.plus],p=products.find(p=>String(p.id)===String(x.id));if(x.qty+1>Number(p.stock_qty)){toast('Stock limit reached.',true);return}x.qty++;renderCart()});
 $('cartBody').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.remove,1);renderCart()});
}
async function checkout(){
 if(!cart.length){toast('Bill mein pehle product add karein.',true);return}
 const total=cart.reduce((a,x)=>a+x.price*x.qty,0);
 for(const x of cart){const p=products.find(p=>String(p.id)===String(x.id));if(!p||x.qty>Number(p.stock_qty)){toast('Stock badal gaya hai. Cart dobara check karein.',true);return}}
 const sale={id:crypto.randomUUID(),receipt_no:'BILL-'+Date.now().toString().slice(-8),customer_name:$('customerName').value.trim(),total,created_at:new Date().toISOString(),items:cart.reduce((a,x)=>a+x.qty,0),lines:cart.map(x=>({...x}))};
 try{
  if(demoMode){
   cart.forEach(x=>{const p=products.find(p=>String(p.id)===String(x.id));p.stock_qty=Number(p.stock_qty)-x.qty});
   sales.unshift(sale);saveLocal();
  }else{
   const {data,error}=await supa.rpc('checkout_sale',{p_customer_name:sale.customer_name,p_items:cart.map(x=>({product_id:x.id,quantity:x.qty,unit_price:x.price}))});
   if(error)throw error;
   sale.receipt_no=data?.receipt_no||sale.receipt_no;
   await loadCloud();
  }
  printBill(sale);cart=[];$('customerName').value='';renderAll();toast('Sale complete. Stock update ho gaya.');
 }catch(e){toast('Sale save nahi hui: '+e.message,true)}
}
function printBill(s){
 const rows=s.lines.map(x=>`<tr><td>${escapeHtml(x.name)} ${escapeHtml(x.size||'')}</td><td>${x.qty}</td><td>${money(x.price*x.qty)}</td></tr>`).join('');
 $('printArea').innerHTML=`<div class="bill-print"><h2>${escapeHtml(settings.name)}</h2><p style="text-align:center">${escapeHtml(settings.address||'')}${settings.phone?' · '+escapeHtml(settings.phone):''}</p><hr><p>Bill: ${escapeHtml(s.receipt_no)}</p><p>Date: ${new Date(s.created_at).toLocaleString('en-IN')}</p><p>Customer: ${escapeHtml(s.customer_name||'Walk-in')}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${money(s.total)}</div><p style="text-align:center;margin-top:14px">Thank you. Visit again!</p></div>`;
 document.body.classList.remove('printing-labels');document.body.classList.add('printing-bill');window.print();setTimeout(()=>document.body.classList.remove('printing-bill'),800);
}
function renderSales(){
 $('salesBody').innerHTML=sales.map(s=>`<tr><td class="code">${escapeHtml(s.receipt_no||s.id||'')}</td><td>${new Date(s.created_at||s.date).toLocaleString('en-IN')}</td><td>${escapeHtml(s.customer_name||'Walk-in')}</td><td>${Number(s.items||s.sale_items?.reduce((a,x)=>a+x.quantity,0)||0)}</td><td><strong>${money(s.total)}</strong></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Abhi koi sale record nahi.</td></tr>';
 $('salesCount').textContent=`${sales.length} recent sales`;
}
function downloadCSV(filename,rows){
 const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function switchTab(tab){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.tab-content').forEach(s=>s.classList.toggle('hidden',s.id!=='tab-'+tab));if(tab==='billing')$('scanInput').focus()}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>switchTab(b.dataset.goto));
$('newProductBtn').onclick=()=>showProductForm();$('cancelProductBtn').onclick=()=>$('productFormPanel').classList.add('hidden');$('productForm').onsubmit=submitProduct;
$('productSearch').oninput=renderProducts;$('labelSearch').oninput=renderLabels;$('printLabelsBtn').onclick=printLabels;
$('selectAllLabelsBtn').onclick=()=>{products.filter(p=>[p.name,p.category,p.size,p.color,p.barcode].some(x=>String(x||'').toLowerCase().includes($('labelSearch').value.toLowerCase()))).forEach(p=>selectedLabels.set(String(p.id),selectedLabels.get(String(p.id))||1));renderLabels()};
$('scanInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addCartByCode($('scanInput').value)}};$('addByCodeBtn').onclick=()=>addCartByCode($('scanInput').value);
$('clearCartBtn').onclick=()=>{cart=[];renderCart()};$('checkoutBtn').onclick=checkout;
$('settingsForm').onsubmit=async e=>{e.preventDefault();settings={name:$('sName').value.trim()||'My Clothing Store',phone:$('sPhone').value.trim(),address:$('sAddress').value.trim(),tagStyle:$('sTagStyle').value};try{await persistSettings();renderAll();toast('Settings saved.')}catch(err){toast(err.message,true)}};
$('exportProductsBtn').onclick=()=>downloadCSV('kapda-products.csv',[['Name','Category','Size','Colour','Barcode','Cost','Selling price','Stock','Low stock at'],...products.map(p=>[p.name,p.category,p.size,p.color,p.barcode||p.sku,p.cost_price,p.selling_price,p.stock_qty,p.low_stock_at])]);
$('exportSalesBtn').onclick=()=>downloadCSV('kapda-sales.csv',[['Bill','Date','Customer','Items','Total'],...sales.map(s=>[s.receipt_no,s.created_at,s.customer_name,s.items,s.total])]);
$('loginBtn').onclick=async()=>{if(!supa)return;const {error}=await supa.auth.signInWithPassword({email:$('authEmail').value,password:$('authPassword').value});$('authMessage').textContent=error?.message||'Login successful';if(error)toast(error.message,true)};
$('signupBtn').onclick=async()=>{if(!supa)return;const {error}=await supa.auth.signUp({email:$('authEmail').value,password:$('authPassword').value});$('authMessage').textContent=error?'Signup error: '+error.message:'Account request sent. Agar email confirmation on hai to email verify karein, phir login karein.'};
$('logoutBtn').onclick=async()=>{if(supa)await supa.auth.signOut();user=null;refreshAuth()};
init();
})();