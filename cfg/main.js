const Sequelize= require("sequelize")
module.exports= {
  development: {
    database:{
      username: "postgres",
      password: "postgres",
      database: "kp-development",
      host: "127.0.0.1",
      dialect: "postgres",
      query:{
        type: Sequelize.QueryTypes.SELECT
      },
      logging: function(e){
        // console.log(e)
      },
      // pool configuration used to pool database connections
      pool: {
        max: 10,
        idle: 30000,
        acquire: 60000,
      },
      // isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED,
      define: {
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        underscored: true
      }
    },
    "file-server": {
      schema: "http",
      host: "localhost",
      port: 8484,
      "upload-path": "upload",
      "download-path": "download"
    },
    server: {
      username: "server",
      password: "qwerty"
    },
    captcha: {
      key: "6Lf78hkUAAAAALDWSItQ9OdDXfM2ZM7JunDSQMuK",
      secret: "6Lf78hkUAAAAAO59Qt_G_S35rWDjlbRJBzwEU4eh"
    },
    unittest2: {
      username: "unittest2@domain.ru",
      password: "qwerty"
    },
    FCM:{
      serverKey:"AAAAPzuy5_M:APA91bF1sw8KpHaCGZi8GA61T3q3q1irL6rHDNAf8M5OK9w7TYvViohFqfd_f5l_xtWJkZsZF7OWkg23cXBgrPwHmrb3kj_64y2TLKcTC4xHMF8fZRzb9pu_X4e2Ull3eRXyyHruh9qF",
      senderID: "271584520179"
    },
    VAPID:{
      publicKey:"BLz7OwXHhSA1BPc9jVPpy0lTooMfjvP9bb5lmXSjfqtubBDPq_IOCaK6PLbtfz8gbdQ5jpadza9Ap-53AM_9Y4s",
      privateKey:"Wp_CWZxkpaEwgro5asbIK7f57Yq3z2_K02sow-_krKc"
    }
  },
  developmentfast: {
    database: {
      username: "postgres",
      password: "postgres",
      database: "kp-development",
      host: "127.0.0.1",
      dialect: "postgres",
      query:{
        type: Sequelize.QueryTypes.SELECT
      },
      logging: function(e){
        // console.log(e)
      },
      // pool configuration used to pool database connections
      pool: {
        max: 10,
        idle: 30000,
        acquire: 60000,
      },
      // isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED,
      define: {
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        underscored: true
      },
    },
    "file-server": {
      schema: "http",
      host: "localhost",
      port: 8484,
      "upload-path": "upload",
      "download-path": "download"
    },
    server: {
      username: "server",
      password: "qwerty"
    },
    captcha: {
      key: "6Lf78hkUAAAAALDWSItQ9OdDXfM2ZM7JunDSQMuK",
      secret: "6Lf78hkUAAAAAO59Qt_G_S35rWDjlbRJBzwEU4eh"
    },
    unittest2: {
      username: "unittest2@domain.ru",
      password: "qwerty"
    },
    FCM:{
      serverKey:"AAAAPzuy5_M:APA91bF1sw8KpHaCGZi8GA61T3q3q1irL6rHDNAf8M5OK9w7TYvViohFqfd_f5l_xtWJkZsZF7OWkg23cXBgrPwHmrb3kj_64y2TLKcTC4xHMF8fZRzb9pu_X4e2Ull3eRXyyHruh9qF",
      senderID: "271584520179"
    },
    VAPID:{
      publicKey:"BLz7OwXHhSA1BPc9jVPpy0lTooMfjvP9bb5lmXSjfqtubBDPq_IOCaK6PLbtfz8gbdQ5jpadza9Ap-53AM_9Y4s",
      privateKey:"Wp_CWZxkpaEwgro5asbIK7f57Yq3z2_K02sow-_krKc"
    }
  },
  testing: {
    database:{
      username: "postgres",
      password: "postgres",
      database: "kp-testing",
      host: "127.0.0.1",
      dialect: "postgres",
      query:{
        type: Sequelize.QueryTypes.SELECT
      },
      logging: function(e){
        console.log(e)
      },
      // isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED,
      define: {
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        underscored: true
      },
    },
    "file-server": {
      schema: "http",
      host: "localhost",
      port: 8484,
      "upload-path": "upload",
      "download-path": "download"
    },
    server: {
      username: "server",
      password: "qwerty"
    },
    captcha: {
      key: "6Lf78hkUAAAAALDWSItQ9OdDXfM2ZM7JunDSQMuK",
      secret: "6Lf78hkUAAAAAO59Qt_G_S35rWDjlbRJBzwEU4eh"
    },
    unittest2: {
      username: "unittest2@domain.ru",
      password: "qwerty"
    },
    FCM:{
      serverKey:"AAAAPzuy5_M:APA91bF1sw8KpHaCGZi8GA61T3q3q1irL6rHDNAf8M5OK9w7TYvViohFqfd_f5l_xtWJkZsZF7OWkg23cXBgrPwHmrb3kj_64y2TLKcTC4xHMF8fZRzb9pu_X4e2Ull3eRXyyHruh9qF",
      senderID: "271584520179"
    },
    VAPID:{
      publicKey:"BLz7OwXHhSA1BPc9jVPpy0lTooMfjvP9bb5lmXSjfqtubBDPq_IOCaK6PLbtfz8gbdQ5jpadza9Ap-53AM_9Y4s",
      privateKey:"Wp_CWZxkpaEwgro5asbIK7f57Yq3z2_K02sow-_krKc"
    }
  }
}
