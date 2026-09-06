(function(){
'use strict';

var tbody=document.getElementById('comparison');
if(!tbody)return;
var scheduled=false;

function rowIsOpen(row){
  var next=row.nextElementSibling;
  return !!(next&&next.classList.contains('detail-row'));
}

function selectedTierCell(row){
  return row.querySelector('td.cell.sel') || row.querySelector('td.cell[data-tier="2"]') || row.querySelector('td.cell');
}

function currentOpenCell(row){
  return row.querySelector('td.cell.open');
}

function enhance(){
  scheduled=false;
  tbody.querySelectorAll('tr[data-row]').forEach(function(row){
    var label=row.querySelector('.tariff-name');
    var open=rowIsOpen(row);
    row.classList.toggle('v16b-row-open',open);
    row.classList.toggle('v16b-row-closed',!open);

    if(label){
      label.setAttribute('role','button');
      label.setAttribute('tabindex','0');
      label.setAttribute('aria-expanded',open?'true':'false');
      label.title=open?'Close tariff detail':'Open tariff detail';

      var activate=function(e){
        if(e){e.preventDefault();e.stopPropagation();}
        var target=open?currentOpenCell(row):selectedTierCell(row);
        if(target)target.click();
      };
      label.onclick=activate;
      label.onkeydown=function(e){
        if(e.key==='Enter'||e.key===' '){activate(e);}
      };
    }

    row.querySelectorAll('td.cell').forEach(function(cell){
      if(open){
        cell.classList.remove('v16b-cell-locked');
        cell.removeAttribute('aria-disabled');
        cell.setAttribute('role','button');
        cell.setAttribute('tabindex','0');
        cell.title='View detail for '+(parseInt(cell.dataset.tier,10)+1)+' UW service'+(cell.dataset.tier==='0'?'':'s');
        cell.onkeydown=function(e){
          if(e.key==='Enter'||e.key===' '){e.preventDefault();cell.click();}
        };
      }else{
        cell.classList.add('v16b-cell-locked');
        cell.setAttribute('aria-disabled','true');
        cell.removeAttribute('role');
        cell.setAttribute('tabindex','-1');
        cell.title='Open the tariff name first';
        cell.onkeydown=null;
      }
    });
  });
}

function scheduleEnhance(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(enhance);
}

new MutationObserver(scheduleEnhance).observe(tbody,{childList:true,subtree:true});
scheduleEnhance();
})();
