import Lexer from './lexer.js'
import Parser from './parser.js'
import Gen from './generate.js'
import { is_empty, pprint, panic } from './util.js'

export default class Project {
    src
    main_args
    target
    target_opts
    lang
    tokens
    ast
    gen_code

    constructor(src, main_args, target, target_opts, lang, tokens, ast, symtab, transltab, gen_code) {
        this.src = src
        this.main_args = main_args
        this.target = target
        this.target_opts = target_opts
        this.lang = lang
        this.tokens = tokens
        this.ast = ast
        this.symtab = symtab
        this.transltab = transltab
        this.gen_code = gen_code
        return this
    }    

    init(src, main_args, lang, target_opts) {
        this.src = src
        this.main_args = main_args
        this.target = "js"
        this.target_opts = target_opts || {}        
        this.lang = lang || "en"
    }

    init_ar(src, main_args , target_opts) {
        this.init(src, main_args, "ar", target_opts)
    }

    get_code() {
        if(!this.gen_code) {
            this.compile()
        }
        return this.gen_code
    }

    compile() {        
        this.scan(true)        
        this.parse()
        this.generate(this.target)
    }

    scan(ignore_cmts_ws) {        
        const lexer = new Lexer()
        lexer.init(this.lang, this.src, ignore_cmts_ws)
        lexer.run()
        this.tokens = lexer.tokens
        if(!is_empty(lexer.errs)) {
            pprint(lexer.errs)
            panic("")
        }        
    }

    parse() {        
        const parser = new Parser()
        parser.init(this.tokens)
        parser.run()
        this.ast = parser.ast
        if(!is_empty(parser.errs)) {
            pprint(parser.errs)
            panic("")
        }        
    }

    generate(target) {
        const gen = new Gen()
        gen.init(this.ast, this.main_args, target, this.target_opts)
        this.gen_code = gen.run()
    }    
}
