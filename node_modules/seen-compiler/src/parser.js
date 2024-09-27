import {funcs, structs} from './symtab.js'

import {
    Mod,
    Pair,
    Uni,
    Bin,
    Fn,
    FnParam,
    TypeDef,
    StructLEl,
    Asgmt,
    When,
    WhenArm,
    Type,
    TypeDynamic,
    TypeTempl,
    EnumPat,
    Node
} from './ast.js'

import {
    pprint,
    is_none , is_list , contains, is_empty,
    to_str,
    replace ,
    clone,
    panic,    
} from './util.js'

const BIN_OP            = ["+", "-", "*", "/" , "[", "~=", "::", ":=", "=", "+=", "-=", "*=", "/=", "|=", "&=", "==", "!=", ">", ">=", "<", "<=", "|", "||", "|>", "||>", ":>", "&", "&&", ".", ".."] 
const PREFIX_UNI_OP     = [".", "!", "not", "-", "+"] 
const POSTFIX_UNI_OP    = ["?", "!", "%"] 
const BIN_R_ASSOC       = ["=", ":" , "::" , ":=", "~=", "+=", "-=", "*=", "/=", "÷=", "&=" , "&&=" , "|=", "||="] 

export default class Parser {
    tokens
    current_index
    skipped_new_line
    current
    ast
    tabs
    attrs
    errs
    
    init(tokens) {
        this.tokens = tokens
        this.current_index = -1
        this.skipped_new_line = false
        this.current = null
        this.ast = []
        this.attrs = []
        this.errs = []
    }

    run() {
        this.next()
        while(!this.is_eof()) {
            let parsed = false
            if(this.maybe_attrs()) {
                this.maybe_modifier()
                parsed = this.maybe_typedef() || this.maybe_consts_or_fns() 
            } else if(this.is_modifier()) {
                this.maybe_modifier()
                parsed = this.maybe_consts_or_fns() || this.maybe_typedef() 
            } else {
                parsed = this.maybe_use() || this.maybe_consts_or_fns() || this.maybe_typedef()  
            }

            if(!parsed) { panic("invalid syntax: " + to_str(this.current)) }
        }
    }

    next(nl) {        
        this.current_index += 1        
        const tk = this.tokens[this.current_index]
        this.current = tk
        if(tk.v[0] === '\n') {
            this.skipped_new_line = true
            this.next(true)
        } else {
            if(!nl) { this.skipped_new_line = false }
        }
        return this.current
    }

    backtrack() {
        this.current_index -= 1
        const tk = this.tokens[this.current_index]
        this.current = tk
        if(tk.v[0] === '\n') { this.backtrack() }
    }

    skip() { return this.next() }
    lookahead() { return this.lookahead_n(1) }
    lookahead_n(n) {
        let j = this.current_index
        while(n > 0) {
            j += 1
            while(true) {
                const tk = this.tokens[j]
                let nl
                if(tk) { nl = tk.v[0] === '\n' }
                if(nl) { j += 1 } else { break }
            }    
            n -= 1
        }
        return this.tokens[j]
    }

    lookahead_ws() {
        const i = this.current_index + 1
        return this.tokens[i]
    }

    is_eof() { return this.current.v === "$eof" }
    is_newline() { return this.skipped_new_line }
    is_asterisk() { return this.current.v === "*" }
    is_asgmt() { return this.current.v === "=" }
    is_hash() { return this.current.v === "--" }
    is_percent() { return this.current.v === "%" }
    is_dpercent() { return this.current.v === "%%" }
    is_behind_none() { return is_none(this.lookbehind) }
    is_behind_nl() { return this.lookbehind === '\n' }
    is_dot() { return this.current.v === "." }
    is_colon() { return this.current.v === ":" }
    is_dcolon() { return this.current.v === "::" }
    is_caret() { return this.current.v === "^" }
    is_semicolon() { return this.current.v === ";" }
    is_comma() { return this.current.v === "," }
    is_backtick() { return this.current.v === "`" }
    is_tbacktick() { return this.current.v[0] === "```" }
    is_underscore() { return this.is_id() && this.current.v[1] === "_" }
    is_plus() { return this.current.v === "+" }
    is_minus() { return this.current.v === "-" }
    is_exclamation() { return this.current.v === "!" }
    is_question() { return this.current.v === "?" }
    is_bar() { return this.current.v === "|" }
    is_thin_arrow() { return this.current.v === "->" }
    is_thick_arrow() { return this.current.v === "=>" }
    is_tilde() { return this.current.v === "~" }
    is_or() { return this.is_keyword("or") }
    is_and() { return this.is_keyword("and") }
    is_not() { return this.is_keyword("not") }
    is_use() { return this.is_keyword("use") }
    is_let() { return this.is_keyword("let") }
    is_if_let() { return this.is_keyword("if_let") }
    is_const()  { return this.is_keyword("const") }
    is_var()    { return this.is_keyword("var") }
    is_then()   { return this.is_keyword("then") }
    is_do() { return this.is_keyword("do") }
    is_end() { return this.is_keyword("end") }
    is_fn() { return this.is_keyword("fn") }
    is_alias() { return this.is_keyword("alias") }
    is_typedef() { return this.is_keyword("type") }
    is_open_paren() { return this.current.v === "(" }
    is_close_paren() { return this.current.v === ")" }
    is_open_curly() { return this.current.v === "{" }
    is_close_curly() { return this.current.v === "}" }
    is_open_bracket() { return this.current.v === "[" }
    is_close_bracket() { return this.current.v === "]" }
    is_open_angle() { return this.current.v === "<" }
    is_close_angle() { return this.current.v === ">" }
    is_double_close_angle() { return this.current.v === ">>" }
    is_if() { return this.is_keyword("if") }
    is_else() { return this.is_keyword("else") }
    is_ret() { return this.is_keyword("return") }
    is_break() { return this.is_keyword("break") }
    is_when() { return this.is_keyword("when") }
    is_for() { return this.is_keyword("for")  }
    is_in() { return this.is_keyword("in") }
    is_while() { return this.is_keyword("while") }
    is_bool() { return this.is_keyword("true") || this.is_keyword("false")  }
    is_char() { return this.current.v[0] === "char" }
    is_str() { return this.current.v[0] === "str" }
    is_int() { return this.current.v[0] === "int" }
    is_float() { return this.current.v[0] === "float" }
    is_modifier() {
        const plus_or_minus = this.expect_plus() || this.expect_minus() && this.lookahead_n(2).v === ")"
        return this.is_open_paren() && plus_or_minus
    }
    is_this() { return this.is_keyword("this") }    
    is_keyword(id) { return this.current.v[0] === "key" && this.current.v[1] === id }
    is_id() { return this.current.v[0] === "id" }
    is_id_pat() { return this.current.v[0] === "id" }
    is_bool_pat() { return this.current.v[0] === "bool" }
    is_char_pat() { return this.current.v[0] === "char" }
    is_str_pat() { return this.current.v[0] === "str" }
    is_int_pat() { return this.current.v[0] === "int" }
    is_float_pat() { return this.current.v[0] === "float" }
    is_tuple_pat() { return this.is_open_paren() }
    is_list_pat() { return this.is_open_bracket() }
    is_structl_pat() { return this.is_open_curly() }
    is_enum_pat() { return this.is_dot() }
    is_pat() { return this.is_bool_pat() || this.is_char_pat() || this.is_str_pat() || this.is_int_pat() || this.is_float_pat() || this.is_list_pat() || this.is_tuple_pat() || this.is_structl_pat() || this.is_enum_pat() || this.is_id_pat() || this.is_underscore() }

    is_assoc_fn() {
        if(!is_list(this.current.v)) { return }
        return this.is_fn() && this.lookahead().v === "^"
    }

    is_method() {
        if(!is_list(this.current.v)) { return }
        return this.is_fn() && this.lookahead().v !== "^"
    }
    expect_short_asgmt() { return this.lookahead().v === ":=" }
    expect_colon() { return this.lookahead().v === ":" }
    expect_comma() { return this.lookahead().v === "," }
    expect_plus() { return this.lookahead().v === "+" }
    expect_minus() { return this.lookahead().v === "-" }
    expect_id() {
        const tk = this.lookahead().v
        return tk[0] === "id"
    }
    expect_str() {
        const tk = this.lookahead().v
        return tk[0] === "str"
    }
    expect_eof() { return this.lookahead().v === "$eof" }
    expect_close_paren() { return this.lookahead().v === ')' }
    expect_close_bracket() { return this.lookahead().v === ']' }
    expect_open_curly() { return this.lookahead().v === "{" }
    expect_close_curly() { return this.lookahead().v === "}" }
    expect_astrisk() { return this.lookahead().v === "*" }
    expect_asgmt() { return this.lookahead().v === "=" }
    maybe_asgmt() {
        if(this.is_asgmt()) {
            this.next()
            return true
        }
    }
    maybe_comma() {
        if(this.is_comma()) {
            this.next()
            return true
        }
    }
    optional_comma() {
        if(
            this.is_newline() 
            || this.is_close_curly() 
            || this.is_close_paren() 
            || this.is_close_bracket() 
            || this.is_close_angle() 
            || this.is_thin_arrow() 
            || this.is_thick_arrow()
        ) {
            return this.maybe_comma()
        } else {
            return this.req_comma()
        }
    }
    maybe_colon() {
        if(this.is_colon()) {
            this.next()
            return true
        }
    }
    maybe_open_curly() {
        if(this.is_open_curly()) {
            this.next()
            return true
        }
    }    
    maybe_id() {
        if(this.is_id()) {
            const id = this.current
            this.next()
            return id
        }
    }
    maybe_asterisk() {
        if(this.is_asterisk()) {
            const asterisk = this.current
            this.next()
            return this.asterisk
        }
    }
    maybe_open_paren() {
        if(is_open_paren()) {
            this.next()
            return true
        }
    }
    maybe_modifier() {
        if(!this.is_modifier()) { return }
        this.next()
        const n = new Node("modif", "", this.current)
        this.next()
        this.req_close_paren()
        this.ast.push(n)
        return true
    }
    maybe_attrs() {
        while(this.is_hash()) {
            this.skip()
            const id = this.maybe_id()
            if(!this.id) {
                panic("expecting an id: " + to_str(this.current))
            }
            this.attrs.push(id)
            if(this.lookahead().v !== ',') {
                return null
            } else {
                this.skip()
            }
        }
        if(this.attrs.length > 0) { return true }
    }
    maybe_pat() {  if(this.is_pat()) { return this.prim_pat() } }

    req_in() {
        if(this.is_in()) {
            this.next()
            return true
        } else {
            panic("expecting \"in\" : " + to_str(this.current))
        }
    }
    req_asgmt() {
        if(!this.maybe_asgmt()) {
            panic("expecting '=' : " + to_str(this.current))
        }
        return true
    }
    req_comma() {
        if(this.is_comma()) {
            this.next()
            return true
        } else {
            panic("expecting ',' after : " + to_str(this.current))
        }
    }
    req_backtick() { 
        if(this.is_backtick()) { 
            this.next()
            return true
        } else { 
            panic("expecting '`' after : " + to_str(this.current))
        }
    }   
    req_tbacktick() {
        if(this.is_tbacktick()) { 
            this.next()
            return true
        } else {
            panic("expecting '```' after : " + to_str(this.current))
        }
    }      
    req_terminator() { return this.is_newline() || this.is_eof() }
    req_open_paren() {
        if(this.is_open_paren()) {
            this.next()
            return true
        } else {
            panic("expecting '(' : " + to_str(this.current))
        }
    }
    req_close_paren() {
        if(this.is_close_paren()) {
            this.next()
            return true
        } else {
            panic("expecting ')' : " + to_str(this.current))
        }
    }
    req_open_curly() {
        if(this.is_open_curly()) {
            this.next()
            return true
        } else {
            panic("expecting '{' : " + to_str(this.current))
        }
    }
    req_close_curly() {
        if(this.is_close_curly()) {
            this.next()
            return true
        } else {
            panic("expecting '}' : " + to_str(this.current))
        }
    }
    req_close_angle() {
        if(this.is_close_angle()) {
            this.next()
            return true
        } else {
            panic("expecting '>' : " + to_str(this.current))
        }
    }
    req_colon() {
        if(this.is_colon()) {
            this.next()
            return true
        } else {
            panic("expecting a colon ':' " + to_str(this.current))
        }
    }

    req_dcolon() {
        if(this.is_dcolon()) {
            this.next()
            return true
        } else {
            panic("expecting a double colon '::' " + to_str(this.current))
        }
    }

    req_open_bracket() {
        if(this.is_open_bracket()) {
            this.next()
            return true
        } else {
            panic("expecting '[' : " + to_str(this.current))
        }
    }
    req_close_bracket() {
        if(this.is_close_bracket()) {
            this.next()
            return true
        } else {
            panic("expecting ']' : " + to_str(this.current))
        }
    }
    req_thin_arrow() {
        if(this.is_thin_arrow()) {
            this.next()
            return true
        } else {
            panic("expecting '->' : " + to_str(this.current))
        }
    }
    req_thick_arrow() {
        if(this.is_thick_arrow()) {
            this.next()
            return true
        } else {
            panic("expecting '=>' : " + to_str(this.current))
        }
    }

    req_then() {
        if(this.is_then()) {
            this.next()
            return true
        } else {
            panic("expecting 'then' : " + to_str(this.current))
        }
    }    
  

    req_pat() {
        const _pat = this.maybe_pat()
        if(_pat) {
            return _pat
        } else {
            panic("expecting a pattern: " + to_str(this.current))
        }
    }

    prim_pat() {
        if(this.is_underscore()) {
            const n = new Node("_", "pat", "")
            this.next()
            return n
        } else if(this.is_bool_pat()) {
            return this.bool_pat()
        } else if(this.is_char_pat()) {
            return this.char_pat()
        } else if(this.is_str_pat()) {
            return this.str_pat()
        } else if(this.is_int_pat()) {
            return this.int_pat()
        } else if(this.is_float_pat()) {
            return this.float_pat()
        } else if(this.is_list_pat()) {
            return this.list_pat()
        } else if(this.is_tuple_pat()) {
            return this.tuple_pat()
        } else if(this.is_structl_pat()) {
            return this.structl_pat()
        } else if(this.is_enum_pat()) {
            return this.enum_pat()
        } else if(this.is_id_pat()) {
            return this.id_pat()
        }
    }

    bool_pat() {
        const n = new Node("bool", "pat", this.current)
        this.next()
        return n
    }

    char_pat() {
        const n = new Node("char", "pat", this.current)
        this.next()
        return n
    }

    str_pat() {
        const n = new Node("str", "pat", this.current)
        this.next()
        return n
    }

    int_pat() {
        const n = new Node("int", "pat", this.current)
        this.next()
        return n
    }

    float_pat() {
        const n = new Node("float", "pat", this.current)
        this.next()
        return n
    }

    list_pat() {
        if(!this.is_open_bracket()) { return }
        this.next()
        const items = []
        this.maybe_comma()
        while(true) {
            if(items.length > 0) {
                if(!this.req_comma()) { return }
            }
            const _pat = this.maybe_pat()
            if(_pat) {
                return items.push(_pat)
            } else {
                break
            }
        }

        this.maybe_comma()
        this.req_close_bracket()
        const n = new Node("[", "pat", items)
        return n
    }

    tuple_pat() {
        if(!this.is_open_paren()) { return }
        this.next()
        const items = []
        this.maybe_comma()
        while(true) {
            if(items.length > 0) { this.req_comma() }
            const _pat = this.maybe_pat()
            if(_pat) {
                return items.push(_pat)
            } else {
                break
            }

        }

        this.maybe_comma()
        this.req_close_paren()
        const n = new Node("(", "pat", items)
        return n
    }

    structl_pat() {
        if(!this.is_open_curly()) {
            return
        }

        this.next()
        const items = []
        this.maybe_comma()
        while(true) {
            if(items.length > 0) {
                this.maybe_comma() || this.req_terminator()

            }

            const id = this.maybe_id()
            if(!id) {
                break
            }

            let v
            if(this.is_colon()) {
                this.next()
                v = this.req_pat()
            }

            const el = new StructLEl(id, v)
            items.push(el)
        }
        this.maybe_comma()
        this.req_close_curly()
        const n = new Node("{", "pat", items)
        return n
    }

    enum_pat() {
        panic("enum patterns are not supported yet")
        const id = this.current
        this.next()
        const p = new EnumPat(id, _pat)
        if(_pat) {
            const n = new Node("enum_pat", "pat", p)
            return n
        }
    }

    id_pat() {
        const id = this.current
        this.next()
        const n = new Node("id", "pat", id)
        return n
    }

    req_body() {
        const stmts = this.stmts()
        const n = new Node("body", "body", stmts)
        return n
    }

    req_body_ret() {
        const body = this.req_body()
        this.implicit_return(body.v)
        return body
    }

    maybe_stmt() {
        if(this.is_eof() || this.is_modifier()) { return } 
        return   this.maybe_break() || this.maybe_const() || this.maybe_let() || this.maybe_expr() || this.maybe_semicolon()        
    }

    req_stmts() {
        const token = this.current
        const stmts = this.stmts()
        if(is_empty(stmts)) {
            panic("expecting a statement : " + to_str(token))
        } else {
            return stmts
        }
    }

    stmts() {
        let _stmts = []
        let stmt
        while(true) {
            stmt = this.maybe_stmt()
            if(stmt) { _stmts.push(stmt) }
            if(!stmt) { break }
        }
        return _stmts
    }

    maybe_ret() {
        if(!this.is_ret()) { return }
        this.next()
        const expr = this.maybe_expr()
        const n = new Node("return", "expr", expr)
        return n
    }

    maybe_break() {
        if(!this.is_break()) { return }
        this.next()
        const n = new Node("break", "stmt", null)
        return n
    }

    maybe_const() {
        if(!this.is_const()) { return }
        this.next()
        const _pat = this.req_pat()
        const t = this.maybe_tannotation()
        this.req_asgmt()
        const rhs = this.req_expr()
        const asgmt = new Asgmt(_pat, t, rhs)
        // const n = new Node("const", "stmt", asgmt)
        const n = new Node("const", "stmt", asgmt)
        return n
    }
    
    maybe_let() {
        if(!this.is_let()) { return }
        this.next()
        const _pat = this.req_pat()
        const t = this.maybe_tannotation()
        this.req_asgmt()
        const rhs = this.req_expr()
        const asgmt = new Asgmt(_pat, t, rhs)
        // const n = new Node("const", "stmt", asgmt)
        const n = new Node("var", "stmt", asgmt)
        return n
    }

    // maybe_var() {
    //     if(!this.is_var()) { return }
    //     this.next()
    //     const _pat = this.req_pat()
    //     const t = this.maybe_tannotation()
    //     let rhs
    //     if(this.maybe_asgmt()) { rhs = this.req_expr() }
    //     const v = new Asgmt(_pat, t, rhs)
    //     const n = new Node("var", "stmt", v)
    //     return n
    // }

    req_expr() {
        const token = this.current
        const expr = this.maybe_expr()
        if(expr) { 
            return expr
        } else {
            panic("expecting expression : " + to_str(token))
        }
    }

    maybe_do_block_ret() {
        const block = this.maybe_do_block()
        if(block) {
            this.implicit_return(block.v)
            return block
        }
    }
    
    req_do_block_ret() {
        const block = this.req_do_block()
        this.implicit_return(block.v)
        return block
    }
    
    maybe_do_block() {
        if(!this.is_do()) { return }
        this.next()
        const stmts = []
        this.req_open_curly()
        while(true) {
            if(this.is_eof() || this.is_close_curly()) { break }
            const stmt = this.maybe_stmt()
            if(stmt) { stmts.push(stmt) } else { break }
        }
        this.req_close_curly()
        const n = new Node("do_block", "expr", stmts)
        return n
    }

    req_do_block() {
        const token = this.current
        const expr = this.maybe_do_block()
        if(expr) {
            return expr
        } else {
            panic("expecting 'do' block : " + to_str(token))
        }
    }

    maybe_block() {
        if(!this.is_open_curly()) { return }
        this.next()
        const stmts = []
        while(true) {
            if(this.is_eof() || this.is_end()) { break }
            const stmt = this.maybe_stmt()
            if(stmt) {
                stmts.push(stmt)
            } else {
                break
            }
        }
        this.implicit_return(stmts)
        this.req_end()
        const n = new Node("block", "expr", stmts)
        return n
    }

    maybe_semicolon() {
        if(!this.is_semicolon()) { return }
        const tk = this.next()
        const n = new Node(";", "expr", tk)
        return n
    }

    is_bin_op() {
        if(this.current.v === "(" || this.current.v === '{' || this.current.v === "[") {
            if(!this.is_newline()) {
                return true
            }
        } else {
            return contains(BIN_OP, this.current.v)
        }
    }

    is_postfix_uni_op() { return contains(POSTFIX_UNI_OP, this.current.v) }

    req_list_index() {
        const expr = this.req_expr()
        if(expr) {
            if(this.req_close_bracket()) { return expr }
        } else {
            panic("expecting  an index [...]: " + to_str(this.current))
        }
    }

    req_access(lopr) {
        let n = this.req_expr()
        return n
    }

    req_call_args() {
        const args = []
        while(true) {
            if(this.is_eof() || this.is_close_paren()) { break }
            if(args.length > 0) {
                if(this.is_newline()) {
                    this.maybe_comma()    
                } else {
                    this.req_comma()
                }
            }
            let expr = this.maybe_expr()
            if(expr) {
                args.push(expr)
            }
        }
        this.req_close_paren()
        const n = new Node("args", "expr", args)  
        return n
    }

    maybe_lopr_prefix_postfix(expr, postfix_op) {
        const opr = expr.v.opr
        const op = expr.v.op
        if(expr.id === "prefix") {
            if(this.prec_uni(postfix_op) >= this.prec_uni(op)) {
                const postfix = new Uni(opr, postfix_op)
                const postfix_n = new Node("postfix", "expr", postfix)
                const prefix = new Uni(postfix_n, op)
                const prefix_n = new Node("prefix", "expr", prefix )
                this.next()
                return prefix_n
            } else {
                const postfix = new Uni(expr, postfix_op)
                const n = new Node("postfix", "expr", postfix)
                this.next()
                return n
            }
        } 
    }

    maybe_lopr_bin_postfix(expr, postfix_op) {
        if(expr.id === "bin") {
            const op = expr.v.op
            const ropr = expr.v.ropr
            const lopr = expr.v.lopr
            if(this.prec_uni(postfix_op) >= this.prec_bin(op)) {
                const postfix = new Uni(ropr, postfix_op)
                const postfix_n = new Node("postfix", "expr", postfix)
                const bin = new Bin(lopr, op, postfix_n)
                const bin_n = new Node("bin", "expr", bin)
                this.next()
                return bin_n
            } else {
                const postfix = new Uni(expr, postfix_op)
                const postfix_n = new Node("postfix", "expr", postfix)
                this.next()
                return postfix_n
            }
        } 
    }

    maybe_lopr_prefix_bin(expr, bin_op) {
        const op = expr.v.op
        let opr = expr.v.opr
        if(expr.id === "prefix") {
            if(this.prec_uni(op) >= this.prec_bin(bin_op)) {
                opr = this.req_op(opr)
                const prefix = new Uni(opr, op)
                const prefix_n = new Node("prefix", "expr", prefix)
                return prefix_n
            } else {
                const ropr = this.req_ropr(expr)
                const bin = new Bin(opr, bin_op, ropr)
                const bin_n = new Node("bin", "expr", bin)
                const prefix = new Uni(bin_n, op)
                const prefix_n = new Node("prefix", "expr", prefix)
                return prefix_n
            }
        }
    }

    get_lopr(lopr, op) {
        let opr = this.maybe_lopr_prefix_postfix(lopr, op)        
        if(!opr) {
            opr = this.maybe_lopr_bin_postfix(lopr, op)
            if(!opr) {
                const postfix = new Uni(lopr, op)
                opr = new Node("postfix", "expr", postfix)
                this.next()
            }
        }
        return opr
    }

    req_ropr(lopr) {
        let ropr
        const token = this.current
        if(this.is_open_bracket()) {
            this.next()
            ropr = this.req_list_index()
        } else if(this.is_dot()) {
            this.next()
            ropr = this.req_access(lopr)
        } else if(this.is_open_paren()) {
            this.next()
            ropr = this.req_call_args()
        } else {
            this.next()
            ropr = this.maybe_expr()
        }

        if(!ropr) { panic("expecting right operand: " + to_str(token)) }
        return ropr
    }

    prec_uni(v) {
        switch(v.v) {
            case "%":                                           return 60 
            case ".":                                           return 50 
            case "!": case "?":                                 return 16
            case "+": case "-": case "_!": case "not":          return 15
            case "⏎":                                           return 0 
            default: panic("unexpected unary operator: " + to_str(v)) 
        }
    }

    prec_bin(v) {
        switch(v.v) {
            case "["    :                                           return 20
            case "("    : case "{":                                 return 19
            case "."    :                                           return 18
            case "*"    : case "×"  : case "/": case "÷":           return 13
            case "+"    : case "-"  :                               return 12
            case "<"    : case "<=" : case ">": case ">=":          return 11
            case "=="   : case "!=" :                               return 10
            case "<<"   : case ">>" :                               return 8 
            case "&"    :                                           return 7
            case "**"   : case "⊕"  :                               return 6
            case "|"    :                                           return 5
            case "&&"   :                                           return 4
            case "||"   :                                           return 3
            case "|>"   : case "||>": case ":>" :                   return 2
            case "="    : case ":=" : case "::"
                        : case "~=" : case "+=" : case "-="
                        : case "*=" : case "×=" : case "/="
                        : case "÷=" : case "&=" : case "|="
                        : case "^=" : case ">>=": case "<<=" :      return 1
            default: panic("unexpected binary operator: " + to_str(v))
        }
    }

    is_bin_rassoc(v) { return contains(BIN_R_ASSOC, v) }

    maybe_op(lopr) {        
        const op = this.current
        if(this.is_postfix_uni_op()) {
            return this.get_lopr(lopr, op)
        } else if(this.is_bin_op()) {
            const opr = this.maybe_lopr_prefix_bin(lopr, op)
            if(opr) { return opr }
            let ropr = this.req_ropr(lopr)
            if(ropr) {
                if(ropr.id === "bin") {
                    ropr = this.while_op(ropr, this.prec_bin(ropr.v.op) > this.prec_bin(op) || this.prec_bin(ropr.v.op) === this.prec_bin(op) && this.is_bin_rassoc(ropr.v.op))
                } else if(ropr.id === "prefix") {
                    ropr = this.while_op(ropr, this.prec_bin(op) > this.prec_uni(ropr.v.op) || this.is_bin_rassoc(op))
                } else {
                    ropr = this.while_op(ropr, false)
                }
            }
            const bin = new Bin(lopr, op, ropr)
            const n = new Node("bin", "expr", bin)
            return n
        }
    }

    req_op(lopr) {
        const op = this.maybe_op(lopr)
        if(op) {  return op }
        panic("expect an operation: " + to_str(this.lookahead()))
    }
    
    while_op(lopr, cond) {
        let expr = clone(lopr)
        if(this.is_eof()) { return expr }
        while(this.is_bin_op() || this.is_postfix_uni_op()) {            
            if(cond === false) { break }
            expr = this.req_op(expr)
        }
        return expr
    }

    maybe_expr() {
        let expr = this.maybe_prim()
        if(expr) {
            expr = this.while_op(expr)
            return expr
        }
    }

    req_id() {
        const id = this.maybe_id()
        if(id) {
            return id
        } else {
            panic("expecting an ID: " + to_str(this.current))
        }
    }

    maybe_unit() {
        if(this.is_open_paren() && this.expect_close_paren()) {
            this.next()
            this.next()
            const n = new Node("()", "expr", "()")
            return n
        }
    }

    // FIXME: a workaround that only handles using id params
    maybe_afn(els) {
        const to_params = () => {
            if(!els) { return }
            if(!is_list(els)) { els = [els]}
            const params = []
            els.forEach(el => { 
                el.id = 'id' 
                el.type = 'pat'
                
                params.push(new Node("param", "pat", new FnParam(el)))
            }); 
            return params
        }

        if(this.is_thick_arrow()) {
            const params = to_params()
            this.next()
            this.req_open_curly()
            const body = this.req_body_ret()
            this.req_close_curly()
            const _afn = new Fn("", params, null, body)
            const n = new Node("afn", "expr", _afn)
            return n
        }
    }

    maybe_tuple_afn_group() {
        if(this.is_open_paren()) {
            const loc = this.current.loc
            this.next()
            if(this.is_id() && this.expect_colon()) {
                return this.req_named_tuple()
                const afn = this.maybe_afn(tuple)
            } else {                
                let expr = null;
                expr = this.maybe_expr()            
                if(expr) { 
                    let arg = expr
                    if(this.is_comma()) {
                        const tuple = [arg]
                        while(true) {
                            const comma_close_paren = this.is_comma() && this.expect_close_paren()
                            if(this.is_eof() || this.is_close_paren() || comma_close_paren) {  break }
                            this.req_comma()
                            arg =  this.maybe_expr() 
                            if(arg) { tuple.push(arg) } else { panic("expected an argument: " + loc) }
                        }
                        this.maybe_comma()
                        this.req_close_paren()
                        const afn = this.maybe_afn(tuple)
                        if(afn) { return afn } else {  
                            const n = new Node("tuple", "expr", tuple)
                            return n
                        }
                    } else {
                        this.req_close_paren()
                        const afn = this.maybe_afn(expr)
                        if(afn) { return afn } else {  
                            expr.grouped = true
                            return expr
                        }
                    }
                }
            }
        }
    }

    req_named_tuple() {
        let named_tuple = []
        while(!(this.is_eof() || this.is_close_paren())) {
            let name = this.req_id()
            this.req_colon()
            let expr = this.req_expr()
            named_tuple.push([name, expr])
            this.optional_comma()
        }
        this.req_close_paren()
        return new Node("named_tuple", "expr", named_tuple)
    }

    is_prefix_uni_op() {  return contains(PREFIX_UNI_OP, this.current.v)  }

    maybe_prefix_uni_op() {
        if(this.is_prefix_uni_op()) {
            const op = this.current
            this.next()
            const prefix = new Uni(this.req_prim(), op)
            const n = new Node("prefix", "expr", prefix)
            return n
        }
    }

    maybe_literal() {
        let expr = this.maybe_primitivel()
        if(!expr) { expr = this.maybe_list() }
        if(!expr) { expr = this.maybe_tuple() }
        return expr
    }

    maybe_primitivel() {
        let expr = this.maybe_bool()
        if(!expr) { expr = this.maybe_char() }
        if(!expr) { expr = this.maybe_str() }
        if(!expr) { expr = this.maybe_int() }
        if(!expr) { expr = this.maybe_float() }
        return expr
    }

    maybe_bool() {
        if(this.is_bool()) {
            const n = new Node("bool", "expr", this.current)
            this.next()
            return n
        }
    }

    maybe_char() {
        if(this.is_char()) {
            const n = new Node("char", "expr", this.current)
            this.next()
            return n
        }
    }

    maybe_str() {
        if(this.is_str()) {
            const n = new Node("str", "expr", this.current)
            this.next()
            return n
        }
    }

    maybe_int() {
        if(this.is_int()) {
            const num = this.current
            this.next()
            let suffix
            if(this.is_id() && !this.is_newline() ) {
                suffix = this.current
                this.next()
            }
            const n = new Node("int", "expr", [num, suffix])           
            return n
        }
    }

    maybe_float() {
        if(this.is_float()) {
            const num = this.current
            this.next()
            let suffix
            if(this.is_id() && !this.is_newline() ) {
                suffix = this.current
                this.next()
            }
            const n = new Node( "float", "expr", [num, suffix] )
            return n
        }
    }

    maybe_list() {
        if(this.is_open_bracket()) {
            const els = []
            this.next()
            this.maybe_comma()
            while(true) {
                const comma_close_bracket = this.is_comma() && this.expect_close_bracket()
                if(this.is_eof() || this.is_close_bracket() || comma_close_bracket) { break }
                if(els.length > 0) { 
                    if(this.is_newline()) { this.maybe_comma()} else {this.req_comma()}
                }
                els.push(this.req_expr())
            }
            this.maybe_comma()
            this.req_close_bracket()
            const n = new Node("[", "expr", els)
            return n
        }
    }

    maybe_tuple() {
        if(this.is_open_paren()) {
            const els = []
            this.skip()
            this.maybe_comma()
            let named_tuple = false
            if(this.is_id && this.expect_colon()) { named_tuple= true }
            while(true) {
                if(els.length > 0) { this.req_comma() }
                let name
                if(named_tuple) { name = this.req_id(); this.req_colon()}
                let expr = this.req_expr()
                if(named_tuple) {
                    els.push([ name,  expr])
                } else {
                    els.push([expr])
                }
                if(this.is_close_paren()) { break }
            }
            this.maybe_comma()
            this.req_close_paren()
            if(named_tuple) { 
                return new Node("(:", "expr", els)
            } else {
                return new Node("(", "expr", els)
            }
        }
    }

    maybe_call(id) {
        const maybe_args = () => {
            const args = []
            if(!this.is_open_paren()) { return }
            this.next()
            while (!(this.is_eof() || this.is_close_paren())) {
                let arg_name 
                if(this.is_id() && this.expect_colon()) { 
                    arg_name = this.current 
                    this.next()
                    this.next()
                }
                let arg
                if(arg_name) {  
                    arg = new Node("named_arg", "expr", [arg_name, this.req_expr()])
                } else { 
                    arg = this.maybe_expr() 
                }
                if(!arg) { break }
                args.push(arg) 
                this.optional_comma()
            }
            this.req_close_paren()        
            return args
        }
    
        const  maybe_children = (id) => {
            if(!this.is_open_curly()) { return }
            this.next()
            const children = []
            while (!(this.is_eof() || this.is_close_curly())) {
                const expr = this.maybe_expr()
                if(!expr) { break }
                children.push(expr) 
                this.optional_comma()
            }        
            this.req_close_curly()
            children.push()
            return children
        }

        const args  = maybe_args()
        const children = maybe_children()
        if(!(args || children)) { return }
        const n = new Node("call", "expr", [id, args, children])
        const t = "call"
        return n
    }

    req_ref() {
        const id = this.current
        this.next()

        const n = new Node("ref", "expr", id)
        const t = "ref"
        return n
    }
    
    maybe_call_or_ref() {
        if(this.is_id()) {    
            const ref = this.req_ref()
            return this.maybe_call(ref) || ref
        } 
    }

    maybe_when_arm() {
        const pats = []
        while(!this.is_thin_arrow()) {
            pats.push(this.req_pat())
            if(this.is_bar()) { this.next() } else { break }
        }

        this.req_thin_arrow()
        const expr = this.req_expr()
        const arm = new WhenArm(pats, expr)
        const n = new Node("arm", "", arm)
        return n
    }

    maybe_when() {
        if(!this.is_when()) { return }
        this.next()
        this.req_open_paren()
        const expr = this.maybe_expr()
        this.req_close_paren()
        this.req_open_curly()
        const arms = []
        this.maybe_comma()
        while(true) {
            if(this.is_eof() || this.is_close_curly()) {
                break
            }
            if(arms.length > 0) {
                // this.req_comma()
                this.optional_comma()
                if(this.is_eof() || this.is_close_curly()) { break }
            }
            const arm = this.maybe_when_arm()
            if(arm) { arms.push(arm) } else { break }
        }
        this.maybe_comma()
        this.req_close_curly()
        const _when = new When(expr, arms)
        const n = new Node("when", "expr", _when)
        return n
    }

    maybe_prim() {
        let expr = this.maybe_unit()
        if(!expr) { expr = this.maybe_tuple_afn_group() }
        if(!expr) { expr = this.maybe_prefix_uni_op() }
        if(!expr) { expr = this.maybe_call_or_ref() }
        if(!expr) { expr = this.maybe_literal() }
        if(!expr) { expr = this.maybe_when() }
        if(!expr) { expr = this.maybe_do_block_ret() }
        if(!expr) { expr = this.maybe_ret() }
        if(!expr) { expr = this.maybe_semicolon() }
        return expr
    }

    req_prim() {
        const prim = this.maybe_prim()
        if(!prim) { panic("expecting an expression: " + to_str(this.current)) }
        return prim
    }

    maybe_fn() {
        const tk = this.current
        if(!this.is_fn()) { return }
        this.next()
        const _fn = this.req_fn()
        if(_fn && contains(["main", "بدء"], _fn.v.name.v[1])) {
            const n = new Node("main", "fn", _fn.v)
            return n
        } else {
            const n = new Node("fn", "fn", _fn.v)
            return n
        }
    }

    maybe_use() {
        if(!this.is_use()) { return }
        this.next()       
        const path = []
        if(!this.is_id()) { return false }
        while(this.is_id()) {
            path.push(this.current)
            this.next()
            if(this.is_dot()) {
                this.skip()
                if(!this.is_id()) { panic("expecting an idnetifier after " + to_str(this.current)) }
            } else { break }
        }
        const n = new Node("use", "stmt", path)
        this.ast.push(n)
        return true        
    }

    maybe_optional() {
        if(this.is_question()) {
            this.next()
            return true
        }
    }

    maybe_type() {
        let n
        if(this.is_open_bracket()) {
            this.next()
            const t = this.req_type()
            this.req_close_bracket()
            const _type = new Type(t, this.maybe_optional())
            n = new Node("[", "t", _type)
        } else if(this.is_open_curly()) {
            this.next()
            const fields = []
            this.maybe_comma()
            while(true) {
                if(this.is_eof() || this.is_close_curly()) { break }
                if(fields.length > 0) {  this.req_comma()  }
                const k = this.maybe_id()
                let t
                if(k) { 
                    if(this.is_colon()) {
                        this.next()
                        t = this.req_type()
                    }
                }
                const pair = new Pair(k, t)
                fields.push(pair)
            }
            this.maybe_comma()
            this.req_close_curly()
            const _type = new TypeDynamic(fields, this.maybe_optional())
            n = new Node("{", "t", _type) 

        } else if(this.is_id()) {
            const t = this.req_id()
            if(this.is_open_angle()) {
                const ts = []
                this.next()
                this.maybe_comma()
                while(true) {
                    if(this.is_eof() || this.is_close_angle()) { break }
                    if(ts.length > 0) { this.req_comma() }
                    ts.push(this.req_type())
                }
                this.maybe_comma()
                this.req_close_angle()
                const _type = new TypeTempl(t, ts, this.maybe_optional())
                n = new Node("<", "t", _type)
            } else {
                const _type = new Type(t, this.maybe_optional())
                n = new Node("t", "t", _type)
            }
        }
        return n        
    }

    req_type() {
        let n = this.maybe_type()
        if (!n) { panic("type required: " + to_str(this.current)) }
        return n
    }

    maybe_tannotation() { 
        if(!this.is_colon()) { return }
        this.next()
        return this.maybe_type() 
    }
    req_tannotation() {
        const tannotation = this.maybe_tannotation()
        if(!tannotation) {
            panic("requires type annotation: " + to_str(this.current))
        }
        return tannotation
    }

    maybe_fn_params() {
        const params = []
        if(!this.is_open_paren()) {
            return params
        }
        this.next()
        this.maybe_comma()
        while(true) {
            if(this.is_close_paren() || this.is_eof()) { break }
            if(params.length > 0) { this.req_comma() }
            const _pat = this.req_pat()
            const t = this.maybe_tannotation()
            const param = new FnParam(_pat, t)
            const n = new Node("param", "pat", param)
            if(_pat.id !== "id") {  panic("only parameters with id patterns are currently supported")  }
            params.push(n)
        }
        this.maybe_comma()
        this.req_close_paren()
        return params
    }

    maybe_fn_ret_types() {
        // TODO
        const ret_types = []
        if(this.is_thin_arrow()) {
            this.next()
            while(this.is_id()) {
                let id = this.next()
                if(this.is_exclamation()) {
                    this.next()
                    ret_types.push({
                        id: id,
                        _t: "throw"
                    })
                } else {
                    //TODO add generic types                     
                    ret_types.push({
                        id: id,
                        _t: "ret_type"
                    })                
                }
                this.optional_comma()
            }
        }
        return ret_types
    }

    req_fn() {
        const name = this.req_id()
        funcs.push(name.v[1]); // FIXME: hack, remove when name resolution is fixed.
        const params = this.maybe_fn_params()
        const ret_types = this.maybe_fn_ret_types()
        if(this.is_open_curly()) {
            this.next()
            const body = this.req_body_ret()
            const _fn = new Fn(name, params , ret_types, body)
            const n = new Node("fn", "fn", _fn)
            this.req_close_curly();
            return n
        } else {
            this.req_asgmt()
            const body = this.req_body_ret()
            const _fn = new Fn(name, params , ret_types, body)
            const n = new Node("fn", "fn", _fn)
            return n            
        }        
    }

    maybe_fields() {
        const fields = []
        while(this.is_id()) {
            const key = new Node("id", "expr", this.req_id())
            const v = this.req_tannotation()
            const pair = new Pair(key, v)
            const field = new Node("field", "", pair)
            fields.push(field)
            if(this.is_close_paren()) { break; }
            this.optional_comma()
        }
        return fields
    }

    maybe_typedef() {
        const maybe_fields = () => {
            const fields = []
            if(!this.is_open_paren()) { return }
            this.next()
            while (!(this.is_eof() || this.is_close_paren())) {
                let field_name 
                if(this.is_id() && this.expect_colon()) { 
                    field_name = this.current 
                    this.next()
                    this.next()
                }
                let field
                if(field_name) {  
                    field = new Node("field", "expr", [field_name, this.req_type()])
                } else { 
                    field = this.maybe_expr() 
                }
                if(!field) { break }
                fields.push(field) 
                this.optional_comma()
            }
            this.req_close_paren()        
            return fields
        }
    
        const  maybe_children = () => {
            if(!this.is_open_curly()) { return }
            this.next()
            const children = []
            while (!(this.is_eof() || this.is_close_curly())) {
                const expr = this.maybe_expr()  // FIXME: for typedef: this should be types not exprs
                if(!expr) { break }
                children.push(expr) 
                this.optional_comma()
            }        
            this.req_close_curly()
            children.push()
            return children
        }

        if(!this.is_typedef()) { return }
        this.next()
        const id = this.req_id()
        structs.push(id.v[1])
        let fields  = maybe_fields() || []
        const children = maybe_children()
        if(!(fields || children)) { return }        
        if(children) {
            const id = {v:['id','__children'], loc:{"line":0,"column":0}}
            const t = {"id":"[","t":"t","v":{"t":{"id":"t","t":"t","v":{"t":{"v":["id","any"],"loc":{"line":0,"column":0}}}}}}
            const field = new Node("field", "expr", [id, t])
            fields.push(field)
        }
        // pprint('typedef: ')
        // pprint(fields)
        const _t = new TypeDef(id, fields, children)
        const n = new Node("type", "def", _t)
        this.ast.push(n)
        return true
    }

    maybe_consts_or_fns() {
        let parsed = false
        while(true) {
            // if(this.is_const()) {
            if(this.is_pat()) {
                this.ast.push(this.maybe_const())
                parsed = true
            } else if(this.is_fn()) {
                this.ast.push(this.maybe_fn())
                parsed = true
            } else {
                break
            }
        }
        return parsed
    }
    
    implicit_return(_stmts) {
        if(!_stmts || _stmts.length <= 0) { return }
        const last_index = _stmts.length - 1
        const last = _stmts[last_index]
        if(contains(["when", "while", "if", "for", "return", "let", "var", "const"], last.id) 
            ||  (last.id === 'bin' && last.v.op.v === ':=') 
        ) { return }
        if(last.id === ";") { return }
        if(last.id === "bin" && last.v.op.v === "=") { return }
        if(last.id === "bin" && last.v.lopr.id === "ref" && contains(["println", "اطبع_سطر"], last.v.lopr.v.v[1])) { return }
        if(last.t === "expr") {
            const n = new Node("iret", "expr", last)
            return replace(_stmts, last_index, n)
        }
    }
}