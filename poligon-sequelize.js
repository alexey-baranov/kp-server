let models = require('./model');

async function poligon() {
    let alexey2baranov= await models.Kopnik.findById(1);
    console.log(await alexey2baranov.getAttachments());
    console.log(await alexey2baranov.getStarshina());
}

poligon()
    .catch(function (err) {
        console.error(err);
    });