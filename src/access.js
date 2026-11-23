// Single source of truth for who may open which part of the site (server mode).
// Public pages never need a session; each private area belongs to specific roles.
// The API enforces the same rules; this only decides what the browser shows.

export const AREA_ROLES={learner:['LEARNER'],guardian:['GUARDIAN'],admin:['ADMIN'],moderator:['MODERATOR','ADMIN']};

export function areaOf(path){
  const p=String(path||'/');
  if(/^\/app(\/|$)/.test(p))return 'learner';
  if(/^\/guardian(\/|$)/.test(p))return 'guardian';
  if(/^\/admin(\/|$)/.test(p))return 'admin';
  if(/^\/moderator(\/|$)/.test(p))return 'moderator';
  return 'public';
}

export const signedIn=auth=>!!(auth&&auth.authenticated&&auth.role);

export function homeFor(role){
  return {ADMIN:'/admin',MODERATOR:'/moderator',GUARDIAN:'/guardian',LEARNER:'/app'}[role]||'/';
}

export function canAccess(role,path){
  const area=areaOf(path);
  return area==='public'||(AREA_ROLES[area]||[]).includes(role);
}

// What the shell must show for `path`: the page itself, a sign-in gate, or a "wrong area" notice.
export function accessDecision(auth,path){
  if(areaOf(path)==='public')return 'allow';
  if(!signedIn(auth))return 'sign-in';
  return canAccess(auth.role,path)?'allow':'wrong-role';
}

// Only same-site absolute paths are accepted as a post-login destination (no open redirects).
export function safeNext(value){
  const v=typeof value==='string'?value:'';
  return /^\/(?![/\\])[^\s]*$/.test(v)&&!/^\/(login|signup)(\?|$)/.test(v)?v:'';
}

// Where to go after signing in: the requested page if this role may open it, otherwise the role's home.
export function afterSignIn(role,next){
  const target=safeNext(next);
  return target&&canAccess(role,target)?target:homeFor(role);
}
