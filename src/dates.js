export function dateErrors(arrival,departure,today){
  let start='',end='';
  if(!arrival)start='Choose a check-in date.';
  else if(arrival<today)start='Choose today or a future check-in date.';
  if(!departure)end='Choose a check-out date.';
  else if(!arrival)start=start||'Choose a check-in date first.';
  else if(departure<=arrival)end='Check-out must be after check-in.';
  return {start,end};
}
