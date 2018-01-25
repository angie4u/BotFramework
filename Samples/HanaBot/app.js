// 개발 시 필요한 패키지들을 포함시키는 부분
var apis = require('./apis.js')
var restify = require('restify')
var builder = require('botbuilder')
var card = require('./cards.js').card

var luisurl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/e81eef89-5dc9-4990-a1bd-51b175dbe9c8?subscription-key=1a0c89d3e7de446a8b870011ccd8abdd&verbose=true&timezoneOffset=540&q='

// Restify Server 셋팅과정
var server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url)
})

// Bot Framework 서비스랑 커뮤니케이션하기 위해 Chat connector 생성하는 과정
var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

// 사용자 메세지 기다리는 부분
server.post('/api/messages', connector.listen())

// 사용자에게 응답을 보내주는 부분
var bot = new builder.UniversalBot(connector, [
  function (session) {
    session.send('안녕하세요, 하나투어 봇 입니다!')
    builder.Prompts.choice(session, '원하시는 서비스를 선택하시기 바랍니다!', '패키지|항공권|호텔|추천|기타', { listStyle: builder.ListStyle.button })
  },
  function (session, results) {
    if (results.response.entity === '추천') {
      session.beginDialog('recommendation')
    } else {
      session.beginDialog('booking', { product: results.response.entity })
    }
  }
])

bot.on('conversationUpdate', function (message) {
  if (message.membersAdded) {
    message.membersAdded.forEach(function (identity) {
      if (identity.id === message.address.bot.id) {
        bot.beginDialog(message.address, '/')
      }
    })
  }
})

var booking = {}
bot.dialog('booking', [
  // adaptive card - submit action 처리를 위한 부분
  function (session, args) {
    if (session.message && session.message.value) {
      console.log(session.message.value)
    }

    // 지금 adaptive card 끝나고 돌아왔을때 값 처리하는 부분에서 막힘. next 쓰고 이미 물어본거면 안물어보게끔 처리하면 될듯

    if (args) {
      booking.product = args.product
    }
    // booking.product = args.product
    session.send(`${booking.product}상품을 안내해드리겠습니다.`)
    builder.Prompts.choice(session, '출발 도시를 선택해주세요!', '인천|김포|부산|광주|제주', { listStyle: builder.ListStyle.button })
    // builder.Prompts.text(session, '출발 도시를 선택해주세요!')
    // session.endDialog()
  }, function (session, results) {
    booking.departure = results.response.entity
    builder.Prompts.choice(session, '가고자 하는 지역을 선택해주세요:)', '동남아|중국|일본|남태평양|유럽|미주/중남미', { listStyle: builder.ListStyle.button })
  }, function (session, results) {
    booking.location = results.response.entity
    builder.Prompts.choice(session, '가고자 하는 도시를 선택해주세요:)', '방콕|세부|보라카이|다낭|하노이|대만', { listStyle: builder.ListStyle.button })
  }, function (session, results) {
    booking.city = results.response.entity
    // builder.Prompts.text(session, '')
    var msg = new builder.Message(session)
        .addAttachment(card)

    return session.send(msg)
    // var date = session.message.value.date
    // builder.Prompts.text(session, msg)
  }, function (session, results) {
    // session.send('test')
    if (session.message && session.message.value) {
      console.log(session.message.value)
    }
  }, function (session, results) {
    // session.send('test')
    session.send('안녕하세요')
  }
])

bot.dialog('recommendation', [
  function (session) {
    builder.Prompts.text(session, '원하시는 여행을 자유롭게 말씀해주세요! (예시)가족끼리 가기 좋은 여행지 추천, 따뜻한 여행지 추천 ...')
    // session.endDialog()
  }, function (session, results) {
    var query = results.response
    apis
      .luisApi(luisurl, query)
      .then(function (value) { handleApiResponse(session, value) })
      .catch(function (error) { console.error(error) })
    session.endDialog()
  }
])

function handleApiResponse (session, luisResult) {
  session.send(luisResult)
}
