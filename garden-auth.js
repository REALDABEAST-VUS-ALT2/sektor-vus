const $gardenAuth=id=>document.getElementById(id);
let gardenAuthMode='login';

function readGardenAuthSession(){
  try{
    const account=JSON.parse(localStorage.getItem('gardenfallSession')||'null');
    return account&&/^[\w-]{8,64}$/.test(String(account.id||''))&&/^[a-f0-9]{64}$/i.test(String(account.token||''))&&typeof account.username==='string'
      ?{id:String(account.id),token:String(account.token),username:account.username.trim().slice(0,20)}:null;
  }catch(error){return null;}
}

function updateGardenAuthScreen(account){
  $gardenAuth('accountGate').hidden=!!account;
  $gardenAuth('gameOptions').hidden=!account;
  $gardenAuth('accountStatus').textContent=account?'':'This account belongs to Gardenfall.';
  $gardenAuth('accountWelcome').textContent=account?`Signed in as ${account.username}. Choose how to play.`:'';
  $gardenAuth('publicButton').disabled=!account;
  $gardenAuth('createPrivateButton').disabled=!account;
  if(account&&!$gardenAuth('playerName').value)$gardenAuth('playerName').value=account.username;
}

function setGardenAuthMode(mode){
  gardenAuthMode=mode;
  const signup=mode==='signup';
  $gardenAuth('loginModeButton').classList.toggle('active',!signup);
  $gardenAuth('loginModeButton').setAttribute('aria-selected',String(!signup));
  $gardenAuth('signupModeButton').classList.toggle('active',signup);
  $gardenAuth('signupModeButton').setAttribute('aria-selected',String(signup));
  $gardenAuth('accountSubmit').textContent=signup?'Create account':'Log in';
  $gardenAuth('accountPassword').autocomplete=signup?'new-password':'current-password';
  $gardenAuth('accountStatus').textContent=signup?'Choose a username and password for Gardenfall.':'This account belongs to Gardenfall.';
}

async function restoreGardenAuthSession(){
  let account=readGardenAuthSession();
  if(account){
    try{
      const response=await fetch('/api/garden/auth/session',{headers:{Authorization:`Bearer ${account.token}`},cache:'no-store'});
      if(response.ok){const result=await response.json();account={...account,...result.user};}
      else{localStorage.removeItem('gardenfallSession');account=null;}
    }catch(error){}
  }
  updateGardenAuthScreen(account);
  window.dispatchEvent(new CustomEvent('gardenfall:account',{detail:account}));
  if(account){
    try{$gardenAuth('playerName').value=localStorage.getItem(`gardenfallName:${account.id}`)||account.username;}
    catch(error){$gardenAuth('playerName').value=account.username;}
  }
}

async function submitGardenAuth(event){
  event.preventDefault();
  const submit=$gardenAuth('accountSubmit');
  const username=$gardenAuth('accountUsername').value.trim();
  const password=$gardenAuth('accountPassword').value;
  submit.disabled=true;
  $gardenAuth('accountStatus').textContent=gardenAuthMode==='signup'?'Creating your account…':'Logging in…';
  try{
    const response=await fetch(`/api/garden/auth/${gardenAuthMode}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password}),
    });
    const result=await response.json().catch(()=>({error:'Gardenfall account service is unavailable at this address. Open the game through its server.'}));
    if(!response.ok)throw new Error(result.error||'Gardenfall account request failed.');
    const account={...result.user,token:result.token};
    localStorage.setItem('gardenfallSession',JSON.stringify(account));
    $gardenAuth('accountPassword').value='';
    $gardenAuth('playerName').value=account.username;
    $gardenAuth('joinStatus').textContent='Signed in. Choose a garden to play.';
    updateGardenAuthScreen(account);
    window.dispatchEvent(new CustomEvent('gardenfall:account', {detail:account}));
  }catch(error){
    $gardenAuth('accountStatus').textContent=error.message||'Could not reach Gardenfall account service.';
  }finally{submit.disabled=false;}
}

$gardenAuth('loginModeButton').addEventListener('click',()=>setGardenAuthMode('login'));
$gardenAuth('signupModeButton').addEventListener('click',()=>setGardenAuthMode('signup'));
$gardenAuth('accountForm').addEventListener('submit',submitGardenAuth);
restoreGardenAuthSession();
