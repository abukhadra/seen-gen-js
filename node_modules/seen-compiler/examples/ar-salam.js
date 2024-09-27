import {Project} from '../src/main.js' 

let project = new Project()                      
project.init_ar(`دل بدء {اطبع_سطر(«السلام عليكم!»)}`)
let code = project.get_code()
eval(code); 