import {
    write_ar_html, 
    write_html
} from 'seen-gen-html/src/main.js'

import {
    HELPERS, 
    // symtab_funcs, 
    symtab_structs
} from 'seen-compiler/src/main.js'

import {
    pprint,
    to_maghrib_num, 
    is_list , contains, 
    to_str,
    repeat,
    panic,    
} from 'seen-compiler/src/main.js'

const AR_ID = {
    "بدء": "main",
    "اطبع_سطر": "println",
    "تعبير_نمطي": "regex",
    "هذا": "this",
    "مشيّد": "constructor",
    "انهاء": "panic"
}

const SPACES = 4

export default class JSGen {
    current
    indent_level
    stack
    astructs
    ast
    main_args
    opts

    constructor(current, indent_level, stack, astructs, ast, opts) {
        this.current = current
        this.indent_level = indent_level
        this.stack = stack
        this.astructs = astructs
        this.ast = ast
        this.opts = opts
        return this
    }    

    init(ast, main_args, opts) {
        this.current = ""
        this.indent_level = 0
        this.stack = []
        this.astructs = []
        this.ast = ast
        this.main_args = main_args
        this.opts = opts       
    }

    run() {
        this.strict_mode()
        let main
        let i = 0
        while(i < this.ast.length) {
            const n = this.ast[i]
            if(n) {
                const v = n.v
                switch(n.id) {
                    case "use": this.write_use(v) ; break
                    case "modif": this.write_modifier(v) ;break
                    case "main": main = v ; break
                    case "const": this.write_const(v) ; break
                    case "fn": this.write_fn(v) ; break
                    case "type": this.write_typedef(v) ; break                        
                    default: panic("unsupported node: " + this.ast[i].id)
                }
            }
            i += 1
        }
        this.write_helper_fns()
        if(main) { this.write_main(main) }
        const code = this.get_code()
        return code
    }

    to_en_id(id) {
        if(!id.v && !is_list(id.v)) { return }
        if(AR_ID[id.v[1]]) {  id.v[1] = AR_ID[id.v[1]] }
    }

    push() {
        this.stack.push(this.current)
        this.current = ""
    }

    pop() { this.current = this.stack.pop() + this.current }
    pop_prepend() { this.current = this.current + this.stack.pop() }
    append(code) { this.current += code }

    appendi(code) {
        this.current += this.spaces()
        this.current += code
    }

    spaces(level) {
        if(!level) { level = this.indent_level }
        return repeat(' ', level * SPACES)
    }

    strict_mode() { this.append("\"use strict\";\n\n") }
    write_id_pat(id) { 
        const v = id.v.v[1]
        this.append( v === '_'? 'default' : v) 
    }
    write_char_pat(c) { this.append("'" + c.v.v[1] + "'") }
    write_str_pat(str) { this.append("\"" + str.v.v[1] + "\"") }

    write_tuple_pat(tuple) {
        this.append('(')
        let i = 0
        while(i < tuple.v.length) {
            this.write_pat(tuple.v[i])
            if(i < tuple.v.length - 1) { this.append(', ') }
            i += 1
        }
        this.append(')')
    }

    write_pat(p) {
        switch(p.id) {
            case "id": this.write_id_pat(p) ; break
            case "bool": this.append(p.v.v[1]) ; break
            case "int": case "float": this.append(to_maghrib_num(p.v.v[1][0])) ; break
            case "char": this.write_char_pat(p) ; break
            case "str": this.write_str_pat(p) ; break
            case "tuple":  this.write_tuple_pat(p) ; break
            case "_": this.append("default") ; break
            default: panic("unsupported pattern " + to_str(p)) 
        }
    }

    write_modifier(n) {
        if(this.opts.ignore_export) { return  }
        if(n.v === "+") { this.appendi("export ") }
    }
    write_use(n) { return }

    write_main(_fn) {
        this.push()
        this.appendi("(")
        this.write_fn(_fn, this.main_args)
        this.appendi(")()\n")
        this.pop()
    }

    write_params(params) {
        this.append("(")
        let i = 0
        while(i < params.length) {
            if(i > 0) { this.append(", ") }
            this.write_pat(params[i].v._pat)
            i += 1
        }
        this.append(")")
    }

    write_do_block(block) {
        this.append(`(()=>`)
        this.write_block(block)          
        this.append(`)() \n`)
    }

    write_block(block) {
        this.append(" {\n")
        this.push()
        this.indent_level += 1
        let i = 0
        const length = block.v.length
        while(i < length) {
            const stmt = block.v[i]
            this.write_stmt(stmt)
            i += 1
        }
        this.pop()
        this.indent_level -= 1
        this.appendi("}\n")
    }

    write_fn(_fn, main_args) {
        this.push()
        if(_fn.t === "fn") { this.appendi("static ") } 
        this.to_en_id(_fn.name)
        this.append("function " + _fn.name.v[1])
        if(main_args) {this.append('()') } else { this.write_params(_fn.params) }
        
        this.write_body(_fn.body, _fn.name ==='main', main_args)
        this.pop()
    }

    write_fields(fields) {        
        const ids = []
        fields.forEach(field => {
            const id = field.v[0].v[1]
            ids.push(id)
        })
        ids.forEach(id => { this.appendi(this.spaces() + "" + id + "\n") })
        this.write_init(ids)
    }

    write_init(ids) {
        this.append("\n")
        this.appendi("constructor(")
        let i = 0
        while(i < ids.length) {
            this.append(ids[i])
            if(i < ids.length - 1) { this.append(", ") }
            i += 1
        }
        this.append(") {\n")
        this.indent_level += 1
        i = 0
        while(i < ids.length) {
            this.appendi("this." + ids[i] + " = " + ids[i] + "\n")
            i += 1
        }
        this.appendi("return this\n")
        this.indent_level -= 1
        this.appendi("}\n")
    }

    write_typedef(_typedef) {
        this.appendi("class " + _typedef.name.v[1] + " {\n")
        this.indent_level += 1
        if(_typedef.fields) { this.write_fields(_typedef.fields) }
        this.indent_level -= 1
        this.appendi("}\n\n")
    }

    write_const(_const) {
        this.appendi("const ")
        this.write_pat(_const.lhs)
        this.append(" = ")
        this.write_expr(_const.rhs)
        this.append("\n")
    }

    write_var(_var) {
        this.appendi("let ")
        this.write_pat(_var.lhs)
        if(_var.rhs) {
            this.append(" = ")
            this.write_expr(_var.rhs)
        }
        this.append("\n")
    }

    write_ret(n) {
        this.append("return ")
        if(n.v) {
            this.write_expr(n.v)
        }
    }

    write_break(expr) { this.append("break") }

    write_stmt(stmt) {
        if(stmt.t === "expr") {
            this.appendi("")
            this.write_expr(stmt)
            this.append("\n")
        } else if(stmt.id === "const") {
            this.write_const(stmt.v)
        } else if(stmt.id === "var") {
            this.write_var(stmt.v)
        } else if(stmt.id === "break") {
            this.write_break(stmt)
        } else { panic("cannot write stmt: " + to_str(stmt)) }
    }

    write_body(body, is_main, main_args) {
        this.append(" {\n")
        this.push()
        this.indent_level += 1
        if(main_args) {             
            for (const [k,v] of Object.entries(main_args)) {            
                this.append(`const ${k} = '${v}'\n`) 
            }
        }                    
        let i = 0        
        const length = body.v.length
        while(i < length) {
            const stmt = body.v[i]
            this.write_stmt(stmt)
            i += 1
        }
        this.pop()
        this.indent_level -= 1
        this.appendi("}\n")
    }

    write_id(id) { this.append(id.v[1]) }

    write_ref(expr) {
        const _ref = expr.v.v[1]        
        switch(_ref) {
            // TODO
            default:
                break
        }
        this.append(_ref)    
    }

    write_str(expr) { 
        const str = expr.v.v[1]
        const symbol = str.indexOf('${') === -1 ? '"' : '`'

        this.append(symbol + str + symbol) 
    }
    write_str_id(expr) { this.append(symbol + expr.v.v[1] + symbol) }
    is_call(expr) { return expr.v.id === "bin" && expr.v.v.op.v ==="(" }
    write_iret(expr) {
        if( !(
            contains(["when", "while", "if", "for", "return"], expr.v.node) 
            || expr.v.t === "()" 
            || this.is_call(expr)
            || expr.semicolon ) ) {
            this.append("return ")
        }
        
        if(this.is_call(expr)) {
            this.append("const temp_seen_var = ")
            this.write_expr(expr.v)
            this.append('\n')
            this.append("return temp_seen_var")
        } else {
            this.write_expr(expr.v)
        }
    }

    write_list(expr) {
        this.append("[")
        let i = 0
        const length = expr.v.length
        while(i < length) {
            this.write_expr(expr.v[i])
            if(i < expr.v.length - 1) { this.append(", ") }
            i += 1
        }
        this.append("]")
    }

    write_structl(expr) {
        const fields = expr.v
        this.append('{')
        let i = 0
        while(i < fields.length) {
            const field = fields[i]
            const key = field.k
            if(key.v.v[1]) {
                this.write_id(key.v)
            } else {
                this.write_str_id(key.v)
            }
            const value = field.v
            this.append(": ")
            this.write_expr(value)
            if(i < fields.length - 1) {
                this.append(', ')
            }
            i += 1
        }
        this.append('}')
    }

    write_args(expr) {
        this.append("(")
        let i = 0
        while(i < expr.v.length) {
            let _expr = expr.v[i]
            if (_expr.v.op && _expr.v.op.v === ':') {
                _expr = _expr.v.ropr
            }
            this.write_expr(_expr)
            if(i < expr.v.length - 1) {
                this.append(", ")
            }
            i += 1
        }
        this.append(")")
    }

    write_named_arg(narg) {
            const k  = narg.v[0].v[1]
            const v = narg.v[1]
            this.write_expr(v)
    }    

    write_tuple(expr) {
        this.append("[")
        let i = 0
        while(i < expr.v.length) {
            let arg = expr.v[i]
            if(arg.id === 'narg') {
                arg = expr.v[i].v[1] //  node -> [name,expr]
            }

            this.write_expr(arg)
            if(i < expr.v.length - 1) {
                this.append(", ")
            }
            i += 1
        }
        this.append("]")
    }

    write_named_tuple(expr) {
        this.append('{')
        expr.v.forEach((pair, i ) => {
            const k  = pair[0].v[1]
            const v = pair[1]
            this.append(k)
            this.append(': ')
            this.write_expr(v)
            if( i < expr.v.length ) {
                this.append(',')
            }
        })
        this.append('}')
    }

    write_when(expr) {
        this.appendi("switch(")
        this.write_expr(expr.v.expr)
        this.append(") {\n")
        this.indent_level += 1
        let i = 0
        while(i < expr.v.arms.length) {
            const arm = expr.v.arms[i]
            const pats = arm.v.pats
            const _expr = arm.v.expr
            let j = 0
            while(j < pats.length) {
                if(pats[j].id !== "_") {
                    this.appendi("case ")
                }
                this.write_pat(pats[j])
                this.append(" :\n")
                j += 1
            }
            this.indent_level += 1
            this.appendi("")
            this.write_expr(_expr)
            this.append("\n")
            this.appendi("break\n")
            this.indent_level -= 1
            i += 1
        }
        this.indent_level -= 1
        this.appendi("}\n")
    }

    write_prefix_uni(expr) {
        const op = expr.v.op.v
        switch(op) {
            case ".": {
                if(expr.v.opr.v.v[1] === "none") {
                    this.append("null")
                    return
                } else { 
                    panic("enum variants are not supported, found : (." + expr.v.opr.v.v[1] + ")")
                }
            }
            break
            case "not":
                    this.append("!")
                    break
            case "!":
            case "-":
                this.append(op)
                break
            default:
                panic("unsupported op: " + op)
                break
        }
        this.write_expr(expr.v.opr)
    }

    write_pipe(stack) {
        while(stack.length > 0) {
            let expr = stack.pop()
            switch(expr.id) {
                case 'ref' : 
                    this.write_expr(expr)
                    if(stack.length > 0) {
                        this.append('(')
                        this.write_pipe(stack)
                        this.append(')')                                      
                    }
                    break
                case "call" : 
                    const lhs = expr.v[0]
                    const rhs = expr.v[1]
                    this.write_expr(lhs)
                    this.append('(')
                    this.write_pipe(stack)
                    if(this.current.slice(-1) !== '(' && rhs.length > 0) { this.append(', ')}
                    rhs.forEach((el,i) => {
                        this.write_expr(el) 
                        if(i < rhs.length - 1 ) { this.append( ', ') }
                    })
                    this.append(')')     
                    break                             
                case 'int' : case 'float' : case 'str': case '[': case 'tuple'  : case 'named_tuple' :
                    this.write_expr(expr)
                    break
                default: throw new Error('syntax error |> :' + to_str(expr))
            }
        }
    }

    write_call(expr) {
        this.to_en_id(expr.v[0].v)
        if(expr.v[0].v.v[1] === 'html') { 
            const page = write_html(expr, '') 
            this.append(` (() => \`${page}\`)() `)
            return
        }    // FIXME: workaround to generate html that should be removed when semantic analysis is ready
        else if (expr.v[0].v.v[1] === 'صفحة_الشبكة') { 
            const page = write_ar_html(expr, '')
            this.append(`(() => \`${page}\`)()`)
            return
        } 
        else if(symtab_structs.includes(expr.v[0].v.v[1])) {  this.append('new ') }
        this.write_expr(expr.v[0])
        
        this.append('(')
        const args = expr.v[1]
        if(args) {
            args.forEach( (arg , i) => {
                // if(arg.id === 'named_arg') { panic("named arguments are not fully supported yet.") }
                this.write_expr(arg)   
                if( i < args.length - 1 )  { this.append(', ') }
            })    
        }
        if(expr.v[2]) { 
            if(args){ this.append(', ')}
            this.write_children(expr.v[2]) 
        }        
        this.append(')')

    }

    write_children(block) {
        if(!block || block.length === 0 ) { return }
        // this.append('.__children = [')
        this.append('[')
        block.forEach(expr => {
            this.write_expr(expr)
            this.append(',')
        })
        this.append(']')
        // panic("nesting children is not fully supported yet.")

    }

    write_bin(expr) {
        const op = expr.v.op.v
        switch(op) {
            case "[": {
                this.write_expr(expr.v.lopr)
                this.append('[')
                this.write_expr(expr.v.ropr)
                this.append(']')
            }
            break
            case "=": {
                this.write_expr(expr.v.lopr)
                this.append('=')
                this.write_expr(expr.v.ropr)
            }
            break
            case ":=": {
                this.append('let ')
                this.write_expr(expr.v.lopr)
                this.append(' = ')
                this.write_expr(expr.v.ropr)
                this.append("\n")
            }
            break            
            case "::": {
                this.appendi("const ")
                this.write_expr(expr.v.lopr)
                this.append(" = ")
                this.write_expr(expr.v.ropr)
                this.append("\n")
            }
            break

            case ":": {
                this.appendi("let ")
                this.write_expr(expr.v.lopr)
                this.append("\n")
            }
            break      
            
            case "|>" : {
                let stack = []

                let lhs =  expr.v.lopr
                let rhs = expr.v.ropr 
                while(true)  {                    
                    stack.push(lhs)           
                    if(rhs.id === 'bin' && rhs.v.op.v === '|>' ) {
                        lhs = rhs.v.lopr
                        rhs = rhs.v.ropr
                    } else {
                        stack.push(rhs)
                        break
                    }
                }
                this.write_pipe(stack)
                break                
            }
            case "||>" : throw new Error(' ||> : WIP , ' + to_str(expr))
            case ":>" : throw new Error(' :> : WIP , ' + to_str(expr))
            case "==":
            case "!=":
            case "<":
            case "<=":
            case ">":
            case ">=":
            case "|":
            case "||":
            case "&":
            case "&&":
            case "+":
            case "-":
            case "/":
            case "*":
            case "+=":
            case "-=":
            case "*=":
            case "\\=":
            case ".": {
                this.write_expr(expr.v.lopr)
                this.append(op)
                if(op === "==" || op === "!=") { this.append("=") }
                this.write_expr(expr.v.ropr)
            }
            break
            default:
                panic("cannot write binary operation: " + to_str(expr))
                break
        }
    }

    write_afn(expr) {
        this.push()
        this.write_params(expr.v.params)
        this.append('=>')
        this.write_body(expr.v.body)
        this.pop()
    }

    
    write_expr(expr) {
        if(expr.grouped) { this.append("(") }
        switch(expr.id) {
            case "()"           :                                                   break
            case ";"            :                                                   break
            case "ref"          : this.write_ref(expr)                          ;   break
            case "bool"         : this.append(expr.v.v[1])                      ;   break
            case "int" : 
                case "float"    : this.append(to_maghrib_num(expr.v[0].v[1]))   ;   break
            case "char"         : this.append("'" + expr.v.v[1] + "'")          ;   break
            case "str"          : this.write_str(expr)                          ;   break
            case "return"       : this.write_ret(expr)                          ;   break
            case "iret"         : this.write_iret(expr)                         ;   break
            case "["            : this.write_list(expr)                         ;   break
            case "{"            : this.write_structl(expr)                      ;   break
            case "args"         : this.write_args(expr)                         ;   break
            case "named_arg"    : this.write_named_arg(expr)                    ;   break
            case "tuple"        : this.write_tuple(expr)                        ;   break
            case "named_tuple"  : this.write_named_tuple(expr)                  ;   break
            case "when"         : this.write_when(expr)                         ;   break
            case "do_block"     : this.write_do_block(expr)                     ;   break
            case "block"        : this.write_block(expr)                        ;   break
            case "prefix"       : this.write_prefix_uni(expr)                   ;   break
            case "call"         : this.write_call(expr)                         ;   break
            case "bin"          : this.write_bin(expr)                          ;   break
            case "afn"          : this.write_afn(expr)                          ;   break
            default             : panic("cannot write expr: " + to_str(expr)) 
        }
        if(expr.grouped) { this.append(")") }
    }

    write_helper_fns() { this.append(HELPERS) }
    get_code() { return this.current }
}
