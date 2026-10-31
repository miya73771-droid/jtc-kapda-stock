KAPDA STOCK & BARCODE WEB APP - SETUP GUIDE (Hindi/Hinglish)
===========================================================

IS VERSION MEIN KYA HAI
- Product entry: name, category, size, colour, purchase/selling price, stock.
- Save par automatic unique internal barcode value.
- Code 128 barcode ke saath A4 price tags print (simple/professional shop name).
- Barcode scanner ya manually typed code se billing.
- Sale ke baad stock kam hota hai.
- Sales history, dashboard, CSV export.
- Supabase cloud database + account login support.
- Demo mode bhi hai, lekin demo mode sirf usi browser/device mein local data rakhta hai.

IMPORTANT: Online multi-device mode ke liye neeche Supabase setup karna zaroori hai.
Sirf static website upload karne se shared cloud database apne aap nahi banega.

STEP 1: ZIP extract karein
1. ZIP file par right click > Extract All.
2. Folder ke andar index.html, app.js, style.css, config.js aur supabase_schema.sql honge.

STEP 2: Supabase project banayein
1. https://supabase.com par account banayein aur New project create karein.
2. Database password safe jagah likh kar rakhein.
3. Project ready hone ke baad Project Settings > API (ya API Keys) kholein.
4. Project URL aur publishable/anon public key copy karein.
   Service role / secret key kabhi config.js ya public website mein mat daalein.

STEP 3: Database tables banayein
1. Supabase Dashboard > SQL Editor > New query.
2. supabase_schema.sql file ka poora content paste karein.
3. Run dabayein. Agar SQL error aaye to error text save karein aur fix karayein.
4. Authentication > Providers mein Email enabled rakhein.
5. Authentication settings mein email confirmation on hai to signup ke baad email verify karna hoga.

STEP 4: config.js edit karein
Notepad mein config.js kholein. Values is tarah bharein:
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
};
Save karein. Public/anon key browser mein rakhna expected hai; database access RLS policies se secure hota hai.
Service role key bilkul na daalein.

STEP 5: Website locally test karein
Internet connected ho. Folder ko VS Code mein kholkar Live Server extension use karein, ya Python installed ho to folder mein terminal khol kar:
  python -m http.server 8000
Phir browser mein:
  http://localhost:8000
Supabase config sahi hai to login/create account panel dikhega.
Note: file:// se seedha open karne par cloud auth/browser behaviour inconsistent ho sakta hai; local server use karein.

STEP 6: Online hosting (GitHub Pages)
1. GitHub account banayein.
2. New PUBLIC repository banayein (e.g. kapda-stock-app).
3. index.html, app.js, style.css, config.js upload karein. supabase_schema.sql public repo mein rakhna zaroori nahi.
4. Repository Settings > Pages > Deploy from branch > main / root > Save.
5. GitHub Pages URL khulne par test karein.
Public repo mein config.js ka public/anon key dikh sakta hai, ye normal hai ONLY when RLS policies are correctly enabled. Never publish service-role key.
Custom domain baad mein add kar sakte hain.

STEP 7: First-time test
1. Website kholein aur Create account karein.
2. Login karein.
3. Shop Settings mein shop name, phone, address save karein.
4. Products tab > New product: 3 test products add karein.
5. Price Tags tab mein select karke Print selected tags dabayein.
6. Browser print dialog: Paper = A4, Scale = 100% / Actual size, Margins = default/none (browser preview check karein), Headers/footers = off.
7. Pehle normal paper par test print; tag alignment theek hone ke baad sticker sheet use karein.
8. Billing tab mein barcode number manually type karke Enter se test karein. Real USB scanner baad mein le sakte hain. Most scanners keyboard mode mein type karte hain and Enter suffix send karte hain.
9. Ek test sale complete karein, phir Products tab mein stock check karein.

PRINTING NOTES
- CSS A4 grid mein 4 columns aur approx 49 mm height tags banata hai. Actual label sheet ke gap/size ke mutabik print layout adjustment ki zaroorat ho sakti hai.
- Canon Pixma G4070 normal A4 sticker sheets ya card paper print kar sakta hai, lekin label stock printer-compatible ho. Paper jam se bachne ke liye thick material ke printer specs check karein.
- Barcode lines ko crop/scale na karein. Print quality normal/high rakhein. Har batch mein 1 label scan test karein.
- Product size/colour variants ko separate entries banayein, har variant ka barcode unique hoga.

LIMITATIONS / NEXT IMPROVEMENTS
- This is a starter app, not a certified accounting/POS package.
- Tax/GST invoice support nahi hai (aapne normal bill choose kiya).
- Cloud mode mein product CRUD, settings, checkout and sales history are connected to Supabase.
- Refunds, supplier purchase invoices, discounts, returns, cash drawer, printer-specific label templates, staff roles, audit log, automatic cloud backup schedule, and robust stock adjustment history abhi included nahi.
- Cloud database ko live shop data se pehle test karein; first test sale data delete karna ho to manually dashboard se karna padega.
- CSV export regular download karke safe jagah backup rakhein.
- External CDN libraries (Supabase JS, JsBarcode) ke liye internet chahiye.
- Password aur secret keys share na karein.

TROUBLESHOOTING
- “Cloud data load nahi hua”: config.js URL/key, SQL run status, login and internet check karein.
- Signup ke baad login nahi hota: email verification inbox/spam check karein.
- Barcode print nahi hota: internet connection/CDN check karein.
- Stock nahi ghatta: cloud mode mein SQL function checkout_sale create hua hai ya nahi check karein.
- Website doosre device par same data nahi dikhati: demo mode use na karein; Supabase config set karke account login karein.


ACCOUNT / PASSWORD RECOVERY NOTES
---------------------------------
- Login, Create account aur Forgot password ke liye Supabase Auth use hota hai.
- Supabase Dashboard > Authentication > URL Configuration mein apni live GitHub Pages website ka exact URL Redirect URLs list mein add karein, jaise: https://mlya73771-droid.github.io/jtc-kapda-stock/
- Email verification enabled ho to naya account banane ke baad inbox ya Spam mein verification email kholkar confirm karein.
- Forgot password par wahi email bharein; reset link email se kholein, phir website par naya password save karein.
- Alag accounts ka data private rakhne ke liye supabase_schema.sql ke Row Level Security (RLS) policies project mein enabled rehni chahiye. Website mein kabhi service_role key na daalein; sirf publishable/anon key use karein.
- Live website par update karne se pehle local files aur test account se signup, login, password reset aur data separation test karein.


DOCUMENTS PRIVATE VAULT SETUP (required for Documents tab)
1. Supabase Dashboard > SQL Editor > New query kholen.
2. ZIP mein documents_storage_setup.sql file ka poora code copy karke run karein.
3. Isse private storage bucket, documents table aur per-account security policies banengi.
4. Website mein login karke Documents tab se PDF/JPG/PNG (maximum 10 MB) upload karein.
5. Public bucket ya public sharing links enable na karein. Har account sirf apne documents dekh sakta hai.

A4 PRICE TAG UPDATE
Tags are 40 mm wide x 50 mm tall, 4 columns x 5 rows (20 per A4 sheet) with cut guides. Print preview mein A4, portrait, 100% / actual size select karke pehle test page print karein.
