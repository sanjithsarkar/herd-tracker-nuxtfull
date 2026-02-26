import{j as h}from"./BXyo1EIY.js";const a=()=>{const t=h();return{store:t,authFetch:async(r,e={})=>$fetch(r,{...e,headers:{...e.headers,Authorization:`Bearer ${t.token}`}})}};export{a as u};
