const HYPHENATED = [
    "min_width",
    "min_height",
    
    "background_color",
    "background_image",
    "background_position",
    "background_repeat",
    "background_size",
    "background_attachment",
    "_webkite_background_size",

    "aspect_ratio",

    "border_right",
    "border_left",
    "border_top",
    "border_bottom",
    "border_radius",   
    "border_style",

    "margin_top",
    "margin_bottom",
    "margin_right",
    "margin_left",    

    "align_items",
    "text_align",

    "justify_content",
    "justify_items",
    "text_justify",


    "object_fit",

    "font_size",
    "font_family",
    "box_sizing",

    "scrollbar_width",

    "user_select",
    "_ms_user_select",
    "_webkit_user_select",
    "_moz_user_select",

    "box_shadow",
    "_webkit_box_shadow",
    "_moz_box_shadow",

    "no_repeat",

    "border_box",
    "space_between",
    "flex_direction",
    "inter_word",
]

const BOOL_ATTRS = [
    "readonly",
]

const ELEMENTS_WITH_DIR = [
    "html",
    "body",
    "div",
    "span",
    "p",
    "textarea",
    "field",
]

function maybe_hyphenated(id) {
    if(HYPHENATED.includes(id)) {
        return id.replaceAll('_','-')
    } else {
        return id
    }  
}

export { 
    maybe_hyphenated,
    HYPHENATED, 
    BOOL_ATTRS,
    ELEMENTS_WITH_DIR,
}

