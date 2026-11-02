# Kiro + USAM Kids — execution handoff (toolkit v3.3.1 + additions)

هذه الحزمة تحتوي على **كود Site Reconstruction Toolkit v3.3.1 كاملاً كما في الـ ZIP الأصلي**، مع أدوات إضافية لحفظ الروابط المتبقية، وتشغيل **مرتين لكل موقع** (4 فحوص منفصلة إجمالاً)، وتجهيز برومبت تفصيلي *لكل صفحة مسجلة* ومصفوفة تغطية.

## الملفات المهمة

- `KIRO_COPY_PASTE_PROMPT.txt` — **البرومبت القصير للنسخ إلى Kiro.**
- `scripts/kiro-run-two-sites-twice.ps1` — تشغيل جولتين لكل موقع، وتغذية الجولة الثانية بالروابط التي لم تُفحص في الجولة الأولى.
- `scripts/kiro-build-followup-batches.mjs` — تجميع روابط المتابعة إلى دفعات بحد أقصى 199 رابطًا في الدفعة لتوافق حد 200 صفحة لكل Scan.
- `scripts/kiro-build-page-briefs.mjs` — توليد Markdown prompt مستقل لكل صفحة في CONTENT_INDEX.json و`ROUTE_IMPLEMENTATION_MATRIX.csv`.
- `src/discovery.js` و`src/cli.js` — تعديل محدود لحفظ `pending-routes.txt` والعدد المنقح `pendingUniqueRoutes` عند بدء كل Scan، بدل الاكتفاء بعدد المتبقي بالقائمة.

## المسارات المحلية الأصلية (على جهازك)

1. `M:\Linkedin jobs\Cources\site-reconstruction-toolkit-v3.3.1-section-hotfix.zip` — ZIP الكود السابق.
2. `C:\Users\moham\Documents\SiteReconData\Prodigy-Full` — **نتائج الفحص السابقة** (لا يتم تضمينها في الحزمة الجديدة).
3. `C:\Users\moham\Documents\SiteReconData\Prodigy-Full\UNIVERSAL_RECONSTRUCTION_PROMPT.md` — التعليمات المولدة سابقاً.

## التشغيل داخل PowerShell (من فولدر الأداة بعد فك ZIP)

```powershell
npm install
npx playwright install chromium
npm test
npm run check

# للجولتين لكل موقع: نفذ فقط لو مصرح لك بفحص الموقعين
.\scripts\kiro-run-two-sites-twice.ps1 -IHavePermission

# لتشغيل بقية دفعات الروابط المسجلة أيضًا (قد ينتج فحوصاً عديدة)
.\scripts\kiro-run-two-sites-twice.ps1 -IHavePermission -ContinueFollowupBatches

# أرشفة ملفات عامة فقط إذا كانت لديك حقوق الحفظ والاستعمال المناسبة
.\scripts\kiro-run-two-sites-twice.ps1 -IHavePermission -SavePublicAssets -ArchivePublicSource
```

> لا تنسخ بادئة PowerShell مثل `PS C:\...>` مع الأمر. لا تعِد تشغيل الفحوص بلا تصريح. هذه الأوامر لا تغيّر موقع USAM تلقائياً؛ **Kiro هو الذي يحتاج الوصول إلى مستودع USAM لتعديل الكود الفعلي**.

يمكن إنشاء برومبتات للصفحات التي جُمعت مسبقًا من دون أي فحص جديد:

```powershell
node scripts/kiro-build-page-briefs.mjs --reference "C:\Users\moham\Documents\SiteReconData\Prodigy-Full" --out "C:\Users\moham\Documents\SiteReconData\Prodigy-Page-Briefs"

node scripts/kiro-build-followup-batches.mjs --reference "C:\Users\moham\Documents\SiteReconData\Prodigy-Full" --out "C:\Users\moham\Documents\SiteReconData\Prodigy-Followup-Batches"
```

## ما الذي **لا** تحتويه الحزمة؟

- لا تحتوي على مستودع كود USAM Kids ولا يمكنها تعديله من جهاز ChatGPT الحالي؛ Kiro يجب أن يفتحه محلياً ويعدّل الملفات ويعمل Git commit.
- لا تحتوي على بيانات Prodigy-Full بحجم أكثر من 1GB لأنها على جهازك وليست مرفوعة هنا.
- لا تضمن مسح كل صفحات الموقعين؛ 200 صفحة لكل تشغيل، والروابط الجديدة تظهر مع الفحص وقد لا تكون كل الروابط ظاهرة علنًا.
- لا تحتوي على كود Backend خاص أو ملفات مملوكة للمواقع الخارجية.
- النجاح في بناء الـ ZIP هنا **ليس دليلاً** على بناء موقع USAM النهائي. يجب أن يقدم Kiro تغيرات فعلية وكشف اختبارات وصور مقارنة.

## معيار التسليم من Kiro

استخدام الدلائل الموجودة + جولتين مستقلتين لكل موقع مُصرّح + متابعة الروابط الجديدة + صفحات/عناصر/أنيميشن/Features مع خريطة توافق USAM + تغييرات فعلية في مستودع USAM + اختبارات + مقارنة بصرية + Git commits + ZIP للكود النهائي الذي نفذه. تقرير النواقص يظل صريحًا ولو بقيت وظائف غير قابلة للتحقق.
