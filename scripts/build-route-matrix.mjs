import fs from 'node:fs';
const text=fs.readFileSync('docs/implementation-audit.md','utf8');
const rows=[...text.matchAll(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*(أساس عامل|جزئي|غير منفذ)\s*\|\s*([^|]+)\|/gm)];
const quote=s=>'"'+String(s).replaceAll('"','""')+'"';
function mapping(path){
 if(path.startsWith('/guardian'))return ['src/operations.jsx; src/guardian-details.jsx; src/guardian-account.jsx; src/guardian-plans.jsx','/api/guardian/*; /api/guardians/*','tests/api.test.mjs'];
 if(path.startsWith('/moderator'))return ['src/moderation.jsx','/api/moderation/*','tests/api.test.mjs'];
 if(path.startsWith('/admin'))return ['src/admin-studio.jsx; src/admin-insights.jsx; src/admin-operations.jsx; src/agent-ops.jsx; src/operations.jsx','/api/admin/*; /api/moderation/*','tests/api.test.mjs'];
 if(path.startsWith('/app/english'))return ['src/english-lab.jsx; src/english-content.js','/api/activities','tests/english.test.mjs; tests/api.test.mjs'];
 if(path.startsWith('/app/stories')||path.startsWith('/app/simulations'))return ['src/narratives.jsx; src/narratives.js','/api/activities','tests/narratives.test.mjs; tests/api.test.mjs'];
 if(path.startsWith('/app/coding'))return ['src/coding-challenges.jsx; src/coding-content.js; src/world-hubs.jsx','/api/activities; /api/projects','tests/coding-challenges.test.mjs; tests/api.test.mjs'];
 if(path.startsWith('/app/ai'))return ['src/ai-topics.jsx; src/ai-content.js; src/agent-ops.jsx','/api/activities; /api/assist','tests/ai-topics.test.mjs; tests/api.test.mjs'];
 if(path.startsWith('/app/thinking'))return ['src/thinking-lab.jsx; src/thinking-content.js','/api/activities','tests/thinking.test.mjs; tests/api.test.mjs'];
 if(path.startsWith('/app/missions')||path.startsWith('/app/practice'))return ['src/session-player.jsx; src/main.jsx; src/engine.js','/api/learning-sessions; /api/attempts','tests/api.test.mjs; tests/engine.test.mjs'];
 if(path.startsWith('/app/projects')||path.startsWith('/app/portfolio'))return ['src/workshop.jsx; src/main.jsx','/api/projects','tests/api.test.mjs'];
 if(path.startsWith('/app'))return ['src/main.jsx; src/library.jsx; src/extra.jsx','/api/learners/*; /api/activities','tests/api.test.mjs; tests/content.test.mjs'];
 if(['/login','/signup','/verify','/forgot-password','/reset-password'].some(x=>path===x))return ['src/operations.jsx; src/recovery.jsx','/api/auth/*','tests/api.test.mjs'];
 return ['src/main.jsx; src/public-journey.jsx; src/public-info.jsx','none: public static or demo','manual UI review required'];
}
const head=['No','USAM route','Current audit status','Feature/gap evidence','Implementation code candidates','Backend contract candidates','Automated test candidates','Route-specific visual QA'];
const output=[head.map(quote).join(',')];
for(const [,num,path,status,gap] of rows){const mapped=mapping(path);output.push([num,path,status,gap.trim(),...mapped,'NOT RECORDED'].map(quote).join(','));}
fs.writeFileSync('docs/route-code-matrix.csv',output.join('\n')+'\n');
console.log(`Mapped ${rows.length} USAM routes. Code/API/test columns are candidate ownership, not proof of route-specific acceptance.`);
