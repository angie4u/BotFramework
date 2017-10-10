var restify = require('restify');
var builder = require('botbuilder');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s listening to %s',server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var luisAppUrl = process.env.LUIS_APP_URL || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0c66a7dd-96d5-442d-84c5-1a3c09300707?subscription-key=c4ac39be736d47598ab8ca33b5cccd7c&verbose=true&timezoneOffset=0&q=';


server.post('/api/messages',connector.listen());

var bot = new builder.UniversalBot(connector, [
    function(session){
        session.beginDialog('greeting');
    },
    function(session){
        session.beginDialog('getUserData',session.userData.profile);
    },
    function(session,results){
        session.userData.profile = results.response;
        //session.send('사용자 정보')
        //session.send(`${session.userData.profile.name}, ${session.userData.profile.homeAddress}, ${session.userData.profile.phoneNumber}`);        
               
        session.send('원하는 서비스를 입력하세요(예시: 꽃 선물 / 꽃꽃이 강좌안내 / 꽃 추천)');        
    }
]);

bot.recognizer(new builder.LuisRecognizer(luisAppUrl));

bot.dialog('greeting',[
    function(session){                
        session.send("안녕하세요! 꽃과 관련된 서비스를 하는 봇 입니다.");
        session.endDialog();
    }
]);

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
        //var intent = args.intent;
        //console.log(`intent: %s`,intent);
        session.send('꽃 주문을 하기 위한 dialog 입니다...');
        session.dialogData.order = {};

        var cards = getCardAttachments();
        var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
          
        //builder.Prompts.text(session,"hello");
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
    function(session,args){
        // var intent = args.intent;        
        // console.log('intent: %s',intent);
        session.send('꽃 검색을 하기 위한 dialog 입니다...').endDialog();
    }
]).triggerAction({
    matches: 'FlowerSearch'
});


bot.dialog('class',[
    function(session,args){
        // var intent = args.intent;        
        // console.log('intent: %s',intent);
        session.send('꽃꽃이 강좌 신청을 위한 dialog 입니다...').endDialog();
    }
]).triggerAction({
    matches: 'FlowerClass'
});


bot.dialog('softbyEvent',[
    function(session){
        session.dialogData.event = {};
        //session.send('softbyEvent 다이얼로그');    
        //session.send(`1. 생일 기념일\n 2. `)    
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

function createThumbnailCard(session){
    return [
        new builder.ThumbnailCard(session)
            .title()
            .subtitle()
            .text()
            .images([
                builder.CardImage.create(session,'')
            ])
            .buttons([
                builder.CardAction.openUrl(session,'','더 알아보기')
            ]),
        new builder.ThumbnailCard(session)
            .title()
            .subtitle()
            .text()
            .images([
                builder.CardImage.create(session,'')
            ])
            .buttons([
                builder.CardAction.openUrl(session,'','더 알아보기')
            ]),
        new builder.ThumbnailCard(session)
            .title()
            .subtitle()
            .text()
            .images([
                builder.CardImage.create(session,'')
            ])
            .buttons([
                builder.CardAction.openUrl(session,'','더 알아보기')
            ]),
    ]
}