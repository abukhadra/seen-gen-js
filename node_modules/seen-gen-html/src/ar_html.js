import {JSGen} from 'seen-gen-js/src/main.js'

import {
    maybe_hyphenated,
    BOOL_ATTRS,
    ELEMENTS_WITH_DIR,
} from './html.js'

import {
    pprint,
    to_maghrib_num,
    is_list,
    to_str,
    panic,
} from 'seen-compiler/src/main.js'

const HTML_tag_en = {
    "صفحة_الشبكة"   : "html",          
    "راس"           : "head",  
    "نسق"           : "style", 
    "متن"           : "body", 
    "منطقة_النص"    : "textarea",
    "عنوان_راسي٣"   : "h3",
    "قسم"           : "div" ,
    "سطر"           : "br"
}

const HTML_attr_en = (id) => { // FIXME: workround
    switch(id) {
        case "صنف"           : return "class"
        case "اعمدة"         : return "cols"
        case "صفوف"         : return "rows"
        case "للقراءة_فقط"   : return "readonly"
        default              : return id
    }
}

const CSS_rule_en = (id) => { // FIXME: workround
    switch(id) {
        case "اختر"          : return "select"
        case "اطارات_رئيسية" : return "keyframes"
        case "عرف_خط"        : return "font-face"
        default              : return id
    }
}

 const CSS_pseudo_en =  {    // FIXME: workaround
        "حوم"               : "hover",
}

const CSS_fn_en = (id) => { // FIXME: workround
    switch(id) {
        case "عند"           : return "at"
        case "ازاحة_س"       : return "translateX"
        case "عنوان"         : return "url"
        default              : return id
    }
}

const CSS_suffix_en = (id) => { // FIXME: workround
    switch(id) {
        case "ع_ص"           : return "px"
        case "ع_ط"           : return "vh"
        case "م_ج"           : return "rem"
        case "ث"             : return "s"
        case "٪"             : return "%"
        default              : return id
    }

}

const CSS_key_en = (id) => {    // FIXME: workround
    switch(id) {
        case "عنصر"          : return "element"
        case "عرض"           : return "width"
        case "ادنى_عرض"      : return "min_width"
        case "ارتفاع"        : return "height"
        case "ادنى_ارتفاع"   : return "min_height"
        
        case "لون"           : return "color"
        case "اتجاه"         : return "direction"
        case "خلفية"         : return "background"
        case "لون_الخلفية"   : return "background_color"
        case "صورة_الخلفية"  : return "background_image"
        case "موقع_الخلفية"  : return "background_position"
        case "تكرار_الخلفية" : return "background_repeat"

        case "ارفاق_الخلفية" : return "background_attachment"

        case "ملائمة_العنصر"  : return "object_fit"

        case "حجم_الخلفية"   : return "background_size"
        case "_آبل_حجم_الخلفية" : return "_webkite_background_size"

        case "فائض"          : return "overflow"
        case "عتامة"         : return "opacity"
        case "اظهار"         : return "display"
        case "هامش"          : return "margin"
        case "هامش_علوي"     : return "margin_top"
        case "هامش_سفلي"     : return "margin_bottom"
        case "هامش_ايمن"     : return "margin_right" 
        case "هامش_ايسر"     : return "margin_left"
        case "بطانة"         : return "padding"
        case "تحجيم_الصندوق" : return "box_sizing"
        case "ضبط_المحتوى"   : return "justify_content"
        case "ضبط_العناصر"   : return "justify_items"
        case "ضبط_النص"      : return "text_justify"
        case "محاذاة_العناصر": return "align_items"
        case "محاذاة_النص"   : return "text_align"
        case "حجم_الخط"      : return "font_size"
        case "فصيلة_الخط"    : return "font_family"
        case "فجوة"          : return "gap"
        case "حدود"          : return "border"
        case "قطر_الحدود"    : return "border_radius"
        case "نسق_الحدود"    : return "border_style"
        case "حدود_خارجية"   : return "outline"
        case "موضع"          : return "position"
        case "تحريك"         : return "animation"
        case "تحول"          : return "transform"
        case "اعادة_تحجيم"   : return "resize"
        case "مصدر"          : return "src"

        case "نسبة_س_ص"      : return "aspect_ratio"

        case "مرن_باتجاه"    : return "flex_direction"

        case "شريط_التمرير_عرض" : return "scrollbar_width"
        
        case "قدرة_اختيار_النص"              : return "user_select"
        case "_مايكروسوفت_قدرة_اختيار_النص"  : return "_ms_user_select"
        case "_آبل_قدرة_اختيار_النص"         : return "_webkit_user_select"
        case "_موزيلا_قدرة_اختيار_النص"       : return "_moz_user_select"

        case "خيال_الصندوق"                  : return "box_shadow"
        case "_آبل_خيال_الصندوق"             : return "_webkit_box_shadow"
        case "_موزيلا_خيال_الصندوق"           : return "_moz_box_shadow"


        default              : return id
    }
}

const CSS_value_en = (id) => { // FIXME: workround
    switch(id) {
        case "تلقائي"        : return "auto"
        case "حدود_الصندوق"  : return "border_box"
        case "بلا_قيمة"       : return "none"
        case "مطلق"          : return "absolute"
        case "مرن"           : return "flex"
        case "مخفي"          : return "hidden"
        case "مركز"          : return "center"
        case "مسافة_بين"     : return "space_between"
        case "بداية"         : return "start"
        case "نهاية"         : return "end"
        case "بارز"          : return "ridge"
        case "لا_نهاية"       : return "infinite"
        case "لا_تكرار"       : return "no_repeat"

        case "احتواء"        : return "contain"
        case "قطع"           : return "clip"

        case "ضعف"           : return "double"

        case "ضبط"           : return "justify"
        case "بين_الكلمات"   : return "inter_word"

        case "مهم"           : return "important"
        case "غير_مهم"       : return "!important"

        case "مثبت"          : return "fixed"

        case "من_اليمين"     : return "rtl"

        case "عمودي"         : return "column"
        case "افقي"          : return "row"

        case "سماوي_فاتح"    : return "lightskyblue"
        case "ابيض"          : return "white"
        case "اصفر"          : return "yellow"
        case "اسود"          : return "black"
        case "برتقالي"       : return "orange"
        default              : return id
    }
}

const CSS_str_en = (id) => { // FIXME: workround
    switch(id) { 
        case "متن"          : return "body"
        case "صفحة_الشبكة"  : return "html"
        default             : return id
    }
}

export default function write_ar_html(el, page) {
    const stack = []
    switch (el.id) {
        case 'call':
            const id = el.v[0].v.v[1]
            const tag = HTML_tag_en[id] || id
            const attrs = el.v[1] || []
            const children = el.v[2] || []
            if(tag === 'br') { return page += '<br>' }
            switch (tag) {
                case 'اختر': page = write_ar_css(attrs, page) + '} '; break
                case 'عرف_خط': page = write_ar_css_fontface(attrs, page); break
                case 'اطارات_رئيسية': page = write_ar_css_keyframes(attrs, children, page); break
                default:
                    stack.push(tag)
                    page += `<${tag}`

                    if( ELEMENTS_WITH_DIR.includes(tag)) { page += ` dir='rtl'` } 
                    attrs.forEach((attr, i) => {
                        if (i === 0 && attr.id === 'str') {
                            page += ` id='${attr.v.v[1]}'`
                        } else if (attr.id === 'named_arg') {
                            const attr_name = HTML_attr_en(attr.v[0].v[1])
                            if(BOOL_ATTRS.includes(attr_name)) {
                                page += ` ${attr_name} `    
                            } else {
                                page += ` ${attr_name}= `
                                if (attr.v[1].id === 'str') {
                                    page += `'${attr.v[1].v.v[1]}'`
                                } else if (attr.v[1].id === 'int' || attr.v[1].id === 'float') {
                                    const num = to_maghrib_num(attr.v[1].v[0].v[1])
                                    const suffix = attr.v[1].v[1]? CSS_suffix_en(attr.v[1].v[1].v[1]) || '' : ''
                                    page += `${num}${suffix}`
                                } else if (attr.v[1].id === 'bool') {
                                    page += `${HTML_attr_en(attr_name)}`

                                }else { panic('not supported: ' + to_str(attr)) }
                            }

                        } else {
                            panic('not supported: ' + to_str(attr))
                        }
                    })
                    page += '>'
                    children.forEach(c => { page = write_ar_html(c, page) })
                    stack.pop()
                    page += `</${tag}>`
            }
            break
        case 'str': page += el.v.v[1]; break
        default: panic('unknown html element: ' + to_str(el))
    }
    return page
}

function write_ar_css(attrs, page) {
    attrs.forEach(attr => {
        const k = maybe_hyphenated(CSS_key_en(attr.v[0].v[1]))
        const v = attr.v[1]
        if (k === 'element') {
            page = write_ar_css_selector(v, page)
            page += ' {'
        } else {
            page += `${k} : `
            page = write_ar_css_attr_value(v, page)
            page += `; `
        }
    })
    return page
}

function write_ar_css_selector(v, page) {
    const translate = (path) => {
        const get_regexp = (k) => RegExp(`(?<![p{L}\\p{N}_])${k}(?![\\p{L}\\p{N}_])`, 'ug')
        Object.keys(HTML_tag_en).forEach(k => {
            path = path.replaceAll(get_regexp(k), HTML_tag_en[k])
        })
        Object.keys(CSS_pseudo_en).forEach(k => {
            path = path.replaceAll(get_regexp(k), CSS_pseudo_en[k])
        })
        return path
    }

    if (is_list(v.v)) {
        page += ' '
        v.v.forEach((selector, i) => {
            let path = selector.v.v[1]            
            page += translate(path)
            if (i < v.v.length - 1) { page += ',' }
        })
    } else {
        const path = v.v.v[1]
        page += translate(path)
    }
    return page
}

function write_ar_css_attr_value(v, page) {
    switch (v.id) {
        case 'bool':
                panic() // FIXME
            break;
        case 'int':
        case 'float':
            const num = to_maghrib_num(v.v[0].v[1])
            const suffix = CSS_suffix_en(v.v[1] && v.v[1].v[1]) || ''
            page += num + suffix
            break
        case 'prefix':
            page += v.v.op.v
            page = write_ar_css_attr_value(v.v.opr, page)
            break
        case 'postfix':
            page = write_ar_css_attr_value(v.v.opr, page)
            page += v.v.op.v
            break
        case 'str': page += CSS_str_en(v.v.v[1]); break;
        case 'ref': page += maybe_hyphenated(CSS_value_en(v.v.v[1])); break;
        case 'tuple':   // FIXME: this depends on order, some things require order in css and others do not
            v.v.forEach(el => {
                page = write_ar_css_attr_value(el, page + ' ')
            })
            break;
        case 'call':
            const ref = CSS_fn_en(v.v[0].v.v[1])
            const args = v.v[1]
            page += ` ${ref}(`
            args.forEach(arg => {
                page = write_ar_css_attr_value(arg, page)
            })
            page += `)`
            break
        case 'bin': 
            const gen = new JSGen()
            // gen.init([v])
            gen.init()
            gen.write_expr(v)
            const code = gen.get_code()
            page += '${' + code + '}'.trim() 
            break
        default: panic(`not supported: html generations:  ${to_str(v)}`)
    }
    return page
}

function write_ar_css_fontface(attrs, page) {
    page += `@font-face { `    
    page = write_ar_css(attrs,page)
    page += '}'
    return page
}

function write_ar_css_keyframes(attrs, children, page) {
    // FIXME we are not covering all the cases: 
    // attrs[0] is only for keyframes('id'), what if user passes keyframes(id: 'id')
    page += ` @keyframes ${attrs[0].v.v[1]} { `
    children && children.forEach(c => {
        const ref = c.v[0].v.v[1]
        const v = CSS_value_en(c.v[1])
        switch (ref) {
            case 'عند':
                const percentage = v[0]
                const attrs = v[1].v || []
                page = write_ar_css_attr_value(percentage, page)
                page += ' {'
                attrs.forEach(attr => {
                    if (attr.id === 'named_tuple') {
                        attr.v.forEach(el => {
                            const _k = maybe_hyphenated(CSS_key_en(el[0].v[1]))
                            const _v = CSS_value_en(el[1])
                            page += ` ${_k} : `
                            page = write_ar_css_attr_value(_v, page)
                            page += `; `
                        })
                    } else {
                        const _k = maybe_hyphenated(CSS_key_en(attr[0].v[1]))
                        const _v = CSS_value_en(attr[1])
                        page += ` ${_k} : `
                        page = write_ar_css_attr_value(_v, page)
                        page += `; `    
                    }
                })
                page += '} '
                break
            default: panic('unsupported element: ' + to_str(ref))
        }
    })
    page += '}'
    return page
}


export {
    HTML_attr_en,
    CSS_value_en,
    CSS_str_en
}
