import {regexp} from './util.js'

const MASHRIQ_DIGIT = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] 
const MAGHRIB_DIGIT = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] 
const TATWEEL = '\u{640}' 
const ANY_LETTER = regexp("\\p{L}") 
const ANY_NUM = regexp("\\p{N}") 
const AR_KEYWORD = {
    "???" : "as",
    "صحيح": "true",
    "غير_صحيح": "false",
    "عندما": "when",
    "حيث": "where",
    "احضر": "use",
    "عرف" : "let",
    "ثابت": "const",
    "متغير": "var",
    "دل": "fn",
    "نوع": "type",
    "سمة": "trait",
    "???": "impl",
    "رد": "return",
    "نفذ" : "do",
}

const EN_KEYWORD = { 
    "as" : "???",
    "true" : "صحيح",
    "false" : "غير_صحيح",
    "when" : "عندما",
    "where" : "حيث",
    "use" : "احضر",
    "let" : "عرف",
    "const" : "ثابت",
    "var" : "متغير",
    "fn" : "دل",
    "type" : "نوع",
    "trait" : "سمة",
    "impl" : "???",
    "return" : "رد",
    "do" : "نفذ",
}


export { 
    MASHRIQ_DIGIT , MAGHRIB_DIGIT,
    ANY_NUM , ANY_LETTER,
    AR_KEYWORD, EN_KEYWORD,
    TATWEEL,
}