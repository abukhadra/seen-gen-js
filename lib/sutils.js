/*version: 0.1.4*/
const u=["\u0660","\u0661","\u0662","\u0663","\u0664","\u0665","\u0666","\u0667","\u0668","\u0669"],l=["0","1","2","3","4","5","6","7","8","9"],p="\u0640",d=o("\\p{L}"),k=o("\\p{N}");function f(n){return s(u,n[0])}function _(n){if(f(n))return n;{let e="",r=0;for(;r<n.length;){switch(n[r]){case"0":e+="\u0660";break;case"1":e+="\u0661";break;case"2":e+="\u0662";break;case"3":e+="\u0663";break;case"4":e+="\u0664";break;case"5":e+="\u0665";break;case"6":e+="\u0666";break;case"7":e+="\u0667";break;case"8":e+="\u0668";break;case"9":e+="\u0669";break;case".":e+="\u066B";break;default:a()}r+=1}return e}}function g(n){let e;switch(n){case"0":e="\u0660";break;case"1":e="\u0661";break;case"2":e="\u0662";break;case"3":e="\u0663";break;case"4":e="\u0664";break;case"5":e="\u0665";break;case"6":e="\u0666";break;case"7":e="\u0667";break;case"8":e="\u0668";break;case"9":e="\u0669";break;default:a()}return e}function b(n){return s(l,n[0])}function y(n){if(b(n))return n;{let e="",r=0;for(;r<n.length;){switch(n[r]){case"\u0660":e+="0";break;case"\u0661":e+="1";break;case"\u0662":e+="2";break;case"\u0663":e+="3";break;case"\u0664":e+="4";break;case"\u0665":e+="5";break;case"\u0666":e+="6";break;case"\u0667":e+="7";break;case"\u0668":e+="8";break;case"\u0669":e+="9";break;case",":e+=".";break;default:a()}r+=1}return e}}function h(n){let e;switch(n){case"\u0660":e="0";break;case"\u0661":e="1";break;case"\u0662":e="2";break;case"\u0663":e="3";break;case"\u0664":e="4";break;case"\u0665":e="5";break;case"\u0666":e="6";break;case"\u0667":e="7";break;case"\u0668":e="8";break;case"\u0669":e="9";break;default:a();break}return e}function v(n){return n==null}function w(n){return n instanceof Array}function s(n,e){return n.includes(e)}function m(n,e,r){n[e]=r}function x(n){return Array.isArray(n)&&n.length===0}function j(n){return parseInt(n)}function A(n,e){let r=[];const i=(c,t)=>{if(t&&typeof t=="object"){if(r.includes(t))return"[CIRCULAR]";r.push(t)}return t};return e?JSON.stringify(n,i,e):JSON.stringify(n,i)}function E(n,e,r){n[r]=n[r].concat(e[r])}function N(n,e){delete n[e]}function C(n,e){}function o(n){return new RegExp(n,"u")}function S(n){throw new Error("print() is not implemeted")}function I(n){n==null?console.log("undefined"):console.log(n)}function R(n,e){n==null?console.log("undefined"):console.log(e?JSON.stringify(n,null,e):JSON.stringify(n))}function a(n){throw new Error(n)}function J(n){return{...n}}function L(n,e){return n.repeat(e)}function O(n){return n.charAt(0).toUpperCase()+n.slice(1)}function T(n){return n.toLowerCase()}const q=`
//------------------------------------------------------------------------------
// js helper functions injected to workaround missing seen features that are yet to be added.
function is_none(x) { return x == null }        
function is_list(x) { return x instanceof Array }
function replace(array, i, v) {  array[i] = v }
function to_int(str) { return parseInt(str) }
function assign(x,y) { x = y }
function concat(x,y,id) { x[id] = x[id].concat(y[id]) }
function del(array, i) { delete array[i] }
function regexp(expr) { return RegExp(expr, 'ug') }
function match_regexp(v, expr) {return expr.exec(v) }
function print(v) { throw new Error('print() is not implemeted')}
function \u0627\u0637\u0628\u0639_\u0633\u0637\u0631(v) { println(v) }
function println(v) {         
    if(v == null ) { console.log("undefined") } else { console.log(v) }
}
function panic(v) { throw new Error(v)}
function clone(obj) { return {...obj} }
function contains(list, el) { return list.includes(el) }
function is_empty(list) { return Array.isArray(list) && list.length === 0 }
function \u0627\u0637\u0628\u0639_\u062A\u0641\u0627\u0635\u064A\u0644(obj, indent) { pprint(obj, indent) }
function pprint(obj, indent) { 
    if( obj == null ) {
        console.log("undefined")
    } else {
        if(indent) {
            console.log(JSON.stringify(obj, null, indent)) 
        } else {
            console.log(JSON.stringify(obj)) 
        }       
    }
}
function to_str(obj, indent) { 
let objects = []
function eliminateCircular(k, v) {
    if (v && typeof v === 'object') {
        if (objects.includes(v)) { return "[CIRCULAR]" } else { objects.push(v) }
    }
    return v
}
if(indent) {
    return JSON.stringify(obj, eliminateCircular, indent)
} else {
    return JSON.stringify(obj, eliminateCircular)
}
}
function repeat(str, times) { return str.repeat(times) }
function c0_to_uppercase(str){ return str.charAt(0).toUpperCase() + str.slice(1) }
function to_lowercase(str) {return str.toLowerCase()}
function \u0639\u0631\u0636_\u0627\u0648\u0644\u064A(code, preview_id){ preview(code, preview_id) }
function preview(code, preview_id) { window.parent.document.querySelector(preview_id).srcdoc = code }
function \u0647\u0627\u062A_\u0627\u0644\u0627\u0641\u0631\u0639(\u0633) {
    return \u0633.__children
}
function \u0627\u062E\u062A\u0631(\u0633,\u062F\u0627\u0644\u0629) {
    return \u0633.filter(\u062F\u0627\u0644\u0629)
}
function \u0647\u0627\u062A(\u0642,\u0641\u0647\u0631\u0633) { return \u0642[\u0641\u0647\u0631\u0633]}
function \u0639\u062F\u062F_\u0627\u0644\u0639\u0646\u0627\u0635\u0631(\u0642) { return \u0642.length}
async function read_url(url) {
    const response = await fetch(url);
    return response.text()
}

//------------------------------------------------------------------------------
`;function U(n,e){const{version:r}=require(n);(void 0)(e,"utf8",(i,c)=>{if(i){console.error(i);return}(void 0)(e,`/*version: ${r}*/
${c}`,t=>{if(t){console.error(t);return}})})}export{d as ANY_LETTER,k as ANY_NUM,q as HELPERS,l as MAGHRIB_DIGIT,u as MASHRIQ_DIGIT,p as TATWEEL,U as appendPkgVersion,C as assign,O as c0_to_uppercase,J as clone,E as concat,s as contains,N as del,x as is_empty,w as is_list,b as is_maghrib_num,f as is_mashriq_num,v as is_none,a as panic,R as pprint,S as print,I as println,o as regexp,L as repeat,m as replace,j as to_int,T as to_lowercase,h as to_maghrib_digit,y as to_maghrib_num,g as to_mashriq_digit,_ as to_mashriq_num,A as to_str};
