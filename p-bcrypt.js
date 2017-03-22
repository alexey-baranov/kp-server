let bcrypt= require("bcrypt");

var start= new Date().getTime();

console.log(bcrypt.hashSync("Lesha", bcrypt.genSaltSync(/*14*/)))

var hash = bcrypt.hashSync("bacon", bcrypt.genSaltSync(14));
console.log(new Date().getTime()-start);
console.log(bcrypt.compareSync("bacon", hash)); // true
console.log(new Date().getTime()-start);
console.log(bcrypt.compareSync("veggies", hash)); // false

console.log(new Date().getTime()-start);
