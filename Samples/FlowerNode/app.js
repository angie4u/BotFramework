var restify = require('restify'),
    builder = require('botbuilder'),
    request = require('request').defaults({ encoding: null }),
    url = require('url'),
    validUrl = require('valid-url'),
    imageService = require('./image-service'),
    azure = require('botbuilder-azure'),
    cognitiveservices = require('botbuilder-cognitiveservices');

var documentDbOptions = {
    host: 'flowergallery.documents.azure.com',
    masterKey: 'OKT5Wv0e7B41FaHcSbhBs24kVCK5agY9yOOklhhopKZQ23IspdH4ecxfUkXfEgWPz7vS3q6e1TfJEibre9mLCw==',
    database: 'botdocs',
    collection: 'botdata'
};

// Table storage
var tableName = "flowernode"; // You define
var storageName = "memefunctionstorage"; // Obtain from Azure Portal
var storageKey = "/rOwErr/F+yO3TupawAPHZP8ZMvWSr5DVL9WucLnGGSHkcFvk2dsctTgA1A79HmFw/2ZRrv7AhxAe4ljYdmKAw=="; // Obtain from Azure Portal

var docDbClient = new azure.DocumentDbClient(documentDbOptions);
var cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

var azureTableClient = new azure.AzureTableClient(tableName, storageName, storageKey);
var tableStorage = new azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Set up for qna maker dialog
// var recognizer = new cognitiveservices.QnAMakerRecognizer({
//     knowledgeBaseId: 'f33c9325-c60b-4c57-9983-675a4a737fbc',
//     subscriptionKey: '15745d9b221e41c593222171882b6efa'
// });

// var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
// 	recognizers: recognizer,
// 	defaultMessage: 'No good match in FAQ.',
// 	qnaThreshold: 0.5});


var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});


//var luisAppUrl = process.env.LUIS_APP_URL || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0c66a7dd-96d5-442d-84c5-1a3c09300707?subscription-key=c4ac39be736d47598ab8ca33b5cccd7c&verbose=true&timezoneOffset=0&q=';
var luisAppUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0c66a7dd-96d5-442d-84c5-1a3c09300707?subscription-key=c4ac39be736d47598ab8ca33b5cccd7c&verbose=true&timezoneOffset=0&q=';


var MAX_CARD_COUNT = 10;

//var imageService = require('./image-service');


server.get('/api/keyboard', function create(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.json({
        //"type" : "text"
        "type": "buttons",
        "buttons": ["선택 1", "선택 2", "선택 3"]
    });
});
server.post('/api/messages', connector.listen());


// Hero 카드 생성하는 부분
function getCardAttachments(session) {
    return [
        new builder.HeroCard(session)
            .title('1. 꽃 선물하기')
            .subtitle('선물하실 꽃을 찾아보세요')
            .text('선물하기 좋은 꽃들을 추천해드립니다')
            .images([builder.CardImage.create(session, 'https://scontent-nrt1-1.xx.fbcdn.net/v/t1.0-9/23915999_2012529288961288_4970280158005085318_n.jpg?oh=3b374fb8335f5adecaf69e9877987044&oe=5ACD2A0C')])
            .buttons([builder.CardAction.imBack(session, "1", "1.꽃 선물하기")]),
        new builder.HeroCard(session)
            .title('2. 꽃꽃이 강좌안내')
            .subtitle('꽃꽃이 클래스 관련 안내')
            .text('꽃꽃이 클래스를 안내해드립니다')
            .images([builder.CardImage.create(session, 'https://scontent-nrt1-1.xx.fbcdn.net/v/t1.0-9/17904376_1907943682753183_8690189794666672275_n.jpg?oh=38ddc4634cbc3be8c70bbed7b5a0a547&oe=5ACC4F9F')])
            .buttons([builder.CardAction.imBack(session, "2", "2.꽃꽃이 강좌안내")]),
        new builder.HeroCard(session)
            .title('3. 꽃 이미지 검색')
            .subtitle('Bing 꽃 이미지 검색')
            .text('꽃 이미지 검색 결과를 보여드립니다')
            .images([builder.CardImage.create(session, 'https://lh3.ggpht.com/-WiDedZuL4zfWpkmqSlFNkNUU7o5ixdeGmjo1Fnjy-JdKiWgOGwd5x9qMp71zvtWvRO2=h900')])
            .buttons([builder.CardAction.imBack(session, "3", "3.꽃 이미지 검색")]),
        new builder.HeroCard(session)
            .title('4. FAQ')
            .subtitle('자주 묻는 질문')
            .text('자주 묻는 질문에 답해드립니다')
            .images([builder.CardImage.create(session, 'https://home.llu.edu/sites/home.llu.edu/files/images/Assessment/Newsletter/faqs.jpg')])
            .buttons([builder.CardAction.imBack(session, "4", "4.FAQ")]),
    ];
}

var qnaFunction = function(session,question){
    var lQnaMakerServiceEndpoint = 'https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/';
    var lQnaApi = 'generateAnswer';
    var lKnowledgeBaseId = 'f33c9325-c60b-4c57-9983-675a4a737fbc';
    var lSubscriptionKey = '15745d9b221e41c593222171882b6efa';
    //var lHtmlentities = new entities.AllHtmlEntities();
    var lKbUri = lQnaMakerServiceEndpoint + lKnowledgeBaseId + '/' + lQnaApi;
    request({
        url: lKbUri,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': lSubscriptionKey
        },
        body: '{"question":"' + question + '"}'
    },
    function (error, response, body){
        var lResult;
        var stopQNA;
        if(!error){
            lResult = JSON.parse(body);
            //lResult.answer = lHtmlentities.decode(lResult.answers);
        }else{
            lResult.answer = "Unfortunately an error occurred. Try again.(fQnAMaker)";
            lResult.score = 0;
        }
        
        session.send(lResult.answers[0].answer);        
        //session.send('처음으로 돌아가고 싶으신 경우 "홈"을 입력해주세요');
        builder.Prompts.text(session, "궁금하신 것들을 말씀해주세요!");
        
    })
}

var bot = new builder.UniversalBot(connector, [
    // function(session){
    //     session.beginDialog('getUserData',session.userData.profile);
    // },
    function (session) {
        var cards = getCardAttachments();
        var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
        session.send(reply);
        builder.Prompts.text(session, "원하는 타입의 옵션을 선택하시기 바랍니다! 혹은 자유롭게 말씀하셔도 되요!");
    },
    function (session, results) {
        session.dialogData = {};
        session.dialogData.select = {};
        session.dialogData.select.type = session.message.text;

        if (session.dialogData.select.type == '1') {
            //session.userData.early = {};
            //session.beginDialog('softbyEvent');  
            session.beginDialog('order');
        }
        else if (session.dialogData.select.type == '2') {
            //session.beginDialog('softbyPrice');
            session.beginDialog('search');
        }
        else if (session.dialogData.select.type == '3') {
            //session.beginDialog('softbyFlowerType');  
            //session.send("궁금하신 질문을 입력해주세요, 그만하시려면 '그만'이라고 입력해주세요");
            //session.userData.early = {};
            session.beginDialog('class');
        }
        else if (session.dialogData.select.type == '4') {
            //session.beginDialog('softbyFlowerType');  
            //session.send("궁금하신 질문을 입력해주세요, 그만하시려면 '그만'이라고 입력해주세요");
            //session.userData.early = {};
            session.beginDialog('qnamaker');
        }
        else {
            //session.send("You said: %s", session.message.text);
            session.send("다시 선택해주세요!");
        }
    },

    function (session, results) {
        //session.userData.profile = results.response;
        //session.send('사용자 정보')
        //session.send(`${session.userData.profile.name}, ${session.userData.profile.homeAddress}, ${session.userData.profile.phoneNumber}`);        

        session.send('원하는 서비스를 입력하세요(예시: 꽃 선물 / 꽃꽃이 강좌안내 / 꽃 이미지 검색)');
    }
])
    .set('storage', tableStorage);

bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                var reply = new builder.Message()
                    .address(message.address)
                    .text('안녕하세요, 꽃과 관련된 서비스를 하는 봇 입니다!');
                bot.send(reply);
            }
        });
    }
});


//bot.recognizer(new builder.LuisRecognizer(luisAppUrl));


bot.dialog('getUserData', [
    function (session, args, next) {
        session.dialogData.profile = args || {};
        if (!session.dialogData.profile.name) {
            session.send("더욱 편리한 이용을 위해 초기 1회 사용자 정보를 입력받고 있습니다.");
            builder.Prompts.text(session, '성함이 어떻게 되시나요?');
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.dialogData.profile.name = results.response;
        }
        if (!session.dialogData.profile.homeAddress) {
            builder.Prompts.text(session, '집 주소가 어떻게 되시나요?');
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.dialogData.profile.homeAddress = results.response;
        }
        if (!session.dialogData.profile.phoneNumber) {
            builder.Prompts.text(session, '휴대폰 번호도 알려주시기 바랍니다 ;) 배송시 필요합니다!');
        } else {
            next();
        }
    },
    function (session, results) {
        if (results.response) {
            session.dialogData.profile.phoneNumber = results.response;
            session.send("사용자 정보 입력이 완료되었습니다. 감사합니다!");
        }
        session.endDialogWithResult({ response: session.dialogData.profile });
    }

]);

bot.dialog('order', [
    function (session, args) {
        session.send('사랑하는 사람에게 꽃을 선물해 보세요!');
        session.dialogData.order = {};

        var cards = getCardAttachments2();
        var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);

        session.send(reply);
        builder.Prompts.text(session, "원하는 타입의 옵션을 선택하시기 바랍니다!");

    },
    function (session, results) {
        session.dialogData.order.type = results.response;
        if (session.dialogData.order.type == '1') {
            session.beginDialog('softbyEvent');
        }
        else if (session.dialogData.order.type == '2') {
            session.beginDialog('softbyPrice');
        }
        else if (session.dialogData.order.type == '3') {
            session.beginDialog('softbyFlowerType');
        }
    }
]).triggerAction({
    matches: 'FlowerOrder'
});


bot.dialog('search', [
    function (session) {
        //session.send('꽃 이름을 입력하시면 Bing Image 검색 결과를 보여드립니다!');
        builder.Prompts.text(session, `꽃 이름을 입력하시면 Bing Image 검색 결과를 보여드립니다!`);
    },
    function (session, results) {
        var flowerName = results.response;
        if (flowerName) {
            imageService
                .getFlowerImageByName(flowerName)
                .then(function (value) { handleApiResponse(session, value); })
                .catch(function (error) { handleErrorResponse(session, error); });
        } else {
            session.send('이름 맞게 입력하신거 맞죠??');
        }

    },

]).triggerAction({
    matches: 'FlowerSearch'
});


bot.dialog('class', [

    function (session, args) {
        session.dialogData.class = {};

        session.send('kukka 플라워 클래스를 안내해 드립니다!');
        builder.Prompts.text(session, `원하는 지점을 선택해주세요\n1.이태원점\n2.광화문점`);
    },
    function (session, results) {
        session.dialogData.class.location = results.response;
        builder.Prompts.text(session, `수강하고 싶은 클래스를 선택해주세요!\n1.입문반\n2.중급반\n3.고급반\n4.핸드타이드\n5.웨딩\n6.드라이플라워`);
    },
    function (session, results) {
        session.dialogData.class.type = results.response;
        builder.Prompts.text(session, `원하는 날짜를 선택해주세요\n1.10월 13일\n2.10월 14일\n3.10월 15일`);
    },
    function (session, results) {
        session.dialogData.class.date = results.response;
        var classInfo = `선택하신 옵션은: ${session.dialogData.class.location}, ${session.dialogData.class.type}, ${session.dialogData.class.date} 입니다.`;

        session.send(classInfo);
        session.send('성공적으로 예약되었습니다. 신청해주셔서 감사합니다 ;)').endDialogWithResult(session.dialogData.class);
    }
]).triggerAction({
    matches: 'FlowerClass'
});

// var qnamaker = new cognitiveservices.QnAMakerDialog({
//     recognizers: [recognizer],
//     defaultMessage: 'No match! Try changing the query terms!',
//     qnaThreshold: 0.5
// });


bot.dialog('qnamaker', [
    function (session) {
        // if (session.message.text == "그만") {
        //     session.endDialog();
        // }
        // else {
        //     builder.Prompts.text(session, "궁금하신 것들을 말씀해주세요!");
        // }
        session.send('안녕하세요 qna dialog 입니다!');
        builder.Prompts.text(session,'긍금하신 것을 입력하시기 바랍니다.');
    },
    function (session, results) { 
        if(results.response.text == '그만'){
            session.endDialog();
        }

        var question = results.response;
        //qnaFunction(session,question);
        //session.endDialog();

        //qna 호출
        var lQnaMakerServiceEndpoint = 'https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/';        
        var lQnaApi = 'generateAnswer';
        var lKnowledgeBaseId = 'f33c9325-c60b-4c57-9983-675a4a737fbc';
        var lSubscriptionKey = '15745d9b221e41c593222171882b6efa';
        //var lHtmlentities = new entities.AllHtmlEntities();
        var lKbUri = lQnaMakerServiceEndpoint + lKnowledgeBaseId + '/' + lQnaApi;
        request({
            url: lKbUri,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': lSubscriptionKey
            },
            body: '{"question":"' + question + '"}'
        },
        function (error, response, body){
            var lResult;
            var stopQNA;
            if(!error){
                lResult = JSON.parse(body);
                //lResult.answer = lHtmlentities.decode(lResult.answers);
            }else{
                lResult.answer = "Unfortunately an error occurred. Try again.(fQnAMaker)";
                lResult.score = 0;
            }
            
            session.send(lResult.answers[0].answer);        
            session.send('처음으로 돌아가고 싶으신 경우 "그만"을 입력해주세요');
            //builder.Prompts.text(session, "궁금하신 것들을 말씀해주세요!");
            
        })


    },
]);


bot.dialog('softbyEvent', [
    function (session) {
        session.dialogData.event = {};
        //session.send('softbyEvent 다이얼로그');          
        builder.Prompts.text(session, `해당하는 이벤트 번호를 입력하세요\n1. 생일 기념일\n 2. 승진, 취업\n3.개업, 집들이\n4. 졸업식, 연주회`);
    },
    function (session, results) {
        session.dialogData.event = results.response;
        session.endDialog();

    }
]);

bot.dialog('softbyPrice', [
    function (session) {
        session.send('softbyPrice 다이얼로그');
    }
]);

bot.dialog('softbyFlowerType', [
    function (session) {
        session.send('softbyFlowerType 다이얼로그');
    }
]);

function getCardAttachments2(session) {
    return [
        new builder.HeroCard(session)
            .title('1. 이벤트별로 살펴보기')
            .subtitle('생일 축하 / 승진기념 ..')
            .text('이벤트 용도의 꽃 주문')
            .images([builder.CardImage.create(session, 'http://cfile29.uf.tistory.com/image/27639449561FE674063434')])
            .buttons([builder.CardAction.imBack(session, "1", "Type 1")]),
        new builder.HeroCard(session)
            .title('2. 가격대별로 살펴보기')
            .subtitle('49,900 / 79,900 / 129,900')
            .text('원하는 가격대별 꽃을 찾아보세요')
            .images([builder.CardImage.create(session, 'https://www.floralhub.com.au/wp-content/uploads/2015/07/dark-pink-roses-bouquet.jpg')])
            .buttons([builder.CardAction.imBack(session, "2", "Type 2")]),
        new builder.HeroCard(session)
            .title('3. 종류별로 살펴보기')
            .subtitle('꽃 다발 / 바구니 / 플랜트 / 드라이꽃')
            .text('원하는 종류별로 꽃을 찾아보세요')
            .images([builder.CardImage.create(session, 'http://arangflower.com/data/item/2016-05-11/1028567796_a6968d50_1.jpg')])
            .buttons([builder.CardAction.imBack(session, "3", "Type 3")]),
    ];
}


function handleApiResponse(session, images) {
    if (images && images.constructor === Array && images.length > 0) {

        //session.sendTyping();
        var productCount = Math.min(MAX_CARD_COUNT, images.length);

        var cards = new Array();
        for (var i = 0; i < productCount; i++) {
            cards.push(constructCard(session, images[i]));
        }

        var reply = new builder.Message(session)
            .text('이미지 검색 결과입니다 :)')
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
        session.send(reply);
    } else {
        session.send('해당 검색어에 해당하는 꽃을 찾지 못했습니다 :(');
    }
}

function constructCard(session, image) {
    return new builder.HeroCard(session)
        .title(image.name)
        .subtitle(image.hostPageDisplayUrl)
        .images([
            builder.CardImage.create(session, image.thumbnailUrl)
        ])
        .buttons([
            builder.CardAction.openUrl(session, image.hostPageUrl, '웹 페이지 열기'),
            builder.CardAction.openUrl(session, image.webSearchUrl, '더 검색하기')
        ]);
}

function handleErrorResponse(session, error) {
    session.send("뭔가가 잘못되었습니다;; 조금 후에 다시 시도해주세요!");
    console.error(error);
}

