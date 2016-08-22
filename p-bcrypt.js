let bcrypt= require("bcrypt");

var start= new Date().getTime();

var hash = bcrypt.hashSync("bacon", bcrypt.genSaltSync(14));
console.log(new Date().getTime()-start);
console.log(bcrypt.compareSync("bacon", hash)); // true
console.log(new Date().getTime()-start);
console.log(bcrypt.compareSync("veggies", hash)); // false

console.log(new Date().getTime()-start);
