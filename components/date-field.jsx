'use client';
import {useEffect,useId,useRef,useState} from 'react';

const weekdays=['Mo','Tu','We','Th','Fr','Sa','Su'];
const monthLabel=new Intl.DateTimeFormat('en',{month:'long',year:'numeric'});
const display=value=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';
 const [y,m,d]=value.split('-');
 return `${d} / ${m} / ${y}`;
};
const iso=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const parse=value=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [y,m,d]=value.split('-').map(Number);
 return new Date(y,m-1,d);
};

function monthGrid(year,month){
 const first=new Date(year,month,1);
 const start=(first.getDay()+6)%7;
 const days=new Date(year,month+1,0).getDate();
 const cells=[];
 for(let i=0;i<start;i++)cells.push(null);
 for(let d=1;d<=days;d++)cells.push(d);
 while(cells.length%7)cells.push(null);
 return cells;
}

export function DateField({name,label,required=false,min='',value='',onChange,invalid,describedBy}){
 const uid=useId();
 const root=useRef(null),trigger=useRef(null),hidden=useRef(null);
 const [open,setOpen]=useState(false);
 const selected=parse(value);
 const [cursor,setCursor]=useState(()=>selected||parse(min)||new Date());
 useEffect(()=>{if(selected)setCursor(selected);},[value]);
 useEffect(()=>{
  if(!open)return;
  const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};
  const escape=e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',close);
  document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
 },[open]);
 useEffect(()=>{hidden.current?.setCustomValidity(required&&!value?'Choose a date.':'');},[required,value]);

 const year=cursor.getFullYear(),month=cursor.getMonth();
 const cells=monthGrid(year,month);
 const shift=delta=>setCursor(new Date(year,month+delta,1));
 const choose=day=>{
  const next=iso(year,month,day);
  if(min&&next<min)return;
  onChange?.(next);
  hidden.current?.setCustomValidity('');
  setOpen(false);
  trigger.current?.focus();
 };

 return <div className="date-field" ref={root}>
  <span className="date-field-label" id={`${uid}-label`}>{label}{required?<> <span>(required)</span></>:null}</span>
  <input ref={hidden} type="text" className="visually-hidden" name={name} id={name} value={value} readOnly tabIndex={-1} aria-hidden="true" onChange={()=>{}}/>
  <button ref={trigger} type="button" className={'date-field-trigger'+(invalid?' is-invalid':'')} aria-labelledby={`${uid}-label`} aria-describedby={describedBy} aria-expanded={open} aria-haspopup="dialog" aria-controls={`${uid}-calendar`} aria-invalid={invalid?'true':undefined} onClick={()=>setOpen(v=>!v)}>
   <span className={value?'':'is-placeholder'}>{value?display(value):'dd / mm / yyyy'}</span>
   <span className="date-field-icon" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
   </span>
  </button>
  {open?<div className="date-calendar" id={`${uid}-calendar`} role="dialog" aria-label={label}>
   <div className="date-calendar-head">
    <button type="button" className="date-nav" aria-label="Previous month" onClick={()=>shift(-1)}>‹</button>
    <p>{monthLabel.format(new Date(year,month,1))}</p>
    <button type="button" className="date-nav" aria-label="Next month" onClick={()=>shift(1)}>›</button>
   </div>
   <div className="date-weekdays" aria-hidden="true">{weekdays.map(day=><span key={day}>{day}</span>)}</div>
   <div className="date-grid" role="grid" aria-label={monthLabel.format(new Date(year,month,1))}>
    {cells.map((day,i)=>{
     if(!day)return <span key={`e${i}`} className="date-empty"/>;
     const date=iso(year,month,day);
     const disabled=!!(min&&date<min);
     const isSelected=value===date;
     const isToday=date===new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai'}).format(new Date());
     return <button key={date} type="button" className={'date-day'+(isSelected?' is-selected':'')+(isToday?' is-today':'')} disabled={disabled} aria-pressed={isSelected} aria-label={date} onClick={()=>choose(day)}>{day}</button>;
    })}
   </div>
  </div>:null}
 </div>;
}
