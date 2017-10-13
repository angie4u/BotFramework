var restify = require('restify');
var builder = require('botbuilder'),
    request = require('request').defaults({ encoding: null }),
    url = require('url'),    
    validUrl = require('valid-url'),
    imageService = require('./image-service');

    
var MAX_CARD_COUNT = 10;

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s listening to %s',server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});


//var luisAppUrl = process.env.LUIS_APP_URL || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0c66a7dd-96d5-442d-84c5-1a3c09300707?subscription-key=c4ac39be736d47598ab8ca33b5cccd7c&verbose=true&timezoneOffset=0&q=';
var luisAppUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0c66a7dd-96d5-442d-84c5-1a3c09300707?subscription-key=c4ac39be736d47598ab8ca33b5cccd7c&verbose=true&timezoneOffset=0&q=';


var MAX_CARD_COUNT = 10;

//var imageService = require('./image-service');

server.post('/api/messages',connector.listen());

var bot = new builder.UniversalBot(connector, [    
    function(session){
        session.beginDialog('getUserData',session.userData.profile);
    },
    function(session,results){
        session.userData.profile = results.response;
        //session.send('사용자 정보')
        //session.send(`${session.userData.profile.name}, ${session.userData.profile.homeAddress}, ${session.userData.profile.phoneNumber}`);        
               
        session.send('원하는 서비스를 입력하세요(예시: 꽃 선물 / 꽃꽃이 강좌안내 / 꽃 이미지 검색)');        
    }
]);

bot.on('conversationUpdate',function(message){
    if(message.membersAdded){
        message.membersAdded.forEach(function(identity){
            if(identity.id === message.address.bot.id){
                var reply = new builder.Message()
                    .address(message.address)
                    .text('안녕하세요, 꽃과 관련된 서비스를 하는 봇 입니다!');
                bot.send(reply);
            }           
        });
    }
});


bot.recognizer(new builder.LuisRecognizer(luisAppUrl));


bot.dialog('getUserData',[
    function(session,args,next){
        session.dialogData.profile = args || {};
        if(!session.dialogData.profile.name){
            session.send("더욱 편리한 이용을 위해 초기 1회 사용자 정보를 입력받고 있습니다.");
            builder.Prompts.text(session,'성함이 어떻게 되시나요?');
        }else{
            next();
        }
    },
    function(session,results,next){
        if(results.response){
            session.dialogData.profile.name = results.response;
        }
        if(!session.dialogData.profile.homeAddress){
            builder.Prompts.text(session, '집 주소가 어떻게 되시나요?');
        }else{
            next();
        }
    },
    function(session,results,next){
        if(results.response){
            session.dialogData.profile.homeAddress = results.response;
        }
        if(!session.dialogData.profile.phoneNumber){
            builder.Prompts.text(session,'휴대폰 번호도 알려주시기 바랍니다 ;) 배송시 필요합니다!');
        }else{
            next();
        }
    },
    function(session,results){
        if(results.response){
            session.dialogData.profile.phoneNumber = results.response;
            session.send("사용자 정보 입력이 완료되었습니다. 감사합니다!");
        }
        session.endDialogWithResult({response: session.dialogData.profile});    
    }

]);

bot.dialog('order',[
    function(session,args){
        session.send('사랑하는 사람에게 꽃을 선물해 보세요!');
        session.dialogData.order = {};

        var cards = getCardAttachments();
        var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
          
        session.send(reply);
        builder.Prompts.text(session,"원하는 타입의 옵션을 선택하시기 바랍니다!");        
        
    },
    function(session,results){
        session.dialogData.order.type = results.response;       
        if(session.dialogData.order.type == '1')
        {
            session.beginDialog('softbyEvent');  
        }
        else if(session.dialogData.order.type == '2')
        {
            session.beginDialog('softbyPrice');  
        }
        else if(session.dialogData.order.type == '3')
        {
            session.beginDialog('softbyFlowerType');  
        }
    }
]).triggerAction({
    matches: 'FlowerOrder'
});


bot.dialog('search',[
    function(session){        
        //session.send('꽃 이름을 입력하시면 Bing Image 검색 결과를 보여드립니다!');
        builder.Prompts.text(session,`꽃 이름을 입력하시면 Bing Image 검색 결과를 보여드립니다!`);
    },
    function(session,results){        
        var flowerName = results.response;        
        if(flowerName){
            imageService
                .getFlowerImageByName(flowerName)
                .then(function(value){ handleApiResponse(session, value); })
                .catch(function(error) { handleErrorResponse(session,error); });
        }else{
            session.send('이름 맞게 입력하신거 맞죠??');
        }                 
   
    },
    
]).triggerAction({
    matches: 'FlowerSearch'
});


bot.dialog('class',[
    
    function(session,args){
        session.dialogData.class = {};

        session.send('kukka 플라워 클래스를 안내해 드립니다!');
        builder.Prompts.text(session, `원하는 지점을 선택해주세요\n1.이태원점\n2.광화문점`);
    },
    function(session,results){
        session.dialogData.class.location = results.response;
        builder.Prompts.text(session, `수강하고 싶은 클래스를 선택해주세요!\n1.입문반\n2.중급반\n3.고급반\n4.핸드타이드\n5.웨딩\n6.드라이플라워`);
    },
    function(session,results){
        session.dialogData.class.type = results.response;
        builder.Prompts.text(session, `원하는 날짜를 선택해주세요\n1.10월 13일\n2.10월 14일\n3.10월 15일`);
    },
    function(session,results){
        session.dialogData.class.date = results.response;
        var classInfo = `선택하신 옵션은: ${session.dialogData.class.location}, ${session.dialogData.class.type}, ${session.dialogData.class.date} 입니다.`;
             
        session.send(classInfo);
        session.send('성공적으로 예약되었습니다. 신청해주셔서 감사합니다 ;)').endDialogWithResult(session.dialogData.class);
    }
]).triggerAction({
    matches: 'FlowerClass'
});


bot.dialog('softbyEvent',[
    function(session){
        session.dialogData.event = {};
        //session.send('softbyEvent 다이얼로그');          
        builder.Prompts.text(session, `해당하는 이벤트 번호를 입력하세요\n1. 생일 기념일\n 2. 승진, 취업\n3.개업, 집들이\n4. 졸업식, 연주회`);
    },
    function(session,results){
        session.dialogData.event = results.response;
        session.endDialog();
    }
]);

bot.dialog('softbyPrice',[
    function(session){
        session.send('softbyPrice 다이얼로그');        
    }
]);

bot.dialog('softbyFlowerType',[
    function(session){
        session.send('softbyFlowerType 다이얼로그');        
    }
]);

function getCardAttachments(session){
    return [
         new builder.HeroCard(session)
            .title('1. 이벤트별로 살펴보기')
            .subtitle('생일 축하 / 승진기념 ..')
            .text('이벤트 용도의 꽃 주문')
            .images([builder.CardImage.create(session,'http://cfile29.uf.tistory.com/image/27639449561FE674063434')])
            .buttons([ builder.CardAction.imBack(session,"1","Type 1")]),
        new builder.HeroCard(session)
            .title('2. 가격대별로 살펴보기')
            .subtitle('49,900 / 79,900 / 129,900')
            .text('원하는 가격대별 꽃을 찾아보세요')
            .images([builder.CardImage.create(session,'https://www.floralhub.com.au/wp-content/uploads/2015/07/dark-pink-roses-bouquet.jpg')])
            .buttons([ builder.CardAction.imBack(session,"2","Type 2")]),
        new builder.HeroCard(session)
            .title('3. 종류별로 살펴보기')
            .subtitle('꽃 다발 / 바구니 / 플랜트 / 드라이꽃')
            .text('원하는 종류별로 꽃을 찾아보세요')
            .images([builder.CardImage.create(session,'http://arangflower.com/data/item/2016-05-11/1028567796_a6968d50_1.jpg')])
            .buttons([ builder.CardAction.imBack(session,"3","Type 3")]),
    ];
}


function handleApiResponse(session, images){
    if(images && images.constructor === Array && images.length > 0){

        //session.sendTyping();
        var productCount = Math.min(MAX_CARD_COUNT, images.length);

        var cards = new Array();
        for(var i=0; i<productCount; i++){
            cards.push(constructCard(session,images[i]));
        }

        var reply = new builder.Message(session)
            .text('이미지 검색 결과입니다 :)')
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
        session.send(reply);
    }else{
        session.send('해당 검색어에 해당하는 꽃을 찾지 못했습니다 :(');
    }
}

function constructCard(session, image){
    return new builder.HeroCard(session)
        .title(image.name)
        .subtitle(image.hostPageDisplayUrl)
        .images([
            builder.CardImage.create(session,image.thumbnailUrl)
        ])
        .buttons([
            builder.CardAction.openUrl(session, image.hostPageUrl, '웹 페이지 열기'),
            builder.CardAction.openUrl(session,image.webSearchUrl,'더 검색하기')
        ]);
}

function handleErrorResponse(session, error){
    session.send("뭔가가 잘못되었습니다;; 조금 후에 다시 시도해주세요!");
    console.error(error);
}

