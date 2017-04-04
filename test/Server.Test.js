/**
 * Created by alexey2baranov on 8/26/16.
 */

var assert = require('chai').assert;
let autobahn = require("autobahn");

let Cleaner = require("../src/Cleaner")
let config = require("../cfg")
let _ = require("lodash");
let model = require("../src/model");

let WAMP = require("../src/WAMPFactory");
let Server = require("../src/Server");
let server = new Server();

let UNIT_TEST_ZEMLA_2 = 2,
  unitTestKopnik2,
  UNIT_TEST_KOPNIK_2 = 2;


describe('Server', function () {
  before(async function () {
    await Cleaner.clean()
  });

  describe('#promiseKopi()', function (done) {
    let result;
    it("should return array of obj, invited or initier=me", async function () {
      let CHE = new Date(2016, 9 - 1, 1).getTime();
      result = await server.Zemla_promiseKopi(null, {
        PLACE: UNIT_TEST_ZEMLA_2,
        // TIME: null
      }, {caller_authid: "unittest2@domain.ru"});

      assert.equal(_.isArray(result), true);
      for (var eachResult of result) {
        assert.equal(_.isObject(result[0]), true);
        assert.equal(eachResult.owner_id == UNIT_TEST_KOPNIK_2 || eachResult.invited != null, true);
      }
    })

    it('size should be 4 ', function () {
      assert.equal(result.length, 4);
    });

    it('should be ordered invited followed by my planned', function () {
      assert.equal(result[0].invited < result[1].invited, true);
      assert.equal(result[1].invited < result[2].invited, true);
      assert.equal(!result[3].invited, true);
    });
  });

  describe('#promisei(BEFORE)', function () {
    let result;
    it("should return array of obj, invited", async function () {
      let CHE = new Date(2016, 9 - 1, 1).getTime();
      result = await server.Zemla_promiseKopi(null, {
        PLACE: UNIT_TEST_ZEMLA_2,
        BEFORE: CHE
      }, {caller_authid: "unittest2@domain.ru"});

      assert.equal(_.isArray(result), true);
      for (var eachResult of result) {
        assert.equal(_.isObject(result[0]), true);
        assert.equal(eachResult.invited != null, true);
        assert.equal(eachResult.invited < CHE, true);
      }
    });

    it('size should be 2 ', function () {
      assert.equal(result.length, 2);
    });

    it('should be ordered invited', function () {
      assert.equal(result[0].invited < result[1].invited, true);
    });
  });

  describe.only('addPushSubscription()', function () {
    it("shluld subscribe", async() => {
      let subscription = await server.Application_addPushSubscription([{
        endpoint: 'unit test subscription',
        keys: {p256dh: "p256dh", auth: "auth"}
      }], {}, {caller_authid: "unittest2@domain.ru"})
      await model.PushSubscription.findById(subscription.id)
    })

    it("shluld delete last one", async() => {
      for (let i = 0; i < model.PushSubscription.maxCountPerKopnik; i++) {
        await server.Application_addPushSubscription([{
          endpoint: 'unit test subscription',
          keys: {p256dh: "p256dh", auth: "auth"}
        }], {}, {caller_authid: "unittest2@domain.ru"})
      }
      //1. получить подписки до добавления
      let subscriptionsBefore = await model.PushSubscription.findAll({where: {owner_id: 2}, order: "id"})
      assert.equal(subscriptionsBefore.length, model.PushSubscription.maxCountPerKopnik, "subscriptions.length, " + model.PushSubscription.maxCountPerKopnik)
      //2. добавить подписку
      let subscription = await server.Application_addPushSubscription([{
        endpoint: 'unit test subscription',
        keys: {p256dh: "p256dh", auth: "auth"}
      }], {}, {caller_authid: "unittest2@domain.ru"})
      assert.equal(await model.PushSubscription.findById(subscription.id) != null, true, "model.PushSubscription.findById(SUBSCRIPTION)!= null")
      //3. получить подписки после добавления
      let subscriptionsAfter = await model.PushSubscription.findAll({where: {owner_id: 2}, order: "id"})
      //4. сравнить до и после должны сдвинуться
      assert.equal(subscriptionsAfter[0].id, subscriptionsBefore[1].id, "0")
      assert.equal(subscriptionsAfter[1].id, subscriptionsBefore[2].id, "0")
      assert.equal(subscriptionsAfter[2].id, subscriptionsBefore[3].id, "0")
      assert.equal(subscriptionsAfter[3].id, subscriptionsBefore[4].id, "0")
    })

    it.only("should push", async() => {
      console.log("refresh browser to add correct webpush subscription into database")
      const webpush = require('web-push');

      webpush.setGCMAPIKey(/*'<Your GCM API Key Here>'*/config.FCM.serverKey);
      webpush.setVapidDetails('mailto:alexey2baranov@gmail.com', config.VAPID.publicKey, config.VAPID.privateKey)

      // This is the same output of calling JSON.stringify on a PushSubscription
      let subscriptions = await model.PushSubscription.findAll({where: {owner_id: 2}})
      const pushSubscription = subscriptions[subscriptions.length - 1].value

      let result = await webpush.sendNotification(pushSubscription, JSON.stringify({
        notification: {
          title: 'unit test title',
          options: {
            body: 'unit test body',
            tag: "unit test tag" + new Date()
          }
        }
      }))
      // assert.equal(result.success,1)
    })
  })
})

// WAMP.open();
