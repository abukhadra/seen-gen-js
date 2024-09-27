export class Err {  
    msg
    start_loc
    end_loc 
    
    constructor(msg, start_loc, end_loc) { 
        this.msg = msg
        this.start_loc = start_loc
        this.end_loc = end_loc
}   }