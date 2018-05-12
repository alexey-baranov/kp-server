let express = require('express'),
  router = express.Router()

let config= require("../../cfg")


router.get('/simple', (req, res) =>{
  res.send("unittest")
})
router.get('/json', (req, res) =>{
  res.json({unittest:"unittest"})
})
router.get('/status404', (req, res) =>{
  res.status(404).send("not found")
})
router.get('/throw', (req, res) =>{
  throw new Error("unittest")
})
router.get('/async', async (req, res) =>{
  let result= await Promise.resolve("unittest")
  res.send("unittest")
})
router.get('/asyncthrow', async (req, res) =>{
  let result= await Promise.resolve("unittest")
  throw new Error("asyncthrow")
})


module.exports = router
