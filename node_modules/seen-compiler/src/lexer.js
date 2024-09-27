import { Err } from './err.js'

import { 
    MASHRIQ_DIGIT, MAGHRIB_DIGIT,
    ANY_NUM , ANY_LETTER,
    AR_KEYWORD, EN_KEYWORD,
    TATWEEL,    
} from './constants.js'

import {    
    is_none , contains,
    pprint, 
    clone
} from './util.js'

class Loc { line ; column ;  constructor(line, column) { this.line = line ; this.column = column ; return this } }
class Token { 
    v ; loc 
    constructor(v, loc) {
        this.v = v
        this.loc = loc
        return this
    }
}

export default class Lexer {
    lang
    code
    start_loc
    end_loc
    tokens
    errs
    current_index
    current
    lookbehind
    ignore_cmts_ws

    constructor(lang, code, start_loc, end_loc, tokens, errs, current_index, current, lookbehind, ignore_cmts_ws) {
        this.lang = lang
        this.code = code
        this.start_loc = start_loc
        this.end_loc = end_loc
        this.tokens = tokens
        this.errs = errs
        this.current_index = current_index
        this.current = current
        this.lookbehind = lookbehind
        this.ignore_cmts_ws = ignore_cmts_ws
        return this
    }

    init(lang, code, ignore_cmts_ws) {
        this.lang = lang
        this.code = code
        this.start_loc = new Loc(1, 1)
        this.end_loc = new Loc(1, 1)
        this.tokens = []
        this.errs = []
        this.current_index = -1
        this.current = null
        this.lookbehind = null
        this.ignore_cmts_ws = ignore_cmts_ws
    }

    run() {       
            if(this.lang === "ar") { 
                this.ar() 
            } else if(this.lang === "en") {
                this.en()
            } 
        this.start_loc = clone(this.end_loc)
        this.add_token("$eof")
    }

    add_token(v) {
        const tk = new Token(v, clone(this.start_loc))
        this.tokens.push(tk)
    }

    next() {
        this.lookbehind = this.current
        this.current_index += 1
        const c = this.code[this.current_index]
        this.current = c
        if(c === '\n') {
            this.end_loc.line += 1
            this.end_loc.column = 1
        } else {
            this.end_loc.column += 1
        }
        return this.current
    }

    lookahead() { return this.code[this.current_index + 1] }

    skip(count) {
        while(count > 0) {
            this.next()
            count -= 1
        }
    }

    insert_err(msg) {
        const err = new Err(msg, clone(this.start_loc), clone(this.end_loc))
        this.errs.push(err)
    }

    last_token() { return this.tokens[this.tokens.length - 1] }

    skip_invalid_num_or_id() {
        while(this.expect_letter() || this.expect_num() || this.expect_underscore()) {
            this.skip(1)
        }
    }

    expect_tatweel() { return this.lookahead() === TATWEEL }
    expect_nl_behind() { return this.lookbehind === '\n' }    
    expect_none_behind() { return is_none(this.lookbehind) }
    expect_none_ahead() { return is_none(this.lookahead()) }
    expect_ws_behind() { return this.lookbehind === '\n' || this.lookbehind === ' ' || this.lookbehind === '\r' || this.lookbehind === '\t' }
    expect_space_ahead() { return this.lookahead() === ' ' || this.lookahead() === '\t' }
    expect_ws_ahead() { return this.lookahead() === '\n' || this.lookahead() === ' ' || this.lookahead() === '\r' || this.lookahead() === '\t' }
    expect_nl_ahead() { return this.lookahead() === '\n' }
    expect_separator_behind() { return this.lookbehind === ',' || this.lookbehind === ';' || this.lookbehind === ';;' || this.lookbehind === ':' || this.lookbehind === '(' || this.lookbehind === '[' || this.lookbehind === '{' || this.lookbehind === '<' }
    expect_separator_ahead() { return this.lookahead() === ',' || this.lookahead() === ';' || this.lookahead() === ';;' || this.lookahead() === ':' || this.lookahead() === ')' || this.lookahead() === ']' || this.lookahead() === '}' || this.lookahead() === '>' }
    expect_open_bracket() { return this.lookahead() === '[' }
    expect_open_paren() { return this.lookahead() === '(' }
    expect_letter() {
        if(this.lookahead()) { return this.lookahead().match(ANY_LETTER) }
    }
    expect_num() { return this.lookahead().match(ANY_NUM) }
    expect_underscore() { return this.lookahead() === '_' }
    expect_eof() { return is_none(this.lookahead()) }
    expect_eol() { return this.lookahead() === '\n' || this.lookahead() === '\r' || this.expect_eof() }

    multi_comment() {
        if('-' === this.lookahead()) {
            let v = ""
            const levels = []
            while(!this.expect_eof()) {
                if('{' === this.current && '-' === this.lookahead()) {
                    v += this.next() + this.next()
                    levels.push(clone(this.end_loc))

                } else if('-' === this.current && '}' === this.lookahead()) {
                    if(levels.length > 1) {
                        v += this.next() + this.next()
                        levels.pop()

                    } else {
                        v += this.next()
                        levels.pop()
                        break
                    }
                } else {
                    v += this.next()
                }
            }
            const loc = levels.pop()
            if(loc) {
                this.start_loc = clone(loc)
                this.insert_err("unclosed comment")
            }
            if(!this.ignore_cmts_ws) { this.add_token(["--", v]) }
            return true
        }
    }

    ar_escape_char() {
        let sym = this.current
        if('٪' === sym) {
            let c = this.next()
            switch(c) {
                case '(': 
                    c = this.next()
                    switch(c) {
                        case 'س': c = '\n' ; break
                        case 'ر': c = '\r' ; break
                        case 'ج': c = '\t' ; break
                        case '‹': c = '‹'  ; break
                        case '›': c = '›'  ; break
                        case '«': c = '«'  ; break
                        case '»': c = '»'  ; break        
                    }
                    if( this.next() !== ')') { this.insert_err("invalid_escape_character: " + c)}
                    break
                case '٪': c = '٪'  ; break                    
                case '{': c = '${'  ; break
                default: { this.insert_err("invalid escape character: " + c) }
            }
            return c
        } else { 
            return this.current
        }
    }

    en_escape_char() {
        const sym = this.current
        if('%' === sym) {
            let c = this.next()
            switch(c) {
                case 'n': c = '\n' ; break
                case 'r': c = '\r' ; break
                case 't': c = '\t' ; break
                case '\'': c = '\'' ; break
                case '"': c = '"' ; break
                case '%': c = '%' ; break
                case '{': c = '${'  ; break
                default: { this.insert_err("invalid escape character: " + c) }
                break
            }
            return c
        } else {
            return this.current
        }
    }

    enclosed_val(sym) {
        let v = ""
        while(!this.expect_eof()) {
            this.next()
            if(sym === this.current) { break }
            if(this.expect_eol()) {
                this.insert_err("unclosed literal, expecting: " + sym)
                break
            }
            if(this.lang === "ar") { 
                v += this.ar_escape_char()
            } else {
                v += this.en_escape_char()
            }
        }
        return v
    }

    ar_str() {
        if('«' === this.lookahead()) {
            this.ar_multi_str()
        } else {
            this.add_token(["str", this.enclosed_val('»')])
        }
    }

    en_str() {
        if('"' === this.lookahead()) {
            this.en_multi_str()
        } else {
            this.add_token(["str", this.enclosed_val('\'')])
        }
    }

    multi_str(sym) {
        let c = ""
        let v = ""
        while(!this.expect_eof()) {
            this.next()
            if(this.expect_eof()) {
                this.insert_err("unclosed multiline String literal, expecting " + sym)
                break
            }
            if(sym === this.current && sym === this.lookahead()) {
                this.skip(1)
                if(this.lookahead() === sym) {
                    this.skip(1)
                    this.add_token(["str", v])
                    break
                } else {
                    c += sym + sym
                }
            } else {
                if(this.lang === "ar") {
                    v += this.ar_escape_char()
                } else {
                    v += this.en_escape_char()
                }
                v += c
            }
        }
    }

    ar_multi_str(sym) {
        this.skip(1)
        if('«' === this.lookahead()) {
            this.skip(1)
            this.multi_str('»')
        } else {
            this.add_token(["str", ""])
        }
    }

    en_multi_str(sym) {
        this.skip(1)
        if('"' === this.lookahead()) {
            this.skip(1)
            this.multi_str('"')
        } else {
            this.add_token(["str", ""])
        }
    }

    equal() {
        const sym = []
        while('=' === this.lookahead()) { sym.push(this.next()) }
        if(sym.length === 0) {
            this.add_token("=")
        } else if(sym.length === 1) {
            this.add_token("==")
        } else if(sym.length > 1) {
            if(!this.ignore_cmts_ws) {
                this.add_token(["===", sym.length + 1])
            }
        } else {
            return false
        }
        return true
    }

    thick_arrow() {
        if('>' === this.lookahead()) {
            this.next()
            this.add_token("=>")
            return true
        }
    }

    add_asgmt() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token("+=")
            return true
        }
    }

    add() {
        this.add_token("+")
        return true
    }

    sub_asgmt() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token("-=")
            return true
        }
    }

    thin_arrow() {
        if('>' === this.lookahead()) {
            this.next()
            this.add_token("->")
            return true
        }
    }

    dash() {
        const sym = []
        while('-' === this.lookahead()) {
            sym.push(this.next())
        }
        if(sym.length === 0) {
            this.add_token("-")
        } else if(sym.length > 1) {
            if(!this.ignore_cmts_ws) {
                this.add_token(["---", sym.length + 1])
            }
        } else {
            return false
        }
        return true
    }

    tilde() {
        const sym = []
        if('~' === this.lookahead()) {
            this.next()
            this.add_token("~")
            return true
        }
    }

    mul_asgmt() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token("*=")
            return true
        }
    }

    mul() {
        this.add_token("*")
        return true
    }

    asterisk() {
        let sym = "*"
        while('*' === this.lookahead()) {
            sym += this.next()
        }
        if(sym.length === 1) {
            this.mul()
        } else {
            return false
        }
        return true    
    }

    ar_div_asgmt() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token("\\=")
            return true
        }
    }

    div_asgmt() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token("/=")
            return true
        }
    }

    comment() {
        if('-' === this.lookahead()) {
            let v = ""
            while(!this.expect_eof()) {
                if(this.expect_eol()) {
                    break
                } else {
                    v += this.next()
                }
            }

            if(!this.ignore_cmts_ws) {
                this.add_token(["--", v])
            }
            return true
        }
    }

    ar_div() {
        this.add_token("\\")
        return true
    }

    div() {
        this.add_token("/")
        return true
    }

    ne() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token("!=")
            return true
        }
    }

    exclamation() {
        this.add_token("!")
        return true
    }

    ge() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token(">=")
            return true
        }
    }

    gt() {
        this.add_token(">")
        return true
    }

    le() {
        if('=' === this.lookahead()) {
            this.next()
            this.add_token("<=")
            return true
        }
    }

    lt() {
        this.add_token("<")
        return true
    }

    and() {
        if(this.lookahead() === '&') {
            this.skip(1)
            this.add_token("&&")
            return true
        } else {
            this.add_token("&")
            return true
        }
    }

    or_listpipe() {
        if(this.lookahead() === '|') {
            this.skip(1)
            if(this.lookahead() === '>') {
                this.skip(1)
                this.add_token("||>")
                return true    
            }
            this.add_token("||")
            return true
        } 
    }

    pipe() {
        if(this.lookahead() === '>') {
            this.skip(1)
            this.add_token("|>")
            return true
        }
    }

    bar() {
        this.add_token("|")
        return true
    }

    mashriq_float() {
        if(contains(MASHRIQ_DIGIT, this.lookahead())) {
            v = this.current + this.mashriq_fract()
            this.add_token(["float", v])
        } else {
            this.insert_err("ill-formed floating point number")
        }
    }

    maghrib_float() {
        if(contains(MAGHRIB_DIGIT, this.lookahead())) {
            v = this.current + this.maghrib_fract()
            this.add_token(["float", v])
            return true
        }
    }

    ddot() {
        if('.' === this.lookahead()) {
            this.skip(1)
            this.add_token("..")
            return true
        }
    }

    dot() {
        this.add_token(".")
        return true
    }

    deconstruct() {
        if(this.lookahead() === '>') {
            this.skip(1)
            this.add_token(":>")
            return true
        }
    }

    decl() {
        if(this.lookahead() === '=') {
            this.skip(1)
            this.add_token(":=")
            return true
        }
    }

    dcolon() {
        if(this.lookahead() === ':') {
            this.skip(1)
            if(this.lookahead() === '=') {
                this.skip(1)
                this.add_token("::=")

            } else {
                this.add_token("::")
            }
            return true
        }
    }

    colon() {
        this.add_token(":")
        return true
    }

    ar_semicolon() {
        this.add_token(";")
        return true
    }

    en_semicolon() {
        this.add_token(";")
        return true
    }

    mashriq_num() {
        let v = this.current
        let is_float = false
        while(true) {
            if(contains(MASHRIQ_DIGIT, this.lookahead())) {
                v += this.next()
            } else if(contains(MAGHRIB_DIGIT, this.lookahead())) {
                this.insert_err("you can either use Mashriq digits (٠ - ٩) or Maghrib digits (0 - 9) but not a mix: " + this.current)
                this.skip_invalid_num_or_id()
            } else if(',' === this.lookahead()) {
                v += this.next()
                is_float = true
                v += this.maghrib_fract()
            } else {
                break
            }
            if(this.expect_eof()) { break  }
        }

        if(this.is_float) {
            this.add_token(["float", v])
        } else {
            this.add_token(["int", v])
        }
    }

    maghrib_num() {
        let v = this.current
        let is_float = false
        while(true) {
            if(contains(MAGHRIB_DIGIT, this.lookahead())) {
                v += this.next()
            } else if(contains(MASHRIQ_DIGIT, this.lookahead())) {
                this.insert_err("you can either use Eastern Arabic digits (٠ - ٩) or Western (0 - 9) but not a mix: " + this.current)
                this.skip_invalid_num_or_id()
            } else if('.' === this.lookahead()) {
                v += this.next()
                is_float = true
                v += this.maghrib_fract()
            } else {
                break
            }
            if(this.expect_eof()) {  break  }
        }

        if(is_float) {
            this.add_token(["float", v])
        } else {
            this.add_token(["int", v])
        }
    }

    ar_id() {
        let v = this.current
        while(!this.expect_eof()) {
            if(this.expect_letter() || this.expect_num() || this.expect_underscore()) {
                if(this.expect_tatweel()) {
                    if(!contains(["ف", "ل", "اه", "ك"], v)) {
                        this.skip(1)
                    } else {
                        v += this.next()
                    }
                } else {
                    v += this.next()
                }
            } else {
                break
            }
        }
        
        if(AR_KEYWORD[v]) {
            this.add_token(["key", AR_KEYWORD[v]])
        } else {
            this.add_token(["id", v])
        }
    }

    en_id() {
        let v = this.current        
        while(!this.expect_eof()) {            
            if(this.expect_letter() || this.expect_num() || this.expect_underscore()) {
                v += this.next()
            } else {
                break
            }
        }
        if(EN_KEYWORD[v]) {
            this.add_token(["key", v])
        } else {
            this.add_token(["id", v])
        }
    }

    mashriq_fract() {
        let v = ""
        while(!this.expect_eof()) {
            if(contains(MASHRIQ_DIGIT, this.lookahead())) {
                v += this.next()
            } else {
                break
            }
        }
        return v
    }

    maghrib_float() {
        if(contains(MAGHRIB_DIGIT, this.lookahead())) {
            const v = this.current + this.maghrib_fract()
            this.add_token(["float", v])
            return true
        }
    }

    maghrib_fract() {
        let v = ""
        while(!this.expect_eof()) {
            if(contains(MAGHRIB_DIGIT, this.lookahead())) {
                v += this.next()
            } else {
                break
            }
        }
        return v
    }

    new_line() {
        let count = 1
        while(true) {
            if(this.lookahead() === '\n') {
                this.skip(1)
                count += 1
            } else {
                if(this.last_token() && this.last_token().v !== '\n') {
                    this.add_token(['\n', count])
                }
                break
            }
        }
    }

    ar() {
        while(!this.expect_eof()) {
            this.start_loc = clone(this.end_loc)
            const c = this.next()
            switch(c) {
                case '؟': this.add_token("?") ; break
                case '٪': this.add_token('%'); break
                case ',': this.mashriq_float() ; break
                case '.': this.maghrib_float() || this.ddot() || this.dot() ; break
                case '،': this.add_token(",") ; break
                case '×': this.mul_asgmt() || this.mul() ; break
                case '*': this.mul_asgmt() || this.asterisk() ; break
                case '÷': case '/': this.div_asgmt() || this.div() ; break
                case '\\': this.ar_div_asgmt() || this.ar_div() ; break
                case '؛': this.ar_semicolon() ; break
                case '«': this.ar_str() ; break
                default: { 
                    if(contains(MASHRIQ_DIGIT, c)) {
                        this.mashriq_num()
                    } else if(contains(MAGHRIB_DIGIT, c)) {
                        this.maghrib_num()
                    } else {
                        if(c === '_' ||  c.match(ANY_LETTER) ) {
                            this.ar_id()
                        } else {
                            this.common(c)
                        }
                    }
                }
            }
        }
    }

    en() {
        while(!this.expect_eof()) {            
            this.start_loc = clone(this.end_loc)
            const c = this.next()
            switch(c) { 
                case '?': this.add_token("?") ; break
                case '%': this.add_token('%'); break
                case '.': this.maghrib_float() || this.ddot() || this.dot() ; break
                case ',': this.add_token(",") ; break
                case '*': this.mul_asgmt() || this.asterisk() ; break
                case '/': this.div_asgmt() || this.div() ; break
                case ';': this.en_semicolon() ; break
                case '\'': this.en_str() ; break
                default: {
                    if(contains(MAGHRIB_DIGIT, c)) {
                        this.maghrib_num()
                    } else if(contains(MASHRIQ_DIGIT, c)) {
                        this.insert_err("only English Numerals are allowed in English source files: " + this.current)
                        this.skip_invalid_num_or_id()
                    } else {
                        if(c === '_' || c.match(ANY_LETTER)) {
                            this.en_id()
                        } else {
                            this.common(c)
                        }
                    }
                }
            }
        }
    }

    common(c) {
        switch(c) {
            case '\n': this.new_line() ; break
            case '\r': case '\t': case ' ': { if(!this.ignore_cmts_ws) {  this.add_token(c)  } } break
            case '&': this.and() ; break
            case '|': this.pipe() || this.or_listpipe()  || this.bar()  ; break
            case '+': this.add_asgmt() || this.add() ; break
            case '-': this.comment() || this.sub_asgmt() || this.thin_arrow() || this.dash() ; break
            case '~': this.tilde() ; break
            case '^': this.add_token("^") ; break
            case '=': this.thick_arrow() || this.equal() ; break
            case '!': this.ne() || this.exclamation() ; break
            case '>': this.ge() || this.gt() ; break
            case '<': this.le() || this.lt() ; break
            case ':': this.deconstruct() || this.decl() || this.dcolon() || this.colon() ; break
            case '`': this.transl() ; break                
            case '$': this.add_token("$") ; break
            case '[': this.add_token("[") ; break
            case ']': this.add_token("]") ; break
            case '(': this.add_token("(") ; break
            case ')': this.add_token(")") ; break
            case '{':  this.multi_comment() || this.add_token("{") ; break
            case '}': this.add_token("}") ; break
            default: this.insert_err("unrecognized character: " + this.current) 
        }
    }
}
