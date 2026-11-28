'use client';
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,useCallback,Suspense} from 'react';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {collections,faqs,media} from '../src/data.mjs';
import {chapters} from '../src/chapter-data.mjs';
import {CollectionImage} from './collection-image.jsx';
import {staySummary} from '../src/experience.js';

const SiteContext=createContext(null);
const keys=['arrival','departure','guests'];
const easing='cubic-bezier(.22,1,.36,1)';
const photoSrc=p=>['studio-600x336.jpg','1BR-600x336.jpg','2BR-600x336.jpg','4BR-600x336.jpg','villa-600x336.jpg'].includes(p.image.split('/').at(-1))?'/media/'+p.image.split('/').at(-1):media+p.image;
const animate=(element,frames,duration=600)=>element?.animate?.(frames,{duration,easing});
function useSite(){return useContext(SiteContext)}
export function EnquirySidebar({children}){
 const sidebar=useRef(null);
 useLayoutEffect(()=>{
  const element=sidebar.current,desktop=matchMedia('(min-width:1001px)');
  const update=()=>{
   const height=element.offsetHeight;
   element.style.setProperty('--sidebar-top',`${Math.max(32,(innerHeight-height)/2)}px`);
   element.toggleAttribute('data-sticky',desktop.matches&&height<=innerHeight-64);
  };
  const observer=new ResizeObserver(update);observer.observe(element);
  window.addEventListener('resize',update,{passive:true});update();
  return()=>{observer.disconnect();window.removeEventListener('resize',update);};
 },[]);
 return <aside ref={sidebar} className="enquiry-sidebar">{children}</aside>;
}
export function SiteProvider({children}){
 const [plan,setPlan]=useState({arrival:'',departure:'',guests:'1'});
 const [query,setQuery]=useState({});
 const sync=useCallback(search=>{const q=Object.fromEntries(new URLSearchParams(search));setQuery(q);setPlan({arrival:/^\d{4}-\d{2}-\d{2}$/.test(q.arrival||'')?q.arrival:'',departure:/^\d{4}-\d{2}-\d{2}$/.test(q.departure||'')?q.departure:'',guests:/^(?:[1-9]|1[0-2])$/.test(q.guests||'')?q.guests:'1'});},[]);
 useEffect(()=>{const legacy={about_us:'/about/',property_management:'/property-management/'};if(location.pathname==='/'&&legacy[location.hash.slice(1)])location.replace(legacy[location.hash.slice(1)]);},[]);
 const href=path=>{
  if(!/^\/(?:stays|contact|monthly-stays)\//.test(path))return path;
  const url=new URL(path,'https://shining.invalid');
  keys.forEach(key=>{if(plan[key]&&(key!=='guests'||plan[key]!=='1'))url.searchParams.set(key,plan[key]);});
  return url.pathname+url.search+url.hash;
 };
 return <SiteContext.Provider value={{plan,setPlan,query,href}}><Suspense fallback={null}><PlanSync onNavigate={sync}/></Suspense>{children}</SiteContext.Provider>;
}
function PlanSync({onNavigate}){const path=usePathname(),params=useSearchParams(),search=params.toString();useEffect(()=>onNavigate(search),[path,search,onNavigate]);return null}
export function ContextLink({href,...props}){const site=useSite(),target=site.href(href);return target.startsWith('/')&&!target.startsWith('//')?<Link href={target} {...props}/>:<a href={target} {...props}/>}
export function Header(){
 return <header className="header wrap"><ContextLink className="brand" href="/" aria-label="Shining Vacation Homes home"><img src="/media/shining_logo_ink.svg" alt="Shining Vacation Homes" width="196" height="42"/></ContextLink><ContextLink className="header-contact" href="#plan-your-stay">Plan your stay</ContextLink></header>;
}
export function StayContext(){const {plan}=useSite();return <div className="context-summary">{plan.arrival||plan.departure?staySummary(plan.arrival,plan.departure,plan.guests):'Share your dates, guests and preferences. We will discuss suitable available options with you.'}</div>}
export function Faq(){
 const [active,setActive]=useState(-1);const group=useRef(null);
 useLayoutEffect(()=>{const el=group.current;const measure=()=>{const items=[...el.querySelectorAll('.faq-item')];const closed=items.reduce((n,item)=>n+item.querySelector('button').offsetHeight+2,1);const max=Math.max(...items.map(item=>item.querySelector('.faq-answer').scrollHeight));el.style.minHeight=`${closed+max}px`;};measure();let width=el.clientWidth;const observer=new ResizeObserver(()=>{if(el.clientWidth!==width){width=el.clientWidth;measure();}});observer.observe(el);document.fonts.ready.then(()=>{if(el.isConnected)measure()});return()=>observer.disconnect();},[]);
 return <div ref={group} className="faqs faq-enhanced">{faqs.map(([question,answer],i)=><div key={question} className={'faq-item'+(active===i?' is-open':'')}><button type="button" className="faq-trigger" id={`faq-0-${i}-question`} aria-expanded={active===i} aria-controls={`faq-0-${i}-answer`} onClick={()=>setActive(active===i?-1:i)}>{question}<span aria-hidden="true">+</span></button><div className="faq-panel" role="region" id={`faq-0-${i}-answer`} aria-labelledby={`faq-0-${i}-question`} aria-hidden={active!==i} inert={active!==i}><div className="faq-panel-inner"><div className="faq-answer"><p>{answer}</p></div></div></div></div>)}</div>;
}
export function ChapterStory(){
 const [active,setActive]=useState(0);const tabs=useRef([]),photo=useRef(null),panel=useRef(null);
 const choose=(i,focus=false)=>{if(i===active)return;setActive(i);if(focus)tabs.current[i]?.focus();animate(photo.current,[{opacity:.25,transform:'scale(1.045)'},{opacity:1,transform:'scale(1)'}]);animate(panel.current,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],420);};
 return <div className="chapter-story"><figure className="chapter-photo chapter-reveal"><CollectionImage ref={photo} src={'/media/'+chapters[active].image.split('/').at(-1)} alt={chapters[active].alt} width="900" height="650" loading="lazy"/><span className="chapter-photo-number" aria-hidden="true">0{active+1} <span>/ 03</span></span><figcaption>Example accommodation photograph</figcaption></figure><div className="chapter-story-content"><div className="chapter-tabs" style={{'--chapter-index':active}} role="tablist" aria-label="Choose your Dubai chapter">{chapters.map((c,i)=><button key={c.id} ref={el=>{tabs.current[i]=el}} type="button" role="tab" id={'chapter-tab-'+c.id} aria-controls={'chapter-panel-'+c.id} aria-selected={active===i} tabIndex={active===i?0:-1} onClick={()=>choose(i)} onKeyDown={e=>{const next=e.key==='ArrowRight'?(i+1)%3:e.key==='ArrowLeft'?(i+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();choose(next,true);}}}><span className="chapter-tab-number" aria-hidden="true">0{i+1}</span><span className="chapter-tab-label">{c.label}</span></button>)}</div><div ref={panel} className="chapter-panels chapter-reveal">{chapters.map((c,i)=><div key={c.id} role="tabpanel" id={'chapter-panel-'+c.id} aria-labelledby={'chapter-tab-'+c.id} tabIndex={0} hidden={active!==i} aria-hidden={active!==i} inert={active!==i}><p className="eyebrow">YOUR DUBAI, YOUR WAY</p><h3>{c.title.split('\n').map((line,j)=><span key={line}>{j>0&&<br/>}{line}</span>)}</h3><p>{c.body}</p><ContextLink className="button chapter-action" href={c.href}>{c.cta}</ContextLink></div>)}</div></div></div>;
}
export function CollectionCard({slug,featured=false}){const p=collections.find(p=>p.slug===slug);return <article className={'stay-tile'+(featured?' feature':'')}><ContextLink className={'stay-card'+(featured?' feature':'')} href="#plan-your-stay"><div className="card-image"><CollectionImage sizes={featured?'(max-width:1000px) 100vw, 55vw':'(max-width:600px) 100vw, (max-width:1000px) 50vw, 33vw'} src={photoSrc(p)} alt={'Illustrative '+p.name.toLowerCase()+' accommodation photograph'} width="900" height="650" loading="lazy"/></div><div className="card-copy"><span className="eyebrow">ACCOMMODATION STYLE</span><h3>{p.name}</h3><p>{p.short}</p><span className="card-bottom">Enquire about this option</span></div></ContextLink></article>}
export function AccommodationStyles(){return <><h2 className="visually-hidden">Accommodation styles</h2><div className="cards accommodation-styles" aria-label="Accommodation styles">{collections.map(p=><CollectionCard key={p.slug} slug={p.slug}/>)}</div></>}
export function Motion(){
 const path=usePathname();
 const progress=useRef(null);
 useEffect(()=>{
  const animations=[];const play=(el,frames,duration=720,delay=0)=>{const a=el?.animate?.(frames,{duration,delay,easing,fill:'backwards'});if(a)animations.push(a);};
  const enter=(el,delay=0)=>play(el,[{opacity:0,transform:'translateY(32px)'},{opacity:1,transform:'translateY(0)'}],720,delay);
  document.querySelectorAll('.hero-copy>*:not(h1),.page-intro>*:not(h1),.detail-heading>*:not(h1):not(.breadcrumb)').forEach((el,i)=>enter(el,Math.min(i*110,440)));
  play(document.querySelector('.hero-visual'),[{clipPath:'inset(0 0 100% 0 round 8px)',transform:'translateY(32px)',opacity:.2},{clipPath:'inset(0 0 0 0 round 8px)',transform:'translateY(0)',opacity:1}],780,40);
  const observer=new IntersectionObserver(entries=>entries.filter(entry=>entry.isIntersecting).forEach((entry,i)=>{enter(entry.target,Math.min(i*90,270));observer.unobserve(entry.target);}),{threshold:.04,rootMargin:'0px 0px 40px 0px'});
  document.querySelectorAll('.section-title,.home-collection>.stay-tile,.collection-row,.slow-grid>*,.steps article,.owner-band>*,.faq-grid>*,.editorial>*,.help-strip,.contact-grid>*,.prose>*,.detail-photo,.detail-copy,.enquiry-panel,.cards>*,.chapter-reveal').forEach(el=>observer.observe(el));
  const hero=document.querySelector('.hero-visual'),finePointer=matchMedia('(hover:hover) and (pointer:fine)');
  let frame=0,lastTime=0,range=Math.max(0,document.documentElement.scrollHeight-innerHeight);
  const pointer={x:0,y:0,active:false},current={x:0,y:0,drift:0};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const update=time=>{
   frame=0;
   const y=scrollY;
   // Read geometry before writing transforms; one frame loop owns the hero movement.
   const box=pointer.active&&hero?hero.getBoundingClientRect():null;
   const clamp=value=>Math.max(0,Math.min(1,value));
   const target={x:box?(clamp((pointer.x-box.left)/box.width)-.5)*14:0,y:box?(clamp((pointer.y-box.top)/box.height)-.5)*10:0,drift:Math.min(Math.max(y,0)*.1,42)};
   const delta=lastTime?Math.min(time-lastTime,64):16.7,blend=1-Math.exp(-delta/100);
   let moving=false;
   if(hero){
    for(const key of ['x','y','drift']){const difference=target[key]-current[key];current[key]=Math.abs(difference)<.03?target[key]:current[key]+difference*blend;if(Math.abs(target[key]-current[key])>=.03)moving=true;}
    hero.style.setProperty('--look-x',`${current.x.toFixed(3)}px`);
    hero.style.setProperty('--look-y',`${current.y.toFixed(3)}px`);
    hero.style.setProperty('--hero-drift',`${current.drift.toFixed(3)}px`);
   }
   progress.current?.style.setProperty('transform',`scaleX(${range>0?clamp(y/range):0})`);
   lastTime=moving?time:0;if(moving)schedule();
  };
  const resize=()=>{range=Math.max(0,document.documentElement.scrollHeight-innerHeight);schedule();};
  const look=event=>{if(!finePointer.matches)return;pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;schedule();};
  const leave=()=>{pointer.active=false;schedule();};
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(document.body);
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize,{passive:true});hero?.addEventListener('pointermove',look,{passive:true});hero?.addEventListener('pointerleave',leave);schedule();
  return()=>{observer.disconnect();sizeObserver.disconnect();animations.forEach(a=>a.cancel());cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',resize);hero?.removeEventListener('pointermove',look);hero?.removeEventListener('pointerleave',leave);};
 },[path]);
 return <div ref={progress} className="reading-progress" aria-hidden="true"/>;
}
