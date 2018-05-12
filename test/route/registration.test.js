/**
 * Created by alexey2baranov on 8/26/16.
 */

let _ = require("lodash"),
  log4js= require("log4js"),

  config = require("../../cfg"),
  models = require("../../src/model")

let api= require("../../src/axios")

  it('/create', async () => {
    let result = await api.get("registration/create", {
      name: "unit",
      surname: "test",
      patronymic: "unittest",
      passport: "1234",
      note: "unittest",
      attachments: [],
      email: "email@domain.ru",
      skype: "skype",
      viber: "viber",
      whatsapp: "whatsapp",
      telegram: "telegram",
      state: "state"
    })

    expect(result.id).toBeGreaterThan(0)
    expect(result.created_at).any(Date)
  })
