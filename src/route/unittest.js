let express = require('express'),
  router = express.Router()

let config= require("../../cfg")


router.get('/simple-get', (req, res) =>{
  res.send("unittest")
})
router.post('/simple-post', (req, res) =>{
  res.send(req.body)
})
router.all('/simple-all', (req, res) =>{
  res.send("unittest")
})

router.post('/json', (req, res) =>{
  res.json(req.body)
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
