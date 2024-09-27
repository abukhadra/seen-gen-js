class Node          { id; t; v                          ;  constructor(id,t,v)         { this.id = id, this.t = t, this.v = v}                 }
class Mod           {                                   ;  constructor()               {}                                                      }
class Type          { t; o                              ;  constructor(t,o)            { this.t = t ; this.o = o }                             }
class TypeDef       { name; fields ; children           ;  constructor(name,fields,children)    { 
                                                                this.name = name 
                                                                this.fields = fields
                                                                this.children = children 
                                                            }                                  
}
class TypeDynamic   { fields; o                         ;  constructor(fields,o)       { this.fields = fields ; this.o = o }                   }
class TypeTempl     { t; ts; o                          ;  constructor(t, ts ,o)       { this.t = t; this.ts = ts ; this.o = o }               }
class EnumPat       { name; variant                     ;  constructor(name, variant)  { this.name = name ; this.variant = variant}            }
class Pair          { k; v                              ;  constructor(k,v)            { this.k = k ; this.v = v }                             }
class Uni           { opr; op                           ;  constructor(opr,op)         { this.opr = opr ; this.op = op }                       }
class Bin           { lopr; op; ropr                    ;  constructor(lopr,op,ropr)   { this.lopr = lopr ; this.op = op ; this.ropr = ropr }  }
class Fn            { name; params; ret_types; body     ;  constructor(name,params,ret_types,body)   { 
                                                                this.name = name ; 
                                                                this.params = params ; 
                                                                this.ret_types = ret_types ; 
                                                                this.body = body
                                                            }  
}
class FnParam       { _pat; t                          ;  constructor(_pat,t)          { this._pat = _pat; this.t = t }                        }
class StructLEl     { k; v                             ;  constructor(k,v)             { this.k = k; this.v = v }                              }
class Asgmt         { lhs; t; rhs                      ;  constructor(lhs, t ,rhs)     { this.lhs = lhs; this.t = t ; this.rhs = rhs }         }
class When          { expr; arms                       ;  constructor(expr,arms)       { this.expr = expr; this.arms = arms }                  }
class WhenArm       { pats; expr                       ;  constructor(pats,expr)       { this.pats = pats; this.expr = expr }                  }

export {
    Node,
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
}