// The exported functions in this module makes a call to Bing Image Search API returns similar products description if found.
// Note: you can do more functionalities like recognizing entities. For more info checkout the API reference:
// https://msdn.microsoft.com/en-us/library/dn760791.aspx
var request = require('request').defaults({ encoding: null });

//var BING_API_URL = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?modulesRequested=SimilarImages&Accept-Language=kr&form=BCSPRD';
var BING_API_URL = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?form=BCSPRD';

//var BING_SEARCH_API_KEY = process.env.BING_SEARCH_API_KEY;
var BING_SEARCH_API_KEY = 'e256c5f32e6241c9b7622c617d7e2b27';

/** 
 * Gets the similar products of the image from an image URL
 * @param {string} name The URL to an image.
 * @return {Promise} Promise with visuallySimilarProducts array if succeeded, error otherwise
 */
// 
exports.getFlowerImageByName = function(name){
    return new Promise(
        function(resolve,reject){
            console.log('%s',name);
            var requestData = {
                url: BING_API_URL + '&q='+name,
                headers:{
                    'Ocp-Apim-Subscription-Key': 'e256c5f32e6241c9b7622c617d7e2b27'
                },
                json: true
            };
            
            request.get(requestData, function(error,response,body){
                if(error){
                    reject(error);
                }
                else if(response.statusCode !== 200){
                    reject(body);
                }
                else {
                    resolve(body.value);
                }
            });
        }
    );
};